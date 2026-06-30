import "server-only";
import { db } from "@/server/db";
import { tally } from "@/lib/analytics-buckets";

/**
 * Deep analytics modules (read-only). Money is integer paise. Pure helpers (heatmap, RFM) are
 * exported separately so they can be unit-tested without a database.
 */

const IST_OFFSET_MIN = 330; // render hour-of-day / weekday in Asia/Kolkata
const toIst = (d: Date) => new Date(d.getTime() + IST_OFFSET_MIN * 60_000);

// ── pure helpers ───────────────────────────────────────────────
export interface HeatCell { day: number; hour: number; count: number; revenue: number }

/** 7×24 grid (day 0 = Sunday) of order counts + revenue, bucketed in IST. */
export function buildHeatmap(orders: { createdAt: Date; total: number }[]): HeatCell[] {
  const grid = new Map<string, HeatCell>();
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) grid.set(`${d}:${h}`, { day: d, hour: h, count: 0, revenue: 0 });
  for (const o of orders) {
    const ist = toIst(o.createdAt);
    const cell = grid.get(`${ist.getUTCDay()}:${ist.getUTCHours()}`)!;
    cell.count += 1;
    cell.revenue += o.total;
  }
  return [...grid.values()];
}

export type RfmSegment = "Champions" | "Loyal" | "Promising" | "At risk" | "Hibernating";
export interface RfmCustomer { userId: string; recencyDays: number; frequency: number; monetary: number; segment: RfmSegment }

/** Simple RFM segmentation from per-customer recency (days)/frequency/monetary. */
export function segmentRfm(
  rows: { userId: string; recencyDays: number; frequency: number; monetary: number }[],
): RfmCustomer[] {
  return rows.map((r) => {
    let segment: RfmSegment;
    if (r.frequency >= 3 && r.recencyDays <= 60) segment = "Champions";
    else if (r.frequency >= 2 && r.recencyDays <= 120) segment = "Loyal";
    else if (r.frequency === 1 && r.recencyDays <= 60) segment = "Promising";
    else if (r.recencyDays > 180) segment = "Hibernating";
    else segment = "At risk";
    return { ...r, segment };
  });
}

// ── 1. Funnel + cohort ─────────────────────────────────────────
export async function getFunnelCohort(eventId?: string) {
  const orderWhere = eventId ? { eventId } : {};
  const [statusGroups, cohortOrders] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true } }),
    // cohort spans all events (repeat-across-events is the interesting signal)
    db.order.findMany({ where: { status: "PAID" }, select: { userId: true, eventId: true } }),
  ]);
  const counts = { PENDING: 0, PAID: 0, FAILED: 0, EXPIRED: 0 } as Record<string, number>;
  for (const g of statusGroups) counts[g.status] = g._count._all;
  const created = Object.values(counts).reduce((s, n) => s + n, 0);

  const byUser = new Map<string, Set<string>>();
  for (const o of cohortOrders) {
    const set = byUser.get(o.userId) ?? new Set<string>();
    set.add(o.eventId);
    byUser.set(o.userId, set);
  }
  const freq = new Map<string, number>();
  for (const o of cohortOrders) freq.set(o.userId, (freq.get(o.userId) ?? 0) + 1);
  const distinct = byUser.size;
  const repeatBuyers = [...freq.values()].filter((n) => n > 1).length;
  const multiEvent = [...byUser.values()].filter((s) => s.size > 1).length;

  return {
    funnel: { counts, created, conversion: created ? counts.PAID / created : 0, abandoned: counts.PENDING + counts.EXPIRED },
    cohort: { distinct, repeatBuyers, newBuyers: distinct - repeatBuyers, multiEvent },
  };
}

// ── 2. Heatmap + forecast ──────────────────────────────────────
export async function getSalesHeatmapForecast(eventId?: string) {
  const orderWhere = { status: "PAID" as const, ...(eventId ? { eventId } : {}) };
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const [orders, recentTickets, event] = await Promise.all([
    db.order.findMany({ where: orderWhere, select: { createdAt: true, total: true } }),
    db.ticket.aggregate({ _sum: { admitCount: true }, where: { isComp: false, createdAt: { gte: since }, ...(eventId ? { order: { eventId } } : {}) } }).then((a) => a._sum.admitCount ?? 0),
    eventId ? db.event.findUnique({ where: { id: eventId }, select: { capacity: true } }) : Promise.resolve(null),
    ]);
  const sold = (await db.ticket.aggregate({ _sum: { admitCount: true }, where: { isComp: false, ...(eventId ? { order: { eventId } } : {}) } }))._sum.admitCount ?? 0;
  const capacity = event?.capacity ?? null;
  const ratePerDay = recentTickets / 14;
  const remaining = capacity != null ? Math.max(0, capacity - sold) : null;
  const daysToSellout = remaining != null && ratePerDay > 0 ? Math.ceil(remaining / ratePerDay) : null;

  return {
    heatmap: buildHeatmap(orders),
    pacing: { sold, capacity, remaining, ratePerDay: Math.round(ratePerDay * 10) / 10, daysToSellout },
  };
}

// ── 3. Marketing ROI ───────────────────────────────────────────
export async function getMarketingRoi(eventId?: string) {
  const paidWhere = { status: "PAID" as const, ...(eventId ? { eventId } : {}) };
  const [paidOrders, couponGroups, coupons, marketingSpend, customers] = await Promise.all([
    db.order.findMany({ where: paidWhere, select: { utm: true, total: true } }),
    db.order.groupBy({ by: ["couponId"], where: { ...paidWhere, couponId: { not: null } }, _count: { _all: true }, _sum: { total: true, discount: true } }),
    db.coupon.findMany({ select: { id: true, code: true } }),
    db.expense.aggregate({ where: { category: "MARKETING", status: { in: ["APPROVED", "PAID"] }, ...(eventId ? { eventId } : {}) }, _sum: { amountPaise: true } }),
    db.order.findMany({ where: paidWhere, select: { userId: true }, distinct: ["userId"] }),
  ]);
  const codeById = new Map(coupons.map((c) => [c.id, c.code]));
  const bySource = tally(paidOrders, (o) => (o.utm as { source?: string } | null)?.source ?? "direct", (o) => o.total);
  const spend = marketingSpend._sum.amountPaise ?? 0;
  const cac = customers.length ? Math.round(spend / customers.length) : null;

  return {
    bySource: bySource.map((r) => ({ source: r.key, orders: r.count, revenue: r.sum })),
    marketingSpend: spend,
    customers: customers.length,
    cac,
    coupons: couponGroups
      .map((g) => ({
        code: codeById.get(g.couponId!) ?? g.couponId!,
        redemptions: g._count._all,
        revenue: g._sum.total ?? 0,
        discount: g._sum.discount ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

// ── 4. Per-type / stall margin ─────────────────────────────────
export async function getProductMargin(eventId?: string) {
  const [ticketTypes, bookings] = await Promise.all([
    db.ticketType.findMany({
      where: eventId ? { eventId } : {},
      select: { name: true, soldQty: true, totalQty: true, priceInPaise: true },
      orderBy: { priceInPaise: "desc" },
    }),
    db.booking.findMany({
      where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] }, ...(eventId ? { eventId } : {}) },
      select: { payment: { select: { amount: true } }, stall: { select: { stallType: { select: { name: true } } } } },
    }),
  ]);

  const stallByType = new Map<string, { revenue: number; count: number }>();
  for (const b of bookings) {
    const name = b.stall?.stallType?.name ?? "Other";
    const cur = stallByType.get(name) ?? { revenue: 0, count: 0 };
    cur.revenue += b.payment?.amount ?? 0;
    cur.count += 1;
    stallByType.set(name, cur);
  }

  return {
    ticketTypes: ticketTypes.map((t) => ({
      name: t.name,
      sold: t.soldQty,
      total: t.totalQty,
      pct: t.totalQty ? t.soldQty / t.totalQty : 0,
      revenue: t.soldQty * t.priceInPaise,
    })),
    stalls: [...stallByType.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
  };
}

// ── 5. No-show / check-in ──────────────────────────────────────
export async function getAttendance(eventId?: string) {
  const ticketWhere = eventId ? { order: { eventId } } : {};
  const [sold, checkedIn, gates] = await Promise.all([
    db.ticket.aggregate({ _sum: { admitCount: true }, where: { ...ticketWhere, isComp: false } }).then((a) => a._sum.admitCount ?? 0),
    db.checkIn.aggregate({ _sum: { admitted: true }, where: { direction: "IN", ticket: ticketWhere } }).then((a) => a._sum.admitted ?? 0),
    db.checkIn.groupBy({ by: ["gate"], where: { direction: "IN", ...(eventId ? { ticket: { order: { eventId } } } : {}) }, _sum: { admitted: true } }),
  ]);
  return {
    sold,
    checkedIn,
    noShow: Math.max(0, sold - checkedIn),
    noShowRate: sold ? Math.max(0, sold - checkedIn) / sold : 0,
    attendanceRate: sold ? checkedIn / sold : 0,
    gates: gates.map((g) => ({ gate: g.gate ?? "General Gate", count: g._sum.admitted ?? 0 })).sort((a, b) => b.count - a.count),
  };
}

// ── 6. Payment failure analysis ────────────────────────────────
export async function getPaymentFailures(eventId?: string) {
  const orderWhere = eventId ? { eventId } : {};
  const [groups, abandonedAgg, recent] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true } }),
    db.order.aggregate({ where: { ...orderWhere, status: { in: ["FAILED", "EXPIRED"] } }, _sum: { total: true }, _count: { _all: true } }),
    db.order.findMany({
      where: { ...orderWhere, status: { in: ["FAILED", "EXPIRED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, total: true, status: true, createdAt: true, user: { select: { phone: true, name: true } } },
    }),
  ]);
  const counts = { PENDING: 0, PAID: 0, FAILED: 0, EXPIRED: 0 } as Record<string, number>;
  for (const g of groups) counts[g.status] = g._count._all;
  const created = Object.values(counts).reduce((s, n) => s + n, 0);
  return {
    counts,
    created,
    failRate: created ? (counts.FAILED + counts.EXPIRED) / created : 0,
    abandonedValue: abandonedAgg._sum.total ?? 0,
    abandonedCount: abandonedAgg._count._all,
    recent,
  };
}

// ── 7. Vendor scorecard ────────────────────────────────────────
export async function getVendorScorecard(eventId?: string) {
  const bookings = await db.booking.findMany({
    where: eventId ? { eventId } : {},
    select: {
      eventId: true,
      status: true,
      createdAt: true,
      payment: { select: { amount: true, createdAt: true } },
      vendorProfile: { select: { id: true, brandName: true, contract: { select: { status: true } } } },
    },
  });
  const map = new Map<string, {
    vendor: string; events: Set<string>; stalls: number; paid: number; revenue: number;
    daysToPaySum: number; daysToPayN: number; contract: string;
  }>();
  for (const b of bookings) {
    const id = b.vendorProfile?.id ?? "—";
    const cur = map.get(id) ?? { vendor: b.vendorProfile?.brandName ?? "—", events: new Set(), stalls: 0, paid: 0, revenue: 0, daysToPaySum: 0, daysToPayN: 0, contract: b.vendorProfile?.contract?.status ?? "—" };
    cur.events.add(b.eventId);
    cur.stalls += 1;
    if (b.payment) {
      cur.paid += 1;
      cur.revenue += b.payment.amount;
      const days = (b.payment.createdAt.getTime() - b.createdAt.getTime()) / 86_400_000;
      cur.daysToPaySum += Math.max(0, days);
      cur.daysToPayN += 1;
    }
    map.set(id, cur);
  }
  return [...map.values()]
    .map((v) => ({
      vendor: v.vendor,
      stalls: v.stalls,
      paid: v.paid,
      revenue: v.revenue,
      repeatEvents: v.events.size,
      avgDaysToPay: v.daysToPayN ? Math.round((v.daysToPaySum / v.daysToPayN) * 10) / 10 : null,
      contract: v.contract,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ── 8. Customer LTV / RFM ──────────────────────────────────────
export async function getCustomerRfm() {
  const orders = await db.order.findMany({
    where: { status: "PAID" },
    select: { userId: true, total: true, createdAt: true },
  });
  const now = Date.now();
  const map = new Map<string, { monetary: number; frequency: number; last: number }>();
  for (const o of orders) {
    const cur = map.get(o.userId) ?? { monetary: 0, frequency: 0, last: 0 };
    cur.monetary += o.total;
    cur.frequency += 1;
    cur.last = Math.max(cur.last, o.createdAt.getTime());
    map.set(o.userId, cur);
  }
  const rows = [...map.entries()].map(([userId, v]) => ({
    userId,
    recencyDays: Math.floor((now - v.last) / 86_400_000),
    frequency: v.frequency,
    monetary: v.monetary,
  }));
  const segmented = segmentRfm(rows);
  const bySegment = tally(segmented, (r) => r.segment, (r) => r.monetary);
  const ltv = rows.length ? Math.round(rows.reduce((s, r) => s + r.monetary, 0) / rows.length) : 0;
  return {
    customers: rows.length,
    avgLtv: ltv,
    bySegment: bySegment.map((s) => ({ segment: s.key, count: s.count, revenue: s.sum })),
    top: segmented.sort((a, b) => b.monetary - a.monetary).slice(0, 10),
  };
}
