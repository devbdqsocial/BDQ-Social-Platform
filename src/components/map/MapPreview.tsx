"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { RenderElement, RenderLayout } from "@/lib/map/render-types";
import { STATUS_LABEL, type StallStatus } from "@/lib/stall-colors";
import { StallLegend } from "./StallLegend";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-96 place-items-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
      Loading event layout…
    </div>
  ),
});

export function MapPreview({
  layout,
  statuses,
}: {
  layout: RenderLayout;
  statuses: Record<string, StallStatus>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (label: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const stalls = useMemo(
    () => layout.elements.filter((e): e is RenderElement => e.kind === "stall"),
    [layout],
  );

  return (
    <div className="space-y-4">
      <StallLegend />
      <MapCanvas layout={layout} statuses={statuses} selected={selected} onSelect={toggle} />
      <p className="text-sm text-muted-foreground">
        {stalls.length} stalls · {selected.size} selected
        {selected.size > 0 ? `: ${[...selected].join(", ")}` : ""}
      </p>

      {/* Accessible fallback — the canvas is not screen-reader navigable (design.md §11/§15). */}
      <details className="rounded-lg border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">Stall list (accessible)</summary>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          {stalls.map((s) => {
            const st: StallStatus = selected.has(s.label)
              ? "SELECTED"
              : (statuses[s.label] ?? "AVAILABLE");
            return (
              <li key={s.label} className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span className="text-muted-foreground">{STATUS_LABEL[st]}</span>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
