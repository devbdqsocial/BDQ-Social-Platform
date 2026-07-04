import "server-only";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Admin/staff invite + password-reset tokens. Signed JWTs (SESSION_SECRET) carrying the target's
 * email (+ role for invites). Invites are valid 72h and single-use (accepted only while passwordHash
 * is null); resets are valid 1h and set a new password even when one exists. No DB row needed.
 */

const INVITE_PURPOSE = "admin-invite";
const INVITE_TTL = "72h";
const RESET_PURPOSE = "admin-reset";
const RESET_TTL = "1h";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return new TextEncoder().encode(s);
}

export async function createInviteToken(email: string, role: "STAFF" | "ADMIN"): Promise<string> {
  return new SignJWT({ purpose: INVITE_PURPOSE, email: email.toLowerCase(), role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(INVITE_TTL)
    .sign(secret());
}

export async function readInviteToken(token: string): Promise<{ email: string; role: "STAFF" | "ADMIN" } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== INVITE_PURPOSE) return null;
    const email = payload.email as string | undefined;
    const role = payload.role as "STAFF" | "ADMIN" | undefined;
    if (!email || (role !== "STAFF" && role !== "ADMIN")) return null;
    return { email, role };
  } catch {
    return null;
  }
}

export async function createResetToken(email: string): Promise<string> {
  return new SignJWT({ purpose: RESET_PURPOSE, email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(RESET_TTL)
    .sign(secret());
}

export async function readResetToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== RESET_PURPOSE) return null;
    const email = payload.email as string | undefined;
    return email ? { email } : null;
  } catch {
    return null;
  }
}

/**
 * Absolute URL for the current deployment. Prefers the real request host (so localhost keeps its
 * port and prod uses the deployed domain) and only falls back to APP_BASE_DOMAIN when no request is
 * in scope. This is why invite/reset links resolve correctly instead of pointing at a portless host.
 */
export async function absoluteUrl(path: string): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}${path}`;
    }
  } catch {
    // no request scope (e.g. a job) — fall through to the configured domain
  }
  const domain = process.env.APP_BASE_DOMAIN ?? "bdqsocial.com";
  const proto = domain.includes("localhost") ? "http" : "https";
  return `${proto}://${domain}${path}`;
}

/** Absolute /admin/invite link for the running host. */
export function inviteUrl(token: string): Promise<string> {
  return absoluteUrl(`/admin/invite/${token}`);
}

/** Absolute /admin/reset link for the running host. */
export function resetUrl(token: string): Promise<string> {
  return absoluteUrl(`/admin/reset/${token}`);
}
