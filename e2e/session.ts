import { SignJWT } from "jose";
import type { BrowserContext } from "@playwright/test";

/** Mint a `bdq_session` cookie (mirrors src/server/auth/session.ts) to sign in without Firebase. */
export async function signIn(
  context: BrowserContext,
  userId: string,
  role: string,
  permissions: string[] = [],
): Promise<void> {
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
  const token = await new SignJWT({ role, permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  await context.addCookies([
    { name: "bdq_session", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
  ]);
}
