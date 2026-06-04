import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";

/**
 * Prunes stale rows to prevent unbounded table growth:
 * - RateLimit rows whose window has long expired (> 1 day past resetAt)
 * - Outbox SENT rows older than 30 days
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

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [rateLimitResult, outboxResult] = await Promise.all([
    db.rateLimit.deleteMany({ where: { resetAt: { lt: oneDayAgo } } }),
    db.outbox.deleteMany({ where: { status: "SENT", createdAt: { lt: thirtyDaysAgo } } }),
  ]);

  return NextResponse.json({
    ok: true,
    data: { rateLimitPruned: rateLimitResult.count, outboxPruned: outboxResult.count },
  });
}

export const GET = handle;
export const POST = handle;
