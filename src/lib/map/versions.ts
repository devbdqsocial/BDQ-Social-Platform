import type { EditorElement } from "@/lib/map/designer-ops";
import type { Annotation, Obstacle, Pathway, TerrainPatch, Zone } from "@/lib/map/layout-v2";
import type { Pt } from "@/lib/map/geometry";

/**
 * Named layout snapshots (map-system.md §9 / build-plan R2.5.13). Pure + DB-free. A version
 * stores the editable collections; restore pushes elements through the editor history (undoable),
 * compare reads two snapshots for a stat diff + ghost overlay.
 */

export const MAX_VERSIONS = 10; // hard cap
export const WARN_VERSIONS = 8; // soft warning threshold

export interface VersionMeta {
  id: string;
  name: string;
  createdAt: string; // ISO
  createdBy: string;
  data: unknown; // a VersionSnapshot (schema keeps it loose for forward-compat)
}

export interface VersionSnapshot {
  elements: EditorElement[];
  zones: Zone[];
  pathways: Pathway[];
  terrain: TerrainPatch[];
  obstacles: Obstacle[];
  boundary: Pt[] | null;
  /** optional — snapshots saved before the signage layer existed restore to [] */
  annotations?: Annotation[];
}

export interface VersionStats {
  stalls: number;
  infra: number;
  sellable: number;
  valuePaise: number; // Σ price of non-blocked stalls
}

export function versionStats(snap: VersionSnapshot): VersionStats {
  const stalls = snap.elements.filter((e) => e.kind === "stall");
  const sellable = stalls.filter((s) => s.status !== "BLOCKED");
  return {
    stalls: stalls.length,
    infra: snap.elements.length - stalls.length,
    sellable: sellable.length,
    valuePaise: sellable.reduce((s, e) => s + (e.priceInPaise ?? 0), 0),
  };
}

/** b − a deltas, for the compare panel. */
export function diffStats(a: VersionSnapshot, b: VersionSnapshot): VersionStats {
  const sa = versionStats(a), sb = versionStats(b);
  return { stalls: sb.stalls - sa.stalls, infra: sb.infra - sa.infra, sellable: sb.sellable - sa.sellable, valuePaise: sb.valuePaise - sa.valuePaise };
}

/** Whether a new snapshot may be saved, and any warning to surface. */
export function versionCapState(count: number): { canSave: boolean; warn: string | null } {
  if (count >= MAX_VERSIONS) return { canSave: false, warn: `Version limit reached (${MAX_VERSIONS}). Delete one to save a new snapshot.` };
  if (count >= WARN_VERSIONS) return { canSave: true, warn: `${count} of ${MAX_VERSIONS} versions used.` };
  return { canSave: true, warn: null };
}
