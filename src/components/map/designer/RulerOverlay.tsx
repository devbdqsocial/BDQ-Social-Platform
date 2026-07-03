"use client";

import { rulerTicks } from "@/lib/map/viewport";
import { FT_PER_M } from "@/lib/map/geometry";
import { useDesigner } from "./DesignerContext";

/**
 * Screen-pinned rulers (HTML, outside the Stage — never in PNG/PDF exports). Ticks follow the
 * grid's bold-line cadence and measure from the plot corner (0 at the plot) in the display unit.
 */
export function RulerOverlay() {
  const { worldRect, gridLines, view, pxPerFt, plotOrigin, displayUnit } = useDesigner();
  const toX = (ft: number) => ft * pxPerFt * view.scale + view.x;
  const toY = (ft: number) => ft * pxPerFt * view.scale + view.y;
  const xTicks = rulerTicks(worldRect.x0, worldRect.x1, gridLines.stepFt, plotOrigin[0], toX);
  const yTicks = rulerTicks(worldRect.y0, worldRect.y1, gridLines.stepFt, plotOrigin[1], toY);
  const fmt = (ft: number) => (displayUnit === "M" ? Math.round(ft / FT_PER_M) : ft);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4">
        {xTicks.map((t) => (
          <span key={`x${t.label}`} className="absolute top-0 -translate-x-1/2 text-[9px] leading-4 tabular-nums text-muted-foreground" style={{ left: t.pos }}>
            {fmt(t.label)}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7">
        {yTicks.map((t) => (
          <span key={`y${t.label}`} className="absolute left-1 -translate-y-1/2 text-[9px] tabular-nums text-muted-foreground" style={{ top: t.pos }}>
            {fmt(t.label)}
          </span>
        ))}
      </div>
      <span className="pointer-events-none absolute left-1 top-0 z-10 rounded bg-background/70 px-0.5 text-[9px] font-semibold leading-4 text-muted-foreground">
        {displayUnit === "M" ? "m" : "ft"}
      </span>
    </>
  );
}
