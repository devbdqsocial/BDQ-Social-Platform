import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { db } from "@/server/db";
import { fulfillOrder } from "@/server/tickets/service";
import { fulfillStallBooking } from "@/server/bookings/payment";
import { fulfillAddOnOrder } from "@/server/addons/service";
import { recordHeartbeat, HEARTBEAT } from "@/server/system/heartbeat";
import { logError } from "@/lib/logger";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const isUniqueViolation = (e: unknown) =>
  (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") ||
  (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002");

/**
 * Razorpay webhook — the ONLY trusted source of payment confirmation (never the client callback).
 * Verifies the HMAC signature, then fulfils idempotently. Responds 2xx fast.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = env.RAZORPAY_WEBHOOK_SECRET ?? "";

  if (!verifyWebhookSignature(raw, signature, secret)) {
    logError("webhook.razorpay", new Error("BAD_SIGNATURE"), {
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim(),
    });
    return NextResponse.json({ ok: false, error: { code: "BAD_SIGNATURE" } }, { status: 400 });
  }

  void recordHeartbeat(HEARTBEAT.webhook); // command-center liveness; never blocks fulfilment

  let evt: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; amount?: number | null; fee?: number | null; tax?: number | null } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventId = req.headers.get("x-razorpay-event-id");
  if (eventId) {
    try {
      await db.webhookEvent.create({
        data: { provider: "RAZORPAY", eventId, eventType: evt.event ?? null },
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      logError("webhook.razorpay.dedupe", e, { eventId, eventType: evt.event });
      return NextResponse.json({ ok: false, error: { code: "DEDUPE_FAILED" } }, { status: 500 });
    }
  }

  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    const payment = evt.payload?.payment?.entity;
    const gatewayOrderId = payment?.order_id ?? evt.payload?.order?.entity?.id;
    const paymentId = payment?.id ?? (gatewayOrderId ? `order_${gatewayOrderId}` : undefined);
    // Razorpay reports its fee + tax (in paise) on the payment entity; capture for net-revenue accounting.
    const fees = { feePaise: payment?.fee ?? null, taxPaise: payment?.tax ?? null };
    // Defence in depth: the captured amount must match what we charged (verified inside fulfilment).
    const paidAmountPaise = typeof payment?.amount === "number" ? payment.amount : null;
    if (gatewayOrderId && paymentId) {
      try {
        // dispatch: a Razorpay order maps to a ticket Order, a stall add-on order, or a stall Booking
        const order = await db.order.findUnique({ where: { gatewayOrderId }, select: { id: true } });
        if (order) {
          await fulfillOrder(gatewayOrderId, paymentId, fees, paidAmountPaise);
        } else {
          const addOnOrder = await db.bookingAddOnOrder.findUnique({ where: { gatewayOrderId }, select: { id: true } });
          if (addOnOrder) await fulfillAddOnOrder(gatewayOrderId, paymentId, fees, paidAmountPaise);
          else await fulfillStallBooking(gatewayOrderId, paymentId, fees, paidAmountPaise);
        }
      } catch (e) {
        // Always 2xx so Razorpay does not retry; the reconcile cron is the safety net.
        logError("webhook.razorpay.fulfil", e, { gatewayOrderId, paymentId });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
