import "server-only";
import { db } from "@/server/db";
import { getAnalytics } from "./service";

/** Command-center dashboard = the analytics aggregate + dashboard-only extras + a windowed KPI strip. */

export async function getDashboard(eventId?: string, rangeDays: number | null = 30) {
  const nowMs = Date.now();
  const rangeSince = rangeDays != null ? new Date(nowMs - rangeDays * 86400000) : null;
  const since = new Date(); since.setDate(since.getDate() - 29);
  const prevSince = new Date(); prevSince.setDate(prevSince.getDate() - 59);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const soon = new Date(nowMs + 60 * 60 * 1000);

  const ev = eventId ? { eventId } : {};
  const checkInEv = eventId ? { ticket: { order: { eventId } } } : {};
  const ticketEv = eventId ? { order: { eventId } } : {};
  const rangePaid = { ...ev, status: "PAID" as const, ...(rangeSince ? { createdAt: { gte: rangeSince } } : {}) };

  const [analytics, vendorGroups, footfallToday, prevRevenueAgg, expiringHolds, failedPayments, rangeRevenueAgg, rangeTickets, rangeFootfall] = await Promise.all([
    getAnalytics(eventId),
    db.vendorProfile.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    db.checkIn.count({ where: { direction: "IN", scannedAt: { gte: startToday }, ...checkInEv } }),
    db.order.aggregate({ where: { ...ev, status: "PAID", createdAt: { gte: prevSince, lt: since } }, _sum: { total: true } }),
    db.stall.count({ where: { status: "HELD", holdUntil: { lte: soon }, ...ev } }),
    db.order.count({ where: { ...ev, status: "FAILED", createdAt: { gte: since } } }),
    db.order.aggregate({ where: rangePaid, _sum: { total: true }, _count: { _all: true } }),
    db.ticket.aggregate({ _sum: { admitCount: true }, where: { ...ticketEv, ...(rangeSince ? { createdAt: { gte: rangeSince } } : {}) } }).then((a) => a._sum.admitCount ?? 0),
    db.checkIn.aggregate({ _sum: { admitted: true }, where: { direction: "IN", ...checkInEv, ...(rangeSince ? { scannedAt: { gte: rangeSince } } : {}) } }).then((a) => a._sum.admitted ?? 0),
  ]);

  const vendorPipeline = { SUBMITTED: 0, UNDER_REVIEW: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>;
  for (const g of vendorGroups) vendorPipeline[g.approvalStatus] = g._count._all;

  const revenue30d = analytics.trend.reduce((s, b) => s + b.revenue, 0);
  const prevRevenue = prevRevenueAgg._sum.total ?? 0;
  const revenueDeltaPct = prevRevenue > 0 ? ((revenue30d - prevRevenue) / prevRevenue) * 100 : null;
  const soldOutTypes = analytics.ticketTypes.filter((t) => t.total > 0 && t.sold >= t.total).length;

  return {
    ...analytics,
    vendorPipeline,
    footfallToday,
    revenue30d,
    revenueDeltaPct,
    range: {
      revenue: rangeRevenueAgg._sum.total ?? 0,
      orders: rangeRevenueAgg._count._all,
      tickets: rangeTickets,
      footfall: rangeFootfall,
    },
    pending: {
      approvals: vendorPipeline.SUBMITTED + vendorPipeline.UNDER_REVIEW,
      expiringHolds,
      failedPayments,
      soldOutTypes,
    },
  };
}
