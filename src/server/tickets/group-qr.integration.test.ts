import { afterAll, describe, expect, it } from "vitest";

/**
 * Group-QR end-to-end (build-plan R1.2, architecture §4.2) — needs a real database.
 * Run locally:  set -a; . ./.env; set +a; RUN_DB_TESTS=1 npx vitest run group-qr
 *
 * buy 5 (one line) → ONE ticket admitting 5 → gate admits 3, then the rest → board shows 5
 * heads; replayed webhook and replayed offline scans are no-ops.
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("group-QR fulfilment + partial admit (integration)", () => {
  it("buy-5 → 1 QR → admit 3+2 → board = 5; replays are no-ops", async () => {
    const { db } = await import("@/server/db");
    const { fulfillOrder } = await import("./service");
    const { checkInByToken, capacitySnapshot } = await import("@/server/checkin/service");

    const tag = `groupqr-${Date.now()}`;
    const buyer = await db.user.create({ data: { phone: `+9198${Date.now() % 100000000}`, role: "CUSTOMER" } });
    const staff = await db.user.create({ data: { email: `${tag}@test.local`, role: "STAFF", permissions: ["CHECKIN"] } });
    const event = await db.event.create({
      data: {
        name: `Test ${tag}`,
        slug: tag,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        status: "PUBLISHED",
        ticketTypes: { create: { name: "General", priceInPaise: 10000, totalQty: 10, soldQty: 0 } },
      },
      include: { ticketTypes: true },
    });
    const tt = event.ticketTypes[0];
    const order = await db.order.create({
      data: {
        userId: buyer.id,
        eventId: event.id,
        status: "PENDING",
        subtotal: 50000,
        discount: 0,
        total: 50000,
        gatewayOrderId: `${tag}-rzp`,
        items: [{ ticketTypeId: tt.id, qty: 5 }],
      },
    });

    try {
      // ONE ticket admitting 5
      const fulfil = await fulfillOrder(order.gatewayOrderId!, `${tag}-pay`);
      expect(fulfil.issued).toBe(1);
      const ticket = await db.ticket.findFirstOrThrow({ where: { orderId: order.id } });
      expect(ticket.admitCount).toBe(5);
      expect((await db.ticketType.findUnique({ where: { id: tt.id } }))?.soldQty).toBe(5);

      // partial admit: 3 now…
      const scanA = await checkInByToken(staff.id, ticket.qrToken, "G1", `${tag}-scanA`, 3);
      expect(scanA).toMatchObject({ result: "VALID", admitted: 3, remaining: 2, admitCount: 5 });
      expect((await db.ticket.findUnique({ where: { id: ticket.id } }))?.status).toBe("VALID");

      // …rest later (default = everyone outstanding)
      const scanB = await checkInByToken(staff.id, ticket.qrToken, "G1", `${tag}-scanB`);
      expect(scanB).toMatchObject({ result: "VALID", admitted: 2, remaining: 0 });
      expect((await db.ticket.findUnique({ where: { id: ticket.id } }))?.status).toBe("CHECKED_IN");

      // exhausted → ALREADY_USED
      const scanC = await checkInByToken(staff.id, ticket.qrToken, "G1", `${tag}-scanC`);
      expect(scanC.result).toBe("ALREADY_USED");

      // offline queue re-sync of scanA is idempotent (returns the original VALID, no new admits)
      const resync = await checkInByToken(staff.id, ticket.qrToken, "G1", `${tag}-scanA`, 3);
      expect(resync).toMatchObject({ result: "VALID", admitted: 3, remaining: 0 });

      // the board counts HEADS
      const board = await capacitySnapshot(event.id);
      expect(board.sold).toBe(5);
      expect(board.checkedIn).toBe(5);
      expect(board.byType).toEqual([{ name: "General", sold: 5, checkedIn: 5 }]);

      // webhook replay no-dup
      const replay = await fulfillOrder(order.gatewayOrderId!, `${tag}-pay`);
      expect(replay.issued).toBe(1);
      expect(await db.ticket.count({ where: { orderId: order.id } })).toBe(1);
    } finally {
      await db.checkIn.deleteMany({ where: { ticket: { orderId: order.id } } });
      await db.notification.deleteMany({ where: { eventId: event.id } });
      await db.outbox.deleteMany({ where: { dedupeKey: { contains: order.id } } });
      await db.ticket.deleteMany({ where: { orderId: order.id } });
      await db.payment.deleteMany({ where: { orderId: order.id } });
      await db.order.delete({ where: { id: order.id } });
      await db.event.delete({ where: { id: event.id } });
      await db.user.deleteMany({ where: { id: { in: [buyer.id, staff.id] } } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
