import { PrismaClient } from "@prisma/client";

// Proves the stall-hold guarantee against the real DB. Mirrors the atomic compare-and-set in
// src/server/bookings/service.ts (holdStall / releaseExpiredHolds).
// Run: node --env-file=.env scripts/verify-hold.mjs

const db = new PrismaClient();
const HOLD_TTL_MS = 10 * 60 * 1000;

async function main() {
  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" } });
  if (!event) throw new Error("Seed first: npm exec -- prisma db seed");
  const stall = await db.stall.findFirst({ where: { eventId: event.id, kind: "STALL" } });
  if (!stall) throw new Error("No stalls for the sample event; run the seed.");

  // reset to a clean AVAILABLE state
  await db.stall.update({ where: { id: stall.id }, data: { status: "AVAILABLE", holdUntil: null } });

  // 1) concurrency — two atomic holds race for the same AVAILABLE stall
  const holdUntil = new Date(Date.now() + HOLD_TTL_MS);
  const cas = () =>
    db.stall.updateMany({
      where: { id: stall.id, status: "AVAILABLE" },
      data: { status: "HELD", holdUntil },
    });
  const [a, b] = await Promise.all([cas(), cas()]);
  const winners = [a.count, b.count].filter((c) => c === 1).length;
  console.log(`concurrency: winners=${winners} (a=${a.count}, b=${b.count})`);
  if (winners !== 1) throw new Error("FAIL: expected exactly one winner (double-book!)");

  // 2) expiry — a hold whose TTL has passed is swept back to AVAILABLE
  await db.stall.update({
    where: { id: stall.id },
    data: { status: "HELD", holdUntil: new Date(Date.now() - 1000) },
  });
  const swept = await db.stall.updateMany({
    where: { status: "HELD", holdUntil: { lt: new Date() } },
    data: { status: "AVAILABLE", holdUntil: null },
  });
  const after = await db.stall.findUnique({ where: { id: stall.id } });
  console.log(`expiry: swept>=1 (${swept.count}), stall now ${after.status}`);
  if (after.status !== "AVAILABLE") throw new Error("FAIL: expired hold not released");

  // cleanup
  await db.stall.update({ where: { id: stall.id }, data: { status: "AVAILABLE", holdUntil: null } });
  console.log("OK: no-double-book hold + expiry verified");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
