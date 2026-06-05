import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword } from "@/lib/password";
import { verifyCode } from "@/lib/totp";
import { createSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().trim().optional(),
});

const FAIL = NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });

/** Admin/staff sign-in: email + password + TOTP. Generic failures (no user enumeration). */
export async function POST(req: Request) {
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
    // SUPER_ADMIN and ADMIN must have 2FA; any user with it enabled must pass it.
    if ((user.role === "SUPER_ADMIN" || user.role === "ADMIN") && !user.totpEnabled) return FAIL;
    if (user.totpEnabled) {
      if (!body.code || !user.totpSecret || !verifyCode(body.code, user.totpSecret)) return FAIL;
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
