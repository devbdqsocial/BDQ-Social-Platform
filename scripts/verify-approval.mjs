import { PrismaClient, Prisma } from "@prisma/client";

// Proves vendor approval creates a Booking (BOOKED) and the partial-unique index blocks assigning
// the same stall twice. Mirrors src/server/vendors/admin-service.ts approveVendor.
// Run: node --env-file=.env scripts/verify-approval.mjs

const db = new PrismaClient();

async function main() {
  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" } });
  if (!event) throw new Error("Seed first.");
  const stall = await db.stall.findFirst({ where: { eventId: event.id, kind: "STALL" } });
  if (!stall) throw new Error("No stalls; run the seed.");

  // temp vendors
  await db.user.upsert({ where: { id: "vtest_a" }, update: {}, create: { id: "vtest_a", role: "VENDOR", phone: "+910000009001" } });
  await db.user.upsert({ where: { id: "vtest_b" }, update: {}, create: { id: "vtest_b", role: "VENDOR", phone: "+910000009002" } });
  const pa = await db.vendorProfile.upsert({ where: { userId: "vtest_a" }, update: {}, create: { userId: "vtest_a", brandName: "Test A" } });
  const pb = await db.vendorProfile.upsert({ where: { userId: "vtest_b" }, update: {}, create: { userId: "vtest_b", brandName: "Test B" } });

  // clean slate for this stall
  await db.booking.deleteMany({ where: { stallId: stall.id } });
  await db.stall.update({ where: { id: stall.id }, data: { status: "AVAILABLE", holdUntil: null } });

  // approve A → Booking + Stall BOOKED
  await db.$transaction(async (tx) => {
    await tx.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: pa.id, source: "VENDOR", status: "BOOKED" } });
    await tx.stall.update({ where: { id: stall.id }, data: { status: "BOOKED" } });
    await tx.vendorProfile.update({ where: { id: pa.id }, data: { approvalStatus: "APPROVED" } });
  });
  const sAfter = await db.stall.findUnique({ where: { id: stall.id } });
  const bA = await db.booking.findFirst({ where: { stallId: stall.id, vendorProfileId: pa.id, status: "BOOKED" } });
  console.log(`A approved: booking=${!!bA}, stall=${sAfter.status}`);
  if (!bA || sAfter.status !== "BOOKED") throw new Error("FAIL: A approval");

  // approve B → same stall → must be blocked by the partial-unique index
  let blocked = false;
  try {
    await db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: pb.id, source: "VENDOR", status: "BOOKED" } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") blocked = true;
    else throw e;
  }
  console.log(`B double-assign blocked: ${blocked}`);
  if (!blocked) throw new Error("FAIL: double-assign not blocked");

  // cleanup
  await db.booking.deleteMany({ where: { stallId: stall.id } });
  await db.stall.update({ where: { id: stall.id }, data: { status: "AVAILABLE", holdUntil: null } });
  await db.vendorProfile.deleteMany({ where: { id: { in: [pa.id, pb.id] } } });
  await db.user.deleteMany({ where: { id: { in: ["vtest_a", "vtest_b"] } } });
  console.log("OK: approval creates Booking + no double-assign");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
