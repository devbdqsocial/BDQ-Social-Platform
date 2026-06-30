import { PrismaClient, Prisma } from "@prisma/client";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

// Proves vendor stall payment WITHOUT spending money: real Razorpay order (no charge) + self-signed
// webhook -> Booking BOOKED + Stall BOOKED; idempotent; duplicate booking blocked;
// double-book blocked. Needs the dev server running.
// Run: npm run dev (other shell) then node --env-file=.env scripts/verify-stall-payment.mjs

const db = new PrismaClient();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const APP = "http://localhost:3000";

async function main() {
  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" } });
  const stall = await db.stall.findFirst({ where: { eventId: event.id, kind: "STALL" } });
  const profile = await db.vendorProfile.findUnique({ where: { userId: "vendor_seed" } });
  if (!event || !stall || !profile) throw new Error("Seed first.");

  // clean slate
  await db.payment.deleteMany({ where: { booking: { stallId: stall.id } } });
  await db.booking.deleteMany({ where: { stallId: stall.id } });
  await db.stall.update({ where: { id: stall.id }, data: { status: "AVAILABLE", holdUntil: null, priceInPaise: stall.priceInPaise ?? 1500000 } });
  const price = stall.priceInPaise ?? 1500000;

  // 1) real Razorpay order (no charge) + Booking(PENDING_PAYMENT)
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const order = await rzp.orders.create({ amount: price, currency: "INR", receipt: "verify-stall", notes: { kind: "stall" } });
  console.log("razorpay order (no charge):", order.id);
  const booking = await db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: profile.id, source: "VENDOR", status: "PENDING_PAYMENT", gatewayOrderId: order.id, payBy: new Date(Date.now() + 48 * 3600 * 1000) } });
  await db.stall.update({ where: { id: stall.id }, data: { status: "HELD" } });

  // 2) self-signed webhook
  const paymentId = `pay_stall_${Date.now()}`;
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: order.id, amount: price } } } });
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  const eventId = `evt_verify_stall_${Date.now()}`;
  const post = () => fetch(`${APP}/api/payments/razorpay/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-razorpay-signature": signature, "x-razorpay-event-id": eventId }, body });

  console.log("webhook #1:", (await post()).status);
  const b1 = await db.booking.findUnique({ where: { id: booking.id } });
  const s1 = await db.stall.findUnique({ where: { id: stall.id } });
  const pay = await db.payment.findFirst({ where: { bookingId: booking.id } });
  console.log(`booking=${b1.status}, stall=${s1.status}, payment=${!!pay}`);
  if (b1.status !== "BOOKED" || s1.status !== "BOOKED" || !pay) throw new Error("FAIL: stall fulfilment");

  await post();
  const payCount = await db.payment.count({ where: { bookingId: booking.id } });
  console.log("after replay payments=", payCount);
  if (payCount !== 1) throw new Error("FAIL: not idempotent");

  // 3) double-book blocked
  let blocked = false;
  try {
    await db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: profile.id, source: "VENDOR", status: "BOOKED" } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") blocked = true;
    else throw e;
  }
  console.log("double-book blocked:", blocked);
  if (!blocked) throw new Error("FAIL: double-book not blocked");

  // cleanup
  await db.payment.deleteMany({ where: { bookingId: booking.id } });
  await db.booking.deleteMany({ where: { stallId: stall.id } });
  await db.stall.update({ where: { id: stall.id }, data: { status: "AVAILABLE", holdUntil: null } });
  await db.webhookEvent.deleteMany({ where: { provider: "RAZORPAY", eventId } });
  console.log("OK: stall pay -> BOOKED; idempotent; no double-book; no charge");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
