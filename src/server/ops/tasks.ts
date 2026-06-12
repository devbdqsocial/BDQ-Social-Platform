import "server-only";
import { db } from "@/server/db";

/** Computed ops snapshot: pending action items + live counters. Read-only, event-scoped. */

export async function getOpsSnapshot(eventId?: string) {
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  const since7 = new Date(); since7.setDate(since7.getDate() - 7);
  const ev = eventId ? { eventId } : {};
  const ticketEv = eventId ? { order: { eventId } } : {};
  const checkInEv = eventId ? { ticket: { order: { eventId } } } : {};

  const [
    pendingApprovals, expiringHolds, failedPayments, waitlistCount,
    ticketTypes, stallGroups, ticketsSold, checkedInToday, ordersToday, recentCheckins,
  ] = await Promise.all([
    db.vendorProfile.count({ where: { approvalStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.stall.count({ where: { status: "HELD", holdUntil: { lte: soon }, ...ev } }),
    db.order.count({ where: { ...ev, status: "FAILED", createdAt: { gte: since7 } } }),
    db.waitlist.count({ where: { ...ev } }),
    db.ticketType.findMany({ where: eventId ? { eventId } : {}, select: { soldQty: true, totalQty: true } }),
    db.stall.groupBy({ by: ["status"], where: { kind: "STALL", ...ev }, _count: { _all: true } }),
    db.ticket.aggregate({ _sum: { admitCount: true }, where: ticketEv }).then((a) => a._sum.admitCount ?? 0),
    db.checkIn.aggregate({ _sum: { admitted: true }, where: { direction: "IN", scannedAt: { gte: startToday }, ...checkInEv } }).then((a) => a._sum.admitted ?? 0),
    db.order.count({ where: { ...ev, status: "PAID", createdAt: { gte: startToday } } }),
    db.checkIn.findMany({
      where: { ...checkInEv },
      orderBy: { scannedAt: "desc" },
      take: 12,
      select: {
        id: true, direction: true, gate: true, scannedAt: true,
        ticket: { select: { holderName: true, ticketType: { select: { name: true } } } },
      },
    }),
  ]);

  const soldOutTypes = ticketTypes.filter((t) => t.totalQty > 0 && t.soldQty >= t.totalQty).length;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const g of stallGroups) { counts[g.status] = g._count._all; total += g._count._all; }
  const stalls = { counts, total, booked: counts.BOOKED ?? 0, pct: total ? (counts.BOOKED ?? 0) / total : 0 };

  return {
    pending: { approvals: pendingApprovals, expiringHolds, failedPayments, soldOutTypes, waitlist: waitlistCount },
    live: { ticketsSold, checkedInToday, ordersToday, stalls },
    recentCheckins,
  };
}
