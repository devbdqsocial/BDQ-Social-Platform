import { NextResponse } from "next/server";
import { getHappeningStrip } from "@/server/content/happening";

export const runtime = "nodejs";

/** Lightweight strip feed for the 60s live refresh (R6.3). Short CDN cache — time-sensitive. */
export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const items = await getHappeningStrip(eventId);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } });
}
