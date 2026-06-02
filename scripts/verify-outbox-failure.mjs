import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

// Proves graceful retry: an outbox EMAIL that can't be delivered (bad address) flips to FAILED with
// attempts tracked + lastError set, and stays retryable — a provider outage never loses a ticket.
// Needs the dev server running. Run: node --env-file=.env scripts/verify-outbox-failure.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";
const CRON = process.env.CRON_SECRET;

async function main() {
  if (!CRON) throw new Error("CRON_SECRET not set");

  const event = await db.event.findFirst({ where: { slug: "bdq-social-october-edition" }, include: { ticketTypes: true } });
  if (!event) throw new Error("Seed first.");
  const tt = event.ticketTypes[0];

  // a real paid order + ticket so buildTicketEmail has something to render
  const order = await db.order.create({
    data: { userId: "customer_seed", eventId: event.id, status: "PAID", subtotal: 0, discount: 0, total: 0, items: [{ ticketTypeId: tt.id, qty: 1 }] },
  });
  const tid = randomUUID();
  await db.ticket.create({ data: { id: tid, orderId: order.id, ticketTypeId: tt.id, qrToken: `failrow-${tid}` } });

  const dedupeKey = `verify-fail:${order.id}:EMAIL`;
  await db.outbox.create({
    data: { channel: "EMAIL", toAddress: "not-an-email", template: "ticket", payload: { orderId: order.id }, dedupeKey },
  });

  try {
    const res = await fetch(`${APP}/api/cron/notify-retry`, { method: "POST", headers: { "x-cron-key": CRON } });
    console.log("notify-retry:", res.status, JSON.stringify((await res.json()).data));

    const row = await db.outbox.findUnique({ where: { dedupeKey } });
    console.log(`outbox: status=${row?.status} attempts=${row?.attempts} lastError=${row?.lastError ? "set" : "none"}`);
    if (!row || row.status !== "FAILED") throw new Error("FAIL: expected FAILED");
    if (!(row.attempts >= 1 && row.attempts < 5)) throw new Error("FAIL: attempts not tracked / not retryable");
    if (!row.lastError) throw new Error("FAIL: lastError not recorded");

    console.log("OK: failed send → FAILED + attempts tracked + still retryable (no ticket lost)");
  } finally {
    await db.outbox.deleteMany({ where: { dedupeKey } });
    await db.ticket.deleteMany({ where: { id: tid } });
    await db.order.deleteMany({ where: { id: order.id } });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
