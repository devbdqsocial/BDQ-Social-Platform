import "server-only";
import { db } from "@/server/db";
import { bucketByDay, tally } from "@/lib/analytics-buckets";

/** Read-only aggregates for the admin analytics dashboard. Optional per-event scope. Money = paise. */

export async function getAnalytics(eventId?: string) {
  const orderWhere = eventId ? { eventId } : {};
  const paidWhere = { ...orderWhere, status: "PAID" as const };
  const ticketWhere = eventId ? { order: { eventId } } : {};
  const since = new Date();
  since.setDate(since.getDate() - 29);

  const [
    revenueAgg,
    ticketsSold,
    checkedIn,
    statusGroups,
    trendOrders,
    paidUsers,
    discountGroups,
    ticketTypes,
    stallGroups,
    stallRevenueAgg,
    approvedVendors,
    topCoupons,
    recentOrders,
    event,
  ] = await Promise.all([
    db.order.aggregate({ where: paidWhere, _sum: { total: true, discount: true }, _count: { _all: true } }),
    db.ticket.count({ where: ticketWhere }),
    db.ticket.count({ where: { ...ticketWhere, status: "CHECKED_IN" } }),
    db.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true } }),
    db.order.findMany({ where: { ...paidWhere, createdAt: { gte: since } }, select: { createdAt: true, total: true } }),
    db.order.findMany({ where: paidWhere, select: { userId: true, utm: true } }),
    db.order.groupBy({ by: ["discountSource"], where: paidWhere, _count: { _all: true }, _sum: { discount: true } }),
    db.ticketType.findMany({
      where: eventId ? { eventId } : {},
      select: { id: true, name: true, soldQty: true, totalQty: true, priceInPaise: true, event: { select: { name: true } } },
      orderBy: { priceInPaise: "asc" },
    }),
    db.stall.groupBy({ by: ["status"], where: { kind: "STALL", ...(eventId ? { eventId } : {}) }, _count: { _all: true } }),
    db.payment.aggregate({
      where: { status: "CAPTURED", bookingId: { not: null }, ...(eventId ? { booking: { eventId } } : {}) },
      _sum: { amount: true },
    }),
    db.vendorProfile.count({ where: { approvalStatus: "APPROVED" } }),
    db.coupon.findMany({
      where: eventId ? { OR: [{ eventId }, { eventId: null }] } : {},
      orderBy: { usedCount: "desc" },
      take: 5,
      select: { code: true, type: true, value: true, usedCount: true, maxUses: true },
    }),
    db.order.findMany({
      where: paidWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, total: true, createdAt: true, event: { select: { name: true } } },
    }),
    eventId ? db.event.findUnique({ where: { id: eventId }, select: { capacity: true, name: true } }) : Promise.resolve(null),
  ]);

  const userRows = tally(paidUsers, (o) => o.userId);
  const distinctCustomers = userRows.length;
  const returningCustomers = userRows.filter((r) => r.count > 1).length;

  const grossTicketRevenue = revenueAgg._sum.total ?? 0;
  const stallRevenue = stallRevenueAgg._sum.amount ?? 0;
  const paidOrders = revenueAgg._count._all;
  const capacity = event?.capacity ?? null;

  const statusCounts = { PENDING: 0, PAID: 0, FAILED: 0, EXPIRED: 0 } as Record<string, number>;
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;
  const createdOrders = statusGroups.reduce((s, g) => s + g._count._all, 0);

  return {
    kpis: {
      grossTicketRevenue,
      stallRevenue,
      totalRevenue: grossTicketRevenue + stallRevenue,
      totalDiscount: revenueAgg._sum.discount ?? 0,
      ticketsSold,
      paidOrders,
      distinctCustomers,
      avgOrderValue: paidOrders ? Math.round(grossTicketRevenue / paidOrders) : 0,
      checkedIn,
      attendanceRate: ticketsSold ? checkedIn / ticketsSold : 0,
      capacity,
      capacityUtil: capacity ? ticketsSold / capacity : null,
      approvedVendors,
    },
    trend: bucketByDay(trendOrders, 30),
    funnel: {
      counts: statusCounts,
      created: createdOrders,
      conversion: createdOrders ? statusCounts.PAID / createdOrders : 0,
      abandoned: statusCounts.PENDING + statusCounts.EXPIRED,
    },
    customers: { distinct: distinctCustomers, returning: returningCustomers, new: distinctCustomers - returningCustomers },
    ticketTypes: ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      eventName: t.event.name,
      sold: t.soldQty,
      total: t.totalQty,
      pct: t.totalQty ? t.soldQty / t.totalQty : 0,
      revenue: t.soldQty * t.priceInPaise,
    })),
    discounts: discountGroups
      .filter((g) => g.discountSource !== "NONE")
      .map((g) => ({ source: g.discountSource, count: g._count._all, total: g._sum.discount ?? 0 })),
    stalls: (() => {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const g of stallGroups) {
        counts[g.status] = g._count._all;
        total += g._count._all;
      }
      return { counts, total, booked: counts.BOOKED ?? 0, pct: total ? (counts.BOOKED ?? 0) / total : 0 };
    })(),
    utm: tally(paidUsers, (o) => (o.utm as { source?: string } | null)?.source, () => 0),
    topCoupons,
    recentOrders,
  };
}
