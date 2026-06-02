import { PrismaClient } from "@prisma/client";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

// Proves the ticket money path WITHOUT spending money: create a real Razorpay order (no charge),
// then drive fulfilment with a SELF-SIGNED webhook (no charge). Needs the dev server running.
// Run: npm run dev  (in another shell)  then  node --env-file=.env scripts/verify-checkout.mjs

const db = new PrismaClient();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const APP = "http://localhost:3000";

async function main() {
  if (!WEBHOOK_SECRET) throw new Error("RAZORPAY_WEBHOOK_SECRET not set");

  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" }, include: { ticketTypes: true } });
  if (!event || event.ticketTypes.length === 0) throw new Error("Seed first.");
  const tt = event.ticketTypes[0];

  // 1) real Razorpay order (creating an order does NOT charge anyone)
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const rzpOrder = await rzp.orders.create({ amount: tt.priceInPaise, currency: "INR", receipt: "verify-checkout", notes: { test: "1" } });
  console.log("razorpay order created (no charge):", rzpOrder.id);

  // 2) our PENDING order mapped to it
  const order = await db.order.create({
    data: {
      userId: "customer_seed",
      eventId: event.id,
      status: "PENDING",
      subtotal: tt.priceInPaise,
      discount: 0,
      total: tt.priceInPaise,
      items: [{ ticketTypeId: tt.id, qty: 1 }],
      gatewayOrderId: rzpOrder.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const soldBefore = tt.soldQty;

  // 3) self-signed payment.captured webhook
  const paymentId = `pay_test_${Date.now()}`;
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: rzpOrder.id } } } });
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  const post = () =>
    fetch(`${APP}/api/payments/razorpay/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": signature },
      body,
    });

  const r1 = await post();
  console.log("webhook #1:", r1.status);
  const paid = await db.order.findUnique({ where: { id: order.id } });
  const issued1 = await db.ticket.count({ where: { orderId: order.id } });
  console.log(`order=${paid.status}, tickets=${issued1}`);
  if (paid.status !== "PAID" || issued1 !== 1) throw new Error("FAIL: fulfilment");

  // 4) replay → idempotent (no extra tickets)
  await post();
  const issued2 = await db.ticket.count({ where: { orderId: order.id } });
  console.log(`after replay tickets=${issued2}`);
  if (issued2 !== 1) throw new Error("FAIL: not idempotent");

  // cleanup
  await db.payment.deleteMany({ where: { orderId: order.id } });
  await db.ticket.deleteMany({ where: { orderId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.ticketType.update({ where: { id: tt.id }, data: { soldQty: soldBefore } });
  console.log("OK: order created (no charge) + webhook fulfilment + idempotent");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
