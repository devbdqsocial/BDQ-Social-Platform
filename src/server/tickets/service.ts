import "server-only";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createRazorpayOrder } from "@/lib/razorpay";
import { signTicketToken, ticketTokenExpiry } from "@/lib/qr-token";
import { logError } from "@/lib/logger";
import {
  isCouponRedeemable,
  priceOrder,
  type AppliedCoupon,
  type BulkTier,
  type LineItem,
} from "@/server/pricing/engine";

const ORDER_TTL_MS = 15 * 60 * 1000; // BUSINESS-RULES §1.6

interface OrderItemInput {
  ticketTypeId: string;
  qty: number;
}

export class CheckoutError extends Error {
  constructor(public code: "EVENT_NOT_AVAILABLE" | "SOLD_OUT" | "COUPON_INVALID" | "INVALID_TOTAL" | "EMPTY") {
    super(code);
    this.name = "CheckoutError";
  }
}

/**
 * Validate a coupon for this user: window + global `maxUses` + `perUserLimit`. Per-user usage =
 * confirmed redemptions (CouponRedemption) + this user's live unexpired PENDING orders holding it,
 * so a user cannot stack the discount across parallel checkouts.
 */
async function resolveCoupon(
  eventId: string,
  code: string,
  userId: string,
): Promise<AppliedCoupon & { id: string }> {
  const c = await db.coupon.findUnique({ where: { code } });
  const now = new Date();
  const [redeemed, pending] = c
    ? await Promise.all([
        db.couponRedemption.count({ where: { couponId: c.id, userId } }),
        db.order.count({ where: { couponId: c.id, userId, status: "PENDING", expiresAt: { gt: now } } }),
      ])
    : [0, 0];
  if (!isCouponRedeemable(c, eventId, now, redeemed + pending)) throw new CheckoutError("COUPON_INVALID");
  return { id: c!.id, type: c!.type, value: c!.value, minOrder: c!.minOrder };
}

/** Create a PENDING order + a Razorpay order. No money moves until the webhook confirms payment. */
export async function createTicketOrder(
  userId: string,
  eventId: string,
  items: OrderItemInput[],
  couponCode?: string,
) {
  if (!items.length) throw new CheckoutError("EMPTY");

  const event = await db.event.findUnique({ where: { id: eventId }, include: { ticketTypes: true } });
  if (!event || (event.status !== "PUBLISHED" && event.status !== "LIVE")) {
    throw new CheckoutError("EVENT_NOT_AVAILABLE");
  }

  const byId = new Map(event.ticketTypes.map((t) => [t.id, t]));
  const lineItems: LineItem[] = [];
  for (const it of items) {
    const t = byId.get(it.ticketTypeId);
    if (!t || it.qty < 1) throw new CheckoutError("EMPTY");
    if (t.soldQty + it.qty > t.totalQty) throw new CheckoutError("SOLD_OUT");
    lineItems.push({ priceInPaise: t.priceInPaise, earlyPriceInPaise: t.earlyPricePaise, qty: it.qty });
  }

  const coupon = couponCode ? await resolveCoupon(eventId, couponCode, userId) : null;
  const pricing = priceOrder(
    lineItems,
    {
      bulkTiers: (event.bulkTiers as BulkTier[] | null) ?? undefined,
      earlyBird: (event.earlyBird as { active: boolean; percent?: number } | null) ?? undefined,
    },
    coupon,
  );

  // Paid checkout must never produce a zero/negative charge (e.g. a 100%-off coupon). Free
  // tickets are issued only via the admin comp flow, never here.
  if (pricing.total <= 0) throw new CheckoutError("INVALID_TOTAL");

  const order = await db.order.create({
    data: {
      userId,
      eventId,
      status: "PENDING",
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      total: pricing.total,
      discountSource: pricing.discountSource,
      couponId: coupon?.id,
      items: items as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    },
  });

  const rzp = await createRazorpayOrder(pricing.total, order.id, { orderId: order.id });
  await db.order.update({ where: { id: order.id }, data: { gatewayOrderId: rzp.id } });

  return {
    orderId: order.id,
    razorpayOrderId: rzp.id,
    amountPaise: pricing.total,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "",
  };
}

/**
 * Fulfil a paid order: mark PAID, record Payment, issue signed-QR tickets, bump soldQty.
 * Idempotent — keyed on the Razorpay order/payment id, so duplicate webhooks are no-ops.
 */
export async function fulfillOrder(gatewayOrderId: string, paymentId: string): Promise<{ issued: number }> {
  const order = await db.order.findUnique({
    where: { gatewayOrderId },
    include: { tickets: true, event: { select: { endsAt: true } } },
  });
  if (!order) return { issued: 0 };
  if (order.status === "PAID") return { issued: order.tickets.length };

  const items = (order.items as OrderItemInput[] | null) ?? [];
  const exp = ticketTokenExpiry(order.event.endsAt);

  await db.$transaction(async (tx) => {
    // idempotency guard: bail if this payment was already recorded
    const existing = await tx.payment.findUnique({ where: { gatewayRef: paymentId } });
    if (existing) return;

    await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    await tx.payment.create({
      data: {
        orderId: order.id,
        gateway: "RAZORPAY",
        mode: "ONLINE",
        gatewayRef: paymentId,
        amount: order.total,
        status: "CAPTURED",
      },
    });

    // Build all ticket rows first, then insert in one batch + per-type soldQty bump.
    const ticketRows: { id: string; orderId: string; ticketTypeId: string; qrToken: string }[] = [];
    for (const it of items) {
      for (let i = 0; i < it.qty; i++) {
        const id = randomUUID();
        ticketRows.push({ id, orderId: order.id, ticketTypeId: it.ticketTypeId, qrToken: signTicketToken(id, undefined, exp) });
      }
    }
    await tx.ticket.createMany({ data: ticketRows });
    await Promise.all(
      items.map((it) =>
        tx.ticketType.update({ where: { id: it.ticketTypeId }, data: { soldQty: { increment: it.qty } } }),
      ),
    );

    // Record the coupon redemption (per-user-limit ledger) and bump the global usedCount under a
    // conditional guard so it can never exceed maxUses. The Payment.gatewayRef idempotency check
    // above guarantees this runs at most once per order.
    if (order.couponId) {
      await tx.couponRedemption.create({
        data: { couponId: order.couponId, userId: order.userId, orderId: order.id },
      });
      await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1 WHERE "id" = ${order.couponId} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
    }
  });

  // best-effort delivery via the notification outbox — failures never fail fulfilment
  try {
    const { enqueueTicketNotifications, processOutbox } = await import("@/server/notifications/outbox");
    await enqueueTicketNotifications(order.id);
    await processOutbox();
  } catch (e) {
    logError("fulfillOrder.notify", e, { orderId: order.id });
  }

  // best-effort admin alert (in-app bell)
  try {
    const { notify } = await import("@/server/notifications/admin");
    await notify({
      type: "PAYMENT_CAPTURED",
      title: "Payment received",
      body: `₹${(order.total / 100).toLocaleString("en-IN")} · order ${order.id.slice(0, 8)}`,
      href: `/admin/tickets/orders/${order.id}`,
      eventId: order.eventId,
    });
  } catch (e) {
    logError("fulfillOrder.adminNotify", e, { orderId: order.id });
  }

  const after = await db.ticket.count({ where: { orderId: order.id } });
  return { issued: after };
}

export function listUserTickets(userId: string) {
  return db.ticket.findMany({
    where: { order: { userId, status: "PAID" } },
    include: {
      ticketType: { select: { name: true } },
      order: { include: { event: { select: { name: true, slug: true, startsAt: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
