import "server-only";
import { db } from "@/server/db";
import { REVIEW_SLA_MS } from "@/lib/vendor-sla";
import { liveCheckedIn } from "@/server/checkin/service";
import { getHeartbeat, HEARTBEAT } from "@/server/system/heartbeat";
import { formatPaise } from "@/lib/utils";
import { getAnalytics } from "./service";

/** Command-center dashboard = the analytics aggregate + dashboard-only extras + a windowed KPI strip. */

export async function getDashboard(eventId?: string, rangeDays: number | null = 30) {
  const nowMs = Date.now();
  const rangeSince = rangeDays != null ? new Date(nowMs - rangeDays * 86400000) : null;
  const since = new Date(); since.setDate(since.getDate() - 29);
  const prevSince = new Date(); prevSince.setDate(prevSince.getDate() - 59);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const soon = new Date(nowMs + 60 * 60 * 1000);
  const reviewSla = new Date(nowMs - REVIEW_SLA_MS);

  const ev = eventId ? { eventId } : {};
  const checkInEv = eventId ? { ticket: { order: { eventId } } } : {};
  const ticketEv = eventId ? { order: { eventId } } : {};
  const rangePaid = { ...ev, status: "PAID" as const, ...(rangeSince ? { createdAt: { gte: rangeSince } } : {}) };

  const [analytics, vendorGroups, footfallToday, prevRevenueAgg, expiringHolds, failedPayments, rangeRevenueAgg, rangeTickets, rangeFootfall, reviewAging] = await Promise.all([
    getAnalytics(eventId),
    db.vendorProfile.groupBy({ by: ["approvalStatus"], _count: { _all: true } }),
    db.checkIn.count({ where: { direction: "IN", scannedAt: { gte: startToday }, ...checkInEv } }),
    db.order.aggregate({ where: { ...ev, status: "PAID", createdAt: { gte: prevSince, lt: since } }, _sum: { total: true } }),
    db.stall.count({ where: { status: "HELD", holdUntil: { lte: soon }, ...ev } }),
    db.order.count({ where: { ...ev, status: "FAILED", createdAt: { gte: since } } }),
    db.order.aggregate({ where: rangePaid, _sum: { total: true }, _count: { _all: true } }),
    db.ticket.aggregate({ _sum: { admitCount: true }, where: { ...ticketEv, ...(rangeSince ? { createdAt: { gte: rangeSince } } : {}) } }).then((a) => a._sum.admitCount ?? 0),
    db.checkIn.aggregate({ _sum: { admitted: true }, where: { direction: "IN", ...checkInEv, ...(rangeSince ? { scannedAt: { gte: rangeSince } } : {}) } }).then((a) => a._sum.admitted ?? 0),
    // Vendors who signed >48h ago and are still awaiting the call-back approval (SLA breach).
    db.vendorContract.count({ where: { status: "SIGNED", signedAt: { lt: reviewSla }, vendorProfile: { approvalStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] } } } }),
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
      reviewAging,
    },
  };
}

export interface ActivityItem {
  kind: "order" | "booking" | "checkin";
  label: string;
  sub: string;
  at: Date;
}

/**
 * Command center (admin-portal §2): the six founder tiles + a danger alert row (non-zero only) +
 * a recent-activity feed, scoped to the event-switcher selection. Composes getDashboard (analytics +
 * pending/extras) with a few targeted reads. Tiles must reconcile to the seed math (R5.2 test).
 */
export async function getCommandCenter(eventId?: string) {
  const d = await getDashboard(eventId, null);
  const nowMs = Date.now();
  const ev = eventId ? { eventId } : {};
  const since24h = new Date(nowMs - 86400000);
  const since7d = new Date(nowMs - 7 * 86400000);

  const [feesAgg, sponsorGroups, paymentFailures24h, waitlistAdded7d, live, recentBookings, recentCheckins, cronAt, webhookAt] = await Promise.all([
    db.payment.aggregate({ _sum: { feePaise: true, taxPaise: true }, where: { status: "CAPTURED" } }),
    db.sponsor.groupBy({ by: ["tier"], where: { status: { in: ["SIGNED", "PAID"] }, ...ev }, _sum: { amountPaise: true }, _count: { _all: true } }),
    db.order.count({ where: { ...ev, status: "FAILED", createdAt: { gte: since24h } } }),
    db.waitlist.count({ where: { createdAt: { gte: since7d }, ...(eventId ? { eventId } : {}) } }),
    liveCheckedIn(eventId),
    db.booking.findMany({ where: { ...ev, status: "BOOKED" }, orderBy: { createdAt: "desc" }, take: 6, include: { stall: { select: { label: true } }, event: { select: { name: true } }, vendorProfile: { select: { brandName: true } } } }),
    db.checkIn.findMany({ where: { direction: "IN", ...(eventId ? { ticket: { order: { eventId } } } : {}) }, orderBy: { scannedAt: "desc" }, take: 6, select: { id: true, scannedAt: true, admitted: true } }),
    getHeartbeat(HEARTBEAT.cron),
    getHeartbeat(HEARTBEAT.webhook),
  ]);

  const fees = (feesAgg._sum.feePaise ?? 0) + (feesAgg._sum.taxPaise ?? 0);
  const grossPaise = d.kpis.totalRevenue;
  const soldTotal = d.ticketTypes.reduce((s, t) => s + t.sold, 0);
  const capacityTotal = d.ticketTypes.reduce((s, t) => s + t.total, 0);
  const signedPaise = sponsorGroups.reduce((s, g) => s + (g._sum.amountPaise ?? 0), 0);
  const sponsorCount = sponsorGroups.reduce((s, g) => s + g._count._all, 0);

  const tiles = {
    revenue: { grossPaise, netPaise: grossPaise - fees },
    tickets: { sold: soldTotal, total: capacityTotal, spark: d.trend.slice(-14).map((b) => b.revenue) },
    checkins: { live, pctOfSold: soldTotal ? live / soldTotal : 0 },
    vendors: { booked: d.stalls.booked, total: d.stalls.total, pendingReview: d.pending.approvals },
    sponsors: { signedPaise, count: sponsorCount, byTier: sponsorGroups.map((g) => ({ tier: String(g.tier), count: g._count._all })) },
    waitlist: { total: d.extras.ticketWaitlist + d.extras.stallWaitlist, added7d: waitlistAdded7d },
  };

  const alerts = [
    { key: "failures", n: paymentFailures24h, label: "payment failure(s), last 24h", href: "/admin/analytics" },
    { key: "outbox", n: d.extras.failedNotifications, label: "notification(s) failed in outbox", href: "/admin/ops" },
    { key: "review", n: d.pending.reviewAging, label: "vendor(s) waiting >48h for a call-back", href: "/admin/vendors" },
  ].filter((a) => a.n > 0);

  const activity: ActivityItem[] = [
    ...d.recentOrders.map((o) => ({ kind: "order" as const, label: `Order · ${o.event.name}`, sub: formatPaise(o.total), at: o.createdAt })),
    ...recentBookings.map((b) => ({ kind: "booking" as const, label: `Stall ${b.stall.label} booked`, sub: b.vendorProfile?.brandName ?? b.event.name, at: b.createdAt })),
    ...recentCheckins.map((c) => ({ kind: "checkin" as const, label: "Guest checked in", sub: `${c.admitted} admitted`, at: c.scannedAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return {
    tiles,
    alerts,
    health: { cronAt, webhookAt },
    revenueByDay: d.trend,
    activity,
    // Passthrough for the retained "needs attention" feed (no extra getDashboard call).
    pending: d.pending,
    unsignedContracts: d.extras.totalContracts - d.extras.signedContracts,
  };
}
