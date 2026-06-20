"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import { generateSecret, otpauthUrl, verifyCode } from "@/lib/totp";
import { generateBackupCodes } from "@/lib/backup-codes";
import { logError } from "@/lib/logger";
import type { Role } from "@/server/auth/guard";

/**
 * Self-service 2FA for admins/staff. Replaces the CLI-only enrolment so credentials never depend on
 * running a script against the right database. Verify-before-enable: a secret is only activated once the
 * user proves a current code, so they can't lock themselves out. Recovery (backup) codes are issued on
 * enable for lockout recovery — see src/lib/backup-codes.ts.
 */

async function audit(actorId: string, role: Role, action: string) {
  try {
    await db.auditLog.create({ data: { actorId, role, action, entity: "User", entityId: actorId } });
  } catch (e) {
    logError("profile.security.audit", e, { actorId, action });
  }
}

/** Begin enrolment: mint a secret, stash it as pending, and return a QR + manual key for the app. */
export async function startTotpEnrollment(): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in.");
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  if (!user) throw new Error("Account not found.");

  const secret = generateSecret();
  await db.user.update({ where: { id: session.userId }, data: { totpPendingSecret: secret } });

  const url = otpauthUrl(user.email ?? session.userId, secret);
  const qrDataUrl = await QRCode.toDataURL(url);
  return { secret, otpauthUrl: url, qrDataUrl };
}

/** Finish enrolment: verify a current code against the pending secret, enable 2FA, issue backup codes. */
export async function confirmTotpEnrollment(code: string): Promise<{ backupCodes: string[] }> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in.");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { totpPendingSecret: true },
  });
  if (!user?.totpPendingSecret) throw new Error("Start setup again — no pending authenticator.");
  if (!verifyCode(code.trim(), user.totpPendingSecret)) {
    throw new Error("That code didn't match. Enter the current 6-digit code from your app.");
  }

  const { plain, hashes } = generateBackupCodes();
  await db.user.update({
    where: { id: session.userId },
    data: {
      totpSecret: user.totpPendingSecret,
      totpEnabled: true,
      totpPendingSecret: null,
      recoveryCodes: hashes,
    },
  });
  await audit(session.userId, session.role, "admin.totp.enable");
  revalidatePath("/admin/profile");
  return { backupCodes: plain };
}

/** Replace backup codes (e.g. after using some). Returns the new plaintext set, shown once. */
export async function regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in.");
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { totpEnabled: true } });
  if (!user?.totpEnabled) throw new Error("Enable two-factor first.");

  const { plain, hashes } = generateBackupCodes();
  await db.user.update({ where: { id: session.userId }, data: { recoveryCodes: hashes } });
  await audit(session.userId, session.role, "admin.totp.codes");
  return { backupCodes: plain };
}

/** Turn off 2FA. STAFF only — SUPER_ADMIN/ADMIN must keep it (enforced by the login route); they re-enroll instead. */
export async function disableTotp(): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in.");
  if (session.role !== "STAFF") {
    throw new Error("Admin accounts must keep 2FA on. Use “Reset authenticator” to re-enroll a new device.");
  }
  await db.user.update({
    where: { id: session.userId },
    data: { totpEnabled: false, totpSecret: null, totpPendingSecret: null, recoveryCodes: [] },
  });
  await audit(session.userId, session.role, "admin.totp.disable");
  revalidatePath("/admin/profile");
}
