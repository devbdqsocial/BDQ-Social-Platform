"use client";

import { HEATMAP_RAMP } from "@/lib/map/heatmap";
import { formatPaise } from "@/lib/utils";
import { useDesigner } from "./DesignerContext";

/** Heatmap legend (map-system §9.3): the cream→lavender ramp with its quintile bounds. */
export function HeatmapLegend() {
  const { heatmapMode, heatmapBounds } = useDesigner();
  if (heatmapMode === "off") return null;

  if (heatmapBounds.length === 0) {
    return (
      <aside className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Heatmap · no {heatmapMode === "price" ? "priced" : "scored"} stalls yet — set prices (or add stalls) to see the ramp.
      </aside>
    );
  }

  const fmt = (v: number) => (heatmapMode === "price" ? formatPaise(v) : String(Math.round(v)));
  // 5 buckets from 4 bounds: "≤ b0", "b0–b1", … , "≥ b3"
  const labels = heatmapBounds.length === 4
    ? [`≤ ${fmt(heatmapBounds[0])}`, `${fmt(heatmapBounds[0])}–${fmt(heatmapBounds[1])}`, `${fmt(heatmapBounds[1])}–${fmt(heatmapBounds[2])}`, `${fmt(heatmapBounds[2])}–${fmt(heatmapBounds[3])}`, `≥ ${fmt(heatmapBounds[3])}`]
    : HEATMAP_RAMP.map(() => "—");

  return (
    <aside className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
      <h2 className="font-display text-base font-semibold">Heatmap · by {heatmapMode}</h2>
      <ul className="space-y-1 text-xs">
        {HEATMAP_RAMP.map((hex, i) => (
          <li key={hex} className="flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded" style={{ background: hex }} />
            <span className="text-muted-foreground">{labels[i]}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Quintiles across {heatmapMode === "price" ? "priced" : "scored"} stalls. Unpriced stalls render grey.</p>
    </aside>
  );
}
