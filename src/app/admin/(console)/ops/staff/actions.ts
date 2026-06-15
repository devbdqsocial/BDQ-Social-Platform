"use server";

import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/result";
import { toResult } from "@/server/action";
import { requireAdminRole } from "@/server/auth/guard";
import { upsertStaff, removeStaffAccess, revokeStaffSessions, StaffEmailTakenError } from "@/server/staff/service";
import { isStaffPreset, type StaffPreset } from "@/lib/staff-presets";

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
  const email = String(formData.get("email") || "").trim();
  const preset = String(formData.get("preset") || "");
  const name = String(formData.get("name") || "").trim() || undefined;
  const password = String(formData.get("password") || "") || undefined;

  const isAdminPreset = preset === "ADMIN";
  if (!email || (!isAdminPreset && !isStaffPreset(preset))) {
    throw new Error("Enter an email and pick a role.");
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

/** Sign a teammate out of all devices (revoke sessions) — keeps their access, audited. */
export async function signOutEverywhereAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    await revokeStaffSessions(session, String(formData.get("id")));
    revalidatePath("/admin/ops/staff");
  });
}

