"use server";

import QRCode from "qrcode";
import { db } from "@/server/db";
import { hashPassword } from "@/lib/password";
import { generateSecret, otpauthUrl, verifyCode } from "@/lib/totp";
import { generateBackupCodes } from "@/lib/backup-codes";
import { createSession } from "@/server/auth/session";
import { readInviteToken } from "@/server/auth/invite";

/** Invite acceptance: set your own password, then enroll 2FA. Token is single-use while passwordHash is null. */

async function userFromToken(token: string) {
  const data = await readInviteToken(token);
  if (!data?.email) throw new Error("This invite link is invalid or has expired.");
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user) throw new Error("This invite is no longer valid.");
  return user;
}

export async function setInvitePassword(token: string, password: string): Promise<void> {
  const user = await userFromToken(token);
  if (user.passwordHash) throw new Error("This invite was already used. Please sign in instead.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
}

export async function startInviteEnrollment(token: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const user = await userFromToken(token);
  const secret = generateSecret();
  await db.user.update({ where: { id: user.id }, data: { totpPendingSecret: secret } });
  const url = otpauthUrl(user.email ?? user.id, secret);
  return { secret, otpauthUrl: url, qrDataUrl: await QRCode.toDataURL(url) };
}

export async function confirmInviteEnrollment(token: string, code: string): Promise<{ backupCodes: string[] }> {
  const user = await userFromToken(token);
  if (!user.totpPendingSecret) throw new Error("Start setup again — no pending authenticator.");
  if (!verifyCode(code.trim(), user.totpPendingSecret)) {
    throw new Error("That code didn't match. Enter the current 6-digit code from your app.");
  }
  const { plain, hashes } = generateBackupCodes();
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: user.totpPendingSecret, totpEnabled: true, totpPendingSecret: null, recoveryCodes: hashes },
  });
  await createSession({ userId: user.id, role: user.role, permissions: user.permissions });
  return { backupCodes: plain };
}
