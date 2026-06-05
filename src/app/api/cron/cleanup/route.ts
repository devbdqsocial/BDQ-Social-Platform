import { NextResponse } from "next/server";
import { pruneStaleRows } from "@/server/cron/tasks";
import { isCronAuthed } from "@/lib/cron-auth";

export const runtime = "nodejs";

/** Prune stale RateLimit/Outbox rows (see pruneStaleRows). Manual/targeted invocation. */
async function handle(req: Request) {
  if (!isCronAuthed(req)) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  return NextResponse.json({ ok: true, data: await pruneStaleRows() });
}

export const GET = handle;
export const POST = handle;
