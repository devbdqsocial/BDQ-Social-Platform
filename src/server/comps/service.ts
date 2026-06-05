import "server-only";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { rateLimit } from "@/lib/ratelimit";
import { signTicketToken, ticketTokenExpiry } from "@/lib/qr-token";
import type { Session } from "@/server/auth/guard";

/** Max comp-issuance actions per staff member per hour (abuse velocity cap, on top of the qty clamp). */
const COMP_ISSUE_MAX_PER_HOUR = 50;

/** Complimentary (VIP/sponsor/press) ticket issuance — real signed-QR tickets, no payment. */

export interface CompInput {
  ticketTypeId: string;
  qty: number;
  holderName?: string;
  holderPhone?: string;
  holderEmail?: string;
}

/** Issue `qty` comp tickets under a zero-value order. Returns the order id. */
export async function generateComps(session: Session, input: CompInput): Promise<string> {
  if (!(await rateLimit(`comp:${session.userId}`, COMP_ISSUE_MAX_PER_HOUR, 60 * 60 * 1000))) {
    throw new Error("Comp issuance limit reached — try again later");
  }
  return withAudit(session, { action: "COMP_ISSUE", entity: "Order" }, async () => ({
    before: null,
    run: async () => {
      let unitPaise = 0;
      const orderId = await db.$transaction(async (tx) => {
        const tt = await tx.ticketType.findUnique({
          where: { id: input.ticketTypeId },
          select: { eventId: true, priceInPaise: true, event: { select: { endsAt: true } } },
        });
        if (!tt) throw new Error("Ticket type not found");
        unitPaise = tt.priceInPaise;
        const exp = ticketTokenExpiry(tt.event.endsAt);
        const order = await tx.order.create({
          data: {
            userId: session.userId,
            eventId: tt.eventId,
            status: "PAID",
            subtotal: 0,
            discount: 0,
            total: 0,
            items: [{ ticketTypeId: input.ticketTypeId, qty: input.qty }] as Prisma.InputJsonValue,
          },
        });
        for (let i = 0; i < input.qty; i++) {
          const id = randomUUID();
          await tx.ticket.create({
            data: {
              id,
              orderId: order.id,
              ticketTypeId: input.ticketTypeId,
              isComp: true,
              qrToken: signTicketToken(id, undefined, exp),
              holderName: input.holderName,
              holderPhone: input.holderPhone,
              holderEmail: input.holderEmail,
            },
          });
        }
        return order.id;
      });

      // optional delivery to a recipient email (reuses the ticket-email outbox)
      if (input.holderEmail) {
        try {
          await db.outbox.upsert({
            where: { dedupeKey: `comp:${orderId}:EMAIL` },
            update: {},
            create: { channel: "EMAIL", toAddress: input.holderEmail, template: "ticket", payload: { orderId }, dedupeKey: `comp:${orderId}:EMAIL` },
          });
          const { processOutbox } = await import("@/server/notifications/outbox");
          await processOutbox();
        } catch (e) {
          console.error("comp notify", e);
        }
      }

      return {
        result: orderId,
        after: {
          ticketTypeId: input.ticketTypeId,
          qty: input.qty,
          unitPaise,
          valuePaise: unitPaise * input.qty,
        },
      };
    },
  }));
}

export function listEventsWithTicketTypes() {
  return db.event.findMany({
    orderBy: { startsAt: "desc" },
    select: { id: true, name: true, ticketTypes: { select: { id: true, name: true }, orderBy: { priceInPaise: "asc" } } },
  });
}

export function listCompBatches() {
  return db.order.findMany({
    where: { tickets: { some: { isComp: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      createdAt: true,
      event: { select: { name: true } },
      _count: { select: { tickets: true } },
      tickets: { take: 1, select: { holderName: true, ticketType: { select: { name: true } } } },
    },
  });
}

export function getCompOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { name: true, startsAt: true, location: true } },
      tickets: { include: { ticketType: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}
