import { afterAll, describe, expect, it } from "vitest";

/**
 * Oversell guard race test (build-plan R1.1, security §3.1) — needs a real database.
 * Run locally:  RUN_DB_TESTS=1 npx --node-options=--env-file=.env vitest run oversell
 * Skipped in CI (no RUN_DB_TESTS) — the unit suite stays DB-free.
 *
 * Scenario: ONE ticket left, TWO paid orders race through fulfilment. Exactly one issues;
 * the loser keeps its captured payment, gets zero tickets, and writes a REJECT/OVERSOLD
 * audit row. soldQty never exceeds totalQty.
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("fulfillOrder oversell guard (integration)", () => {
  it("two paid orders racing for the last ticket → exactly one fulfils", async () => {
    const { db } = await import("@/server/db");
    const { fulfillOrder } = await import("./service");

    const tag = `oversell-${Date.now()}`;
    const user = await db.user.create({ data: { phone: `+9199${Date.now() % 100000000}`, role: "CUSTOMER" } });
    const event = await db.event.create({
      data: {
        name: `Test ${tag}`,
        slug: tag,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        status: "PUBLISHED",
        ticketTypes: { create: { name: "Last One", priceInPaise: 10000, totalQty: 1, soldQty: 0 } },
      },
      include: { ticketTypes: true },
    });
    const tt = event.ticketTypes[0];
    const mkOrder = (n: number) =>
      db.order.create({
        data: {
          userId: user.id,
          eventId: event.id,
          status: "PENDING",
          subtotal: 10000,
          discount: 0,
          total: 10000,
          gatewayOrderId: `${tag}-rzp-${n}`,
          items: [{ ticketTypeId: tt.id, qty: 1 }],
        },
      });
    const [o1, o2] = await Promise.all([mkOrder(1), mkOrder(2)]);

    try {
      const [r1, r2] = await Promise.all([
        fulfillOrder(o1.gatewayOrderId!, `${tag}-pay-1`),
        fulfillOrder(o2.gatewayOrderId!, `${tag}-pay-2`),
      ]);

      const issued = r1.issued + r2.issued;
      expect(issued).toBe(1);

      const after = await db.ticketType.findUnique({ where: { id: tt.id } });
      expect(after?.soldQty).toBe(1); // never exceeds totalQty, loser compensated

      const payments = await db.payment.count({ where: { orderId: { in: [o1.id, o2.id] }, status: "CAPTURED" } });
      expect(payments).toBe(2); // money stays captured on both (manual resolution path)

      const rejects = await db.auditLog.findMany({
        where: { action: "REJECT", entity: "Order", entityId: { in: [o1.id, o2.id] } },
      });
      expect(rejects).toHaveLength(1);
      expect((rejects[0].after as { reason?: string })?.reason).toBe("OVERSOLD");

      // replaying the loser's webhook stays a no-op (idempotent by gatewayRef)
      const loserGw = rejects[0].entityId === o1.id ? o1.gatewayOrderId! : o2.gatewayOrderId!;
      const loserPay = rejects[0].entityId === o1.id ? `${tag}-pay-1` : `${tag}-pay-2`;
      const replay = await fulfillOrder(loserGw, loserPay);
      expect(replay.issued).toBe(0);
      expect((await db.ticketType.findUnique({ where: { id: tt.id } }))?.soldQty).toBe(1);
    } finally {
      await db.auditLog.deleteMany({ where: { entityId: { in: [o1.id, o2.id] } } });
      await db.notification.deleteMany({ where: { eventId: event.id } });
      await db.outbox.deleteMany({ where: { dedupeKey: { contains: tag } } });
      await db.ticket.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
      await db.payment.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
      await db.order.deleteMany({ where: { id: { in: [o1.id, o2.id] } } });
      await db.event.delete({ where: { id: event.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
