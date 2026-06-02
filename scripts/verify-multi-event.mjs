import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

// Proves multi-event isolation: a paid ticket + a stall booking on event A leave event B's
// revenue / tickets / stalls completely untouched. Needs the seed (2 events). Run:
// node --env-file=.env scripts/verify-multi-event.mjs

const db = new PrismaClient();

const revenue = async (eventId) => (await db.order.aggregate({ where: { eventId, status: "PAID" }, _sum: { total: true } }))._sum.total ?? 0;
const ticketsSold = (eventId) => db.ticket.count({ where: { order: { eventId } } });
const stallsAvailable = (eventId) => db.stall.count({ where: { eventId, status: "AVAILABLE" } });

async function main() {
  const [a, b] = await Promise.all([
    db.event.findUnique({ where: { slug: "bdq-social-october-edition" }, include: { ticketTypes: true } }),
    db.event.findUnique({ where: { slug: "bdq-social-december-edition" }, include: { ticketTypes: true } }),
  ]);
  if (!a || !b) throw new Error("Seed both events first (npx prisma db seed).");
  const tt = a.ticketTypes[0];

  // baselines
  const [revA0, revB0, tixA0, tixB0, availB0] = await Promise.all([revenue(a.id), revenue(b.id), ticketsSold(a.id), ticketsSold(b.id), stallsAvailable(b.id)]);
  const aStall = await db.stall.findFirst({ where: { eventId: a.id, kind: "STALL", status: "AVAILABLE" }, select: { id: true } });
  if (!aStall) throw new Error("No available stall on event A.");

  // act on A: a paid order + ticket + a stall booking
  const order = await db.order.create({
    data: { userId: "customer_seed", eventId: a.id, status: "PAID", subtotal: tt.priceInPaise, discount: 0, total: tt.priceInPaise, items: [{ ticketTypeId: tt.id, qty: 1 }] },
  });
  const tid = randomUUID();
  await db.ticket.create({ data: { id: tid, orderId: order.id, ticketTypeId: tt.id, qrToken: `verify-multi-${tid}` } });
  await db.stall.update({ where: { id: aStall.id }, data: { status: "BOOKED" } });

  try {
    const [revA1, revB1, tixA1, tixB1, availB1] = await Promise.all([revenue(a.id), revenue(b.id), ticketsSold(a.id), ticketsSold(b.id), stallsAvailable(b.id)]);

    console.log(`A: revenue ${revA0}→${revA1} (+${tt.priceInPaise}), tickets ${tixA0}→${tixA1}`);
    console.log(`B: revenue ${revB0}→${revB1}, tickets ${tixB0}→${tixB1}, stalls available ${availB0}→${availB1}`);

    if (revA1 !== revA0 + tt.priceInPaise) throw new Error("FAIL: event A revenue did not reflect the sale");
    if (tixA1 !== tixA0 + 1) throw new Error("FAIL: event A tickets did not increase");
    if (revB1 !== revB0 || tixB1 !== tixB0 || availB1 !== availB0) throw new Error("FAIL: event B leaked — A's activity changed B");

    console.log("OK: events are isolated (A's sale + booking left B untouched)");
  } finally {
    await db.ticket.deleteMany({ where: { id: tid } });
    await db.order.deleteMany({ where: { id: order.id } });
    await db.stall.update({ where: { id: aStall.id }, data: { status: "AVAILABLE" } });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e.message ?? e);
    await db.$disconnect();
    process.exit(1);
  });
