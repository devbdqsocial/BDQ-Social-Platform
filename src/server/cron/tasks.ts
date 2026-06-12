import "server-only";
import { db } from "@/server/db";
import { fetchCapturedPayment } from "@/lib/razorpay";
import { fulfillOrder } from "@/server/tickets/service";
import { releaseExpiredHolds } from "@/server/bookings/service";
import { processOutbox } from "@/server/notifications/outbox";
import { materializeDueExpenseSchedules } from "@/server/finance/expenses";
import { getEventPnl } from "@/server/finance/pnl";
import { notify } from "@/server/notifications/admin";
import { formatPaise } from "@/lib/utils";
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
        await fulfillOrder(o.gatewayOrderId!, cap.id, { feePaise: cap.feePaise, taxPaise: cap.taxPaise });
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

/**
 * Weekly finance digest: pick the most relevant event (LIVE, else latest), post an in-app summary
 * and enqueue a P&L email to every admin. Weekly dedupe key keeps the daily cron from re-sending.
 */
export async function sendFinanceDigest() {
  const event =
    (await db.event.findFirst({ where: { status: "LIVE" }, orderBy: { startsAt: "desc" }, select: { id: true, name: true } })) ??
    (await db.event.findFirst({ orderBy: { startsAt: "desc" }, select: { id: true, name: true } }));
  if (!event) return { event: null };

  const pnl = await getEventPnl(event.id);
  await notify({
    type: "FINANCE_DIGEST",
    title: `Finance digest — ${event.name}`,
    body: `Net profit ${formatPaise(pnl.netProfit)} · margin ${(pnl.marginPct * 100).toFixed(1)}%`,
    href: "/admin/finance/pnl",
    eventId: event.id,
  });

  const admins = await db.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, email: { not: null } },
    select: { id: true, email: true },
  });
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  let enqueued = 0;
  for (const a of admins) {
    await db.outbox.upsert({
      where: { dedupeKey: `findigest:${event.id}:${a.id}:${week}` },
      update: {},
      create: { channel: "EMAIL", toAddress: a.email!, template: "finance-digest", payload: { eventId: event.id }, dedupeKey: `findigest:${event.id}:${a.id}:${week}` },
    });
    enqueued++;
  }
  const result = await processOutbox(50);
  return { event: event.id, admins: admins.length, enqueued, ...result };
}

/** Prune stale rows: expired RateLimit windows (>1d), SENT Outbox rows (>30d), and Notifications (>14d). */
export async function pruneStaleRows() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [rateLimitResult, outboxResult, notificationResult] = await Promise.all([
    db.rateLimit.deleteMany({ where: { resetAt: { lt: oneDayAgo } } }),
    db.outbox.deleteMany({ where: { status: "SENT", createdAt: { lt: thirtyDaysAgo } } }),
    db.notification.deleteMany({ where: { createdAt: { lt: fourteenDaysAgo } } }),
  ]);
  return { 
    rateLimitPruned: rateLimitResult.count, 
    outboxPruned: outboxResult.count,
    notificationsPruned: notificationResult.count
  };
}

/** Run every maintenance task; one failing task never aborts the others. */
export async function runAllMaintenance(): Promise<Record<string, unknown>> {
  const tasks: Record<string, () => Promise<unknown>> = {
    reconcile: reconcilePendingPayments,
    releaseHolds: async () => ({ released: await releaseExpiredHolds() }),
    notifyRetry: async () => processOutbox(50),
    reminders: sendEventReminders,
    recurringExpenses: async () => ({ created: await materializeDueExpenseSchedules() }),
    financeDigest: sendFinanceDigest,
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
