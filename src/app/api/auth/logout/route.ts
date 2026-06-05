import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { clearSession, revokeSessions } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST() {
  // For privileged accounts, bump tokenVersion so logout invalidates every device, not just this cookie.
  const session = await getSession();
  if (session && session.role !== "CUSTOMER") {
    try {
      await revokeSessions(session.userId);
    } catch {
      // never block logout on a revocation write failure
    }
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
