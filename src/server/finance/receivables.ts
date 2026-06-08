import "server-only";
import { db } from "@/server/db";

/**
 * Accounts receivable + cash accountability (read-only).
 * Receivable  = stall bookings advanced to PENDING but with no CAPTURED payment (money owed).
 * Cash-in-hand = captured OFFLINE payments grouped by the staff member who recorded them.
 */

const stallPrice = (s: { priceInPaise: number | null; stallType: { priceInPaise: number } | null } | null) =>
  s?.priceInPaise ?? s?.stallType?.priceInPaise ?? 0;

export async function getReceivables(eventId?: string) {
  const bookings = await db.booking.findMany({
    where: {
      status: "PENDING",
      ...(eventId ? { eventId } : {}),
      payment: { is: null }, // no payment row at all → uncollected
    },
    select: {
      id: true,
      createdAt: true,
      vendorProfile: { select: { brandName: true } },
      stall: { select: { label: true, priceInPaise: true, stallType: { select: { priceInPaise: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  const items = bookings.map((b) => ({
    bookingId: b.id,
    vendor: b.vendorProfile?.brandName ?? "—",
    stall: b.stall?.label ?? "—",
    owedPaise: stallPrice(b.stall),
    since: b.createdAt,
  }));
  return { items, totalPaise: items.reduce((s, i) => s + i.owedPaise, 0) };
}

export async function getCashByRecorder(eventId?: string) {
  const eventFilter = eventId ? { OR: [{ order: { eventId } }, { booking: { eventId } }] } : {};
  const groups = await db.payment.groupBy({
    by: ["recordedById"],
    where: { mode: "OFFLINE", status: "CAPTURED", ...eventFilter },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const ids = groups.map((g) => g.recordedById).filter((x): x is string => !!x);
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name ?? u.phone ?? u.id]));
  const rows = groups.map((g) => ({
    recorder: g.recordedById ? (nameById.get(g.recordedById) ?? g.recordedById) : "Unknown",
    amountPaise: g._sum.amount ?? 0,
    count: g._count._all,
  }));
  return { rows, totalPaise: rows.reduce((s, r) => s + r.amountPaise, 0) };
}
