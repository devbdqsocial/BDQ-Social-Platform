// R5.5 Phase 4 — additive data migration: fold each legacy LayoutTemplate into a VenueMap (EventMap).
// Idempotent (keyed on EventMap.legacyTemplateId); never drops or mutates the source LayoutTemplate.
// Run local:  node --env-file=.env scripts/venue-backfill.mjs
// Run prod:   $env:DATABASE_URL=<prod-pooled>; node scripts/venue-backfill.mjs   (PowerShell)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DEF = { widthFt: 230, heightFt: 160, gridFt: 5 };

async function main() {
  const templates = await db.layoutTemplate.findMany();
  let migrated = 0;
  let skipped = 0;
  for (const tpl of templates) {
    const exists = await db.eventMap.findFirst({ where: { legacyTemplateId: tpl.id }, select: { id: true } });
    if (exists) { skipped++; continue; }
    const canvas = (tpl.layoutJson && typeof tpl.layoutJson === "object" && tpl.layoutJson.canvas) || {};
    await db.eventMap.create({
      data: {
        name: tpl.name,
        unit: "FT",
        widthFt: Number(canvas.widthFt) || DEF.widthFt,
        heightFt: Number(canvas.heightFt) || DEF.heightFt,
        gridFt: Number(canvas.gridFt) || DEF.gridFt,
        layoutJson: tpl.layoutJson,
        createdById: tpl.createdById ?? null,
        legacyTemplateId: tpl.id,
      },
    });
    migrated++;
  }
  const totalVenueMaps = await db.eventMap.count();
  console.log(JSON.stringify({ templates: templates.length, migrated, skipped, totalVenueMaps }));
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
