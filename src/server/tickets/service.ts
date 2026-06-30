import "server-only";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createRazorpayOrder, type GatewayFees } from "@/lib/razorpay";
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

type UtmInput = Partial<Record<"source" | "medium" | "campaign" | "term" | "content" | "ref", string>>;

export class CheckoutError extends Error {
  constructor(public code: "EVENT_NOT_AVAILABLE" | "SOLD_OUT" | "COUPON_INVALID" | "INVALID_TOTAL" | "EMPTY") {
    super(code);
    this.name = "CheckoutError";
  }
}

/**
 * Validate a coupon: window + global `maxUses` + `perUserLimit`. Per-user usage = confirmed
 * redemptions (CouponRedemption) + the user's live unexpired PENDING orders holding it, so a
 * user cannot stack the discount across parallel checkouts. Anonymous quotes (`userId: null`,
 * R1.4 preview) skip the per-user count — it is re-checked with the real user at order creation.
 */
async function resolveCoupon(
  eventId: string,
  code: string,
  userId: string | null,
): Promise<AppliedCoupon & { id: string }> {
  const c = await db.coupon.findUnique({ where: { code } });
  const now = new Date();
  const [redeemed, pending] = c && userId
    ? await Promise.all([
        db.couponRedemption.count({ where: { couponId: c.id, userId } }),
        db.order.count({ where: { couponId: c.id, userId, status: "PENDING", expiresAt: { gt: now } } }),
      ])
    : [0, 0];
  if (!isCouponRedeemable(c, eventId, now, redeemed + pending)) throw new CheckoutError("COUPON_INVALID");
  return { id: c!.id, type: c!.type, value: c!.value, minOrder: c!.minOrder };
}

/**
 * Price an order without creating anything (R1.4 coupon preview + reused by createTicketOrder).
 * Validates event availability, line items, inventory headroom, and the coupon.
 */
export async function quoteTicketOrder(
  eventId: string,
  items: OrderItemInput[],
  couponCode: string | undefined,
  userId: string | null,
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
  return { event, coupon, pricing };
}

/** Create a PENDING order + a Razorpay order. No money moves until the webhook confirms payment. */
export async function createTicketOrder(
  userId: string,
  eventId: string,
  items: OrderItemInput[],
  couponCode?: string,
  utm?: UtmInput,
  clientOrderKey?: string,
) {
  const keyId = () => process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "";
  const existing = clientOrderKey
    ? await db.order.findUnique({
        where: { clientOrderKey },
        select: { id: true, userId: true, eventId: true, status: true, total: true, gatewayOrderId: true, expiresAt: true },
      })
    : null;
  if (
    existing?.userId === userId &&
    existing.eventId === eventId &&
    existing.status === "PENDING" &&
    existing.gatewayOrderId &&
    (!existing.expiresAt || existing.expiresAt > new Date())
  ) {
    return {
      orderId: existing.id,
      razorpayOrderId: existing.gatewayOrderId,
      amountPaise: existing.total,
      keyId: keyId(),
    };
  }

  const { coupon, pricing } = await quoteTicketOrder(eventId, items, couponCode, userId);

  // Paid checkout must never produce a zero/negative charge (e.g. a 100%-off coupon). Free
  // tickets are issued only via the admin comp flow, never here.
  if (pricing.total <= 0) throw new CheckoutError("INVALID_TOTAL");

  let order: { id: string };
  try {
    order = await db.order.create({
      data: {
        userId,
        eventId,
        status: "PENDING",
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        total: pricing.total,
        discountSource: pricing.discountSource,
        couponId: coupon?.id,
        clientOrderKey,
        items: items as unknown as Prisma.InputJsonValue,
        utm: utm ? (utm as Prisma.InputJsonValue) : undefined,
        expiresAt: new Date(Date.now() + ORDER_TTL_MS),
      },
    });
  } catch (e) {
    if (!(clientOrderKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    const retry = await db.order.findUnique({
      where: { clientOrderKey },
      select: { id: true, userId: true, eventId: true, status: true, total: true, gatewayOrderId: true, expiresAt: true },
    });
    if (
      retry?.userId === userId &&
      retry.eventId === eventId &&
      retry.status === "PENDING" &&
      retry.gatewayOrderId &&
      (!retry.expiresAt || retry.expiresAt > new Date())
    ) {
      return { orderId: retry.id, razorpayOrderId: retry.gatewayOrderId, amountPaise: retry.total, keyId: keyId() };
    }
    throw e;
  }

  const rzp = await createRazorpayOrder(pricing.total, order.id, { orderId: order.id });
  await db.order.update({ where: { id: order.id }, data: { gatewayOrderId: rzp.id } });

  return {
    orderId: order.id,
    razorpayOrderId: rzp.id,
    amountPaise: pricing.total,
    keyId: keyId(),
  };
}

/**
 * Fulfil a paid order: mark PAID, record Payment, issue signed-QR tickets, bump soldQty.
 * Idempotent — keyed on the Razorpay order/payment id, so duplicate webhooks are no-ops.
 */
export async function fulfillOrder(
  gatewayOrderId: string,
  paymentId: string,
  fees?: GatewayFees,
  paidAmountPaise?: number | null,
): Promise<{ issued: number }> {
  const order = await db.order.findUnique({
    where: { gatewayOrderId },
    include: { tickets: true, event: { select: { endsAt: true } } },
  });
  if (!order) return { issued: 0 };
  if (order.status === "PAID") return { issued: order.tickets.length };

  // Defence in depth: a (signature-valid) webhook whose captured amount doesn't match what we
  // charged must never issue tickets. Audited for ops follow-up; reconcile cron stays the net.
  if (paidAmountPaise != null && paidAmountPaise !== order.total) {
    await db.auditLog.create({
      data: {
        action: "REJECT",
        entity: "Payment",
        entityId: paymentId,
        after: { reason: "AMOUNT_MISMATCH", gatewayOrderId, expectedPaise: order.total, paidPaise: paidAmountPaise },
      },
    });
    return { issued: 0 };
  }

  const items = (order.items as OrderItemInput[] | null) ?? [];
  const exp = ticketTokenExpiry(order.event.endsAt);

  let oversold = false;
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
        feePaise: fees?.feePaise ?? null,
        taxPaise: fees?.taxPaise ?? null,
        status: "CAPTURED",
      },
    });

    // Oversell guard (build-plan R1.1 / security §3.1): creation-time capacity checks don't
    // reserve, so concurrent PENDING orders can both pay. The conditional UPDATE makes the DB
    // the referee — soldQty can never exceed totalQty. All-or-nothing; compensated on shortfall.
    const reserved: OrderItemInput[] = [];
    let shortfallTypeId: string | null = null;
    for (const it of items) {
      const n = await tx.$executeRaw`UPDATE "TicketType" SET "soldQty" = "soldQty" + ${it.qty} WHERE "id" = ${it.ticketTypeId} AND "soldQty" + ${it.qty} <= "totalQty"`;
      if (n === 0) {
        shortfallTypeId = it.ticketTypeId;
        break;
      }
      reserved.push(it);
    }
    if (shortfallTypeId) {
      for (const r of reserved) {
        await tx.$executeRaw`UPDATE "TicketType" SET "soldQty" = "soldQty" - ${r.qty} WHERE "id" = ${r.ticketTypeId}`;
      }
      // Money stays CAPTURED (no-refund rule; ops resolves manually) — but never issue tickets.
      await tx.auditLog.create({
        data: {
          action: "REJECT",
          entity: "Order",
          entityId: order.id,
          after: { reason: "OVERSOLD", gatewayOrderId, paymentId, ticketTypeId: shortfallTypeId },
        },
      });
      oversold = true;
      return;
    }

    // Group-QR (R1.2/M1): ONE ticket per order line — a single QR admits the whole group
    // (admitCount = qty). Check-in admits partially until the count is exhausted.
    const ticketRows = items.map((it) => {
      const id = randomUUID();
      return { id, orderId: order.id, ticketTypeId: it.ticketTypeId, qrToken: signTicketToken(id, undefined, exp), admitCount: it.qty };
    });
    await tx.ticket.createMany({ data: ticketRows });

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

  if (oversold) {
    logError("fulfillOrder.oversold", new Error("OVERSOLD"), { orderId: order.id, gatewayOrderId, paymentId });
    try {
      const { notify } = await import("@/server/notifications/admin");
      await notify({
        type: "OVERSOLD",
        title: "Paid order has no inventory",
        body: `Order ${order.id.slice(0, 8)} captured payment but tickets were sold out — resolve manually.`,
        href: `/admin/tickets/orders/${order.id}`,
        eventId: order.eventId,
      });
    } catch (e) {
      logError("fulfillOrder.oversold.notify", e, { orderId: order.id });
    }
    return { issued: 0 };
  }

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

/** Live unexpired PENDING orders — powers the wallet "confirming payment" card (R1.4). */
export function listPendingOrders(userId: string) {
  return db.order.findMany({
    where: { userId, status: "PENDING", expiresAt: { gt: new Date() } },
    select: { id: true, total: true, createdAt: true, event: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function listUserTickets(userId: string) {
  return db.ticket.findMany({
    where: { order: { userId, status: "PAID" } },
    include: {
      ticketType: { select: { name: true } },
      order: { include: { event: { select: { name: true, slug: true, startsAt: true, location: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
