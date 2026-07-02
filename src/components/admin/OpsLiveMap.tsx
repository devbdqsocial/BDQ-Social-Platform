"use client";

import dynamic from "next/dynamic";
import { StallLegend } from "@/components/map/StallLegend";
import type { RenderExtras, RenderLayout, StatusMap } from "@/lib/map/render-types";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="grid h-72 place-items-center rounded-xl border border-border text-sm text-muted-foreground">Loading map…</div>,
});

/** Read-only live venue map for the ops monitor — statuses recolor on the page's AutoRefresh. */
export function OpsLiveMap({ layout, statuses, extras }: { layout: RenderLayout; statuses: StatusMap; extras: RenderExtras }) {
  return (
    <div className="space-y-3">
      <MapCanvas layout={layout} statuses={statuses} extras={extras} />
      <StallLegend />
    </div>
  );
}
