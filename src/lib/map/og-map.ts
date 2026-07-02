import type { LayoutV2 } from "@/lib/map/layout-v2";
import { ZONE_COLOR_HEX } from "@/lib/map/zones";

/**
 * Venue silhouette for the event's social-share image: plot outline + zone fills + stall dots,
 * scaled into a maxW×maxH box. Pure + konva-free (satori renders plain SVG shapes). Returns null
 * when there is nothing to show or the layout is too dense for an OG render.
 */

export const OG_MAP_ELEMENT_CAP = 400;

export interface OgMapShapes {
  width: number;
  height: number;
  /** svg points strings */
  boundary: string | null;
  zones: { points: string; fill: string }[];
  stalls: { x: number; y: number; w: number; h: number }[];
}

export function ogMapShapes(layout: LayoutV2, maxW: number, maxH: number): OgMapShapes | null {
  const stalls = layout.elements.filter((e) => e.kind === "stall");
  if (stalls.length === 0 && !layout.boundary) return null;
  if (layout.elements.length > OG_MAP_ELEMENT_CAP) return null;

  const k = Math.min(maxW / layout.canvas.widthFt, maxH / layout.canvas.heightFt);
  const pts = (points: [number, number][]) => points.map(([x, y]) => `${(x * k).toFixed(1)},${(y * k).toFixed(1)}`).join(" ");

  return {
    width: Math.round(layout.canvas.widthFt * k),
    height: Math.round(layout.canvas.heightFt * k),
    boundary: layout.boundary && layout.boundary.points.length >= 3 ? pts(layout.boundary.points as [number, number][]) : null,
    zones: layout.zones.map((z) => ({ points: pts(z.points as [number, number][]), fill: ZONE_COLOR_HEX[z.color] })),
    stalls: stalls.map((s) => ({ x: +(s.xFt * k).toFixed(1), y: +(s.yFt * k).toFixed(1), w: Math.max(1, +(s.widthFt * k).toFixed(1)), h: Math.max(1, +(s.heightFt * k).toFixed(1)) })),
  };
}
