"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/lib/result";
import { toResult } from "@/server/action";
import { parseOrThrow } from "@/lib/validation";
import { requireAdminRole } from "@/server/auth/guard";
import {
  upsertStaff,
  removeStaffAccess,
  revokeStaffSessions,
  setStaffPermissions,
  getStaffCredentialInfo,
  hardDeleteStaff,
  StaffEmailTakenError,
} from "@/server/staff/service";
import { isStaffPreset, type StaffPreset } from "@/lib/staff-presets";
import { PERMISSION_KEYS } from "@/lib/permissions";
import type { Permission } from "@/server/auth/guard";
import { createInviteToken, inviteUrl, createResetToken, resetUrl } from "@/server/auth/invite";
import { emailConfigured, sendEmail } from "@/lib/sendgrid";
import { staffInviteEmailHtml, staffResetEmailHtml } from "@/lib/email-template";

/** Trim + lowercase + validate an email once, with a user-facing message on failure. */
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

/**
 * Saves or updates a teammate's user account in the system.
 * This function enforces access control boundaries: ADMINs can only create or edit standard staff members (presets),
 * whereas SUPER_ADMINs are additionally allowed to create or promote users to the ADMIN role.
 *
 * @throws {Error} If credentials or authorization boundaries are violated.
 */
export async function saveStaffAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
  const session = await requireAdminRole();
  const email = parseOrThrow(emailSchema, formData.get("email"));
  const preset = String(formData.get("preset") || "");
  const name = String(formData.get("name") || "").trim() || undefined;
  const password = String(formData.get("password") || "") || undefined;

  const isAdminPreset = preset === "ADMIN";
  if (!isAdminPreset && !isStaffPreset(preset)) {
    throw new Error("Pick a role.");
  }

  // Restrict ADMIN role assignment solely to SUPER_ADMIN sessions to prevent privilege escalation.
  if (isAdminPreset && session.role !== "SUPER_ADMIN") {
    throw new Error("Only Super Admin can assign the Admin role.");
  }

  const role = isAdminPreset ? "ADMIN" : "STAFF";
  const targetPreset = isAdminPreset ? undefined : (preset as StaffPreset);

  try {
    await upsertStaff(session, { email, name, role, preset: targetPreset, password });
  } catch (e) {
    if (e instanceof StaffEmailTakenError) {
      throw new Error("That email already belongs to another account.");
    }
    throw e;
  }
  revalidatePath("/admin/ops/staff");
  });
}

/**
 * Invites a teammate by email: creates their account (no password) and emails a self-serve link to set
 * their own password + enroll 2FA. Returns the link so the admin can copy/share it even if email is
 * unconfigured or the mail bounces — the invite never silently fails.
 */
export async function inviteStaffAction(formData: FormData): Promise<Result<{ url: string }>> {
  const session = await requireAdminRole();
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { ok: false, error: { code: "VALIDATION", message: "Enter a valid email address." } };
  const preset = String(formData.get("preset") || "");
  const name = String(formData.get("name") || "").trim() || undefined;

  const isAdminPreset = preset === "ADMIN";
  if (!isAdminPreset && !isStaffPreset(preset)) {
    return { ok: false, error: { code: "VALIDATION", message: "Pick a role." } };
  }
  if (isAdminPreset && session.role !== "SUPER_ADMIN") {
    return { ok: false, error: { code: "FORBIDDEN", message: "Only Super Admin can invite an Admin." } };
  }

  const role = isAdminPreset ? "ADMIN" : "STAFF";
  const targetPreset = isAdminPreset ? undefined : (preset as StaffPreset);
  try {
    await upsertStaff(session, { email: email.data, name, role, preset: targetPreset });
  } catch (e) {
    if (e instanceof StaffEmailTakenError) return { ok: false, error: { code: "EMAIL_TAKEN", message: "That email already belongs to another account." } };
    return { ok: false, error: { code: "INTERNAL", message: e instanceof Error ? e.message : "Could not create the teammate." } };
  }

  const token = await createInviteToken(email.data, role);
  const url = await inviteUrl(token);
  // Email is best-effort: always return the link so the admin can copy/share it regardless.
  if (await emailConfigured()) {
    try {
      await sendEmail({ to: email.data, subject: "You're invited to the BDQ Social admin portal", html: staffInviteEmailHtml({ url, role }) });
    } catch { /* fall through — the returned url is the reliable path */ }
  }
  revalidatePath("/admin/ops/staff");
  return { ok: true, data: { url } };
}

/** Re-issue a pending teammate's invite link (and re-email it). Returns the link to copy/share. */
export async function resendInviteAction(formData: FormData): Promise<Result<{ url: string }>> {
  const session = await requireAdminRole();
  const info = await getStaffCredentialInfo(String(formData.get("id")));
  if (!info?.email) return { ok: false, error: { code: "NOT_FOUND", message: "Teammate not found." } };
  if (info.passwordHash) return { ok: false, error: { code: "ALREADY_ACTIVE", message: "This teammate already set up their account. Send a password reset instead." } };
  if (info.role === "SUPER_ADMIN") return { ok: false, error: { code: "FORBIDDEN", message: "Cannot manage Super Admin accounts." } };
  if (info.role === "ADMIN" && session.role !== "SUPER_ADMIN") return { ok: false, error: { code: "FORBIDDEN", message: "Only Super Admin can manage Admin accounts." } };

  const token = await createInviteToken(info.email, info.role === "ADMIN" ? "ADMIN" : "STAFF");
  const url = await inviteUrl(token);
  if (await emailConfigured()) {
    try {
      await sendEmail({ to: info.email, subject: "Your BDQ Social admin invite", html: staffInviteEmailHtml({ url, role: info.role }) });
    } catch { /* returned url is the reliable path */ }
  }
  return { ok: true, data: { url } };
}

/** Send an active teammate a password-reset link (and email it). Returns the link to copy/share. */
export async function sendResetLinkAction(formData: FormData): Promise<Result<{ url: string }>> {
  const session = await requireAdminRole();
  const info = await getStaffCredentialInfo(String(formData.get("id")));
  if (!info?.email) return { ok: false, error: { code: "NOT_FOUND", message: "Teammate not found." } };
  if (!info.passwordHash) return { ok: false, error: { code: "PENDING", message: "This teammate hasn't set up yet. Resend their invite instead." } };
  if (info.role === "SUPER_ADMIN") return { ok: false, error: { code: "FORBIDDEN", message: "Cannot manage Super Admin accounts." } };
  if (info.role === "ADMIN" && session.role !== "SUPER_ADMIN") return { ok: false, error: { code: "FORBIDDEN", message: "Only Super Admin can manage Admin accounts." } };

  const token = await createResetToken(info.email);
  const url = await resetUrl(token);
  if (await emailConfigured()) {
    try {
      await sendEmail({ to: info.email, subject: "Reset your BDQ Social admin password", html: staffResetEmailHtml({ url }) });
    } catch { /* returned url is the reliable path */ }
  }
  return { ok: true, data: { url } };
}

/** Change a teammate's exact permissions and (SUPER_ADMIN only) role. Audited + forces re-auth. */
export async function editStaffAccessAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    const id = String(formData.get("id"));
    const selected = formData.getAll("perm").map(String);
    const permissions = PERMISSION_KEYS.filter((p) => selected.includes(p)) as Permission[];
    const roleVal = formData.get("role");
    const role = roleVal === "STAFF" || roleVal === "ADMIN" ? roleVal : undefined;

    await setStaffPermissions(session, id, permissions, role);
    revalidatePath("/admin/ops/staff");
    revalidatePath(`/admin/ops/staff/${id}`);
  });
}

/**
 * Disables a staff member's credentials and revokes their active permissions.
 * The underlying database user is retained for audit trail consistency, but login credentials are cleared.
 * This action ensures ADMINs cannot disable other ADMINs or SUPER_ADMINs.
 *
 * @throws {Error} If the action exceeds the caller's authorization level.
 */
export async function removeStaffAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    await removeStaffAccess(session, String(formData.get("id")));
    revalidatePath("/admin/ops/staff");
  });
}

/** Permanently delete a teammate (hard delete). Blocked for accounts with financial/gate records. */
export async function deleteStaffAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    await hardDeleteStaff(session, String(formData.get("id")));
    revalidatePath("/admin/ops/staff");
  });
}

/** Sign a teammate out of all devices (revoke sessions) — keeps their access, audited. */
export async function signOutEverywhereAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    await revokeStaffSessions(session, String(formData.get("id")));
    revalidatePath("/admin/ops/staff");
  });
}
