import { rejectCrossOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { releaseStall } from "@/server/bookings/service";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const limited = await enforceRateLimit(req, "release", 30, 10 * 60 * 1000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  const { id } = await params;
  await releaseStall(session.userId, id);
  return NextResponse.json({ ok: true });
}
