import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { holdStall, StallUnavailableError } from "@/server/bookings/service";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(req, "hold", 30, 10 * 60 * 1000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = await holdStall(session.userId, id);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    if (e instanceof StallUnavailableError) {
      return NextResponse.json({ ok: false, error: { code: "STALL_UNAVAILABLE" } }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: { code: "INTERNAL" } }, { status: 500 });
  }
}
