import { PrismaClient } from "@prisma/client";

// Proves the reminders cron: a paid order on an imminent event enqueues a reminder Outbox row that
// drains to SENT (real Resend send to the simulated address). Dev server running.
// Run: node --env-file=.env scripts/verify-reminders.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";
const CRON = process.env.CRON_SECRET;

async function main() {
  if (!CRON) throw new Error("CRON_SECRET not set");
  const ts = Date.now();

  const user = await db.user.upsert({
    where: { email: "delivered@resend.dev" },
    update: { role: "CUSTOMER" },
    create: { email: "delivered@resend.dev", role: "CUSTOMER", name: "Reminder Test" },
  });
  const event = await db.event.create({
    data: {
      name: `Reminder Test ${ts}`,
      slug: `reminder-test-${ts}`,
      startsAt: new Date(Date.now() + 12 * 3600 * 1000),
      endsAt: new Date(Date.now() + 15 * 3600 * 1000),
      status: "PUBLISHED",
    },
  });
  const order = await db.order.create({
    data: { userId: user.id, eventId: event.id, status: "PAID", subtotal: 0, discount: 0, total: 0 },
  });
  const dedupeKey = `reminder:${event.id}:${user.id}`;

  try {
    const res = await fetch(`${APP}/api/cron/reminders`, { method: "POST", headers: { "x-cron-key": CRON } });
    console.log("reminders cron:", res.status, JSON.stringify((await res.json()).data));

    const ob = await db.outbox.findUnique({ where: { dedupeKey } });
    console.log(`reminder outbox: ${ob?.status} (lastError=${ob?.lastError ?? "-"})`);
    if (!ob || ob.status !== "SENT") throw new Error("FAIL: reminder was not sent");

    console.log("OK: reminders cron enqueued + sent (Resend simulated address)");
  } finally {
    await db.outbox.deleteMany({ where: { dedupeKey } });
    await db.order.deleteMany({ where: { id: order.id } });
    await db.event.delete({ where: { id: event.id } });
    await db.user.delete({ where: { id: user.id } }).catch(() => {});
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
