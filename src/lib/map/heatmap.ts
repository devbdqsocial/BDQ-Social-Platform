/**
 * Revenue/score heatmap (map-system.md §9.3, build-plan R2.5.12). Pure + DB-free. Stalls are
 * filled by quintile of price (or score) on a cream→lavender ramp; the legend reads the bounds.
 */

export type HeatmapMode = "off" | "price" | "score";

/** Cream → lavender, 5 steps (brand lavender #868EFF caps the top quintile). Konva needs hex. */
export const HEATMAP_RAMP = ["#FBF1D3", "#E7DCD6", "#C9C2DD", "#A7A6EC", "#868EFF"] as const;

/** Linear-interpolated percentile (0..1) of an ASCENDING-sorted array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** The 4 internal quintile cut points (20/40/60/80th percentiles), ascending. */
export function quintileBounds(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return [0.2, 0.4, 0.6, 0.8].map((p) => percentile(sorted, p));
}

/** Quintile bucket of a value against its bounds: 0 (lowest) … 4 (highest). */
export function quintileIndex(value: number, bounds: number[]): number {
  let i = 0;
  for (const b of bounds) if (value > b) i++;
  return Math.min(i, HEATMAP_RAMP.length - 1);
}

/** Ramp colour for a value against precomputed bounds. */
export function heatmapFill(value: number, bounds: number[]): string {
  return HEATMAP_RAMP[quintileIndex(value, bounds)];
}
