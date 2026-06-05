import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createRazorpayOrder } from "@/lib/razorpay";
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

/** Idempotent: a paid stall booking → PENDING (awaiting verification) + Payment + Stall PENDING. */
export async function fulfillStallBooking(gatewayOrderId: string, paymentId: string): Promise<{ ok: boolean }> {
  const booking = await db.booking.findUnique({ where: { gatewayOrderId } });
  if (!booking) return { ok: false };
  if (booking.status !== "HELD") return { ok: true }; // already advanced

  await db.$transaction(async (tx) => {
    if (await tx.payment.findUnique({ where: { gatewayRef: paymentId } })) return;
    const stall = await tx.stall.findUnique({
      where: { id: booking.stallId },
      include: { stallType: { select: { priceInPaise: true } } },
    });
    const amount = stall ? await stallPrice(stall) : 0;

    await tx.booking.update({ where: { id: booking.id }, data: { status: "PENDING" } });
    await tx.stall.update({ where: { id: booking.stallId }, data: { status: "PENDING" } });
    await tx.payment.create({
      data: { bookingId: booking.id, gateway: "RAZORPAY", mode: "ONLINE", gatewayRef: paymentId, amount, status: "CAPTURED" },
    });
  });
  return { ok: true };
}
