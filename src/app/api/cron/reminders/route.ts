import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { processOutbox } from "@/server/notifications/outbox";

export const runtime = "nodejs";

/**
 * Event-day reminders: for events starting within 24h, enqueue one reminder email per paid customer
 * (deduped via the Outbox), then drain. Triggered by Vercel Cron.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed =
    !!secret &&
    (req.headers.get("authorization") === `Bearer ${secret}` || req.headers.get("x-cron-key") === secret);
  if (!authed) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });

  const now = new Date();
  const within = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await db.event.findMany({
    where: { status: { in: ["PUBLISHED", "LIVE"] }, startsAt: { gte: now, lte: within } },
    select: { id: true },
  });

  let enqueued = 0;
  for (const ev of events) {
    const buyers = await db.order.findMany({
      where: { eventId: ev.id, status: "PAID", user: { email: { not: null } } },
      select: { userId: true, user: { select: { email: true } } },
      distinct: ["userId"],
    });
    for (const b of buyers) {
      if (!b.user?.email) continue;
      await db.outbox.upsert({
        where: { dedupeKey: `reminder:${ev.id}:${b.userId}` },
        update: {},
        create: { channel: "EMAIL", toAddress: b.user.email, template: "reminder", payload: { eventId: ev.id }, dedupeKey: `reminder:${ev.id}:${b.userId}` },
      });
      enqueued++;
    }
  }

  const result = await processOutbox(100);
  return NextResponse.json({ ok: true, data: { events: events.length, enqueued, ...result } });
}

export const GET = handle;
export const POST = handle;
