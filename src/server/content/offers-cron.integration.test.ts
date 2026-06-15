import { afterAll, describe, expect, it } from "vitest";

/**
 * Offer auto-END cron (R5.4 / admin-portal §6.1) — needs a real database.
 * Run locally:  RUN_DB_TESTS=1 (DATABASE_URL set) vitest run offers-cron.integration
 * Skipped in CI.
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("autoEndDueOffers (integration)", () => {
  it("ends PUBLISHED offers past their window, leaves live + non-published ones", async () => {
    const { db } = await import("@/server/db");
    const { autoEndDueOffers } = await import("./admin-offers");

    const tag = `offer-cron-${Date.now()}`;
    const event = await db.event.create({
      data: { name: `E ${tag}`, slug: tag, startsAt: new Date(Date.now() - 5 * 86400000), endsAt: new Date(Date.now() + 5 * 86400000), status: "LIVE" },
    });
    const base = { eventId: event.id, terms: "t", kind: "DISCOUNT" as const };
    const pastPublished = await db.offer.create({ data: { ...base, title: "Past", status: "PUBLISHED", startsAt: new Date(Date.now() - 3 * 86400000), endsAt: new Date(Date.now() - 86400000) } });
    const livePublished = await db.offer.create({ data: { ...base, title: "Live", status: "PUBLISHED", startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000) } });
    const pastDraft = await db.offer.create({ data: { ...base, title: "Draft", status: "DRAFT", startsAt: new Date(Date.now() - 3 * 86400000), endsAt: new Date(Date.now() - 86400000) } });

    try {
      const res = await autoEndDueOffers();
      expect(res.ended).toBeGreaterThanOrEqual(1);
      expect((await db.offer.findUnique({ where: { id: pastPublished.id } }))?.status).toBe("ENDED");
      expect((await db.offer.findUnique({ where: { id: livePublished.id } }))?.status).toBe("PUBLISHED");
      expect((await db.offer.findUnique({ where: { id: pastDraft.id } }))?.status).toBe("DRAFT"); // never published → untouched
    } finally {
      await db.offer.deleteMany({ where: { eventId: event.id } });
      await db.event.delete({ where: { id: event.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
