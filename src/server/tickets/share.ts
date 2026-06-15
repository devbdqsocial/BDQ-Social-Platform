import "server-only";
import { db } from "@/server/db";

/**
 * Share-art data (R6.1): ONLY the fields a guest is choosing to make public — never the qrToken,
 * phone, or email (locked rule: the scannable QR never appears on a shareable image). Returns null
 * for a cancelled ticket so we don't generate art for a void pass.
 */
export async function getTicketShareData(id: string) {
  const t = await db.ticket.findUnique({
    where: { id },
    select: {
      status: true,
      holderName: true,
      ticketType: { select: { name: true } },
      order: { select: { event: { select: { name: true, startsAt: true, location: true } } } },
    },
  });
  if (!t || t.status === "CANCELLED" || !t.order.event) return null;
  return {
    holderName: t.holderName?.trim() || null,
    ticketType: t.ticketType.name,
    eventName: t.order.event.name,
    startsAt: t.order.event.startsAt,
    location: t.order.event.location,
  };
}

export type TicketShareData = NonNullable<Awaited<ReturnType<typeof getTicketShareData>>>;
