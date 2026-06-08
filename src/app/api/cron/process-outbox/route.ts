import { NextResponse } from "next/server";
import { processOutbox } from "@/server/notifications/outbox";
import { isCronAuthed } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Drains the unified outbox (tickets, reminders, finance digests, campaigns). Cron-authed. */
async function handle(req: Request) {
  if (!isCronAuthed(req)) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  try {
    const result = await processOutbox(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("Cron Error: process-outbox", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Cron job failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
