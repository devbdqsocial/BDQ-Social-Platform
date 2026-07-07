import "server-only";
import { Prisma, type PaymentMode } from "@prisma/client";
import { withAuditTx } from "@/server/audit";
import { db } from "@/server/db";
import { enqueueVendorNotification } from "@/server/notifications/vendor";
import type { Session } from "@/server/auth/guard";

type OfflinePaymentCode =
  | "REFERENCE_REQUIRED"
  | "NOTE_REQUIRED"
  | "INVALID_AMOUNT"
  | "INVALID_RECEIVED_AT"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_PENDING"
  | "AMOUNT_MISMATCH"
  | "DUPLICATE_REFERENCE";

export class OfflinePaymentError extends Error {
  constructor(public code: OfflinePaymentCode) {
    super(code);
    this.name = "OfflinePaymentError";
  }
}

interface OfflinePaymentDetailsInput {
  amountPaise: number;
  gatewayRef: string;
  note: string;
  receivedAt?: Date | string | null;
}

interface OfflinePaymentDetails {
  amountPaise: number;
  gatewayRef: string;
  note: string;
  receivedAt: Date;
}

interface CreateOfflinePaymentInput extends OfflinePaymentDetails {
  orderId?: string;
  bookingId?: string;
  recordedById: string;
  paymentMode?: PaymentMode;
}

function stallPrice(stall: { priceInPaise: number | null; stallType: { priceInPaise: number } | null }): number {
  return stall.priceInPaise ?? stall.stallType?.priceInPaise ?? 0;
}

export function normalizeOfflinePaymentDetails(input: OfflinePaymentDetailsInput): OfflinePaymentDetails {
  const gatewayRef = input.gatewayRef.trim();
  const note = input.note.trim();
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  if (!gatewayRef) throw new OfflinePaymentError("REFERENCE_REQUIRED");
  if (!note) throw new OfflinePaymentError("NOTE_REQUIRED");
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) throw new OfflinePaymentError("INVALID_AMOUNT");
  if (Number.isNaN(receivedAt.getTime())) throw new OfflinePaymentError("INVALID_RECEIVED_AT");
  return { amountPaise: input.amountPaise, gatewayRef, note, receivedAt };
}

export async function createOfflinePayment(tx: Prisma.TransactionClient, input: CreateOfflinePaymentInput) {
  try {
    return await tx.payment.create({
      data: {
        orderId: input.orderId,
        bookingId: input.bookingId,
        gateway: "OFFLINE",
        mode: input.paymentMode ?? "OFFLINE",
        gatewayRef: input.gatewayRef,
        amount: input.amountPaise,
        status: "CAPTURED",
        recordedById: input.recordedById,
        meta: {
          note: input.note,
          receivedAt: input.receivedAt.toISOString(),
        },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new OfflinePaymentError("DUPLICATE_REFERENCE");
    }
    throw e;
  }
}

export async function recordOfflineStallPayment(session: Session, input: OfflinePaymentDetailsInput & { bookingId: string }) {
  const details = normalizeOfflinePaymentDetails(input);
  const result = await withAuditTx(session, { action: "OFFLINE_PAYMENT", entity: "Booking", entityId: input.bookingId }, async (tx) => {
    const before = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        status: true,
        stallId: true,
        payment: { select: { id: true, gatewayRef: true } },
        stall: { select: { id: true, priceInPaise: true, stallType: { select: { priceInPaise: true } } } },
      },
    });
    return {
      before,
      run: async (runTx) => {
        if (!before) throw new OfflinePaymentError("BOOKING_NOT_FOUND");
        if (before.status !== "PENDING_PAYMENT") throw new OfflinePaymentError("BOOKING_NOT_PENDING");
        const expected = stallPrice(before.stall);
        if (details.amountPaise !== expected) throw new OfflinePaymentError("AMOUNT_MISMATCH");
        const payment = await createOfflinePayment(runTx, { ...details, bookingId: before.id, recordedById: session.userId });
        await runTx.booking.update({ where: { id: before.id }, data: { status: "BOOKED" } });
        await runTx.stall.update({ where: { id: before.stallId }, data: { status: "BOOKED", holdUntil: null, holdUserId: null } });
        return { result: { bookingId: before.id, paymentId: payment.id }, after: { status: "BOOKED", paymentId: payment.id, amountPaise: details.amountPaise } };
      },
    };
  });

  // Post-commit vendor confirmation — the offline path mirrors the webhook path (same dedupe key).
  const b = await db.booking.findUnique({ where: { id: input.bookingId }, select: { vendorProfileId: true } });
  if (b?.vendorProfileId) {
    await enqueueVendorNotification(b.vendorProfileId, "vendor-booking-confirmed", { bookingId: input.bookingId }, `vendor-booked:${input.bookingId}`);
  }
  return result;
}
