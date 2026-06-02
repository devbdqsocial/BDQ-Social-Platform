import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { db } from "@/server/db";
import { fulfillOrder } from "@/server/tickets/service";
import { fulfillStallBooking } from "@/server/bookings/payment";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the ONLY trusted source of payment confirmation (never the client callback).
 * Verifies the HMAC signature, then fulfils idempotently. Responds 2xx fast.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

  if (!verifyWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ ok: false, error: { code: "BAD_SIGNATURE" } }, { status: 400 });
  }

  let evt: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } } };
  };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    const payment = evt.payload?.payment?.entity;
    const gatewayOrderId = payment?.order_id ?? evt.payload?.order?.entity?.id;
    const paymentId = payment?.id ?? (gatewayOrderId ? `order_${gatewayOrderId}` : undefined);
    if (gatewayOrderId && paymentId) {
      try {
        // dispatch: a Razorpay order maps to either a ticket Order or a stall Booking
        const order = await db.order.findUnique({ where: { gatewayOrderId }, select: { id: true } });
        if (order) await fulfillOrder(gatewayOrderId, paymentId);
        else await fulfillStallBooking(gatewayOrderId, paymentId);
      } catch (e) {
        console.error("fulfil webhook", e);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
