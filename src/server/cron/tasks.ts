import "server-only";
import { db } from "@/server/db";
import { fetchCapturedPayment } from "@/lib/razorpay";
import { fulfillOrder } from "@/server/tickets/service";
import { releaseExpiredHolds } from "@/server/bookings/service";
import { processOutbox } from "@/server/notifications/outbox";
import { logError } from "@/lib/logger";

/**
 * Scheduled maintenance tasks, extracted so individual cron routes AND the consolidated `/api/cron/tick`
 * (one daily Vercel cron — Hobby allows ≤2 daily) share one implementation. All tasks are idempotent,
 * so an external scheduler (e.g. cron-job.org / GitHub Actions) may hit `tick` more frequently.
 */

/** Safety net for missed webhooks: fulfil captured-but-unfulfilled PENDING orders; expire the rest. */
export async function reconcilePendingPayments() {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000); // give webhooks ~2 min first
  const pending = await db.order.findMany({
    where: { status: "PENDING", gatewayOrderId: { not: null }, createdAt: { lt: cutoff } },
    select: { id: true, gatewayOrderId: true, expiresAt: true },
    take: 100,
  });
  let fulfilled = 0;
  let expired = 0;
  const now = new Date();
  for (const o of pending) {
    try {
      const cap = await fetchCapturedPayment(o.gatewayOrderId!);
      if (cap) {
        await fulfillOrder(o.gatewayOrderId!, cap.id);
        fulfilled++;
        continue;
      }
    } catch {
      // Razorpay unconfigured or transient error → leave for the next sweep
    }
    if (o.expiresAt && o.expiresAt < now) {
      await db.order.update({ where: { id: o.id }, data: { status: "EXPIRED" } });
      expired++;
    }
  }
  return { scanned: pending.length, fulfilled, expired };
}

/** Event-day reminders: enqueue one email per paid customer for events within 24h, then drain. */
export async function sendEventReminders() {
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
  return { events: events.length, enqueued, ...result };
}

/** Prune stale rows: expired RateLimit windows (>1d) and SENT Outbox rows (>30d). */
export async function pruneStaleRows() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [rateLimitResult, outboxResult] = await Promise.all([
    db.rateLimit.deleteMany({ where: { resetAt: { lt: oneDayAgo } } }),
    db.outbox.deleteMany({ where: { status: "SENT", createdAt: { lt: thirtyDaysAgo } } }),
  ]);
  return { rateLimitPruned: rateLimitResult.count, outboxPruned: outboxResult.count };
}

/** Run every maintenance task; one failing task never aborts the others. */
export async function runAllMaintenance(): Promise<Record<string, unknown>> {
  const tasks: Record<string, () => Promise<unknown>> = {
    reconcile: reconcilePendingPayments,
    releaseHolds: async () => ({ released: await releaseExpiredHolds() }),
    notifyRetry: async () => processOutbox(50),
    reminders: sendEventReminders,
    cleanup: pruneStaleRows,
  };
  const out: Record<string, unknown> = {};
  for (const [name, fn] of Object.entries(tasks)) {
    try {
      out[name] = await fn();
    } catch (e) {
      logError(`cron.tick.${name}`, e);
      out[name] = { error: true };
    }
  }
  return out;
}
