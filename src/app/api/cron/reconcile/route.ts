import { NextResponse } from "next/server";
import { reconcilePendingPayments, reconcileVendorPayments } from "@/server/cron/tasks";
import { isCronAuthed } from "@/lib/cron-auth";

export const runtime = "nodejs";

/** Safety net for missed webhooks — tickets + vendor (stall/add-on) money paths. Manual/targeted. */
async function handle(req: Request) {
  if (!isCronAuthed(req)) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  const [tickets, vendor] = await Promise.all([reconcilePendingPayments(), reconcileVendorPayments()]);
  return NextResponse.json({ ok: true, data: { tickets, vendor } });
}

export const GET = handle;
export const POST = handle;
