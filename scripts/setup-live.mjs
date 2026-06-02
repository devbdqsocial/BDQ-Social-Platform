import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

// Go-live data setup against the (shared) Neon DB. Idempotent. Wipes demo data, stands up the real
// event as an empty shell, and enrols a password-only test SUPER_ADMIN.
// Run: node --env-file=.env scripts/setup-live.mjs <adminEmail> <adminPassword>

const db = new PrismaClient();

// Matches src/lib/password.ts (salt:hash hex, scrypt, keylen 64).
function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

/** Delete everything hanging off an event, FK-safe. */
async function wipeEventChildren(eventId) {
  const orders = await db.order.findMany({ where: { eventId }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  const tickets = await db.ticket.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
  const ticketIds = tickets.map((t) => t.id);
  if (ticketIds.length) await db.checkIn.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await db.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
  const bookings = await db.booking.findMany({ where: { eventId }, select: { id: true } });
  await db.payment.deleteMany({ where: { OR: [{ orderId: { in: orderIds } }, { bookingId: { in: bookings.map((b) => b.id) } }] } });
  await db.order.deleteMany({ where: { eventId } });
  await db.booking.deleteMany({ where: { eventId } });
  await db.lead.deleteMany({ where: { eventId } });
  await db.sponsor.deleteMany({ where: { eventId } });
  await db.waitlist.deleteMany({ where: { eventId } });
  await db.scheduleItem.deleteMany({ where: { eventId } });
  await db.ticketType.deleteMany({ where: { eventId } });
  await db.stall.deleteMany({ where: { eventId } });
  await db.mapLayout.deleteMany({ where: { eventId } });
}

async function main() {
  const email = (process.argv[2] || "admin@bdqsocial.com").toLowerCase();
  const password = process.argv[3];
  if (!password) {
    console.error('Usage: node --env-file=.env scripts/setup-live.mjs <adminEmail> "<adminPassword>"');
    process.exit(1);
  }

  // 1) Real event (repurpose the october seed, or create fresh). Empty shell — content added in admin.
  const realData = {
    name: "BDQ Social",
    slug: "bdq-social",
    description:
      "Vadodara's premium curated night market. Three nights — 30 & 31 October and 1 November — 4 PM to 11 PM each evening at Aarush Lawn. 80+ indie brands, gourmet food, live music, and Instagrammable spaces.",
    location: "Aarush Lawn, Vadodara",
    startsAt: new Date("2026-10-30T16:00:00+05:30"),
    endsAt: new Date("2026-11-01T23:00:00+05:30"),
    status: "PUBLISHED",
    capacity: 3000,
  };
  const existing = await db.event.findFirst({ where: { OR: [{ slug: "bdq-social-october-edition" }, { slug: "bdq-social" }] }, select: { id: true } });
  if (existing) {
    await wipeEventChildren(existing.id);
    await db.event.update({ where: { id: existing.id }, data: realData });
    console.log(`Real event ready (empty shell): ${realData.slug}`);
  } else {
    await db.event.create({ data: { ...realData, createdById: "admin_seed" } });
    console.log(`Real event created (empty shell): ${realData.slug}`);
  }

  // 2) Delete the December demo event entirely.
  const dec = await db.event.findFirst({ where: { slug: "bdq-social-december-edition" }, select: { id: true } });
  if (dec) {
    await wipeEventChildren(dec.id);
    await db.event.delete({ where: { id: dec.id } });
    console.log("Deleted demo event: bdq-social-december-edition");
  }

  // 3) Remove demo vendor profiles (cascades assets/kyc/contract/leads).
  const removed = await db.vendorProfile.deleteMany({ where: { userId: { in: ["vendor_seed", "vendor_approved"] } } });
  if (removed.count) console.log(`Removed ${removed.count} demo vendor profile(s)`);

  // 4) Enrol the password-only test SUPER_ADMIN (no TOTP — pair with ADMIN_NO_2FA_EMAILS).
  const admin = await db.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", passwordHash: hashPassword(password), totpEnabled: false, totpSecret: null },
    create: { email, name: "BDQ Admin", role: "SUPER_ADMIN", passwordHash: hashPassword(password), totpEnabled: false },
  });
  console.log(`\nTest admin ready: ${email} (${admin.id})`);
  console.log(`→ Set this in Vercel + .env so password-only login works:`);
  console.log(`   ADMIN_NO_2FA_EMAILS=${email}`);
  console.log(`Sign in at /admin/login with this email + the password you passed.\n`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
