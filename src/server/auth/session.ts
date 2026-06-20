import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/server/db";
import type { Permission, Role, Session } from "./guard";

/** App session = a jose-signed httpOnly cookie (SESSION_SECRET). The app is the session authority. */

const COOKIE = "bdq_session";
/** Short-lived cookie that proves a password check passed but 2FA isn't set up yet — grants only the setup flow. */
const SETUP_COOKIE = "bdq_setup";
const SETUP_TTL = 60 * 10; // 10 minutes
const DAY = 60 * 60 * 24;
/** Shorter window for privileged accounts; customers keep the 7-day session (BUSINESS-RULES §6). */
const ttlSeconds = (role: Role) =>
  role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF" ? 60 * 60 * 12 : 7 * DAY;
/** Roles whose token is re-checked against the DB `tokenVersion` on every read (instant revocation). */
const isPrivileged = (role: Role) =>
  role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF" || role === "VENDOR";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return new TextEncoder().encode(s);
}

async function tokenVersionOf(userId: string): Promise<number> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } });
  return u?.tokenVersion ?? 0;
}

export async function createSession(session: Session): Promise<void> {
  const maxAge = ttlSeconds(session.role);
  const tv = await tokenVersionOf(session.userId);
  const token = await new SignJWT({ role: session.role, permissions: session.permissions, tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = payload.sub as string;
    const role = payload.role as Role;
    // Privileged sessions are revocable: a tokenVersion bump (role/permission change, ban, logout)
    // instantly invalidates outstanding tokens. Fail closed if the check can't run.
    if (isPrivileged(role)) {
      const current = await tokenVersionOf(userId);
      if (current !== ((payload.tv as number | undefined) ?? 0)) return null;
    }
    return { userId, role, permissions: (payload.permissions as Permission[]) ?? [] };
  } catch {
    return null;
  }
}

/** Invalidate all outstanding sessions for a user (role/permission change, ban, logout). */
export async function revokeSessions(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * 2FA-setup ticket: issued when an admin's password is correct but they have no 2FA yet (invite/first
 * login). It is NOT a session — it only authorises the enrolment flow at /admin/setup-2fa.
 */
export async function createSetupCookie(userId: string): Promise<void> {
  const token = await new SignJWT({ purpose: "setup" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SETUP_TTL}s`)
    .sign(secret());
  (await cookies()).set(SETUP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SETUP_TTL,
  });
}

export async function readSetupUserId(): Promise<string | null> {
  const token = (await cookies()).get(SETUP_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "setup") return null;
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function clearSetupCookie(): Promise<void> {
  (await cookies()).delete(SETUP_COOKIE);
}
