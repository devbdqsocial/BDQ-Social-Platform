import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCheckin } from "@/server/auth/guard";
import { capacitySnapshot } from "@/server/checkin/service";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "capacity", 60, 10 * 60 * 1000);
  if (limited) return limited;

  try {
    await requireCheckin();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const parsed = z.string().cuid().safeParse(new URL(req.url).searchParams.get("eventId"));
  if (!parsed.success) return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 400 });

  const data = await capacitySnapshot(parsed.data);
  return NextResponse.json({ ok: true, data });
}
