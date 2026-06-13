/**
 * Map export helpers (map-system.md §12 / build-plan R2.5.15). Pure + DB-free. The PNG/PDF
 * render lives in `MapPdf.tsx`; this owns the naming convention and the scale-bar maths.
 */

export const EXPORT_VARIANTS = ["vendor", "ops", "print"] as const;
export type ExportVariant = (typeof EXPORT_VARIANTS)[number];

export const VARIANT_LABEL: Record<ExportVariant, string> = {
  vendor: "Vendor Map",
  ops: "Operations Map",
  print: "Print Master",
};

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "map";
}

const yyyymmdd = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** `bdq-map-{slug}-{variant}-{YYYYMMDD}.{ext}` */
export function exportFilename(variant: ExportVariant, name: string, date: Date, ext: "png" | "pdf"): string {
  return `bdq-map-${slugify(name)}-${variant}-${yyyymmdd(date)}.${ext}`;
}

/**
 * Width (in PDF points) of a `feet`-foot scale bar, given the canvas width in feet and the
 * placed image width in points. The canvas grid IS real feet (true-scale once calibrated), so
 * the bar is exact regardless of the underlay's ftPerPx.
 */
export function scaleBarPoints(canvasWidthFt: number, imageWidthPt: number, feet = 50): number {
  if (canvasWidthFt <= 0) return 0;
  return (feet / canvasWidthFt) * imageWidthPt;
}

/** Fit a canvas (feet) into a content box (points), preserving aspect. */
export function fitImageBox(canvasWidthFt: number, canvasHeightFt: number, boxWidthPt: number, boxHeightPt: number): { width: number; height: number } {
  if (canvasWidthFt <= 0 || canvasHeightFt <= 0) return { width: boxWidthPt, height: boxHeightPt };
  const aspect = canvasWidthFt / canvasHeightFt;
  let width = boxWidthPt;
  let height = width / aspect;
  if (height > boxHeightPt) { height = boxHeightPt; width = height * aspect; }
  return { width, height };
}
