import { afterAll, describe, expect, it } from "vitest";

/**
 * R5.5 Phase 4 — venue backfill (LayoutTemplate → VenueMap) is additive + idempotent.
 * Run locally:  RUN_DB_TESTS=1 (DATABASE_URL set) vitest run backfill.integration
 * Skipped in CI.
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("backfillVenueMapsFromTemplates (integration)", () => {
  it("folds a template into a VenueMap without dropping the template, idempotently", async () => {
    const { db } = await import("@/server/db");
    const { backfillVenueMapsFromTemplates } = await import("./service");

    const tag = `venue-bf-${Date.now()}`;
    const tpl = await db.layoutTemplate.create({
      data: { name: `T ${tag}`, layoutJson: { version: 1, canvas: { widthFt: 100, heightFt: 80, gridFt: 5 }, elements: [], stallTypes: [] } },
    });

    try {
      const r1 = await backfillVenueMapsFromTemplates();
      expect(r1.migrated).toBeGreaterThanOrEqual(1);

      const vm = await db.eventMap.findFirst({ where: { legacyTemplateId: tpl.id } });
      expect(vm).toBeTruthy();
      expect(vm?.name).toBe(`T ${tag}`);
      expect(vm?.widthFt).toBe(100);

      // legacy source is preserved (no drop)
      expect(await db.layoutTemplate.findUnique({ where: { id: tpl.id } })).toBeTruthy();

      // idempotent re-run — still exactly one VenueMap for this template
      await backfillVenueMapsFromTemplates();
      expect(await db.eventMap.count({ where: { legacyTemplateId: tpl.id } })).toBe(1);
    } finally {
      await db.eventMap.deleteMany({ where: { legacyTemplateId: tpl.id } });
      await db.layoutTemplate.delete({ where: { id: tpl.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
