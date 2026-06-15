import type { LayoutV2 } from "@/lib/map/layout-v2";

/**
 * Venue lenses (R5.5 Phase 7). The venue is ONE document (`LayoutV2`); a lens controls what is
 * visible — it never changes the underlying venue. Pure + DB-free so every surface can project the
 * same source. Admin sees everything; the others hide layers irrelevant to their job.
 */
export type VenueLens = "admin" | "vendor" | "customer" | "operations";

/** Layers each lens reveals (subset of LAYER_IDS). `elements` (stalls + infra) are always present. */
export const LENS_LAYERS: Record<VenueLens, readonly string[]> = {
  admin: ["underlay", "terrain", "zones", "pathways", "stalls", "infra", "ops", "entryflow", "labels"],
  vendor: ["zones", "pathways", "stalls", "infra", "labels"],
  customer: ["zones", "pathways", "stalls", "infra", "labels"],
  operations: ["zones", "pathways", "stalls", "infra", "ops", "entryflow", "labels"],
};

/**
 * Project the canonical `LayoutV2` through a lens: keep the canvas + elements (geometry), drop the
 * sub-collections the lens omits. Returns a new `LayoutV2`-shaped view (never mutates input). Admin
 * returns the layout unchanged.
 */
export function applyLens(layout: LayoutV2, lens: VenueLens): LayoutV2 {
  if (lens === "admin") return layout;
  const show = new Set(LENS_LAYERS[lens]);
  return {
    ...layout,
    underlay: show.has("underlay") ? layout.underlay : undefined,
    obstacles: show.has("terrain") ? layout.obstacles : [],
    terrain: show.has("terrain") ? layout.terrain : [],
    zones: show.has("zones") ? layout.zones : [],
    pathways: show.has("pathways") ? layout.pathways : [],
    ops: show.has("ops") ? layout.ops : [],
    entryFlow: show.has("entryflow") ? layout.entryFlow : [],
  };
}
