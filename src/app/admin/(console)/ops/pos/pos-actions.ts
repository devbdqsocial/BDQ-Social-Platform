"use server";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/server/auth/guard";
import { withAuditTx } from "@/server/audit";
import { createOfflinePayment, normalizeOfflinePaymentDetails, OfflinePaymentError } from "@/server/payments/offline";
import { signTicketToken, ticketTokenExpiry } from "@/lib/qr-token";
import { logError } from "@/lib/logger";

export interface OfflineCartItem {
  ticketTypeId: string;
  qty: number;
  priceInPaise: number;
}

export async function issueOfflineTickets({
  eventId,
  name,
  phone,
  email,
  items,
  paymentMode,
  paymentReference,
  paymentNote,
}: {
  eventId: string;
  name: string;
  phone: string;
  email: string;
  items: OfflineCartItem[];
  paymentMode: "ONLINE" | "OFFLINE";
  paymentReference: string;
  paymentNote: string;
}) {
  const admin = await requireAdmin();

  if (!items.length) {
    throw new Error("Cart is empty.");
  }
  if (!paymentReference.trim()) {
    throw new Error("Payment reference is required.");
  }
  if (!paymentNote.trim()) {
    throw new Error("Payment note is required.");
  }

  try {
    return await withAuditTx(admin, { action: "POS_ISSUE", entity: "Order", entityId: eventId }, async () => ({
      before: { eventId, itemCount: items.length },
      run: async (runTx) => {
        const event = await runTx.event.findUnique({ where: { id: eventId }, select: { endsAt: true } });
        if (!event) throw new Error("Event not found");
        const exp = ticketTokenExpiry(event.endsAt);
        const ticketTypes = await runTx.ticketType.findMany({
          where: { eventId, id: { in: items.map((it) => it.ticketTypeId) } },
          select: { id: true, priceInPaise: true },
        });
        const byId = new Map(ticketTypes.map((it) => [it.id, it]));
        const orderItems = items.map((it) => {
          const ticketType = byId.get(it.ticketTypeId);
          if (!ticketType || !Number.isInteger(it.qty) || it.qty <= 0) throw new Error("Invalid ticket selection.");
          return { ticketTypeId: it.ticketTypeId, qty: it.qty, priceInPaise: ticketType.priceInPaise };
        });
        const subtotal = orderItems.reduce((acc, it) => acc + it.priceInPaise * it.qty, 0);
        const total = subtotal;
        const payment = normalizeOfflinePaymentDetails({ amountPaise: total, gatewayRef: paymentReference, note: paymentNote });

        let userId: string;
        if (phone) {
          const existing = await runTx.user.findUnique({ where: { phone } });
          const user = existing
            ? await runTx.user.update({ where: { id: existing.id }, data: { name: name || existing.name, email: email || existing.email } })
            : await runTx.user.create({ data: { phone, name: name || "Walk-in Customer", email: email || null, role: "CUSTOMER" } });
          userId = user.id;
        } else {
          const user = await runTx.user.create({ data: { name: name || "Walk-in Customer", email: email || null, role: "CUSTOMER" } });
          userId = user.id;
        }

        const order = await runTx.order.create({
          data: {
            userId,
            eventId,
            status: "PAID",
            subtotal,
            discount: 0,
            total,
            discountSource: "NONE",
            items: orderItems as unknown as Prisma.InputJsonValue,
          },
        });

        await createOfflinePayment(runTx, { ...payment, orderId: order.id, recordedById: admin.userId, paymentMode });

        const ticketRows: { id: string; orderId: string; ticketTypeId: string; qrToken: string; holderName: string | null; holderPhone: string | null; holderEmail: string | null }[] = [];
        for (const it of orderItems) {
          const updated = await runTx.$executeRaw`UPDATE "TicketType" SET "soldQty" = "soldQty" + ${it.qty} WHERE "id" = ${it.ticketTypeId} AND "soldQty" + ${it.qty} <= "totalQty"`;
          if (updated === 0) throw new Error("Ticket inventory is sold out.");
          for (let i = 0; i < it.qty; i++) {
            const id = randomUUID();
            ticketRows.push({
              id,
              orderId: order.id,
              ticketTypeId: it.ticketTypeId,
              qrToken: signTicketToken(id, undefined, exp),
              holderName: name || null,
              holderPhone: phone || null,
              holderEmail: email || null,
            });
          }
        }

        await runTx.ticket.createMany({ data: ticketRows });

        return { result: { success: true, orderId: order.id, issued: ticketRows.length }, after: { orderId: order.id, issued: ticketRows.length } };
      },
    }));
  } catch (error) {
    logError("pos.issueOfflineTickets", error, { adminId: admin.userId, eventId });
    if (error instanceof OfflinePaymentError) {
      if (error.code === "REFERENCE_REQUIRED") throw new Error("Payment reference is required.");
      if (error.code === "NOTE_REQUIRED") throw new Error("Payment note is required.");
      if (error.code === "DUPLICATE_REFERENCE") throw new Error("This payment reference is already recorded.");
    }
    throw new Error("Failed to issue tickets. Check inventory limits.");
  }
}
