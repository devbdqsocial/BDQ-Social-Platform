import { rejectCrossOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword } from "@/lib/password";
import { verifyCode } from "@/lib/totp";
import { consumeBackupCode } from "@/lib/backup-codes";
import { createSession, createSetupCookie } from "@/server/auth/session";
import { enforceRateLimit } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().trim().optional(),
  backupCode: z.string().trim().optional(),
});

const FAIL = NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
// Password is correct but this admin has no 2FA yet — the client redirects to /admin/setup-2fa to enroll.
const SETUP = NextResponse.json({ ok: false, error: { code: "SETUP_2FA" } }, { status: 401 });

/** Admin/staff sign-in: email + password + TOTP. Generic failures (no user enumeration). */
export async function POST(req: Request) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const limited = await enforceRateLimit(req, "admin-auth", 10, 10 * 60 * 1000);
  if (limited) return limited;

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 422 });
  }

  const email = body.email.toLowerCase();
  // Bound brute-force per account (not just per IP), defeating IP rotation against one admin.
  const limitedEmail = await enforceRateLimit(req, "admin-auth", 5, 10 * 60 * 1000, email);
  if (limitedEmail) return limitedEmail;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return FAIL;
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "STAFF") return FAIL;
  if (!(await verifyPassword(body.password, user.passwordHash))) return FAIL;

  // TESTING EXCEPTION: emails in ADMIN_NO_2FA_EMAILS sign in with password only (no TOTP).
  // Keep this list empty / remove the account before public launch.
  const exempt =
    process.env.NODE_ENV === "development" &&
    (process.env.ADMIN_NO_2FA_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .includes(email);

  if (!exempt) {
    // Admins/super-admins without 2FA aren't rejected — they're issued a setup ticket and sent to enroll
    // (covers invited accounts and first login). Password was already verified above.
    if ((user.role === "SUPER_ADMIN" || user.role === "ADMIN") && !user.totpEnabled) {
      await createSetupCookie(user.id);
      return SETUP;
    }
    if (user.totpEnabled) {
      let passed = false;
      if (body.backupCode) {
        // Recovery path: a one-time backup code, consumed (removed) on success.
        const remaining = consumeBackupCode(user.recoveryCodes, body.backupCode);
        if (remaining) {
          await db.user.update({ where: { id: user.id }, data: { recoveryCodes: remaining } });
          passed = true;
        }
      } else if (body.code && user.totpSecret && verifyCode(body.code, user.totpSecret)) {
        passed = true;
      }
      if (!passed) return FAIL;
    }
  }

  await createSession({ userId: user.id, role: user.role, permissions: user.permissions });

  try {
    await db.auditLog.create({
      data: {
        actorId: user.id,
        role: user.role,
        action: "admin.login",
        entity: "User",
        entityId: user.id,
        ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch (e) {
    // audit is best-effort; never block sign-in — but never let an admin login go fully unrecorded.
    logError("auth.admin.audit", e, { actorId: user.id });
  }

  return NextResponse.json({ ok: true, data: { userId: user.id, role: user.role } });
}
