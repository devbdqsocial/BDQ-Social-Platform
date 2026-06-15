import { afterAll, describe, expect, it } from "vitest";

/**
 * Command-center reconciliation (R5.2 / admin-portal §2) — needs a real database.
 * Run locally:  RUN_DB_TESTS=1 (DATABASE_URL set) vitest run command-center.integration
 * Skipped in CI.
 *
 * Seeds a fresh event with known tickets / stalls / sponsor / waitlist, then asserts the six
 * founder tiles reconcile to that seed math.
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("getCommandCenter reconciliation (integration)", () => {
  it("tiles match the seeded numbers", async () => {
    const { db } = await import("@/server/db");
    const { getCommandCenter } = await import("./dashboard");

    const tag = `cc-${Date.now()}`;
    const event = await db.event.create({
      data: {
        name: `E ${tag}`,
        slug: tag,
        startsAt: new Date(Date.now() + 7 * 86400000),
        endsAt: new Date(Date.now() + 8 * 86400000),
        status: "PUBLISHED",
        ticketTypes: { create: { name: "GA", priceInPaise: 50000, totalQty: 200, soldQty: 25 } },
      },
    });
    const stalls = await db.$transaction([
      db.stall.create({ data: { eventId: event.id, label: "S-1", xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, status: "BOOKED" } }),
      db.stall.create({ data: { eventId: event.id, label: "S-2", xFt: 10, yFt: 0, widthFt: 10, heightFt: 10, status: "AVAILABLE" } }),
    ]);
    const sponsor = await db.sponsor.create({ data: { eventId: event.id, name: `Sp ${tag}`, tier: "TITLE", amountPaise: 2_500_000, status: "SIGNED" } });
    await db.waitlist.createMany({ data: [1, 2, 3].map(() => ({ eventId: event.id, type: "TICKET" as const })) });

    try {
      const cc = await getCommandCenter(event.id);
      const t = cc.tiles;

      expect(t.tickets).toMatchObject({ sold: 25, total: 200 });
      expect(t.vendors.booked).toBe(1);
      expect(t.vendors.total).toBe(2);
      expect(t.sponsors.signedPaise).toBe(2_500_000);
      expect(t.sponsors.count).toBe(1);
      expect(t.sponsors.byTier).toEqual([{ tier: "TITLE", count: 1 }]);
      expect(t.waitlist.added7d).toBe(3);
      // No paid orders / check-ins seeded → those tiles read zero.
      expect(t.revenue.grossPaise).toBe(0);
      expect(t.checkins.live).toBe(0);
    } finally {
      await db.waitlist.deleteMany({ where: { eventId: event.id } });
      await db.sponsor.delete({ where: { id: sponsor.id } });
      await db.stall.deleteMany({ where: { id: { in: stalls.map((s) => s.id) } } });
      await db.ticketType.deleteMany({ where: { eventId: event.id } });
      await db.event.delete({ where: { id: event.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
