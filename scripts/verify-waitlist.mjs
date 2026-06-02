import { PrismaClient } from "@prisma/client";

// Proves the notify-me capture: POST /api/waitlist creates a row and is deduped. Dev server running.
// Run: node --env-file=.env scripts/verify-waitlist.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";

async function main() {
  const ev = await db.event.findFirst({ select: { id: true } });
  if (!ev) throw new Error("Seed first.");
  const contact = `verify-wl+${Date.now()}@example.com`;
  await db.rateLimit.deleteMany({ where: { key: "waitlist:local" } });

  const post = () =>
    fetch(`${APP}/api/waitlist`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: ev.id, type: "TICKET", contact }) });

  const r1 = await post();
  console.log("join:", r1.status);
  if (r1.status !== 200) throw new Error("FAIL: join rejected");

  await post(); // duplicate → should not create a second row
  const rows = await db.waitlist.findMany({ where: { eventId: ev.id, contact } });
  console.log("rows for contact:", rows.length);
  if (rows.length !== 1) throw new Error("FAIL: not deduped");

  await db.waitlist.deleteMany({ where: { eventId: ev.id, contact } });
  console.log("OK: waitlist capture + dedupe");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
