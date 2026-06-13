"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { computeFtPerPx, imageDimsFt, roundFt, toFeet, type DistanceUnit } from "@/lib/map/calibration";

type Pt = { x: number; y: number }; // image-NATURAL pixel coordinates

/**
 * Underlay calibration (map-system.md §2). Admin clicks two points on the ground photo whose
 * real distance they know; we derive ft-per-pixel so the image renders at true scale. The
 * confirm step shows the computed venue size vs. the known venue (the mis-calibration guard,
 * failure-analysis #28) before the result is applied.
 */
export function CalibrationModal({
  url,
  knownVenueFt,
  onApply,
  onClose,
}: {
  url: string;
  /** the venue's known dimensions, shown in the confirm step for a sanity check */
  knownVenueFt: { widthFt: number; heightFt: number };
  onApply: (ftPerPx: number) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [distance, setDistance] = useState(50);
  const [unit, setUnit] = useState<DistanceUnit>("FT");
  const [confirming, setConfirming] = useState(false);

  const addPoint = (e: React.MouseEvent<HTMLImageElement>) => {
    if (confirming) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    // displayed click → natural-pixel coordinate (scale-independent)
    const nx = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
    const ny = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;
    setPoints((p) => (p.length >= 2 ? [{ x: nx, y: ny }] : [...p, { x: nx, y: ny }]));
  };

  const ready = points.length === 2 && distance > 0;
  const knownFt = toFeet(distance, unit);
  const ftPerPx = ready ? computeFtPerPx(points[0].x, points[0].y, points[1].x, points[1].y, knownFt) : 0;
  const dims =
    ready && imgRef.current
      ? imageDimsFt(imgRef.current.naturalWidth, imgRef.current.naturalHeight, ftPerPx)
      : { widthFt: 0, heightFt: 0 };

  // marker positions as % of the displayed image (so they track responsive sizing)
  const pct = (p: Pt) =>
    imgRef.current
      ? { left: `${(p.x / imgRef.current.naturalWidth) * 100}%`, top: `${(p.y / imgRef.current.naturalHeight) * 100}%` }
      : { left: "0%", top: "0%" };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl space-y-4 rounded-xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-display text-lg font-semibold">Calibrate the ground plan</h2>
          <p className="text-sm text-muted-foreground">
            Click two points whose real distance you know — a boundary wall, gate-to-gate, or a cricket pitch (66 ft).
            Everything you draw will then match the real ground.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt="Ground plan to calibrate"
            className="block max-h-[48vh] w-full cursor-crosshair object-contain select-none"
            draggable={false}
            onClick={addPoint}
          />
          {points.map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute -ml-2.5 -mt-2.5 grid size-5 place-items-center rounded-full bg-lavender-500 text-[10px] font-bold text-white ring-2 ring-white"
              style={pct(p)}
            >
              {i === 0 ? "A" : "B"}
            </span>
          ))}
        </div>

        {!confirming ? (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Real distance between points
                <input
                  type="number"
                  min={1}
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="h-9 w-32 rounded-md border border-border bg-background px-2 text-sm"
                />
              </label>
              <div className="flex h-9 overflow-hidden rounded-md border border-border">
                {(["FT", "M"] as DistanceUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-3 text-sm ${unit === u ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    {u === "FT" ? "feet" : "metres"}
                  </button>
                ))}
              </div>
              <p className="pb-1.5 text-xs text-muted-foreground">
                {points.length}/2 points placed{ready ? ` · 1 px = ${ftPerPx.toFixed(3)} ft` : ""}
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPoints([])} disabled={!points.length}>
                Reset points
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" disabled={!ready} onClick={() => setConfirming(true)}>Continue</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-background p-4 text-sm">
              <p>
                Your image covers{" "}
                <strong>
                  {roundFt(dims.widthFt)} × {roundFt(dims.heightFt)} ft
                </strong>
                .
              </p>
              <p className="mt-1 text-muted-foreground">
                This venue is about {knownVenueFt.widthFt} × {knownVenueFt.heightFt} ft — does that look right?
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Recalibrate</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={() => onApply(ftPerPx)}>Confirm &amp; apply</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
