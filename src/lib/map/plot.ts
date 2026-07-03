import type { Pt } from "@/lib/map/geometry";

/**
 * Plot-shape helpers (map overhaul, plot-first model). The plot is the venue boundary polygon —
 * presets build one from real dimensions, and the vertex helpers power point-by-point editing
 * (shared by the boundary and zone/pathway/terrain editors). Pure + feet-based.
 */

/** Axis-aligned rectangle plot, origin at (0,0). */
export function rectPlot(widthFt: number, depthFt: number): Pt[] {
  return [[0, 0], [widthFt, 0], [widthFt, depthFt], [0, depthFt]];
}

/** L-shape: a rectangle with a cut taken out of the bottom-right corner. */
export function lShapePlot(widthFt: number, depthFt: number, cutWidthFt: number, cutDepthFt: number): Pt[] {
  const cw = Math.min(cutWidthFt, widthFt - 1);
  const cd = Math.min(cutDepthFt, depthFt - 1);
  return [[0, 0], [widthFt, 0], [widthFt, depthFt - cd], [widthFt - cw, depthFt - cd], [widthFt - cw, depthFt], [0, depthFt]];
}

const clampDim = (v: number) => Math.max(1, Math.round(v)); // no size cap; ≥1 render guard only

/**
 * Canvas that comfortably contains a plot: translate the points so the bbox sits `marginFt` from
 * the origin, and size the canvas to bbox + 2×margin.
 */
export function canvasForPlot(points: Pt[], marginFt = 20): { points: Pt[]; widthFt: number; heightFt: number } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const translated = points.map(([x, y]): Pt => [x - minX + marginFt, y - minY + marginFt]);
  return {
    points: translated,
    widthFt: clampDim(Math.max(...xs) - minX + 2 * marginFt),
    heightFt: clampDim(Math.max(...ys) - minY + 2 * marginFt),
  };
}

/** Axis-aligned bounding box of a polygon, in feet. */
export function plotBbox(points: Pt[]): { x0: number; y0: number; w: number; h: number } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x0, y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

/** Scale a plot to new bbox dimensions, anchored at its bbox min corner (shape preserved). */
export function resizePlot(points: Pt[], targetW: number, targetH: number): Pt[] {
  const { x0, y0, w, h } = plotBbox(points);
  const kx = targetW / (w || 1);
  const ky = targetH / (h || 1);
  return points.map(([x, y]): Pt => [Math.round((x0 + (x - x0) * kx) * 10) / 10, Math.round((y0 + (y - y0) * ky) * 10) / 10]);
}

/** Translate every point by (dx, dy) feet — whole-shape move. */
export function translatePoints(points: Pt[], dx: number, dy: number): Pt[] {
  return points.map(([x, y]): Pt => [x + dx, y + dy]);
}

/** Move one vertex. */
export function movePoint(points: Pt[], index: number, to: Pt): Pt[] {
  return points.map((p, i) => (i === index ? to : p));
}

/** Insert the midpoint of segment (index → index+1, wrapping for closed shapes) after `index`. */
export function insertMidpoint(points: Pt[], index: number, closed: boolean): Pt[] {
  const next = closed ? (index + 1) % points.length : index + 1;
  if (next >= points.length && !closed) return points;
  const mid: Pt = [(points[index][0] + points[next][0]) / 2, (points[index][1] + points[next][1]) / 2];
  return [...points.slice(0, index + 1), mid, ...points.slice(index + 1)];
}

/** Remove a vertex, refusing to go below the shape's minimum (3 closed / 2 open). */
export function removePoint(points: Pt[], index: number, closed: boolean): Pt[] {
  const min = closed ? 3 : 2;
  if (points.length <= min) return points;
  return points.filter((_, i) => i !== index);
}
