import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { createRazorpayOrder, type GatewayFees } from "@/lib/razorpay";
import type { CreateAddOnInput, UpdateAddOnInput, AddOnOrderInput } from "@/server/schemas";

/**
 * Stall add-ons (R4.2 / vendor-portal §5, admin-portal §6.5). Admin CRUDs extras per event;
 * a BOOKED vendor orders them via a SEPARATE Razorpay order, fulfilled idempotently by the shared
 * webhook. Prices are admin-entered paise (snapshotted at order time); stock guarded by a
 * conditional UPDATE on `sold` (the ticket oversell pattern). Orders close at startsAt − 48h.
 */

/** Add-on orders may be placed until this long before the event starts (vendor-portal §5). */
const ADDON_CLOSE_MS = 48 * 60 * 60 * 1000;

export function addOnOrdersOpen(startsAt: Date, now = new Date()): boolean {
  return startsAt.getTime() - ADDON_CLOSE_MS > now.getTime();
}

// ── reads ─────────────────────────────────────────────────────────────────────
export function listActiveAddOns(eventId: string) {
  return db.stallAddOn.findMany({ where: { eventId, active: true }, orderBy: { pricePaise: "asc" } });
}

export function listAddOnsForAdmin(eventId: string) {
  return db.stallAddOn.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } });
}

/** Paid add-on orders for an event (admin orders list / CSV). */
export function listAddOnOrders(eventId: string) {
  return db.bookingAddOnOrder.findMany({
    where: { status: "PAID", booking: { eventId } },
    orderBy: { createdAt: "desc" },
    include: {
      booking: { select: { vendorProfile: { select: { brandName: true } }, stall: { select: { label: true } } } },
      lines: { include: { addOn: { select: { name: true } } } },
      payment: { select: { createdAt: true, gatewayRef: true } },
    },
  });
}

/** A vendor's paid add-ons for a booking (shown on the /add-ons surface). */
export function listBookingAddOns(bookingId: string) {
  return db.bookingAddOnOrder.findMany({
    where: { bookingId, status: "PAID" },
    orderBy: { createdAt: "desc" },
    include: { lines: { include: { addOn: { select: { name: true } } } } },
  });
}

// ── admin CRUD (audited) ────────────────────────────────────────────────────────
export function createAddOn(session: Session, input: CreateAddOnInput) {
  return withAudit(session, { action: "CREATE", entity: "StallAddOn" }, async () => ({
    before: null,
    run: async () => {
      const addOn = await db.stallAddOn.create({
        data: {
          eventId: input.eventId,
          name: input.name,
          pricePaise: input.pricePaise,
          maxPerBooking: input.maxPerBooking,
          stock: input.stock ?? null,
          active: input.active,
        },
      });
      return { result: addOn, after: addOn };
    },
  }));
}

export function updateAddOn(session: Session, input: UpdateAddOnInput) {
  return withAudit(session, { action: "UPDATE", entity: "StallAddOn", entityId: input.id }, async () => {
    const before = await db.stallAddOn.findUnique({ where: { id: input.id } });
    return {
      before,
      run: async () => {
        const addOn = await db.stallAddOn.update({
          where: { id: input.id },
          data: {
            name: input.name,
            pricePaise: input.pricePaise,
            maxPerBooking: input.maxPerBooking,
            stock: input.stock ?? null,
            active: input.active,
          },
        });
        return { result: addOn, after: addOn };
      },
    };
  });
}

/** Hard-delete only when never ordered (FK RESTRICT); otherwise admin deactivates instead. */
export function deleteAddOn(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "StallAddOn", entityId: id }, async () => {
    const before = await db.stallAddOn.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        const lines = await db.bookingAddOn.count({ where: { addOnId: id } });
        if (lines > 0) throw new Error("This add-on has orders — deactivate it instead of deleting.");
        await db.stallAddOn.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}

// ── vendor order + idempotent fulfilment ─────────────────────────────────────────
export interface AddOnOrderResult {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  keyId: string;
}

/**
 * Create a PENDING_PAYMENT add-on order + Razorpay order for a BOOKED vendor. Validates the
 * window (startsAt − 48h), per-add-on max, current stock, and snapshots each price (paise).
 */
export async function createAddOnOrder(vendorProfileId: string, input: AddOnOrderInput): Promise<AddOnOrderResult> {
  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { event: { select: { startsAt: true } } },
  });
  if (!booking || booking.vendorProfileId !== vendorProfileId) throw new Error("Booking not found");
  if (booking.status !== "BOOKED") throw new Error("Confirm your stall before ordering add-ons");
  if (!addOnOrdersOpen(booking.event.startsAt)) throw new Error("Add-on orders are closed for this event");

  const ids = [...new Set(input.items.map((i) => i.addOnId))];
  const addOns = await db.stallAddOn.findMany({ where: { id: { in: ids }, eventId: booking.eventId, active: true } });
  const byId = new Map(addOns.map((a) => [a.id, a]));

  const lines = input.items.map((it) => {
    const a = byId.get(it.addOnId);
    if (!a) throw new Error("That add-on isn't available");
    if (it.qty > a.maxPerBooking) throw new Error(`Up to ${a.maxPerBooking} of ${a.name} per stall`);
    if (a.stock != null && a.sold + it.qty > a.stock) throw new Error(`${a.name} is almost sold out`);
    return { addOnId: a.id, qty: it.qty, pricePaise: a.pricePaise };
  });
  const totalPaise = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  if (totalPaise <= 0) throw new Error("Nothing to order");

  const order = await db.bookingAddOnOrder.create({
    data: { bookingId: booking.id, totalPaise, lines: { create: lines } },
  });

  const rzp = await createRazorpayOrder(totalPaise, order.id, { kind: "addon", addOnOrderId: order.id });
  await db.bookingAddOnOrder.update({ where: { id: order.id }, data: { gatewayOrderId: rzp.id } });

  return {
    orderId: order.id,
    razorpayOrderId: rzp.id,
    amountPaise: totalPaise,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "",
  };
}

/**
 * Idempotent fulfilment on the verified webhook: PENDING_PAYMENT → PAID, decrement stock with a
 * conditional UPDATE (never oversell), record the Payment. Dedupe on Payment.gatewayRef; verify the
 * captured amount. Oversold at capture (rare) keeps the money CAPTURED + writes an OVERSOLD audit.
 */
export async function fulfillAddOnOrder(
  gatewayOrderId: string,
  paymentId: string,
  fees?: GatewayFees,
  paidAmountPaise?: number | null,
): Promise<{ ok: boolean }> {
  const order = await db.bookingAddOnOrder.findUnique({ where: { gatewayOrderId }, include: { lines: true } });
  if (!order) return { ok: false };
  if (order.status === "PAID") return { ok: true };
  if (order.status !== "PENDING_PAYMENT") {
    await db.auditLog.create({
      data: { action: "REJECT", entity: "BookingAddOnOrder", entityId: order.id, after: { reason: "UNEXPECTED_STATUS", status: order.status, gatewayOrderId, paymentId } },
    });
    return { ok: true };
  }

  await db.$transaction(async (tx) => {
    if (await tx.payment.findUnique({ where: { gatewayRef: paymentId } })) return; // duplicate webhook

    if (paidAmountPaise != null && paidAmountPaise !== order.totalPaise) {
      await tx.auditLog.create({
        data: { action: "REJECT", entity: "Payment", entityId: paymentId, after: { reason: "AMOUNT_MISMATCH", gatewayOrderId, addOnOrderId: order.id, expectedPaise: order.totalPaise, paidPaise: paidAmountPaise } },
      });
      return;
    }

    // Conditional stock decrement (the DB is the referee — sold never exceeds stock).
    const reserved: { addOnId: string; qty: number }[] = [];
    let shortfall: string | null = null;
    for (const l of order.lines) {
      const n = await tx.$executeRaw`UPDATE "StallAddOn" SET "sold" = "sold" + ${l.qty} WHERE "id" = ${l.addOnId} AND ("stock" IS NULL OR "sold" + ${l.qty} <= "stock")`;
      if (n === 0) {
        shortfall = l.addOnId;
        break;
      }
      reserved.push({ addOnId: l.addOnId, qty: l.qty });
    }
    if (shortfall) {
      for (const r of reserved) {
        await tx.$executeRaw`UPDATE "StallAddOn" SET "sold" = "sold" - ${r.qty} WHERE "id" = ${r.addOnId}`;
      }
      await tx.auditLog.create({
        data: { action: "REJECT", entity: "BookingAddOnOrder", entityId: order.id, after: { reason: "OVERSOLD", addOnId: shortfall, gatewayOrderId, paymentId } },
      });
      // Money is real and non-refundable — record it + mark PAID; ops hand-fulfils the shortfall.
    }

    await tx.bookingAddOnOrder.update({ where: { id: order.id }, data: { status: "PAID" } });
    await tx.payment.create({
      data: {
        addOnOrderId: order.id,
        gateway: "RAZORPAY",
        mode: "ONLINE",
        gatewayRef: paymentId,
        amount: order.totalPaise,
        feePaise: fees?.feePaise ?? null,
        taxPaise: fees?.taxPaise ?? null,
        status: "CAPTURED",
      },
    });
  });
  return { ok: true };
}
