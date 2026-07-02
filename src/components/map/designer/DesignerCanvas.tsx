"use client";

import { memo, useCallback, useRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { EditorElement } from "@/lib/map/designer-ops";
import { ZONE_COLOR_HEX, polygonCentroid } from "@/lib/map/zones";
import { TERRAIN_COLOR_HEX } from "@/lib/map/terrain";
import { TIER_HEX } from "@/server/map/scoring";
import { OPS_HEX, ENTRY_HEX } from "@/lib/map/entry-ops";
import { snapToNeighbours, nudge } from "@/lib/map/designer-actions";
import { useDesigner } from "./DesignerContext";
import { PolygonEditor } from "./PolygonEditor";

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
  onDragStartId: (id: string) => void;
  onDragMoveId: (id: string, node: Konva.Node) => void;
  onDragEndId: (id: string, node: Konva.Node) => void;
  onTransformEndId: (id: string, node: Konva.Node) => void;
}
const ElementNode = memo(function ElementNode({ el, pxPerFt, editable, isSel, isViolation, fill, onClick, onDragStartId, onDragMoveId, onDragEndId, onTransformEndId }: ElementNodeProps) {
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
      onDragStart={() => onDragStartId(el.id)}
      onDragMove={(e) => onDragMoveId(el.id, e.target)}
      onDragEnd={(e) => onDragEndId(el.id, e.target)}
      onTransformEnd={(e) => onTransformEndId(el.id, e.target)}
    />
  );
});

/** Pure Konva render surface (build-plan R2.5.5). All state + handlers come from the store. */
export function DesignerCanvas() {
  const d = useDesigner();
  const {
    width, height, view, setView, worldRect, pxPerFt, tool, canvas, bgImg, calibrated, layers,
    elements, zones, pathways, terrain, boundary, obstacles, ops, entryFlow, drawing, guides, marquee,
    measureLine, measureDist, measureCursor, selectedIds, violationIds, fillFor,
    salesView, scores, heatFillFor, compareSnapshot, previewMode, pulseId,
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

  return (
    <div ref={d.wrapRef} className="overflow-hidden rounded-xl border border-border bg-card" style={{ touchAction: "none", maxHeight: "72vh" }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable={tool === "pan"}
        onDragMove={(e) => { if (e.target === e.target.getStage()) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() })); }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const p = stageRef.current?.getPointerPosition() ?? { x: width / 2, y: height / 2 };
          wheelZoom(p, e.evt.deltaY);
        }}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
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
                editable={tool === "select" && !layers[lid].locked}
                isSel={selectedIds.has(el.id)}
                isViolation={violationIds.has(el.id) && !previewMode}
                fill={(!previewMode && heatFillFor(el)) || fillFor(el)}
                onClick={onElementClick}
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
            return <Text key={`t_${el.id}`} x={el.xFt * pxPerFt} y={el.yFt * pxPerFt + (el.heightFt * pxPerFt) / 2 - 4} width={el.widthFt * pxPerFt} align="center" text={el.label} fontSize={8} fill="#15120E" listening={false} />;
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
          {drawing && drawing.length >= 1 && (
            <Line
              points={[...drawing, ...(isDrawTool(tool) && measureCursor ? [measureCursor] : [])].flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])}
              closed={isClosed(tool)}
              stroke={tool === "zone" ? "#6C75F5" : tool === "pathway" ? "#BCAE94" : tool === "terrain" ? TERRAIN_COLOR_HEX[d.terrainType] : "#01065B"} strokeWidth={2} dash={[8, 5]} listening={false}
            />
          )}

          {/* fixed obstacles — draggable, muted brown */}
          {obstacles.map((o) => (
            <Rect
              key={o.id}
              x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt}
              fill="#7A5C43" opacity={0.55} stroke="#4E4639" strokeWidth={1} cornerRadius={2}
              draggable={tool === "select"}
              onDragEnd={(e) => d.setObstacles((arr) => arr.map((x) => (x.id === o.id ? { ...x, xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) } : x)))}
            />
          ))}

          {/* entry-flow objects (§8) — gates/lanes/scan points; lavender family */}
          {layers.entryflow.visible && entryFlow.map((o) => (
            <Group key={o.id} listening={!layers.entryflow.locked}>
              <Rect
                x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt}
                fill={ENTRY_HEX[o.type]} opacity={0.5} stroke="#01065B" strokeWidth={1} cornerRadius={2}
                draggable={tool === "select" && !layers.entryflow.locked}
                onDragEnd={(e) => d.setEntryFlow((arr) => arr.map((x) => (x.id === o.id ? { ...x, xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) } : x)))}
              />
              {layers.labels.visible && <Text x={o.xFt * pxPerFt} y={o.yFt * pxPerFt + o.heightFt * pxPerFt / 2 - 4} width={o.widthFt * pxPerFt} align="center" text={o.lanes ? `${o.label} ×${o.lanes}` : o.label ?? ""} fontSize={7} fill="#01065B" listening={false} />}
            </Group>
          ))}

          {/* ops objects (§8) — security/medical/power; muted neutrals (hidden in vendor preview) */}
          {!previewMode && layers.ops.visible && ops.map((o) => (
            <Group key={o.id} listening={!layers.ops.locked}>
              <Rect
                x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt}
                fill={OPS_HEX[o.type]} opacity={0.55} stroke="#15120E" strokeWidth={1} cornerRadius={2}
                draggable={tool === "select" && !layers.ops.locked}
                onDragEnd={(e) => d.setOps((arr) => arr.map((x) => (x.id === o.id ? { ...x, xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) } : x)))}
              />
              {layers.labels.visible && <Text x={o.xFt * pxPerFt} y={o.yFt * pxPerFt + o.heightFt * pxPerFt / 2 - 4} width={o.widthFt * pxPerFt} align="center" text={o.label ?? ""} fontSize={7} fill="#FFFFFF" listening={false} />}
            </Group>
          ))}

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
          />
        </Layer>
      </Stage>
    </div>
  );
}
