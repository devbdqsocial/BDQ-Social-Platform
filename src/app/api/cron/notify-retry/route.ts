import { NextResponse } from "next/server";
import { processOutbox } from "@/server/notifications/outbox";
import { isCronAuthed } from "@/lib/cron-auth";

export const runtime = "nodejs";

/**
 * Drains the notification Outbox (retries failed/queued sends). Triggered by Vercel Cron (GET, see
 * vercel.json) with `Authorization: Bearer $CRON_SECRET`. Also accepts `x-cron-key` for manual runs.
 */
async function handle(req: Request) {
  if (!isCronAuthed(req)) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  const result = await processOutbox(50);
  return NextResponse.json({ ok: true, data: result });
}

export const GET = handle;
export const POST = handle;
