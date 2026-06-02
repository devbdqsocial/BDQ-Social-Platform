import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Permission, Role, Session } from "./guard";

/** App session = a jose-signed httpOnly cookie (SESSION_SECRET). The app is the session authority. */

const COOKIE = "bdq_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days (BUSINESS-RULES §6)

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return new TextEncoder().encode(s);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ role: session.role, permissions: session.permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.sub as string,
      role: payload.role as Role,
      permissions: (payload.permissions as Permission[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
