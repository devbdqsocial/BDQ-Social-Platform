import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { fetchCapturedPayment } from "@/lib/razorpay";
import { fulfillOrder } from "@/server/tickets/service";

export const runtime = "nodejs";

/**
 * Safety net for missed webhooks: for stale PENDING orders, ask Razorpay whether the payment was
 * captured and fulfil (idempotent); expire ones that never paid. Triggered by Vercel Cron.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed =
    !!secret &&
    (req.headers.get("authorization") === `Bearer ${secret}` || req.headers.get("x-cron-key") === secret);
  if (!authed) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });

  const cutoff = new Date(Date.now() - 2 * 60 * 1000); // give webhooks ~2 min first
  const pending = await db.order.findMany({
    where: { status: "PENDING", gatewayOrderId: { not: null }, createdAt: { lt: cutoff } },
    select: { id: true, gatewayOrderId: true, expiresAt: true },
    take: 100,
  });

  let fulfilled = 0;
  let expired = 0;
  const now = new Date();
  for (const o of pending) {
    try {
      const cap = await fetchCapturedPayment(o.gatewayOrderId!);
      if (cap) {
        await fulfillOrder(o.gatewayOrderId!, cap.id);
        fulfilled++;
        continue;
      }
    } catch {
      // Razorpay unconfigured or transient error → leave for the next sweep
    }
    if (o.expiresAt && o.expiresAt < now) {
      await db.order.update({ where: { id: o.id }, data: { status: "EXPIRED" } });
      expired++;
    }
  }

  return NextResponse.json({ ok: true, data: { scanned: pending.length, fulfilled, expired } });
}

export const GET = handle;
export const POST = handle;
