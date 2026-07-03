"use client";

import {
  ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Hand, MousePointer2, Ruler, Spline, Shapes, Route,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween, CircleHelp, Grid2x2, Image as ImageIcon, Mountain, Gauge, Eye, Download,
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EXPORT_VARIANTS, VARIANT_LABEL, type ExportVariant } from "@/lib/map/map-export";
import { downloadMapPdf } from "./MapPdf";
import { seedToEditor } from "@/lib/map/designer-ops";
import type { Pathway } from "@/lib/map/layout-v2";
import { TERRAIN_TYPES, terrainLabel, type TerrainType } from "@/lib/map/terrain";
import { fmtAreaU, fmtLen, polygonArea } from "@/lib/map/geometry";
import { Button } from "@/components/ui/button";
import { DesignerToolbar } from "../DesignerToolbar";
import { NumInput } from "../NumInput";
import { AddPalette } from "./AddPalette";
import { useDesigner } from "./DesignerContext";

const iconBtn = "h-9 w-9 p-0";

/** Top control rows: save · ground-plan/calibration · palette toolbar · power toolbar · structure. */
export function DesignerControls() {
  const d = useDesigner();
  const {
    eventMode, saving, saveStatus, handleSave, canvas, setCanvasDim, uploadAction, bgFileRef, onUploadBg,
    calibrated, setCalibrating, patchBg, setCanvas, snap, setSnap, gridFt, setGridFt,
    selectedIds, deleteSelected, reset, setSelectedIds, buildLayoutV2,
    tool, selectTool, zoom, scale, fit, undo, redo, canUndo, canRedo, doAlign, doDistribute,
    setBulkOpen, exportPng, drawing, isDrawTool, isClosed, finishDrawing, boundary, setBoundary,
    pathType, setPathType, duplicateSelected, terrainType, setTerrainType,
    salesView, setSalesView, heatmapMode, setHeatmapMode,
    previewMode, setPreviewMode, searchQuery, setSearchQuery, searchMatches, focusOn,
    captureFullCanvas, mapName,
  } = d;

  const exportPdf = async (v: ExportVariant) => {
    const cap = captureFullCanvas();
    if (cap) await downloadMapPdf(v, cap, mapName);
  };

  return (
    <>
      {eventMode && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          {d.dirty && !saving && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--warning)" }}>
              <span className="size-2 rounded-full bg-current" /> Unsaved changes
            </span>
          )}
          {saveStatus && <span className="text-sm text-muted-foreground">{saveStatus}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Venue length (ft)
          <NumInput value={canvas.widthFt} onCommit={(v) => v != null && setCanvasDim("widthFt", v)} clamp={(v) => Math.max(1, Math.round(v))} className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm" />
        </label>
        <span className="pb-2 text-muted-foreground">×</span>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Venue width (ft)
          <NumInput value={canvas.heightFt} onCommit={(v) => v != null && setCanvasDim("heightFt", v)} clamp={(v) => Math.max(1, Math.round(v))} className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm" />
        </label>
        <p className="pb-1.5 text-sm">
          <span className="text-muted-foreground">{boundary ? "Plot area:" : "Area:"}</span>{" "}
          <span className="font-medium">{fmtAreaU(boundary ? polygonArea(boundary) : canvas.widthFt * canvas.heightFt, d.displayUnit)}</span>
        </p>
        {uploadAction && (
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => bgFileRef.current?.click()}>
              <ImageIcon className="size-4" /> {canvas.bgImage ? "Change ground plan" : "Add ground plan"}
            </Button>
            <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={onUploadBg} />
            {canvas.bgImage && (
              <>
                <Button type="button" variant={calibrated ? "outline" : "default"} size="sm" onClick={() => setCalibrating(true)}>
                  {calibrated ? "Recalibrate" : "Calibrate"}
                </Button>
                {calibrated && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => patchBg({ locked: !canvas.bgImage?.locked })}>
                    {canvas.bgImage.locked ? "Unlock position" : "Lock position"}
                  </Button>
                )}
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Opacity
                  <input type="range" min={0.2} max={1} step={0.1} value={canvas.bgImage.opacity} onChange={(e) => patchBg({ opacity: Number(e.target.value) })} />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCanvas((c) => ({ ...c, bgImage: undefined }))}>Remove</Button>
                <p className="pb-1.5 text-xs" style={{ color: calibrated ? undefined : "var(--warning)" }}>
                  {calibrated ? `1 px = ${(canvas.bgImage.ftPerPx ?? 0).toFixed(3)} ft` : "Not to scale — calibrate"}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <AddPalette />

      <DesignerToolbar
        snap={snap}
        gridFt={gridFt}
        hasSelection={selectedIds.size > 0}
        onSnap={setSnap}
        onGrid={setGridFt}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onLoadTemplate={() => { reset(seedToEditor()); setSelectedIds(new Set()); }}
        onClear={() => { reset([]); setSelectedIds(new Set()); }}
        getLayout={buildLayoutV2}
        onImport={(els) => { reset(els); setSelectedIds(new Set()); }}
      />

      {/* power toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2">
        <Button variant={tool === "select" ? "secondary" : "ghost"} size="sm" className={iconBtn} title="Select (V)" onClick={() => selectTool("select")}><MousePointer2 className="size-4" /></Button>
        <Button variant={tool === "pan" ? "secondary" : "ghost"} size="sm" className={iconBtn} title="Pan (H)" onClick={() => selectTool("pan")}><Hand className="size-4" /></Button>
        <Button variant={tool === "measure" ? "secondary" : "ghost"} size="sm" className={iconBtn} title="Measure distance (M)" onClick={() => selectTool("measure")}><Ruler className="size-4" /></Button>
        <Button variant={tool === "boundary" ? "secondary" : "ghost"} size="sm" className={iconBtn} title="Draw venue boundary (B)" onClick={() => selectTool("boundary")}><Spline className="size-4" /></Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <Button variant="ghost" size="sm" className={iconBtn} title="Zoom out (−)" onClick={() => zoom(0.8)}><ZoomOut className="size-4" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-14 px-1 text-xs tabular-nums" title="Zoom presets">{Math.round(scale * 100)}%</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-28">
            {[0.5, 1, 2].map((z) => (
              <DropdownMenuItem key={z} onClick={() => d.zoomTo(z)}>{z * 100}%</DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={fit}>Fit to plot (0)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" className={iconBtn} title="Zoom in (+)" onClick={() => zoom(1.25)}><ZoomIn className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Fit to plot" onClick={fit}><Maximize className="size-4" /></Button>
        <span className="mx-1 h-6 w-px bg-border" />
        {(["FT", "M"] as const).map((u) => (
          <Button key={u} variant={d.displayUnit === u ? "secondary" : "ghost"} size="sm" className="h-8 px-2 text-xs" title={u === "FT" ? "Show feet" : "Show meters"} onClick={() => d.setDisplayUnit(u)}>{u.toLowerCase()}</Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        <Button variant="ghost" size="sm" className={iconBtn} title="Undo" disabled={!canUndo} onClick={undo}><Undo2 className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Redo" disabled={!canRedo} onClick={redo}><Redo2 className="size-4" /></Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <Button variant="ghost" size="sm" className={iconBtn} title="Align left" disabled={selectedIds.size < 2} onClick={() => doAlign("left")}><AlignHorizontalJustifyStart className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Align centre" disabled={selectedIds.size < 2} onClick={() => doAlign("hcenter")}><AlignHorizontalJustifyCenter className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Align right" disabled={selectedIds.size < 2} onClick={() => doAlign("right")}><AlignHorizontalJustifyEnd className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Align top" disabled={selectedIds.size < 2} onClick={() => doAlign("top")}><AlignVerticalJustifyStart className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Align middle" disabled={selectedIds.size < 2} onClick={() => doAlign("vcenter")}><AlignVerticalJustifyCenter className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Align bottom" disabled={selectedIds.size < 2} onClick={() => doAlign("bottom")}><AlignVerticalJustifyEnd className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Distribute horizontally" disabled={selectedIds.size < 3} onClick={() => doDistribute("h")}><AlignHorizontalSpaceBetween className="size-4" /></Button>
        <Button variant="ghost" size="sm" className={iconBtn} title="Distribute vertically" disabled={selectedIds.size < 3} onClick={() => doDistribute("v")}><AlignVerticalSpaceBetween className="size-4" /></Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <div className="relative">
          <input
            id="designer-search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search (/)" className="h-8 w-36 rounded-md border border-border bg-background px-2 text-xs"
          />
          {searchMatches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-48 overflow-auto rounded-md border border-border bg-popover p-1 text-xs shadow-md">
              {searchMatches.map((m) => (
                <li key={`${m.kind}_${m.id}`}>
                  <button className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); focusOn(m.focus); setSearchQuery(""); }}>
                    <span className="truncate">{m.label}</span>
                    <span className="shrink-0 capitalize text-muted-foreground">{m.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Grid2x2 className="size-4" /> Bulk grid</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Download className="size-4" /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportPng}><ImageIcon className="mr-2 size-4" /> PNG (2×)</DropdownMenuItem>
            <DropdownMenuSeparator />
            {EXPORT_VARIANTS.map((v) => (
              <DropdownMenuItem key={v} onClick={() => exportPdf(v)}>{VARIANT_LABEL[v]} (PDF)</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" className={iconBtn} title="Keyboard shortcuts (?)" onClick={() => d.setHelpOpen(true)}><CircleHelp className="size-4" /></Button>
        <Button variant={previewMode ? "secondary" : "outline"} size="sm" title="Vendor preview — hide admin layers" onClick={() => setPreviewMode((v) => !v)}><Eye className="size-4" /> Preview</Button>
        <Button variant={salesView ? "secondary" : "outline"} size="sm" title="Sales view — stall scores (S)" disabled={previewMode} onClick={() => setSalesView((v) => !v)}><Gauge className="size-4" /> Sales</Button>
        {salesView && (
          <>
            <span className="ml-1 text-xs text-muted-foreground">Heatmap:</span>
            {(["off", "price", "score"] as const).map((m) => (
              <Button key={m} variant={heatmapMode === m ? "secondary" : "ghost"} size="sm" className="h-8 capitalize" onClick={() => setHeatmapMode(m)}>{m}</Button>
            ))}
          </>
        )}
      </div>

      {/* structure row — boundary + zones + pathways + obstacles */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2 text-xs">
        {d.vertexEdit && d.vertexPoints ? (
          <>
            <span className="text-foreground">
              Editing points — drag a corner to move it, click a small dot to add one, double-click a corner to remove it.
            </span>
            <Button variant="outline" size="sm" onClick={() => d.setVertexEdit(null)}>Done</Button>
          </>
        ) : isDrawTool(tool) ? (
          <>
            <span className="text-foreground">
              Drawing {tool} · {(drawing?.length ?? 0)} pts — {isClosed(tool) ? "click the first point or Enter to close" : "double-click or Enter to finish"}, Esc to cancel
            </span>
            <Button variant="outline" size="sm" disabled={(drawing?.length ?? 0) < (isClosed(tool) ? 3 : 2)} onClick={() => drawing && finishDrawing(drawing)}>Finish</Button>
          </>
        ) : (
          <>
            <span className="px-1 text-muted-foreground">Boundary:</span>
            {boundary ? (
              <>
                <span className="text-foreground">{boundary.length}-pt plot</span>
                <Button variant="ghost" size="sm" onClick={() => d.setVertexEdit({ target: "boundary" })}>Edit points</Button>
                <Button variant="ghost" size="sm" onClick={() => selectTool("boundary")}>Redraw</Button>
                <Button variant="ghost" size="sm" onClick={() => setBoundary(null)}>Clear</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => selectTool("boundary")}><Spline className="size-4" /> Draw plot boundary (B)</Button>
            )}
            <span className="mx-1 h-6 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={() => selectTool("zone")}><Shapes className="size-4" /> Add zone (Z)</Button>
            <span className="mx-1 h-6 w-px bg-border" />
            <span className="px-1 text-muted-foreground"><Route className="inline size-3.5" /> Pathway:</span>
            <select value={pathType} onChange={(e) => setPathType(e.target.value as Pathway["type"])} className="h-8 rounded-md border border-border bg-background px-1.5 text-xs">
              <option value="MAIN">Main (20 ft)</option>
              <option value="SECONDARY">Secondary (12 ft)</option>
              <option value="EMERGENCY">Emergency (10 ft)</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => selectTool("pathway")}>Draw (P)</Button>
            <span className="mx-1 h-6 w-px bg-border" />
            <span className="px-1 text-muted-foreground"><Mountain className="inline size-3.5" /> Terrain:</span>
            <select value={terrainType} onChange={(e) => setTerrainType(e.target.value as TerrainType)} className="h-8 rounded-md border border-border bg-background px-1.5 text-xs">
              {TERRAIN_TYPES.map((t) => <option key={t} value={t}>{terrainLabel(t)}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={() => selectTool("terrain")}>Draw</Button>
          </>
        )}
      </div>
    </>
  );
}

/** Live status: cursor position, zoom, current selection / measurement (map-system §3). */
export function DesignerStatusBar() {
  const { cursorFt, scale, tool, measureLine, measureDist, selected, selectedIds, displayUnit, placing } = useDesigner();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
      <span className="tabular-nums">{cursorFt ? `x ${fmtLen(cursorFt[0], displayUnit)} · y ${fmtLen(cursorFt[1], displayUnit)}` : "—"}</span>
      <span className="tabular-nums">zoom {Math.round(scale * 100)}%</span>
      <span className="tabular-nums">
        {placing
          ? `Placing ${placing.label} — click to stamp, Esc to stop`
          : tool === "measure" && measureLine.length >= 2
          ? `distance ${fmtLen(measureDist, displayUnit)}`
          : selected
            ? `${selected.label}: ${fmtLen(selected.widthFt, displayUnit)} × ${fmtLen(selected.heightFt, displayUnit)} · ${fmtAreaU(selected.widthFt * selected.heightFt, displayUnit)}`
            : selectedIds.size > 1
              ? `${selectedIds.size} selected`
              : "drag to pan · shift-drag to multi-select · ? for shortcuts"}
      </span>
    </div>
  );
}
