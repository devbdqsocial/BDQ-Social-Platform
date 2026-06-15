import "server-only";
import type { EventMap } from "@prisma/client";
import { db } from "@/server/db";
import type { Session } from "@/server/auth/guard";
import { upgradeLayout, type LayoutV2 } from "@/lib/map/layout-v2";
import { listMaps, getMap, createMap, saveMapLayout, attachMapToEvent } from "@/server/map/maps";

/**
 * Venue — the single source of truth for "the venue" (R5.5 consolidation, see
 * Docs/audit/venue-map-audit.md). `EventMap` IS the canonical venue model; this facade is the one
 * import surface for it, and `loadVenueLayout` is the one read entry that always returns a
 * fully-defaulted `LayoutV2`. Legacy `LayoutTemplate`/`MapElement` remain for compatibility and are
 * additively folded toward `VenueMap` (no drops).
 */

/** The canonical venue model. `EventMap` is designated as `VenueMap` (no parallel table). */
export type VenueMap = EventMap;

// Canonical operations (thin re-exports of the existing EventMap service).
export const listVenueMaps = listMaps;
export const getVenueMap = getMap;
export const createVenueMap = createMap;
export const saveVenueLayout = saveMapLayout;
export const attachVenueToEvent = attachMapToEvent;

/**
 * The one read entry: resolve a venue's `LayoutV2` from any source — a reusable `VenueMap`
 * (EventMap), an event's working `MapLayout` (folding its ops blob), or raw JSON. Always returns a
 * fully-defaulted `LayoutV2` via `upgradeLayout`.
 */
export async function loadVenueLayout(source: { venueMapId: string } | { eventId: string }): Promise<LayoutV2 | null> {
  if ("venueMapId" in source) {
    const m = await db.eventMap.findUnique({ where: { id: source.venueMapId }, select: { layoutJson: true } });
    return m ? upgradeLayout(m.layoutJson) : null;
  }
  const ml = await db.mapLayout.findUnique({ where: { eventId: source.eventId }, select: { layoutJson: true, opsLayerJson: true } });
  return ml ? upgradeLayout(ml.layoutJson, ml.opsLayerJson) : null;
}

/**
 * Additive migration (R5.5 Phase 4): fold each legacy `LayoutTemplate` into a `VenueMap` (a template
 * IS a reusable venue). Idempotent — keyed on `EventMap.legacyTemplateId`; never drops or mutates the
 * source `LayoutTemplate`. Safe to re-run on either database.
 */
export async function backfillVenueMapsFromTemplates(session?: Session): Promise<{ migrated: number; skipped: number }> {
  const templates = await db.layoutTemplate.findMany();
  let migrated = 0;
  let skipped = 0;
  for (const tpl of templates) {
    const exists = await db.eventMap.findFirst({ where: { legacyTemplateId: tpl.id }, select: { id: true } });
    if (exists) {
      skipped++;
      continue;
    }
    const v2 = upgradeLayout(tpl.layoutJson);
    await db.eventMap.create({
      data: {
        name: tpl.name,
        unit: "FT",
        widthFt: v2.canvas.widthFt,
        heightFt: v2.canvas.heightFt,
        gridFt: v2.canvas.gridFt ?? 5,
        layoutJson: tpl.layoutJson as object,
        createdById: tpl.createdById ?? session?.userId ?? null,
        legacyTemplateId: tpl.id,
      },
    });
    migrated++;
  }
  return { migrated, skipped };
}
