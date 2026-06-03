import "server-only";
import { db } from "@/server/db";

/** Admin read-views over orders + tickets. Read-only; money is integer paise. */

export function listOrdersForEvent(eventId: string) {
  return db.order.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      subtotal: true,
      discount: true,
      total: true,
      discountSource: true,
      createdAt: true,
      user: { select: { name: true, phone: true, email: true } },
      _count: { select: { tickets: true } },
    },
  });
}

export function getOrderForAdmin(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      event: { select: { name: true, slug: true } },
      coupon: { select: { code: true } },
      payments: { orderBy: { createdAt: "desc" } },
      tickets: { include: { ticketType: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}

export function listTicketsForEvent(eventId: string) {
  return db.ticket.findMany({
    where: { order: { eventId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      holderName: true,
      holderPhone: true,
      status: true,
      isComp: true,
      createdAt: true,
      ticketType: { select: { name: true } },
      order: { select: { user: { select: { phone: true, name: true } } } },
    },
  });
}
