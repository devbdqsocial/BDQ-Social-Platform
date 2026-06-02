import { NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/server/bookings/service";

export const runtime = "nodejs";

/**
 * Sweeps expired stall holds back to AVAILABLE. Triggered by Vercel Cron (GET, see vercel.json),
 * which sends `Authorization: Bearer $CRON_SECRET`. Also accepts `x-cron-key` for manual/local runs.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed =
    !!secret &&
    (req.headers.get("authorization") === `Bearer ${secret}` ||
      req.headers.get("x-cron-key") === secret);
  if (!authed) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  const released = await releaseExpiredHolds();
  return NextResponse.json({ ok: true, data: { released } });
}

export const GET = handle;
export const POST = handle;
