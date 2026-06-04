"use server";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guard";
import { signTicketToken } from "@/lib/qr-token";
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
}: {
  eventId: string;
  name: string;
  phone: string;
  email: string;
  items: OfflineCartItem[];
  paymentMode: "ONLINE" | "OFFLINE";
}) {
  const admin = await requireAdmin();

  if (!items.length) {
    throw new Error("Cart is empty.");
  }

  // 1. Resolve User
  let userId: string;
  
  if (phone) {
    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      user = await db.user.create({
        data: {
          phone,
          name: name || "Walk-in Customer",
          email: email || null,
          role: "CUSTOMER",
        },
      });
    }
    userId = user.id;
  } else {
    // Phantom User without phone
    const user = await db.user.create({
      data: {
        name: name || "Walk-in Customer",
        email: email || null,
        role: "CUSTOMER",
      },
    });
    userId = user.id;
  }

  const subtotal = items.reduce((acc, it) => acc + it.priceInPaise * it.qty, 0);
  const total = subtotal; // No convenience fee for offline

  try {
    const res = await db.$transaction(async (tx) => {
      // Create order marked as PAID
      const order = await tx.order.create({
        data: {
          userId,
          eventId,
          status: "PAID",
          subtotal,
          discount: 0,
          total,
          discountSource: "NONE",
          items: items as unknown as Prisma.InputJsonValue,
        },
      });

      // Log Payment securely assigned to admin
      await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: "OFFLINE",
          mode: paymentMode,
          amount: total,
          status: "CAPTURED",
          recordedById: admin.userId,
          meta: { offlinePos: true },
        },
      });

      // Generate Tickets
      const ticketRows: { id: string; orderId: string; ticketTypeId: string; qrToken: string; holderName: string | null; holderPhone: string | null; holderEmail: string | null }[] = [];
      for (const it of items) {
        for (let i = 0; i < it.qty; i++) {
          const id = randomUUID();
          ticketRows.push({ 
            id, 
            orderId: order.id, 
            ticketTypeId: it.ticketTypeId, 
            qrToken: signTicketToken(id),
            holderName: name || null,
            holderPhone: phone || null,
            holderEmail: email || null
          });
        }
      }
      
      await tx.ticket.createMany({ data: ticketRows });

      // Update capacity
      await Promise.all(
        items.map((it) =>
          tx.ticketType.update({ where: { id: it.ticketTypeId }, data: { soldQty: { increment: it.qty } } }),
        ),
      );

      return { orderId: order.id, issued: ticketRows.length };
    });

    return { success: true, ...res };
  } catch (error) {
    logError("pos.issueOfflineTickets", error, { adminId: admin.userId, eventId });
    throw new Error("Failed to issue tickets. Check inventory limits.");
  }
}
