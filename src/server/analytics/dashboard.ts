import "server-only";
import { db } from "@/server/db";
import { getAnalytics } from "./service";

/** Command-center dashboard = the analytics aggregate + a few dashboard-only extras. Event-scoped. */

export async function getDashboard(eventId?: string) {
  const since = new Date(); since.setDate(since.getDate() - 29);
  const prevSince = new Date(); prevSince.setDate(prevSince.getDate() - 59);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const soon = new Date(Date.now() + 60 * 60 * 1000);

  const paidWhere = { ...(eventId ? { eventId } : {}), status: "PAID" as const };

  const [analytics, vendorGroups, footfallToday, prevRevenueAgg, expiringHolds, failedPayments] = await Promise.all([
    getAnalytics(eventId),
    db.vendorProfile.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    db.checkIn.count({
      where: { direction: "IN", scannedAt: { gte: startToday }, ...(eventId ? { ticket: { order: { eventId } } } : {}) },
    }),
    db.order.aggregate({ where: { ...paidWhere, createdAt: { gte: prevSince, lt: since } }, _sum: { total: true } }),
    db.stall.count({ where: { status: "HELD", holdUntil: { lte: soon }, ...(eventId ? { eventId } : {}) } }),
    db.order.count({ where: { ...(eventId ? { eventId } : {}), status: "FAILED", createdAt: { gte: since } } }),
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
    pending: {
      approvals: vendorPipeline.SUBMITTED + vendorPipeline.UNDER_REVIEW,
      expiringHolds,
      failedPayments,
      soldOutTypes,
    },
  };
}
