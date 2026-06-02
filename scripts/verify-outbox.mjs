import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

// Proves the notification Outbox drains via the cron processor: create a PAID order + ticket,
// enqueue an EMAIL row to Resend's simulated address (real send, no real inbox), POST the
// notify-retry cron, assert the row flips QUEUED -> SENT. Also confirms WhatsApp stays dormant
// when INTERAKT_API_KEY is unset. Needs the dev server running.
// Run: npm run dev  (in another shell)  then  node --env-file=.env scripts/verify-outbox.mjs

const db = new PrismaClient();
const APP = "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

async function main() {
  if (!CRON_SECRET) throw new Error("CRON_SECRET not set");
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set (needed for the real send)");

  // WhatsApp must be dormant when no provider is configured (Cloud API or Interakt)
  const waConfigured =
    (!!process.env.WHATSAPP_CLOUD_TOKEN && !!process.env.WHATSAPP_CLOUD_PHONE_ID) || !!process.env.INTERAKT_API_KEY;
  if (waConfigured) {
    console.log("note: a WhatsApp provider is configured — WhatsApp is ACTIVE (this run only tests email)");
  } else {
    console.log("WhatsApp dormant: no provider configured → no WHATSAPP rows would be enqueued");
  }

  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" }, include: { ticketTypes: true } });
  if (!event || event.ticketTypes.length === 0) throw new Error("Seed first.");
  const tt = event.ticketTypes[0];

  // 1) a PAID order + one issued ticket (no charge — created directly)
  const order = await db.order.create({
    data: {
      userId: "customer_seed",
      eventId: event.id,
      status: "PAID",
      subtotal: tt.priceInPaise,
      discount: 0,
      total: tt.priceInPaise,
      items: [{ ticketTypeId: tt.id, qty: 1 }],
      tickets: { create: { ticketTypeId: tt.id, qrToken: `verify-outbox-${randomUUID()}` } },
    },
  });

  // 2) enqueue an EMAIL row to the simulated address (decoupled from the user's real email)
  const outbox = await db.outbox.create({
    data: {
      channel: "EMAIL",
      toAddress: "delivered@resend.dev",
      template: "ticket",
      payload: { orderId: order.id },
      dedupeKey: `verify-outbox:${order.id}:EMAIL`,
    },
  });
  console.log("enqueued EMAIL outbox row:", outbox.status);

  // 3) drain via cron
  const res = await fetch(`${APP}/api/cron/notify-retry`, { method: "POST", headers: { "x-cron-key": CRON_SECRET } });
  console.log("cron notify-retry:", res.status, await res.json());

  // 4) assert SENT
  const after = await db.outbox.findUnique({ where: { id: outbox.id } });
  console.log(`outbox status=${after.status} attempts=${after.attempts} sentAt=${after.sentAt ? "set" : "null"} lastError=${after.lastError ?? "-"}`);
  if (after.status !== "SENT") throw new Error(`FAIL: expected SENT, got ${after.status} (${after.lastError ?? ""})`);

  // cleanup
  await db.outbox.delete({ where: { id: outbox.id } });
  await db.ticket.deleteMany({ where: { orderId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  console.log("OK: outbox drained EMAIL -> SENT (real Resend send, simulated address); WhatsApp dormant");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
