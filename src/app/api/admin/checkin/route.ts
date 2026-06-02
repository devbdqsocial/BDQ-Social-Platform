import { NextResponse } from "next/server";
import { AuthError, requireCheckin } from "@/server/auth/guard";
import { checkinSchema } from "@/server/schemas";
import { checkInByToken } from "@/server/checkin/service";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // generous — legit gate scanning is high-volume
  const limited = await enforceRateLimit(req, "checkin", 600, 10 * 60 * 1000);
  if (limited) return limited;

  let session;
  try {
    session = await requireCheckin();
  } catch (e) {
    const code = e instanceof AuthError ? e.code : "FORBIDDEN";
    return NextResponse.json({ ok: false, error: { code } }, { status: code === "UNAUTHENTICATED" ? 401 : 403 });
  }

  let body;
  try {
    body = checkinSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 422 });
  }

  const data = await checkInByToken(session.userId, body.qrToken, body.gate, body.clientScanId);
  return NextResponse.json({ ok: true, data });
}
