"use client";

import { TriangleAlert } from "lucide-react";
import { ZONE_COLORS } from "@/lib/map/layout-v2";
import { ZONE_COLOR_HEX } from "@/lib/map/zones";
import { Button } from "@/components/ui/button";
import { useDesigner } from "./DesignerContext";

/** Right-column editable lists + advisories (build-plan R2.5.5). Pure render off the store. */
export function DesignerSidePanels() {
  const { violations, setSelectedIds, setOverrides, zones, setZones, pathWarnings, pathways, setPathways, obstacles, setObstacles, terrain, setTerrain, setVertexEdit, annotations, removeAnnotation, onObjClick, focusOn } = useDesigner();

  return (
    <>
      {violations.length > 0 && (
        <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-destructive">
            <TriangleAlert className="size-4" /> {violations.length} placement issue{violations.length === 1 ? "" : "s"}
          </h2>
          <p className="text-xs text-muted-foreground">Fix these or override each to save.</p>
          <ul className="space-y-1.5">
            {violations.map((v) => (
              <li key={v.elementId} className="flex items-center justify-between gap-2">
                <button type="button" className="truncate text-left hover:underline" onClick={() => setSelectedIds(new Set([v.elementId]))}>
                  <span className="font-medium">{v.label}</span> <span className="text-muted-foreground">{v.detail}</span>
                </button>
                <Button variant="ghost" size="sm" onClick={() => setOverrides((s) => new Set(s).add(v.elementId))}>Override</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {zones.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-display text-base font-semibold">Zones ({zones.length})</h2>
          <ul className="space-y-2">
            {zones.map((z) => (
              <li key={z.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-4 shrink-0 rounded-full" style={{ background: ZONE_COLOR_HEX[z.color] }} />
                  <input
                    value={z.name}
                    onChange={(e) => setZones((zs) => zs.map((x) => (x.id === z.id ? { ...x, name: e.target.value.slice(0, 24) } : x)))}
                    className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setVertexEdit({ target: "zone", id: z.id })}>Edit points</Button>
                  <Button variant="ghost" size="sm" onClick={() => setZones((zs) => zs.filter((x) => x.id !== z.id))}>Remove</Button>
                </div>
                <div className="flex flex-wrap gap-1 pl-6">
                  {ZONE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => setZones((zs) => zs.map((x) => (x.id === z.id ? { ...x, color: c } : x)))}
                      className={`size-5 rounded-full ${z.color === c ? "ring-2 ring-offset-1 ring-ring" : ""}`}
                      style={{ background: ZONE_COLOR_HEX[c] }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pathWarnings.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
          <h2 className="flex items-center gap-1.5 font-display text-base font-semibold" style={{ color: "var(--warning)" }}>
            <TriangleAlert className="size-4" /> {pathWarnings.length} pathway warning{pathWarnings.length === 1 ? "" : "s"}
          </h2>
          <p className="text-xs text-muted-foreground">Advisory — these don&apos;t block saving.</p>
          <ul className="space-y-1 text-xs">{pathWarnings.map((w) => <li key={w.id}>{w.detail}</li>)}</ul>
        </div>
      )}

      {pathways.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-display text-base font-semibold">Pathways ({pathways.length})</h2>
          <ul className="space-y-1.5">
            {pathways.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs capitalize">{p.type.toLowerCase()}</span>
                <input
                  type="number" min={4} max={40} value={p.widthFt}
                  onChange={(e) => setPathways((ps) => ps.map((x) => (x.id === p.id ? { ...x, widthFt: Math.max(4, Math.min(40, Number(e.target.value))) } : x)))}
                  className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
                />
                <span className="text-xs text-muted-foreground">ft</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setVertexEdit({ target: "pathway", id: p.id })}>Edit points</Button>
                <Button variant="ghost" size="sm" onClick={() => setPathways((ps) => ps.filter((x) => x.id !== p.id))}>Remove</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {terrain.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-display text-base font-semibold">Terrain ({terrain.length})</h2>
          <ul className="space-y-1">
            {terrain.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate capitalize">{t.type.toLowerCase()}</span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setVertexEdit({ target: "terrain", id: t.id })}>Edit points</Button>
                  <Button variant="ghost" size="sm" onClick={() => setTerrain((ts) => ts.filter((x) => x.id !== t.id))}>Remove</Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-display text-base font-semibold">Signage ({annotations.length})</h2>
          <p className="text-xs text-muted-foreground">Click one to select it on the map and edit it in the Inspector.</p>
          <ul className="space-y-1">
            {annotations.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left hover:underline"
                  onClick={() => {
                    onObjClick("annotation", a.id);
                    focusOn({ xFt: a.xFt, yFt: a.yFt, widthFt: a.type === "ARROW" ? a.lengthFt : 10, heightFt: 3 });
                  }}
                >
                  <span className="text-xs text-muted-foreground">{a.type === "ARROW" ? "Arrow · " : "Text · "}</span>
                  {a.label || "(no text)"}
                </button>
                <Button variant="ghost" size="sm" onClick={() => removeAnnotation(a.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {obstacles.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-display text-base font-semibold">Obstacles ({obstacles.length})</h2>
          <ul className="space-y-1">
            {obstacles.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left hover:underline"
                  onClick={() => {
                    onObjClick("obstacle", o.id);
                    focusOn({ xFt: o.xFt, yFt: o.yFt, widthFt: o.widthFt, heightFt: o.heightFt });
                  }}
                >
                  {o.label ?? o.type} <span className="text-xs text-muted-foreground">{o.widthFt}×{o.heightFt} ft</span>
                </button>
                <Button variant="ghost" size="sm" onClick={() => setObstacles((arr) => arr.filter((x) => x.id !== o.id))}>Remove</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
