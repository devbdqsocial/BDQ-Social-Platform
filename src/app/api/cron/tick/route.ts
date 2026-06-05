import { NextResponse } from "next/server";
import { runAllMaintenance } from "@/server/cron/tasks";
import { isCronAuthed } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Consolidated maintenance run — the single Vercel cron (Hobby allows ≤2 jobs, daily only). Runs
 * reconcile + release-holds + notify-retry + reminders + cleanup, each idempotent, so an external
 * scheduler may also call this more frequently for sub-daily coverage.
 */
async function handle(req: Request) {
  if (!isCronAuthed(req)) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  return NextResponse.json({ ok: true, data: await runAllMaintenance() });
}

export const GET = handle;
export const POST = handle;
