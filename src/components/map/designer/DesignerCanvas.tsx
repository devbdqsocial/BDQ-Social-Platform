"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Arrow, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import type { EditorElement } from "@/lib/map/designer-ops";
import { ZONE_COLOR_HEX, polygonCentroid } from "@/lib/map/zones";
import { TERRAIN_COLOR_HEX } from "@/lib/map/terrain";
import { TIER_HEX } from "@/server/map/scoring";
import { OPS_HEX, ENTRY_HEX } from "@/lib/map/entry-ops";
import { snapToNeighbours, nudge } from "@/lib/map/designer-actions";
import { catalogLabel } from "@/lib/map/catalog";
import { fmtLen, fmtSize } from "@/lib/map/geometry";
import { useDesigner } from "./DesignerContext";
import { ElementLabel } from "./ElementLabel";
import { PolygonEditor } from "./PolygonEditor";
import { RulerOverlay } from "./RulerOverlay";

// Left button only: Konva 10 defaults to [0, 1], which would let middle-drag MOVE elements.
// Middle-mouse is reserved for panning (handled at the wrapper, capture phase).
Konva.dragButtons = [0];

/**
 * Memoized element node (R2.5.17 perf). Re-renders ONLY when its own props change (geometry,
 * selection, fill, violation, editability) — so high-frequency parent re-renders that don't touch
 * this element (zoom, search typing, attendance input, side-panel updates) skip it entirely. The
 * drag/transform callbacks are ref-stabilized by the parent, so they never change identity.
 */
interface ElementNodeProps {
  el: EditorElement;
  pxPerFt: number;
  editable: boolean;
  isSel: boolean;
  isViolation: boolean;
  fill: string;
  onClick: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDblClickId: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onHoverId: (id: string | null) => void;
  onDragStartId: (id: string) => void;
  onDragMoveId: (id: string, node: Konva.Node) => void;
  onDragEndId: (id: string, node: Konva.Node) => void;
  onTransformEndId: (id: string, node: Konva.Node) => void;
}
const ElementNode = memo(function ElementNode({ el, pxPerFt, editable, isSel, isViolation, fill, onClick, onDblClickId, onHoverId, onDragStartId, onDragMoveId, onDragEndId, onTransformEndId }: ElementNodeProps) {
  return (
    <Rect
      id={el.id}
      x={el.xFt * pxPerFt} y={el.yFt * pxPerFt} width={el.widthFt * pxPerFt} height={el.heightFt * pxPerFt}
      rotation={el.rotation}
      fill={fill}
      stroke={isViolation ? "#C0392B" : isSel ? "#D69A22" : "#352F26"}
      strokeWidth={isViolation ? 2.5 : isSel ? 2 : 1}
      cornerRadius={3}
      opacity={el.kind === "infra" ? 0.85 : 1}
      listening={editable}
      draggable={editable}
      onClick={(e) => onClick(el.id, e)}
      onTap={(e) => onClick(el.id, e)}
      onDblClick={(e) => onDblClickId(el.id, e)}
      onDblTap={(e) => onDblClickId(el.id, e)}
      onMouseEnter={() => onHoverId(el.id)}
      onMouseLeave={() => onHoverId(null)}
      onDragStart={() => onDragStartId(el.id)}
      onDragMove={(e) => onDragMoveId(el.id, e.target)}
      onDragEnd={(e) => onDragEndId(el.id, e.target)}
      onTransformEnd={(e) => onTransformEndId(el.id, e.target)}
    />
  );
});

/** Floating rename input pinned over the renamed node via the camera transform. */
function RenameOverlay() {
  const d = useDesigner();
  const r = d.renaming;
  const target = r
    ? r.kind === "element"
      ? d.elements.find((e) => e.id === r.id)
      : d.annotations.find((a) => a.id === r.id)
    : null;
  const [value, setValue] = useState("");
  useEffect(() => { if (target) setValue(target.label); }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r || !target) return null;

  const left = target.xFt * d.pxPerFt * d.view.scale + d.view.x;
  const top = target.yFt * d.pxPerFt * d.view.scale + d.view.y;
  const width = r.kind === "element" && "widthFt" in target ? Math.max(80, target.widthFt * d.pxPerFt * d.view.scale) : 160;
  const commitRename = () => {
    const label = value.trim();
    if (r.kind === "element") { if (label) d.commit(d.patchOne(r.id, { label })); }
    else d.patchAnnotation(r.id, { label });
    d.setRenaming(null);
  };
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value.slice(0, 40))}
      onFocus={(e) => e.target.select()}
      onBlur={commitRename}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitRename();
        else if (e.key === "Escape") d.setRenaming(null);
      }}
      className="absolute z-20 h-8 rounded-md border border-primary bg-background px-2 text-sm shadow-md"
      style={{ left, top, width }}
    />
  );
}

/** Pure Konva render surface (build-plan R2.5.5). All state + handlers come from the store. */
export function DesignerCanvas() {
  const d = useDesigner();
  const {
    width, height, view, setView, worldRect, pxPerFt, tool, canvas, bgImg, calibrated, layers,
    spaceDown, panning, setPanning, stageDraggable, onStageClick,
    elements, zones, pathways, terrain, boundary, obstacles, ops, entryFlow, drawing, guides, marquee,
    measureLine, measureDist, measureCursor, selectedIds, violationIds, fillFor,
    salesView, scores, heatFillFor, compareSnapshot, previewMode, pulseId, showSizes, displayUnit, plotDims,
    stageRef, trRef, toFt, wheelZoom, patchBg, commit, setSelectedIds, setGuides,
    onStageMouseDown, onStageMouseMove, onStageMouseUp, onElementClick, onTransformEnd,
    finishDrawing, isDrawTool, isClosed,
  } = d;

  // Latest-value refs so the drag/transform callbacks stay referentially stable (R2.5.17) — the
  // memoized ElementNode then only re-renders on its own prop changes, not on every store render.
  const elementsRef = useRef(elements); elementsRef.current = elements;
  const selRef = useRef(selectedIds); selRef.current = selectedIds;
  const pxRef = useRef(pxPerFt); pxRef.current = pxPerFt;
  const toFtRef = useRef(toFt); toFtRef.current = toFt;
  const commitRef = useRef(commit); commitRef.current = commit;

  const onDragStartId = useCallback((id: string) => {
    if (!selRef.current.has(id)) setSelectedIds(new Set([id]));
  }, [setSelectedIds]);
  const onDragMoveId = useCallback((id: string, node: Konva.Node) => {
    if (selRef.current.size > 1) return;
    const px = pxRef.current; const els = elementsRef.current;
    const el = els.find((e) => e.id === id); if (!el) return;
    const moving = { ...el, xFt: node.x() / px, yFt: node.y() / px };
    const r = snapToNeighbours(moving, els.filter((o) => o.id !== id), px, 8);
    node.x(r.xFt * px); node.y(r.yFt * px);
    setGuides(r.guides);
  }, [setGuides]);
  const onDragEndId = useCallback((id: string, node: Konva.Node) => {
    const els = elementsRef.current; const sel = selRef.current;
    const el = els.find((e) => e.id === id); if (!el) return;
    const nx = toFtRef.current(node.x()); const ny = toFtRef.current(node.y());
    if (sel.has(id) && sel.size > 1) commitRef.current(nudge(els, sel, nx - el.xFt, ny - el.yFt));
    else commitRef.current(els.map((e) => (e.id === id ? { ...e, xFt: nx, yFt: ny } : e)));
    setGuides([]);
  }, [setGuides]);
  const onTransformEndId = useCallback((id: string, node: Konva.Node) => onTransformEnd(id, node), [onTransformEnd]);
  const setRenaming = d.setRenaming;
  const onDblClickId = useCallback((id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true; // the stage dblclick finishes drawings — renaming must not
    setRenaming({ kind: "element", id });
  }, [setRenaming]);

  // hover tooltip — full name · type · size, so nothing is ever hidden by a fitted/floated label
  const [hovered, setHovered] = useState<{ kind: "element" | "ops" | "entry" | "obstacle"; id: string } | null>(null);
  const onHoverId = useCallback((id: string | null) => setHovered(id ? { kind: "element", id } : null), []);

  // Middle-mouse pan — intercepted at the wrapper (capture) so Konva never sees the button.
  const midPan = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const onMidPanDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    midPan.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    setPanning(true);
    const move = (ev: PointerEvent) => {
      const m = midPan.current;
      if (m) setView((v) => ({ ...v, x: m.vx + ev.clientX - m.sx, y: m.vy + ev.clientY - m.sy }));
    };
    const up = () => {
      midPan.current = null;
      setPanning(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [view.x, view.y, setView, setPanning]);

  // Cursor mirrors what a drag would do: grab/grabbing (pan), crosshair (draw/measure), default.
  useEffect(() => {
    const c = stageRef.current?.container();
    if (!c) return;
    c.style.cursor = panning
      ? "grabbing"
      : tool === "pan" || spaceDown
        ? "grab"
        : isDrawTool(tool) || tool === "measure" || d.placing
          ? "crosshair"
          : "default";
  }, [panning, spaceDown, tool, isDrawTool, stageRef, d.placing]);

  return (
    <div
      ref={d.wrapRef}
      className="relative overflow-hidden rounded-xl border border-border bg-card"
      style={{ touchAction: "none", maxHeight: "72vh" }}
      onPointerDownCapture={onMidPanDown}
    >
      <RenameOverlay />
      <RulerOverlay />
      {(() => {
        if (!hovered) return null;
        const src =
          hovered.kind === "element" ? elements.find((e) => e.id === hovered.id) :
          hovered.kind === "ops" ? ops.find((o) => o.id === hovered.id) :
          hovered.kind === "entry" ? entryFlow.find((o) => o.id === hovered.id) :
          obstacles.find((o) => o.id === hovered.id);
        if (!src) return null;
        const typeLabel = hovered.kind === "element" ? src.type : catalogLabel((src as { type: string }).type);
        const name = "label" in src && src.label ? src.label : typeLabel;
        const text = `${name} · ${typeLabel} · ${fmtSize(src.widthFt, src.heightFt, displayUnit)}`;
        const left = (src.xFt + src.widthFt / 2) * pxPerFt * view.scale + view.x;
        const top = src.yFt * pxPerFt * view.scale + view.y;
        return (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-[#15120E] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#FBF7F0] shadow"
            style={{ left, top: top - 4 }}
          >
            {text}
          </div>
        );
      })()}
      {/* placement mode — visible cancel affordance (Esc / right-click also cancel) */}
      {d.placing && (
        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs shadow-md">
          <span>Placing <span className="font-medium">{d.placing.label}</span> — click to stamp</span>
          <button type="button" className="rounded-full border border-border px-2 py-0.5 font-medium hover:bg-muted" onClick={() => d.setPlacing(null)}>Cancel</button>
        </div>
      )}
      {/* on-canvas zoom controls (bottom-right) */}
      <div className="absolute bottom-2 right-2 z-10 flex flex-col items-center gap-1">
        {(() => {
          const btn = "relative grid size-8 place-items-center rounded-md border border-border bg-background/90 text-foreground shadow-sm hover:bg-muted after:absolute after:-inset-1.5";
          return (
            <>
              <button type="button" aria-label="Zoom in" title="Zoom in (+)" className={btn} onClick={() => d.zoom(1.25)}><ZoomIn className="size-4" /></button>
              <span className="rounded-md border border-border bg-background/90 px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground shadow-sm">{Math.round(view.scale * 100)}%</span>
              <button type="button" aria-label="Zoom out" title="Zoom out (−)" className={btn} onClick={() => d.zoom(0.8)}><ZoomOut className="size-4" /></button>
              <button type="button" aria-label="Fit to plot" title="Fit to plot (0)" className={btn} onClick={d.fit}><Maximize className="size-4" /></button>
            </>
          );
        })()}
      </div>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable={stageDraggable}
        dragDistance={3}
        onClick={onStageClick}
        onTap={onStageClick}
        onDragStart={(e) => { if (e.target === e.target.getStage()) setPanning(true); }}
        onDragEnd={(e) => { if (e.target === e.target.getStage()) setPanning(false); }}
        onDragMove={(e) => { if (e.target === e.target.getStage()) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() })); }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const p = stageRef.current?.getPointerPosition() ?? { x: width / 2, y: height / 2 };
          wheelZoom(p, e.evt.deltaY);
        }}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (d.placing) { d.setPlacing(null); return; } // right-click cancels placement
          const id = e.target.id() || e.target.getParent()?.id() || "";
          d.openContextMenu(id, { x: e.evt.clientX, y: e.evt.clientY });
        }}
        onDblClick={() => { if (tool === "measure") d.setMeasureCursor(null); else if (isDrawTool(tool) && drawing) finishDrawing(drawing); }}
      >
        {/* Endless graph paper: surround + grid cover the visible WORLD window (any zoom/pan);
            the canvas/plot rect reads as white paper against the muted surround. */}
        <Layer listening={false}>
          <Rect
            x={worldRect.x0 * pxPerFt} y={worldRect.y0 * pxPerFt}
            width={(worldRect.x1 - worldRect.x0) * pxPerFt} height={(worldRect.y1 - worldRect.y0) * pxPerFt}
            fill="#EEF0F3"
          />
          <Rect x={0} y={0} width={canvas.widthFt * pxPerFt} height={canvas.heightFt * pxPerFt} fill="#FBFBFA" />
          {/* the plot itself reads as bright paper against the canvas + surround */}
          {boundary && boundary.length >= 3 && (
            <Line points={boundary.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])} closed fill="#FFFFFF" />
          )}
          {d.gridLines.minor.map((l, i) => <Line key={`gm${i}`} points={l.points} stroke="#E3E6EA" strokeWidth={1} strokeScaleEnabled={false} />)}
          {d.gridLines.major.map((l, i) => <Line key={`gM${i}`} points={l.points} stroke="#D2D7DE" strokeWidth={1} strokeScaleEnabled={false} />)}
          <Rect x={0} y={0} width={canvas.widthFt * pxPerFt} height={canvas.heightFt * pxPerFt} stroke="#94A3B8" strokeWidth={2} dash={[6, 4]} strokeScaleEnabled={false} />
        </Layer>

        {/* Underlay: full-canvas until calibrated, then true-scale at its offset; draggable while unlocked. */}
        {bgImg && layers.underlay.visible && !previewMode && (
          <Layer listening={calibrated && !canvas.bgImage?.locked && !layers.underlay.locked}>
            {calibrated ? (
              <KonvaImage
                image={bgImg}
                x={(canvas.bgImage?.offsetXFt ?? 0) * pxPerFt}
                y={(canvas.bgImage?.offsetYFt ?? 0) * pxPerFt}
                width={bgImg.naturalWidth * (canvas.bgImage!.ftPerPx ?? 0) * pxPerFt}
                height={bgImg.naturalHeight * (canvas.bgImage!.ftPerPx ?? 0) * pxPerFt}
                opacity={canvas.bgImage?.opacity ?? 0.7}
                draggable={!canvas.bgImage?.locked && !layers.underlay.locked}
                onDragEnd={(e) => patchBg({ offsetXFt: toFt(e.target.x()), offsetYFt: toFt(e.target.y()) })}
              />
            ) : (
              <KonvaImage image={bgImg} x={0} y={0} width={canvas.widthFt * pxPerFt} height={canvas.heightFt * pxPerFt} opacity={canvas.bgImage?.opacity ?? 0.5} />
            )}
          </Layer>
        )}

        <Layer>
          {/* compare ghost — the compared version's stalls, faint dashed (R2.5.13) */}
          {!previewMode && compareSnapshot?.elements.map((el) => (
            <Rect
              key={`ghost_${el.id}`}
              x={el.xFt * pxPerFt} y={el.yFt * pxPerFt} width={el.widthFt * pxPerFt} height={el.heightFt * pxPerFt}
              rotation={el.rotation} stroke="#868EFF" strokeWidth={1} dash={[4, 3]} opacity={0.5} listening={false}
            />
          ))}
          {/* terrain — ground-texture polygons under everything (R2.5.8) */}
          {layers.terrain.visible && terrain.map((t) => (
            <Line
              key={t.id}
              points={t.points.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])}
              closed fill={TERRAIN_COLOR_HEX[t.type]} opacity={0.15} listening={false}
            />
          ))}
          {elements.map((el) => {
            const lid = el.kind === "infra" ? "infra" : "stalls";
            if (!layers[lid].visible) return null;
            return (
              <ElementNode
                key={el.id}
                el={el}
                pxPerFt={pxPerFt}
                editable={tool === "select" && !layers[lid].locked && !spaceDown}
                isSel={selectedIds.has(el.id)}
                isViolation={violationIds.has(el.id) && !previewMode}
                fill={(!previewMode && heatFillFor(el)) || fillFor(el)}
                onClick={onElementClick}
                onDblClickId={onDblClickId}
                onHoverId={onHoverId}
                onDragStartId={onDragStartId}
                onDragMoveId={onDragMoveId}
                onDragEndId={onDragEndId}
                onTransformEndId={onTransformEndId}
              />
            );
          })}
          {layers.labels.visible && elements.map((el) => {
            const lid = el.kind === "infra" ? "infra" : "stalls";
            if (!layers[lid].visible) return null;
            return (
              <ElementLabel
                key={`t_${el.id}`}
                xFt={el.xFt} yFt={el.yFt} widthFt={el.widthFt} heightFt={el.heightFt}
                pxPerFt={pxPerFt} scale={view.scale} worldTopFt={worldRect.y0}
                name={el.label} sizeText={showSizes ? fmtSize(el.widthFt, el.heightFt, displayUnit) : null} fill="#15120E"
              />
            );
          })}

          {/* Sales view (S): score badge per stall, tier-coloured (map-system §9.1) */}
          {salesView && !previewMode && layers.stalls.visible && elements.map((el) => {
            if (el.kind !== "stall") return null;
            const sc = scores.get(el.id);
            if (!sc) return null;
            const bx = el.xFt * pxPerFt + 1, by = el.yFt * pxPerFt + 1;
            return (
              <Group key={`sc_${el.id}`} listening={false}>
                <Rect x={bx} y={by} width={26} height={13} fill={TIER_HEX[sc.tier]} cornerRadius={2} opacity={0.92} />
                <Text x={bx} y={by + 2} width={26} align="center" text={String(sc.total)} fontSize={9} fontStyle="bold" fill="#FFFFFF" />
              </Group>
            );
          })}

          {/* search-focus pulse ring (§9.4) */}
          {pulseId && (() => {
            const el = elements.find((e) => e.id === pulseId);
            if (!el) return null;
            return <Rect x={el.xFt * pxPerFt - 4} y={el.yFt * pxPerFt - 4} width={el.widthFt * pxPerFt + 8} height={el.heightFt * pxPerFt + 8} rotation={el.rotation} stroke="#868EFF" strokeWidth={3} cornerRadius={4} opacity={0.9} listening={false} />;
          })()}

          {/* pathways — thick rounded strips (width = stroke); emergency = red dashed */}
          {layers.pathways.visible && pathways.map((p) => p.points.length >= 2 && (
            <Line
              key={p.id}
              points={p.points.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])}
              stroke={p.type === "EMERGENCY" ? "#C0392B" : "#BCAE94"}
              strokeWidth={p.widthFt * pxPerFt}
              opacity={0.45} lineCap="round" lineJoin="round"
              dash={p.type === "EMERGENCY" ? [p.widthFt * pxPerFt * 0.8, p.widthFt * pxPerFt * 0.5] : undefined}
              listening={false}
            />
          ))}

          {/* zones — filled colored regions + centroid name label */}
          {layers.zones.visible && zones.map((z) => {
            const hex = ZONE_COLOR_HEX[z.color];
            const [cx, cy] = polygonCentroid(z.points);
            return (
              <Group key={z.id} listening={false}>
                <Line points={z.points.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])} closed fill={hex} opacity={0.12} stroke={hex} strokeWidth={1.5} />
                <Text x={cx * pxPerFt - 40} y={cy * pxPerFt - 5} width={80} align="center" text={z.name.toUpperCase()} fontSize={10} fontStyle="bold" fill={hex} />
              </Group>
            );
          })}

          {/* venue boundary (set + in-progress) */}
          {boundary && boundary.length >= 2 && (
            <Line points={boundary.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])} closed stroke="#01065B" strokeWidth={2} dash={[8, 5]} listening={false} />
          )}
          {/* plot edge dimensions — always shown; width above the top edge, depth left of the
              left edge; font inverse-scaled so it stays readable at any zoom */}
          {plotDims && (() => {
            const { x0, y0, w, h } = plotDims;
            const fs = 12 / view.scale;
            const pad = 6 / view.scale;
            return (
              <Group listening={false}>
                {/* width — centered above the top edge */}
                <Text x={x0 * pxPerFt} y={y0 * pxPerFt - fs - pad} width={w * pxPerFt} align="center" text={fmtLen(w, displayUnit)} fontSize={fs} fontStyle="bold" fill="#01065B" />
                {/* depth — rotated, centered along the left edge (reads bottom-to-top) */}
                <Group x={x0 * pxPerFt} y={(y0 + h / 2) * pxPerFt} rotation={-90}>
                  <Text x={-(h * pxPerFt) / 2} y={-fs - pad} width={h * pxPerFt} align="center" text={fmtLen(h, displayUnit)} fontSize={fs} fontStyle="bold" fill="#01065B" />
                </Group>
              </Group>
            );
          })()}
          {drawing && drawing.length >= 1 && (
            <Line
              points={[...drawing, ...(isDrawTool(tool) && measureCursor ? [measureCursor] : [])].flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])}
              closed={isClosed(tool)}
              stroke={tool === "zone" ? "#6C75F5" : tool === "pathway" ? "#BCAE94" : tool === "terrain" ? TERRAIN_COLOR_HEX[d.terrainType] : "#01065B"} strokeWidth={2} dash={[8, 5]} listening={false}
            />
          )}

          {/* fixed obstacles — click-to-edit, draggable, muted brown */}
          {obstacles.map((o) => {
            const isSel = d.selectedObj?.id === o.id;
            return (
              <Group key={o.id}>
                <Rect
                  id={o.id}
                  x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt}
                  rotation={o.rotation}
                  fill="#7A5C43" opacity={0.55} stroke={isSel ? "#D69A22" : "#4E4639"} strokeWidth={isSel ? 2 : 1} cornerRadius={2}
                  listening={!d.placing}
                  draggable={tool === "select" && !spaceDown && !d.placing}
                  onClick={() => d.onObjClick("obstacle", o.id)}
                  onTap={() => d.onObjClick("obstacle", o.id)}
                  onMouseEnter={() => setHovered({ kind: "obstacle", id: o.id })}
                  onMouseLeave={() => setHovered((h) => (h?.id === o.id ? null : h))}
                  onDragStart={() => d.onObjClick("obstacle", o.id)}
                  onDragEnd={(e) => d.patchObstacle(o.id, { xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) })}
                  onTransformEnd={(e) => d.onObjTransformEnd("obstacle", o.id, e.target)}
                />
                {layers.labels.visible && (
                  <ElementLabel
                    xFt={o.xFt} yFt={o.yFt} widthFt={o.widthFt} heightFt={o.heightFt}
                    pxPerFt={pxPerFt} scale={view.scale} worldTopFt={worldRect.y0}
                    name={o.label ?? o.type} sizeText={showSizes ? fmtSize(o.widthFt, o.heightFt, displayUnit) : null} fill="#FFFFFF"
                  />
                )}
              </Group>
            );
          })}

          {/* entry-flow objects (§8) — gates/lanes/scan points; click-to-edit; lavender family */}
          {layers.entryflow.visible && entryFlow.map((o) => {
            const isSel = d.selectedObj?.id === o.id;
            return (
              <Group key={o.id}>
                <Rect
                  id={o.id}
                  x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt}
                  rotation={o.rotation}
                  fill={ENTRY_HEX[o.type]} opacity={0.5} stroke={isSel ? "#D69A22" : "#01065B"} strokeWidth={isSel ? 2 : 1} cornerRadius={2}
                  listening={!layers.entryflow.locked && !d.placing}
                  draggable={tool === "select" && !layers.entryflow.locked && !spaceDown && !d.placing}
                  onClick={() => d.onObjClick("entry", o.id)}
                  onTap={() => d.onObjClick("entry", o.id)}
                  onMouseEnter={() => setHovered({ kind: "entry", id: o.id })}
                  onMouseLeave={() => setHovered((h) => (h?.id === o.id ? null : h))}
                  onDragStart={() => d.onObjClick("entry", o.id)}
                  onDragEnd={(e) => d.patchEntry(o.id, { xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) })}
                  onTransformEnd={(e) => d.onObjTransformEnd("entry", o.id, e.target)}
                />
                {layers.labels.visible && (
                  <ElementLabel
                    xFt={o.xFt} yFt={o.yFt} widthFt={o.widthFt} heightFt={o.heightFt}
                    pxPerFt={pxPerFt} scale={view.scale} worldTopFt={worldRect.y0}
                    name={o.lanes ? `${o.label} ×${o.lanes}` : o.label ?? ""} sizeText={showSizes ? fmtSize(o.widthFt, o.heightFt, displayUnit) : null} fill="#01065B"
                  />
                )}
              </Group>
            );
          })}

          {/* ops objects (§8) — click-to-edit; muted neutrals (hidden in vendor preview) */}
          {!previewMode && layers.ops.visible && ops.map((o) => {
            const isSel = d.selectedObj?.id === o.id;
            return (
              <Group key={o.id}>
                <Rect
                  id={o.id}
                  x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt}
                  rotation={o.rotation}
                  fill={OPS_HEX[o.type]} opacity={0.55} stroke={isSel ? "#D69A22" : "#15120E"} strokeWidth={isSel ? 2 : 1} cornerRadius={2}
                  listening={!layers.ops.locked && !d.placing}
                  draggable={tool === "select" && !layers.ops.locked && !spaceDown && !d.placing}
                  onClick={() => d.onObjClick("ops", o.id)}
                  onTap={() => d.onObjClick("ops", o.id)}
                  onMouseEnter={() => setHovered({ kind: "ops", id: o.id })}
                  onMouseLeave={() => setHovered((h) => (h?.id === o.id ? null : h))}
                  onDragStart={() => d.onObjClick("ops", o.id)}
                  onDragEnd={(e) => d.patchOps(o.id, { xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) })}
                  onTransformEnd={(e) => d.onObjTransformEnd("ops", o.id, e.target)}
                />
                {layers.labels.visible && (
                  <ElementLabel
                    xFt={o.xFt} yFt={o.yFt} widthFt={o.widthFt} heightFt={o.heightFt}
                    pxPerFt={pxPerFt} scale={view.scale} worldTopFt={worldRect.y0}
                    name={o.label ?? ""} sizeText={showSizes ? fmtSize(o.widthFt, o.heightFt, displayUnit) : null} fill="#FFFFFF"
                  />
                )}
              </Group>
            );
          })}

          {/* signage — wayfinding arrows + free text (annotations layer, visible to all lenses) */}
          {layers.annotations.visible && d.annotations.map((a) => (
            <Group
              key={a.id}
              id={a.id}
              x={a.xFt * pxPerFt}
              y={a.yFt * pxPerFt}
              rotation={a.rotation}
              listening={!layers.annotations.locked && !d.placing}
              draggable={tool === "select" && !layers.annotations.locked && !spaceDown && !d.placing}
              onClick={() => d.onObjClick("annotation", a.id)}
              onTap={() => d.onObjClick("annotation", a.id)}
              onDblClick={(e) => { e.cancelBubble = true; setRenaming({ kind: "annotation", id: a.id }); }}
              onDblTap={(e) => { e.cancelBubble = true; setRenaming({ kind: "annotation", id: a.id }); }}
              onDragStart={() => d.onObjClick("annotation", a.id)}
              onDragEnd={(e) => d.patchAnnotation(a.id, { xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) })}
              onTransformEnd={(e) => d.onObjTransformEnd("annotation", a.id, e.currentTarget ?? e.target)}
            >
              {a.type === "ARROW" ? (
                <>
                  <Arrow points={[0, 0, a.lengthFt * pxPerFt, 0]} stroke="#01065B" fill="#01065B" strokeWidth={3} pointerLength={10} pointerWidth={10} />
                  {a.label && <Text x={0} y={6} width={a.lengthFt * pxPerFt} align="center" text={a.label} fontSize={10} fontStyle="bold" fill="#01065B" />}
                </>
              ) : (
                <Text text={a.label || "Text"} fontSize={a.fontSize} fontStyle="bold" fill="#15120E" />
              )}
            </Group>
          ))}

          {/* placement ghost — snapped preview of the armed palette object */}
          {d.placing && d.ghostFt && d.placingGhost && (
            <Group listening={false}>
              <Rect
                x={d.ghostFt[0] * pxPerFt}
                y={d.ghostFt[1] * pxPerFt}
                width={d.placingGhost[0] * pxPerFt}
                height={d.placingGhost[1] * pxPerFt}
                fill="#868EFF"
                opacity={0.25}
                stroke="#6C75F5"
                strokeWidth={1.5}
                strokeScaleEnabled={false}
                dash={[6, 4]}
                cornerRadius={3}
              />
              <Text
                x={d.ghostFt[0] * pxPerFt}
                y={(d.ghostFt[1] + d.placingGhost[1]) * pxPerFt + 4}
                text={d.placing.label}
                fontSize={10}
                fontStyle="bold"
                fill="#6C75F5"
              />
            </Group>
          )}

          {guides.map((g, i) => <Line key={`g${i}`} points={g.points} stroke="#868EFF" strokeWidth={1} dash={[4, 4]} listening={false} />)}
          {marquee && <Rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#868EFF22" stroke="#868EFF" strokeWidth={1} listening={false} />}

          {/* distance tool */}
          {measureLine.length >= 2 && (
            <>
              <Line points={measureLine.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])} stroke="#6C75F5" strokeWidth={1.5} dash={[6, 4]} listening={false} />
              {measureLine.map(([x, y], i) => <Rect key={`m${i}`} x={x * pxPerFt - 3} y={y * pxPerFt - 3} width={6} height={6} fill="#6C75F5" listening={false} />)}
              <Text
                x={measureLine[measureLine.length - 1][0] * pxPerFt + 6}
                y={measureLine[measureLine.length - 1][1] * pxPerFt - 6}
                text={`${measureDist.toFixed(1)} ft (${(measureDist / 3.28084).toFixed(1)} m)`}
                fontSize={11} fontStyle="bold" fill="#01065B" listening={false}
              />
            </>
          )}
          <PolygonEditor />
          <Transformer
            ref={trRef}
            rotateEnabled
            flipEnabled={false}
            ignoreStroke
            rotationSnaps={Array.from({ length: 24 }, (_, i) => i * 15)}
            rotationSnapTolerance={6}
            // signage is rotate-only: resizing its Group would scale the caption text
            resizeEnabled={!(selectedIds.size === 0 && d.selectedObj?.kind === "annotation")}
          />
        </Layer>
      </Stage>
    </div>
  );
}
