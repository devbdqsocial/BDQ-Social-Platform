"use server";

import QRCode from "qrcode";
import { db } from "@/server/db";
import { generateSecret, otpauthUrl, verifyCode } from "@/lib/totp";
import { generateBackupCodes } from "@/lib/backup-codes";
import { readSetupUserId, createSession, clearSetupCookie } from "@/server/auth/session";

/** First-login / post-invite 2FA setup, authorised by the short-lived `bdq_setup` cookie (not a session). */

async function setupUser() {
  const userId = await readSetupUserId();
  if (!userId) throw new Error("Your setup link expired. Sign in again.");
  return userId;
}

export async function startSetup(): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const userId = await setupUser();
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new Error("Account not found.");
  const secret = generateSecret();
  await db.user.update({ where: { id: userId }, data: { totpPendingSecret: secret } });
  const url = otpauthUrl(user.email ?? userId, secret);
  return { secret, otpauthUrl: url, qrDataUrl: await QRCode.toDataURL(url) };
}

export async function confirmSetup(code: string): Promise<{ backupCodes: string[] }> {
  const userId = await setupUser();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpPendingSecret: true, role: true, permissions: true },
  });
  if (!user?.totpPendingSecret) throw new Error("Start setup again — no pending authenticator.");
  if (!verifyCode(code.trim(), user.totpPendingSecret)) {
    throw new Error("That code didn't match. Enter the current 6-digit code from your app.");
  }
  const { plain, hashes } = generateBackupCodes();
  await db.user.update({
    where: { id: userId },
    data: { totpSecret: user.totpPendingSecret, totpEnabled: true, totpPendingSecret: null, recoveryCodes: hashes },
  });
  // Now grant the real session and drop the setup ticket.
  await createSession({ userId, role: user.role, permissions: user.permissions });
  await clearSetupCookie();
  return { backupCodes: plain };
}
