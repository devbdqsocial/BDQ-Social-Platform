import type { EditorElement } from "@/lib/map/designer-ops";

/**
 * Pure planar geometry for the designer measurements (map-system.md §3, build-plan R2.5.4).
 * All coordinates/lengths are in FEET. DB-free so it's unit-testable.
 */

export type Pt = [number, number];

/** Shoelace area of a closed polygon, in square feet (always non-negative). */
export function polygonArea(points: Pt[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** Perimeter of a closed polygon, in feet. */
export function polygonPerimeter(points: Pt[]): number {
  if (points.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    p += Math.hypot(x2 - x1, y2 - y1);
  }
  return p;
}

/** Length of an OPEN polyline (the distance tool's multi-segment path), in feet. */
export function pathLength(points: Pt[]): number {
  let p = 0;
  for (let i = 1; i < points.length; i++) {
    p += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return p;
}

/** Project `pt` onto the dominant axis relative to `prev` — Shift-draw straight lines. */
export function constrainAxis(prev: Pt, pt: Pt): Pt {
  return Math.abs(pt[0] - prev[0]) >= Math.abs(pt[1] - prev[1]) ? [pt[0], prev[1]] : [prev[0], pt[1]];
}

/** Shortest distance from a point to a line segment, in feet. */
export function pointToSegment([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay); // degenerate segment
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Shortest distance from a point to an open polyline (min over its segments), in feet. */
export function pointToPolyline(pt: Pt, line: Pt[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return Math.hypot(pt[0] - line[0][0], pt[1] - line[0][1]);
  let min = Infinity;
  for (let i = 1; i < line.length; i++) min = Math.min(min, pointToSegment(pt, line[i - 1], line[i]));
  return min;
}

/** Footprint of one rectangular element (rotation ignored — bounding footprint), sq ft. */
export const elementArea = (el: { widthFt: number; heightFt: number }): number => el.widthFt * el.heightFt;

/** Total drawn footprint of all elements, sq ft. */
export function usedSqFt(elements: EditorElement[]): number {
  return elements.reduce((s, e) => s + elementArea(e), 0);
}

/** Occupancy of the venue: used footprint ÷ venue area (0–1). */
export function occupancy(elements: EditorElement[], venueSqFt: number): number {
  if (venueSqFt <= 0) return 0;
  return usedSqFt(elements) / venueSqFt;
}

const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export const fmtFt = (ft: number): string => `${nf1.format(ft)} ft`;
export const fmtArea = (sqft: number): string => `${nf.format(sqft)} sq ft`;

/** Display-unit aware formatters (storage is ALWAYS feet; only readouts convert). */
export type DisplayUnit = "FT" | "M";
export const FT_PER_M = 3.28084;
export const fmtLen = (ft: number, unit: DisplayUnit = "FT"): string =>
  unit === "M" ? `${nf1.format(ft / FT_PER_M)} m` : `${nf1.format(ft)} ft`;
/** Compact W×H dimension label for on-map size badges, e.g. "10×12 ft" / "3×3.7 m". */
export const fmtSize = (wFt: number, hFt: number, unit: DisplayUnit = "FT"): string =>
  unit === "M"
    ? `${nf1.format(wFt / FT_PER_M)}×${nf1.format(hFt / FT_PER_M)} m`
    : `${nf1.format(wFt)}×${nf1.format(hFt)} ft`;
export const fmtAreaU = (sqft: number, unit: DisplayUnit = "FT"): string =>
  unit === "M" ? `${nf.format(sqft / (FT_PER_M * FT_PER_M))} sq m` : `${nf.format(sqft)} sq ft`;
export const fmtPct = (frac: number): string => `${nf1.format(frac * 100)}%`;
/** Distance label with the metric twin, e.g. "120.0 ft (36.6 m)". */
export const fmtDistance = (ft: number): string => `${nf1.format(ft)} ft (${nf1.format(ft / 3.28084)} m)`;
