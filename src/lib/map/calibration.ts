/**
 * Underlay calibration math (map-system.md §2, build-plan R2.5.2). Pure + DB-free so it's
 * unit-testable. Turns "these two points on the photo are N feet apart" into a feet-per-pixel
 * scale, so every object drawn over the image occupies its true real-world footprint.
 */

const M_TO_FT = 3.28084;

export type DistanceUnit = "FT" | "M";

export function toFeet(value: number, unit: DistanceUnit): number {
  return unit === "M" ? value * M_TO_FT : value;
}

/** Distance in IMAGE-NATURAL pixels between two clicked points. */
export function pixelDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/**
 * ftPerPx = knownFeet / pixelDistance. Returns 0 (uncalibrated) when the two points coincide.
 */
export function computeFtPerPx(ax: number, ay: number, bx: number, by: number, knownFt: number): number {
  const dist = pixelDistance(ax, ay, bx, by);
  if (dist <= 0 || knownFt <= 0) return 0;
  return knownFt / dist;
}

/** Real-world size of the whole image, given its natural pixel dimensions + calibration. */
export function imageDimsFt(naturalWidthPx: number, naturalHeightPx: number, ftPerPx: number): { widthFt: number; heightFt: number } {
  return { widthFt: naturalWidthPx * ftPerPx, heightFt: naturalHeightPx * ftPerPx };
}

/** Round to one decimal foot for the confirm-step readout. */
export const roundFt = (ft: number): number => Math.round(ft * 10) / 10;
