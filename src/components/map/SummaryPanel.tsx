"use client";

import { useMemo } from "react";
import type { EditorElement, PaletteStallType } from "@/lib/map/designer-ops";
import type { Zone } from "@/lib/map/layout-v2";
import { formatPaise } from "@/lib/utils";
import { usedSqFt, occupancy, fmtArea, fmtPct } from "@/lib/map/geometry";
import { zoneRollups } from "@/lib/map/zones";
import { ZONE_COLOR_HEX } from "@/lib/map/zones";

export function SummaryPanel({
  elements,
  stallTypes,
  zones = [],
  venueSqFt,
  isPlot = false,
}: {
  elements: EditorElement[];
  stallTypes: PaletteStallType[];
  zones?: Zone[];
  /** venue area for the space budget — the plot polygon's area when a boundary is set, else canvas W×H */
  venueSqFt?: number;
  /** true when venueSqFt comes from the plot boundary (labels the budget rows accordingly) */
  isPlot?: boolean;
}) {
  const rollups = useMemo(() => zoneRollups(elements, zones), [elements, zones]);
  const summary = useMemo(() => {
    const nameById = Object.fromEntries(stallTypes.map((t) => [t.id, t.name]));
    const priceById = Object.fromEntries(stallTypes.map((t) => [t.id, t.priceInPaise]));
    const stalls = elements.filter((e) => e.kind === "stall");
    const blocked = stalls.filter((s) => s.status === "BLOCKED").length;
    const sellable = stalls.length - blocked;
    // Effective price mirrors checkout: stall override, else its type's price.
    const totalPaise = stalls.reduce(
      (sum, s) => sum + (s.status === "BLOCKED" ? 0 : s.priceInPaise ?? (s.stallTypeId ? priceById[s.stallTypeId] ?? 0 : 0)),
      0,
    );
    const byType = new Map<string, number>();
    for (const s of stalls) {
      const key = s.stallTypeId ? nameById[s.stallTypeId] ?? "Other" : "Untyped";
      byType.set(key, (byType.get(key) ?? 0) + 1);
    }
    const used = usedSqFt(elements);
    return {
      total: stalls.length, infra: elements.length - stalls.length, blocked, sellable, totalPaise,
      byType: [...byType], used, occ: venueSqFt ? occupancy(elements, venueSqFt) : null,
    };
  }, [elements, stallTypes, venueSqFt]);

  return (
    <aside className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
      <h2 className="font-display text-base font-semibold">Summary</h2>
      <div className="flex justify-between"><span className="text-muted-foreground">Stalls</span><span className="font-medium">{summary.total}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Sellable</span><span className="font-medium">{summary.sellable}</span></div>
      {summary.blocked > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Blocked</span><span className="font-medium">{summary.blocked}</span></div>}
      <div className="flex justify-between"><span className="text-muted-foreground">Infra / zones</span><span className="font-medium">{summary.infra}</span></div>
      {venueSqFt != null && (
        <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">{isPlot ? "Plot area" : "Canvas area"}</span><span className="font-medium tabular-nums">{fmtArea(venueSqFt)}</span></div>
      )}
      <div className={venueSqFt != null ? "flex justify-between" : "flex justify-between border-t border-border pt-2"}><span className="text-muted-foreground">Used area</span><span className="font-medium tabular-nums">{fmtArea(summary.used)}</span></div>
      {venueSqFt != null && (
        <div className="flex justify-between"><span className="text-muted-foreground">Free space</span><span className="font-medium tabular-nums">{fmtArea(Math.max(0, venueSqFt - summary.used))}</span></div>
      )}
      {summary.occ != null && (
        <div className="flex justify-between"><span className="text-muted-foreground">Occupancy</span><span className="font-medium tabular-nums">{fmtPct(summary.occ)}</span></div>
      )}
      <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Potential value</span><span className="font-semibold">{formatPaise(summary.totalPaise)}</span></div>
      {summary.byType.length > 0 && (
        <ul className="border-t border-border pt-2 text-xs text-muted-foreground">
          {summary.byType.map(([name, n]) => (
            <li key={name} className="flex justify-between"><span>{name}</span><span>{n}</span></li>
          ))}
        </ul>
      )}
      {rollups.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">By zone</p>
          <ul className="space-y-1 text-xs">
            {rollups.map((z) => (
              <li key={z.zoneId} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: ZONE_COLOR_HEX[z.color] }} />
                  <span className="truncate">{z.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{z.stalls} · {formatPaise(z.potentialPaise)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
