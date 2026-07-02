import "server-only";
import type { EventMap } from "@prisma/client";
import { db } from "@/server/db";
import { upgradeLayout, type LayoutV2 } from "@/lib/map/layout-v2";
import { listMaps, getMap, createMap, saveMapLayout, attachMapToEvent } from "@/server/map/maps";

/**
 * Venue — the single source of truth for "the venue" (R5.5 consolidation, see
 * Docs/audit/venue-map-audit.md). `EventMap` IS the canonical venue model; this facade is the one
 * import surface for it, and `loadVenueLayout` is the one read entry that always returns a
 * fully-defaulted `LayoutV2`. The legacy `LayoutTemplate` system was removed (its rows were folded
 * into `EventMap` first); saving an event layout back to the library replaces "save as template".
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
