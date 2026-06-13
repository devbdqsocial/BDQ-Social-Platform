import type { EditorElement } from "@/lib/map/designer-ops";
import type { Zone, ZoneColor } from "@/lib/map/layout-v2";
import { pointInPolygon } from "@/lib/map/validation";
import { polygonArea } from "@/lib/map/geometry";

/**
 * Zone helpers (map-system.md §6, build-plan R2.5.6). Pure + DB-free. A stall belongs to the
 * zone whose polygon contains its CENTER point (computed, never stored).
 */

/** The 8 fixed zone swatches (design-system §4.8) — konva needs hex literals. */
export const ZONE_COLOR_HEX: Record<ZoneColor, string> = {
  navy: "#01065B",
  lavender: "#868EFF",
  green: "#3FA66A",
  yellow: "#C9871A",
  pink: "#FF58AC",
  red: "#C0392B",
  teal: "#2C8C8C",
  amber: "#E8B23A",
};

const centerOf = (el: { xFt: number; yFt: number; widthFt: number; heightFt: number }): [number, number] => [
  el.xFt + el.widthFt / 2,
  el.yFt + el.heightFt / 2,
];

/** Centroid of a polygon (average of vertices) — used to place the zone's name label. */
export function polygonCentroid(points: [number, number][]): [number, number] {
  if (!points.length) return [0, 0];
  const sum = points.reduce<[number, number]>((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/** The zone containing an element's center, or null. First match wins (draw order). */
export function zoneOf(el: EditorElement, zones: Zone[]): Zone | null {
  const c = centerOf(el);
  return zones.find((z) => z.points.length >= 3 && pointInPolygon(c, z.points)) ?? null;
}

export interface ZoneRollup {
  zoneId: string;
  name: string;
  color: ZoneColor;
  stalls: number;
  sellable: number;
  potentialPaise: number;
  areaSqFt: number;
}

/** Per-zone rollups: stall count, sellable count, Σ potential price, polygon area. */
export function zoneRollups(elements: EditorElement[], zones: Zone[]): ZoneRollup[] {
  const byId = new Map<string, ZoneRollup>(
    zones.map((z) => [z.id, { zoneId: z.id, name: z.name, color: z.color, stalls: 0, sellable: 0, potentialPaise: 0, areaSqFt: polygonArea(z.points) }]),
  );
  for (const el of elements) {
    if (el.kind !== "stall") continue;
    const z = zoneOf(el, zones);
    if (!z) continue;
    const r = byId.get(z.id)!;
    r.stalls += 1;
    if (el.status !== "BLOCKED") {
      r.sellable += 1;
      r.potentialPaise += el.priceInPaise ?? 0;
    }
  }
  return [...byId.values()];
}
