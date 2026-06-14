import { afterAll, describe, expect, it } from "vitest";

/**
 * Add-on fulfilment guard test (R4.2) — needs a real database.
 * Run locally:  RUN_DB_TESTS=1 npx --node-options=--env-file=.env vitest run fulfil.integration
 * Skipped in CI (no RUN_DB_TESTS).
 *
 * Covers: price snapshot (live price bumped after ordering must not change the bill), the stock
 * conditional-update oversell guard (two orders race for the last unit → sold never exceeds stock),
 * and idempotent replay (a duplicate webhook never double-charges or double-decrements).
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("fulfillAddOnOrder (integration)", () => {
  it("snapshots price, guards stock under a race, and replays idempotently", async () => {
    const { db } = await import("@/server/db");
    const { fulfillAddOnOrder } = await import("./service");

    const tag = `addon-${Date.now()}`;
    const user = await db.user.create({ data: { phone: `+9198${Date.now() % 100000000}`, role: "VENDOR" } });
    const vp = await db.vendorProfile.create({ data: { userId: user.id, brandName: `Brand ${tag}`, approvalStatus: "APPROVED" } });
    const event = await db.event.create({
      data: { name: `E ${tag}`, slug: tag, startsAt: new Date(Date.now() + 30 * 86400000), endsAt: new Date(Date.now() + 31 * 86400000), status: "LIVE" },
    });
    const stall = await db.stall.create({ data: { eventId: event.id, label: "A-1", xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, status: "BOOKED" } });
    const booking = await db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: vp.id, status: "BOOKED" } });
    const addOn = await db.stallAddOn.create({ data: { eventId: event.id, name: "Power point", pricePaise: 30000, maxPerBooking: 5, stock: 1, sold: 0 } });

    const mkOrder = (n: number) =>
      db.bookingAddOnOrder.create({
        data: { bookingId: booking.id, totalPaise: 30000, gatewayOrderId: `${tag}-rzp-${n}`, lines: { create: { addOnId: addOn.id, qty: 1, pricePaise: 30000 } } },
      });
    const [o1, o2] = await Promise.all([mkOrder(1), mkOrder(2)]);

    try {
      // Price snapshot: bump the live price AFTER both orders exist. Fulfilment bills the snapshot.
      await db.stallAddOn.update({ where: { id: addOn.id }, data: { pricePaise: 50000 } });

      await Promise.all([
        fulfillAddOnOrder(o1.gatewayOrderId!, `${tag}-pay-1`, undefined, 30000),
        fulfillAddOnOrder(o2.gatewayOrderId!, `${tag}-pay-2`, undefined, 30000),
      ]);

      // Stock never exceeds 1 (conditional update is the referee).
      expect((await db.stallAddOn.findUnique({ where: { id: addOn.id } }))?.sold).toBe(1);

      // Money stays captured on both (no-refund rule); both orders end PAID.
      expect(await db.payment.count({ where: { addOnOrderId: { in: [o1.id, o2.id] }, status: "CAPTURED", amount: 30000 } })).toBe(2);
      expect(await db.bookingAddOnOrder.count({ where: { id: { in: [o1.id, o2.id] }, status: "PAID" } })).toBe(2);

      // Exactly one oversold reject.
      const rejects = await db.auditLog.findMany({ where: { action: "REJECT", entity: "BookingAddOnOrder", entityId: { in: [o1.id, o2.id] } } });
      expect(rejects.filter((r) => (r.after as { reason?: string })?.reason === "OVERSOLD")).toHaveLength(1);

      // Replay a winner's webhook → no duplicate payment, stock unchanged.
      await fulfillAddOnOrder(o1.gatewayOrderId!, `${tag}-pay-1`, undefined, 30000);
      expect(await db.payment.count({ where: { gatewayRef: `${tag}-pay-1` } })).toBe(1);
      expect((await db.stallAddOn.findUnique({ where: { id: addOn.id } }))?.sold).toBe(1);
    } finally {
      await db.auditLog.deleteMany({ where: { entityId: { in: [o1.id, o2.id] } } });
      await db.payment.deleteMany({ where: { addOnOrderId: { in: [o1.id, o2.id] } } });
      await db.bookingAddOn.deleteMany({ where: { orderId: { in: [o1.id, o2.id] } } });
      await db.bookingAddOnOrder.deleteMany({ where: { id: { in: [o1.id, o2.id] } } });
      await db.stallAddOn.delete({ where: { id: addOn.id } });
      await db.booking.delete({ where: { id: booking.id } });
      await db.stall.delete({ where: { id: stall.id } });
      await db.event.delete({ where: { id: event.id } });
      await db.vendorProfile.delete({ where: { id: vp.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
