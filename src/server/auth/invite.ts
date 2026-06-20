import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Admin/staff invite tokens. A signed JWT (SESSION_SECRET) carrying the invitee's email + role, valid for
 * 72h. Single-use is enforced at the call site by accepting it only while the user's passwordHash is null
 * (setting a password kills the link). No DB row needed.
 */

const PURPOSE = "admin-invite";
const TTL = "72h";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return new TextEncoder().encode(s);
}

export async function createInviteToken(email: string, role: "STAFF" | "ADMIN"): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, email: email.toLowerCase(), role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret());
}

export async function readInviteToken(token: string): Promise<{ email: string; role: "STAFF" | "ADMIN" } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== PURPOSE) return null;
    const email = payload.email as string | undefined;
    const role = payload.role as "STAFF" | "ADMIN" | undefined;
    if (!email || (role !== "STAFF" && role !== "ADMIN")) return null;
    return { email, role };
  } catch {
    return null;
  }
}

/** Absolute /admin/invite link (uses APP_BASE_DOMAIN, like unsubscribeUrl). */
export function inviteUrl(token: string): string {
  const domain = process.env.APP_BASE_DOMAIN ?? "bdqsocial.com";
  const proto = domain.includes("localhost") ? "http" : "https";
  return `${proto}://${domain}/admin/invite/${token}`;
}
