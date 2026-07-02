"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lShapePlot, rectPlot } from "@/lib/map/plot";
import { useDesigner } from "./DesignerContext";

const field = "h-9 w-24 rounded-md border border-border bg-background px-2 text-sm";

/** Empty-map starter: define the plot first (preset / draw / trace), then fill it in. */
export function PlotSetupCard() {
  const d = useDesigner();
  const [shape, setShape] = useState<"RECT" | "L">("RECT");
  const [w, setW] = useState(400);
  const [depth, setDepth] = useState(250);
  const [cutW, setCutW] = useState(100);
  const [cutD, setCutD] = useState(80);

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-card p-4">
      <div>
        <p className="font-medium">Define your plot</p>
        <p className="text-sm text-muted-foreground">Start with the real ground you have — everything else is placed inside it. You can reshape it point-by-point any time.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 text-xs text-muted-foreground">
        <label className="flex flex-col gap-1">
          Shape
          <select value={shape} onChange={(e) => setShape(e.target.value as "RECT" | "L")} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
            <option value="RECT">Rectangle</option>
            <option value="L">L-shape</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">Width (ft)<input type="number" min={10} value={w} onChange={(e) => setW(Number(e.target.value))} className={field} /></label>
        <label className="flex flex-col gap-1">Depth (ft)<input type="number" min={10} value={depth} onChange={(e) => setDepth(Number(e.target.value))} className={field} /></label>
        {shape === "L" && (
          <>
            <label className="flex flex-col gap-1">Cut width (ft)<input type="number" min={1} value={cutW} onChange={(e) => setCutW(Number(e.target.value))} className={field} /></label>
            <label className="flex flex-col gap-1">Cut depth (ft)<input type="number" min={1} value={cutD} onChange={(e) => setCutD(Number(e.target.value))} className={field} /></label>
          </>
        )}
        <Button size="sm" onClick={() => d.applyPlot(shape === "L" ? lShapePlot(w, depth, cutW, cutD) : rectPlot(w, depth))}>
          Place plot
        </Button>
        <span className="pb-2">or</span>
        <Button size="sm" variant="outline" onClick={() => d.selectTool("boundary")}>Draw it (B)</Button>
        {d.uploadAction && (
          <Button size="sm" variant="outline" onClick={() => d.bgFileRef.current?.click()}>Trace a photo</Button>
        )}
      </div>
    </div>
  );
}
