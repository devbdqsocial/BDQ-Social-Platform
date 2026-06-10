import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createRazorpayOrder, type GatewayFees } from "@/lib/razorpay";
import { StallUnavailableError } from "@/server/bookings/service";

/**
 * Vendor stall payment. Mirrors ticket checkout: create a Razorpay order, fulfil on the verified
 * webhook. A Booking(HELD) holds the stall during payment; the webhook advances it to PENDING
 * (paid, awaiting team-call verification); admin approval flips it to BOOKED.
 */

async function stallPrice(stall: { priceInPaise: number | null; stallType: { priceInPaise: number } | null }): Promise<number> {
  return stall.priceInPaise ?? stall.stallType?.priceInPaise ?? 0;
}

export async function createStallOrder(vendorProfileId: string, stallId: string) {
  const stall = await db.stall.findUnique({
    where: { id: stallId },
    include: { stallType: { select: { priceInPaise: true } } },
  });
  if (!stall || stall.kind !== "STALL") throw new Error("Stall not found");
  if (stall.status === "BOOKED" || stall.status === "BLOCKED" || stall.status === "PENDING") {
    throw new StallUnavailableError();
  }
  const price = await stallPrice(stall);
  if (price <= 0) throw new Error("This stall has no price set yet");

  let booking;
  try {
    booking = await db.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: { eventId: stall.eventId, stallId, vendorProfileId, source: "VENDOR", status: "HELD" },
      });
      // hold without TTL while paying (avoids the cron freeing a stall mid-payment). Compare-and-set
      // so we never hold a stall that has meanwhile been taken — defence beyond the partial unique
      // index on Booking that ultimately guarantees one active booking per stall.
      const held = await tx.stall.updateMany({
        where: { id: stallId, status: { in: ["AVAILABLE", "HELD"] } },
        data: { status: "HELD", holdUntil: null },
      });
      if (held.count === 0) throw new StallUnavailableError();
      return b;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new StallUnavailableError();
    throw e;
  }

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
 * Create a Razorpay order to PAY for an already-APPROVED stall (approve-before-pay flow). The admin
 * approval moved the booking to PENDING_PAYMENT + set payBy; this is the vendor paying within that
 * window. Distinct from the legacy `createStallOrder` (pay-to-hold).
 */
export async function createStallPaymentOrder(vendorProfileId: string, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { stall: { include: { stallType: { select: { priceInPaise: true } } } } },
  });
  if (!booking || booking.vendorProfileId !== vendorProfileId) throw new Error("Booking not found");
  if (booking.status !== "PENDING_PAYMENT") throw new Error("This booking isn't ready for payment yet");
  if (booking.payBy && booking.payBy < new Date()) throw new Error("Payment window expired — please contact us");
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
 * Idempotent fulfilment on the verified webhook. An approved booking (PENDING_PAYMENT) → BOOKED;
 * a legacy pay-to-hold booking (HELD) → PENDING (awaiting verification). Stall follows.
 */
export async function fulfillStallBooking(
  gatewayOrderId: string,
  paymentId: string,
  fees?: GatewayFees,
): Promise<{ ok: boolean }> {
  const booking = await db.booking.findUnique({ where: { gatewayOrderId } });
  if (!booking) return { ok: false };
  if (booking.status === "BOOKED") return { ok: true }; // already advanced
  if (booking.status !== "HELD" && booking.status !== "PENDING_PAYMENT") return { ok: true };
  const approved = booking.status === "PENDING_PAYMENT";

  await db.$transaction(async (tx) => {
    if (await tx.payment.findUnique({ where: { gatewayRef: paymentId } })) return;
    const stall = await tx.stall.findUnique({
      where: { id: booking.stallId },
      include: { stallType: { select: { priceInPaise: true } } },
    });
    const amount = stall ? await stallPrice(stall) : 0;

    await tx.booking.update({ where: { id: booking.id }, data: { status: approved ? "BOOKED" : "PENDING" } });
    await tx.stall.update({ where: { id: booking.stallId }, data: { status: approved ? "BOOKED" : "PENDING" } });
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
  });
  return { ok: true };
}
