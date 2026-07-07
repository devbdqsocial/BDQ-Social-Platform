import "server-only";
import { db } from "@/server/db";
import { createRazorpayOrder, type GatewayFees } from "@/lib/razorpay";
import { getBookingAgreement } from "@/server/bookings/agreement";
import { enqueueVendorNotification } from "@/server/notifications/vendor";

/**
 * Vendor stall payment — approve-before-pay ONLY (booking collapse, build-plan R1.3 /
 * architecture §4.1): RESERVED ──admin approves──► PENDING_PAYMENT ──webhook──► BOOKED.
 * The legacy pay-to-hold flow (Booking HELD → PENDING) is removed; legacy rows are rejected
 * to the audit log until the M2 data migration retires the enum values.
 */

async function stallPrice(stall: { priceInPaise: number | null; stallType: { priceInPaise: number } | null }): Promise<number> {
  return stall.priceInPaise ?? stall.stallType?.priceInPaise ?? 0;
}

/**
 * Create a Razorpay order to PAY for an already-APPROVED stall. The admin approval moved the
 * booking to PENDING_PAYMENT + set payBy; this is the vendor paying within that window.
 */
export async function createStallPaymentOrder(vendorProfileId: string, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { stall: { include: { stallType: { select: { priceInPaise: true } } } } },
  });
  if (!booking || booking.vendorProfileId !== vendorProfileId) throw new Error("Booking not found");
  if (booking.status !== "PENDING_PAYMENT") throw new Error("This booking isn't ready for payment yet");
  if (booking.payBy && booking.payBy < new Date()) throw new Error("Payment window expired — please contact us");
  const agreement = await getBookingAgreement(bookingId);
  if (agreement?.status !== "SIGNED") throw new Error("Sign the event agreement before paying");
  const price = await stallPrice(booking.stall);
  if (price <= 0) throw new Error("This stall has no price set yet");

  const rzp = await createRazorpayOrder(price, booking.id, { kind: "stall", bookingId: booking.id });
  await db.booking.update({ where: { id: booking.id }, data: { gatewayOrderId: rzp.id } });
  return {
    bookingId: booking.id,
    razorpayOrderId: rzp.id,
    amountPaise: price,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "",
  };
}

/**
 * Idempotent fulfilment on the verified webhook: PENDING_PAYMENT → BOOKED (stall follows).
 * Any other status (incl. legacy HELD rows from the removed pay-to-hold flow) is rejected to
 * the audit log for manual resolution — money is never silently dropped.
 */
export async function fulfillStallBooking(
  gatewayOrderId: string,
  paymentId: string,
  fees?: GatewayFees,
  paidAmountPaise?: number | null,
): Promise<{ ok: boolean }> {
  const booking = await db.booking.findUnique({ where: { gatewayOrderId } });
  if (!booking) return { ok: false };
  if (booking.status === "BOOKED") return { ok: true }; // already advanced
  if (booking.status !== "PENDING_PAYMENT") {
    await db.auditLog.create({
      data: {
        action: "REJECT",
        entity: "Booking",
        entityId: booking.id,
        after: { reason: "UNEXPECTED_STATUS", status: booking.status, gatewayOrderId, paymentId },
      },
    });
    return { ok: true }; // 2xx to the webhook; ops resolves via the audit trail
  }

  const booked = await db.$transaction(async (tx) => {
    if (await tx.payment.findUnique({ where: { gatewayRef: paymentId } })) return false;
    const stall = await tx.stall.findUnique({
      where: { id: booking.stallId },
      include: { stallType: { select: { priceInPaise: true } } },
    });
    const amount = stall ? await stallPrice(stall) : 0;

    // Defence in depth: captured amount must match the stall price we charged.
    if (paidAmountPaise != null && paidAmountPaise !== amount) {
      await tx.auditLog.create({
        data: {
          action: "REJECT",
          entity: "Payment",
          entityId: paymentId,
          after: { reason: "AMOUNT_MISMATCH", gatewayOrderId, bookingId: booking.id, expectedPaise: amount, paidPaise: paidAmountPaise },
        },
      });
      return false;
    }

    await tx.booking.update({ where: { id: booking.id }, data: { status: "BOOKED" } });
    await tx.stall.update({ where: { id: booking.stallId }, data: { status: "BOOKED", holdUntil: null, holdUserId: null } });
    await tx.payment.create({
      data: {
        bookingId: booking.id,
        gateway: "RAZORPAY",
        mode: "ONLINE",
        gatewayRef: paymentId,
        amount,
        feePaise: fees?.feePaise ?? null,
        taxPaise: fees?.taxPaise ?? null,
        status: "CAPTURED",
      },
    });
    return true;
  });

  // Post-commit only, never inside the tx (a notify failure must not roll back money);
  // enqueueVendorNotification swallows errors and the dedupe key absorbs webhook retries.
  if (booked && booking.vendorProfileId) {
    await enqueueVendorNotification(booking.vendorProfileId, "vendor-booking-confirmed", { bookingId: booking.id }, `vendor-booked:${booking.id}`);
  }
  return { ok: true };
}
