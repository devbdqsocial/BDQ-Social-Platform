import { PrismaClient } from "@prisma/client";
import { createHmac, randomUUID } from "crypto";

// Proves offline-sync idempotency: re-POSTing a scan with the same clientScanId returns the ORIGINAL
// VALID (not ALREADY_USED), while a different scan of the same ticket → ALREADY_USED.
// Needs the dev server running (dev admin gate). Token signing mirrors src/lib/qr-token.ts.
// Run: npm run dev (other shell) then node --env-file=.env scripts/verify-checkin-sync.mjs

const db = new PrismaClient();
const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret";
const APP = "http://localhost:3000";

const b64url = (s) => Buffer.from(s).toString("base64url");
function signToken(ticketId) {
  const payload = b64url(JSON.stringify({ tid: ticketId, iat: Date.now() }));
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
const checkin = (qrToken, clientScanId) =>
  fetch(`${APP}/api/admin/checkin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ qrToken, ...(clientScanId ? { clientScanId } : {}) }),
  }).then((r) => r.json());

async function main() {
  const event = await db.event.findUnique({ where: { slug: "bdq-social-october-edition" }, include: { ticketTypes: true } });
  const tt = event?.ticketTypes[0];
  if (!tt) throw new Error("Seed first.");

  const order = await db.order.create({ data: { userId: "customer_seed", eventId: event.id, status: "PAID", subtotal: tt.priceInPaise, total: tt.priceInPaise, items: [{ ticketTypeId: tt.id, qty: 1 }] } });
  const ticketId = randomUUID();
  await db.ticket.create({ data: { id: ticketId, orderId: order.id, ticketTypeId: tt.id, qrToken: signToken(ticketId), status: "VALID" } });
  const token = signToken(ticketId);
  const scanId = randomUUID();

  const r1 = await checkin(token, scanId);
  console.log("sync #1:", r1.data?.result);
  const r2 = await checkin(token, scanId); // same clientScanId → idempotent
  console.log("re-sync (same scanId):", r2.data?.result);
  const r3 = await checkin(token, randomUUID()); // different scan of same ticket
  console.log("different scan:", r3.data?.result);

  if (r1.data?.result !== "VALID") throw new Error("FAIL: first scan");
  if (r2.data?.result !== "VALID") throw new Error("FAIL: re-sync must be idempotent VALID");
  if (r3.data?.result !== "ALREADY_USED") throw new Error("FAIL: different scan must be ALREADY_USED");

  await db.checkIn.deleteMany({ where: { ticketId } });
  await db.ticket.delete({ where: { id: ticketId } });
  await db.order.delete({ where: { id: order.id } });
  console.log("OK: re-sync idempotent (VALID); distinct re-scan ALREADY_USED");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
