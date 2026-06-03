import "server-only";
import { db } from "@/server/db";

/** Admin finance reads (payments). Read-only; money is integer paise. Event-scoped via order/booking. */

export function listPaymentsForEvent(eventId?: string) {
  return db.payment.findMany({
    where: eventId ? { OR: [{ order: { eventId } }, { booking: { eventId } }] } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      gateway: true,
      mode: true,
      amount: true,
      status: true,
      createdAt: true,
      order: { select: { id: true, user: { select: { phone: true, name: true } } } },
      booking: { select: { id: true, vendorProfile: { select: { brandName: true } } } },
    },
  });
}
