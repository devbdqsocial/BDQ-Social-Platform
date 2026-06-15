import { afterAll, describe, expect, it } from "vitest";

/**
 * Happening strip merge/sort/window (R6.3) — needs a real database.
 * Run locally:  RUN_DB_TESTS=1 (DATABASE_URL set) vitest run happening.integration
 * Skipped in CI.
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("getHappeningStrip (integration)", () => {
  it("merges schedule + offers + manual, sorts by kind, hides expired/unpublished/far-off", async () => {
    const { db } = await import("@/server/db");
    const { getHappeningStrip } = await import("./happening");

    const tag = `hap-${Date.now()}`;
    const now = new Date();
    const mins = (m: number) => new Date(now.getTime() + m * 60000);
    const event = await db.event.create({ data: { name: `E ${tag}`, slug: tag, startsAt: mins(-120), endsAt: mins(240), status: "LIVE" } });

    await db.scheduleItem.createMany({
      data: [
        { eventId: event.id, title: "Running set", startsAt: mins(-10), endsAt: mins(30) }, // LIVE_NOW
        { eventId: event.id, title: "Soon set", startsAt: mins(15) }, // STARTING_SOON
        { eventId: event.id, title: "Later set", startsAt: mins(300) }, // too far → excluded
      ],
    });
    await db.offer.create({ data: { eventId: event.id, title: "BOGO coffee", terms: "t", kind: "DISCOUNT", status: "PUBLISHED", startsAt: mins(-30), endsAt: mins(120) } });
    await db.happeningItem.createMany({
      data: [
        { eventId: event.id, kind: "ANNOUNCEMENT", title: "Parking B full", published: true },
        { eventId: event.id, kind: "FACILITY", title: "Old notice", published: true, endsAt: mins(-5) }, // expired → hidden
        { eventId: event.id, kind: "SPONSOR", title: "Draft shout-out", published: false }, // unpublished → hidden
      ],
    });

    try {
      const strip = await getHappeningStrip(event.id, now);
      const kinds = strip.map((s) => s.kind);
      const titles = strip.map((s) => s.title);

      // Order: LIVE_NOW → STARTING_SOON → OFFER → ANNOUNCEMENT
      expect(kinds).toEqual(["LIVE_NOW", "STARTING_SOON", "OFFER", "ANNOUNCEMENT"]);
      expect(titles).toContain("Running set");
      expect(titles).toContain("Soon set");
      expect(titles).toContain("BOGO coffee");
      expect(titles).toContain("Parking B full");
      // Hidden
      expect(titles).not.toContain("Later set");
      expect(titles).not.toContain("Old notice");
      expect(titles).not.toContain("Draft shout-out");
    } finally {
      await db.happeningItem.deleteMany({ where: { eventId: event.id } });
      await db.offer.deleteMany({ where: { eventId: event.id } });
      await db.scheduleItem.deleteMany({ where: { eventId: event.id } });
      await db.event.delete({ where: { id: event.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
