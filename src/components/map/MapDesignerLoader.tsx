"use client";

import dynamic from "next/dynamic";
import type { MapDesignerProps } from "./MapDesigner";

const MapDesigner = dynamic(() => import("./MapDesigner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-96 place-items-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
      Loading designer…
    </div>
  ),
});

export function MapDesignerLoader(props: MapDesignerProps) {
  return <MapDesigner {...props} />;
}
