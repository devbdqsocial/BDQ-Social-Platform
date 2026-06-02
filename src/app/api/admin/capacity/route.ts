import { NextResponse } from "next/server";
import { requireCheckin } from "@/server/auth/guard";
import { capacitySnapshot } from "@/server/checkin/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireCheckin();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 400 });

  const data = await capacitySnapshot(eventId);
  return NextResponse.json({ ok: true, data });
}
