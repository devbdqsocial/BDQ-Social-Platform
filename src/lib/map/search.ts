import type { EditorElement } from "@/lib/map/designer-ops";
import type { Zone } from "@/lib/map/layout-v2";
import { polygonCentroid } from "@/lib/map/zones";

/**
 * Designer search (map-system §9.4). Pure + DB-free. Matches stall/infra labels and zone names
 * (case-insensitive substring); each result carries the geometry to focus/zoom to.
 */

export interface FocusTarget { xFt: number; yFt: number; widthFt?: number; heightFt?: number; id?: string }
export interface SearchMatch { id: string; label: string; kind: "stall" | "infra" | "zone"; focus: FocusTarget }

export function searchLayout(query: string, elements: EditorElement[], zones: Zone[], limit = 8): SearchMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: SearchMatch[] = [];
  for (const el of elements) if (el.label.toLowerCase().includes(q)) out.push({ id: el.id, label: el.label, kind: el.kind, focus: el });
  for (const z of zones) {
    if (z.points.length >= 3 && z.name.toLowerCase().includes(q)) {
      const [xFt, yFt] = polygonCentroid(z.points);
      out.push({ id: z.id, label: z.name, kind: "zone", focus: { xFt, yFt } });
    }
  }
  return out.slice(0, limit);
}
