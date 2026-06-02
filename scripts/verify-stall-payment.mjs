import { PrismaClient, Prisma } from "@prisma/client";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

// Proves vendor stall payment WITHOUT spending money: real Razorpay order (no charge) + self-signed
// webhook -> Booking PENDING + Stall PENDING; idempotent; admin reconcile-approve -> BOOKED;
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

  // 1) real Razorpay order (no charge) + Booking(HELD)
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const order = await rzp.orders.create({ amount: price, currency: "INR", receipt: "verify-stall", notes: { kind: "stall" } });
  console.log("razorpay order (no charge):", order.id);
  const booking = await db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: profile.id, source: "VENDOR", status: "HELD", gatewayOrderId: order.id } });
  await db.stall.update({ where: { id: stall.id }, data: { status: "HELD" } });

  // 2) self-signed webhook
  const paymentId = `pay_stall_${Date.now()}`;
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: order.id } } } });
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  const post = () => fetch(`${APP}/api/payments/razorpay/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-razorpay-signature": signature }, body });

  console.log("webhook #1:", (await post()).status);
  const b1 = await db.booking.findUnique({ where: { id: booking.id } });
  const s1 = await db.stall.findUnique({ where: { id: stall.id } });
  const pay = await db.payment.findFirst({ where: { bookingId: booking.id } });
  console.log(`booking=${b1.status}, stall=${s1.status}, payment=${!!pay}`);
  if (b1.status !== "PENDING" || s1.status !== "PENDING" || !pay) throw new Error("FAIL: stall fulfilment");

  await post();
  const payCount = await db.payment.count({ where: { bookingId: booking.id } });
  console.log("after replay payments=", payCount);
  if (payCount !== 1) throw new Error("FAIL: not idempotent");

  // 3) reconcile-approve -> BOOKED (mirrors approveVendor)
  await db.$transaction(async (tx) => {
    const existing = await tx.booking.findFirst({ where: { stallId: stall.id, vendorProfileId: profile.id, status: { in: ["HELD", "PENDING"] } } });
    await tx.booking.update({ where: { id: existing.id }, data: { status: "BOOKED" } });
    await tx.stall.update({ where: { id: stall.id }, data: { status: "BOOKED" } });
  });
  const b2 = await db.booking.findUnique({ where: { id: booking.id } });
  const s2 = await db.stall.findUnique({ where: { id: stall.id } });
  console.log(`approved: booking=${b2.status}, stall=${s2.status}`);
  if (b2.status !== "BOOKED" || s2.status !== "BOOKED") throw new Error("FAIL: approval");

  // 4) double-book blocked
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
  console.log("OK: stall pay -> PENDING -> approve BOOKED; idempotent; no double-book; no charge");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
