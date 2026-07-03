"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lShapePlot, rectPlot } from "@/lib/map/plot";
import { NumInput } from "../NumInput";
import { useDesigner } from "./DesignerContext";

const field = "h-9 w-24 rounded-md border border-border bg-background px-2 text-sm";

/** Empty-map starter: define the plot first (preset / draw / trace), then fill it in. Fields start
 * empty with example placeholders — nothing pre-filled to fight your typing. */
export function PlotSetupCard() {
  const d = useDesigner();
  const [shape, setShape] = useState<"RECT" | "L">("RECT");
  const [w, setW] = useState<number | null>(null);
  const [depth, setDepth] = useState<number | null>(null);
  const [cutW, setCutW] = useState<number | null>(null);
  const [cutD, setCutD] = useState<number | null>(null);
  const ready = w != null && w > 0 && depth != null && depth > 0;

  const place = () => {
    if (!ready) return;
    d.applyPlot(
      shape === "L"
        ? lShapePlot(w, depth, cutW ?? Math.round(w / 3), cutD ?? Math.round(depth / 3))
        : rectPlot(w, depth),
    );
  };

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
        <label className="flex flex-col gap-1">Width (ft)<NumInput value={w} onCommit={setW} allowEmpty placeholder="400" className={field} /></label>
        <label className="flex flex-col gap-1">Depth (ft)<NumInput value={depth} onCommit={setDepth} allowEmpty placeholder="250" className={field} /></label>
        {shape === "L" && (
          <>
            <label className="flex flex-col gap-1">Cut width (ft)<NumInput value={cutW} onCommit={setCutW} allowEmpty placeholder="100" className={field} /></label>
            <label className="flex flex-col gap-1">Cut depth (ft)<NumInput value={cutD} onCommit={setCutD} allowEmpty placeholder="80" className={field} /></label>
          </>
        )}
        <Button size="sm" disabled={!ready} onClick={place}>
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
