import type { EditorElement } from "@/lib/map/designer-ops";
import type { Obstacle, Pathway, Pt } from "@/lib/map/layout-v2";
import { pointToPolyline } from "@/lib/map/geometry";

/**
 * Save-blocking layout checks (map-system.md §4, build-plan R2.5.3). Pure + DB-free. A stall must
 * sit inside the venue boundary and clear of fixed obstacles, or the save is blocked unless the
 * admin explicitly overrides that stall.
 */

export type ViolationKind = "OUT_OF_BOUNDS" | "OBSTACLE";
export interface Violation {
  elementId: string;
  label: string;
  kind: ViolationKind;
  detail: string;
}

type Rect = { x: number; y: number; w: number; h: number };
const rectOf = (e: { xFt: number; yFt: number; widthFt: number; heightFt: number }): Rect => ({
  x: e.xFt, y: e.yFt, w: e.widthFt, h: e.heightFt,
});

/** Axis-aligned overlap (rotation ignored — bounding box, the conservative check). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Ray-casting point-in-polygon (polygon as [x,y][] in feet). Edge cases bias to "inside". */
export function pointInPolygon([px, py]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True when every corner of the rect is inside the polygon. */
function rectInsidePolygon(r: Rect, poly: Pt[]): boolean {
  const corners: Pt[] = [
    [r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h],
  ];
  return corners.every((c) => pointInPolygon(c, poly));
}

/**
 * Every stall that crosses the boundary or hits an obstacle, minus the admin's per-stall
 * overrides. Infra/obstacle elements themselves are not checked (only sellable layout — stalls).
 */
export function mapViolations(
  elements: EditorElement[],
  boundary: Pt[] | null,
  obstacles: Obstacle[],
  overrides: Set<string> = new Set(),
): Violation[] {
  const out: Violation[] = [];
  for (const el of elements) {
    if (el.kind !== "stall" || overrides.has(el.id)) continue;
    const r = rectOf(el);
    if (boundary && boundary.length >= 3 && !rectInsidePolygon(r, boundary)) {
      out.push({ elementId: el.id, label: el.label, kind: "OUT_OF_BOUNDS", detail: "outside the venue boundary" });
      continue;
    }
    const hit = obstacles.find((o) => rectsIntersect(r, rectOf(o)));
    if (hit) {
      out.push({ elementId: el.id, label: el.label, kind: "OBSTACLE", detail: `overlaps ${hit.label ?? hit.type.toLowerCase()}` });
    }
  }
  return out;
}

/** Minimum widths by pathway type (map-system §7). */
export const MIN_PATH_WIDTH: Record<Pathway["type"], number> = { MAIN: 20, SECONDARY: 12, EMERGENCY: 10 };

export interface PathWarning {
  id: string;
  detail: string;
}

const centerPt = (e: { xFt: number; yFt: number; widthFt: number; heightFt: number }): Pt => [e.xFt + e.widthFt / 2, e.yFt + e.heightFt / 2];

/**
 * Non-blocking pathway checks (map-system §7): under-minimum width, a stall sitting in the
 * strip, and emergency exits/gates not reachable from any path. Warnings never block the save.
 */
export function pathwayWarnings(pathways: Pathway[], elements: EditorElement[]): PathWarning[] {
  const out: PathWarning[] = [];
  const drawn = pathways.filter((p) => p.points.length >= 2);
  for (const p of drawn) {
    const min = MIN_PATH_WIDTH[p.type];
    if (p.widthFt < min) out.push({ id: `w:${p.id}`, detail: `${p.type.toLowerCase()} path is ${p.widthFt} ft (minimum ${min} ft)` });
    const blocker = elements.find((e) => e.kind === "stall" && pointToPolyline(centerPt(e), p.points) < p.widthFt / 2);
    if (blocker) out.push({ id: `b:${p.id}:${blocker.id}`, detail: `path blocked by stall ${blocker.label}` });
  }
  if (drawn.length) {
    for (const e of elements) {
      if (e.kind !== "infra" || (e.type !== "FIRE_EXIT" && e.type !== "ENTRY")) continue;
      const nearest = Math.min(...drawn.map((p) => pointToPolyline(centerPt(e), p.points) - p.widthFt / 2));
      if (nearest > 10) out.push({ id: `x:${e.id}`, detail: `${e.label} isn't on a pathway — emergency access may be blocked` });
    }
  }
  return out;
}
