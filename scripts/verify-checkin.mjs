import { PrismaClient } from "@prisma/client";
import { createHmac, randomUUID } from "crypto";

// Proves gate check-in: a valid ticket scans VALID once, re-scan ALREADY_USED, tampered token
// INVALID. Token signing mirrors src/lib/qr-token.ts. Needs the dev server running (dev admin gate).
// Run: npm run dev (other shell) then node --env-file=.env scripts/verify-checkin.mjs

const db = new PrismaClient();
const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret";
const APP = "http://localhost:3000";

const b64url = (s) => Buffer.from(s).toString("base64url");
function signToken(ticketId) {
  const payload = b64url(JSON.stringify({ tid: ticketId, iat: Date.now() }));
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const checkin = (qrToken) =>
  fetch(`${APP}/api/admin/checkin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ qrToken }),
  }).then((r) => r.json());

async function main() {
  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" }, include: { ticketTypes: true } });
  if (!event || !event.ticketTypes.length) throw new Error("Seed first.");
  const tt = event.ticketTypes[0];

  const order = await db.order.create({
    data: { userId: "customer_seed", eventId: event.id, status: "PAID", subtotal: tt.priceInPaise, total: tt.priceInPaise, items: [{ ticketTypeId: tt.id, qty: 1 }] },
  });
  const ticketId = randomUUID();
  const token = signToken(ticketId);
  await db.ticket.create({ data: { id: ticketId, orderId: order.id, ticketTypeId: tt.id, qrToken: token, status: "VALID" } });

  const r1 = await checkin(token);
  console.log("scan #1:", r1.data?.result);
  const t1 = await db.ticket.findUnique({ where: { id: ticketId } });
  if (r1.data?.result !== "VALID" || t1.status !== "CHECKED_IN") throw new Error("FAIL: first scan");

  const r2 = await checkin(token);
  console.log("scan #2 (replay):", r2.data?.result);
  if (r2.data?.result !== "ALREADY_USED") throw new Error("FAIL: replay not blocked");

  const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
  const r3 = await checkin(tampered);
  console.log("tampered token:", r3.data?.result);
  if (r3.data?.result !== "INVALID") throw new Error("FAIL: tampered token accepted");

  await db.checkIn.deleteMany({ where: { ticketId } });
  await db.ticket.delete({ where: { id: ticketId } });
  await db.order.delete({ where: { id: order.id } });
  console.log("OK: VALID -> ALREADY_USED -> INVALID; single entry enforced");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
