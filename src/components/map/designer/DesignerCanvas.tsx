"use client";

import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { ZONE_COLOR_HEX, polygonCentroid } from "@/lib/map/zones";
import { snapToNeighbours, nudge } from "@/lib/map/designer-actions";
import { useDesigner } from "./DesignerContext";

/** Pure Konva render surface (build-plan R2.5.5). All state + handlers come from the store. */
export function DesignerCanvas() {
  const d = useDesigner();
  const {
    width, height, scale, pxPerFt, tool, canvas, bgImg, calibrated, layers,
    elements, zones, pathways, boundary, obstacles, drawing, guides, marquee,
    measureLine, measureDist, measureCursor, selectedIds, violationIds, fillFor,
    stageRef, trRef, toFt, zoom, patchBg, commit, setSelectedIds, setGuides,
    onStageMouseDown, onStageMouseMove, onStageMouseUp, onElementClick, onTransformEnd,
    finishDrawing, isDrawTool, isClosed,
  } = d;

  return (
    <div ref={d.wrapRef} className="overflow-hidden rounded-xl border border-border bg-card" style={{ touchAction: "none", maxHeight: "72vh" }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        draggable={tool === "pan"}
        onWheel={(e) => { e.evt.preventDefault(); zoom(e.evt.deltaY > 0 ? 0.92 : 1.08); }}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onDblClick={() => { if (tool === "measure") d.setMeasureCursor(null); else if (isDrawTool(tool) && drawing) finishDrawing(drawing); }}
      >
        <Layer listening={false}>
          <Rect x={0} y={0} width={width} height={height} fill="#FAFAFA" />
          {d.gridLines.map((l, i) => <Line key={i} points={l.points} stroke="#E5E7EB" strokeWidth={1} />)}
          <Rect x={0} y={0} width={width} height={height} stroke="#94A3B8" strokeWidth={2} dash={[6, 4]} />
        </Layer>

        {/* Underlay: full-canvas until calibrated, then true-scale at its offset; draggable while unlocked. */}
        {bgImg && layers.underlay.visible && (
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
              <KonvaImage image={bgImg} x={0} y={0} width={width} height={height} opacity={canvas.bgImage?.opacity ?? 0.5} />
            )}
          </Layer>
        )}

        <Layer>
          {elements.map((el) => {
            const lid = el.kind === "infra" ? "infra" : "stalls";
            if (!layers[lid].visible) return null;
            const editable = tool === "select" && !layers[lid].locked;
            const isSel = selectedIds.has(el.id);
            return (
              <Rect
                key={el.id}
                id={el.id}
                x={el.xFt * pxPerFt}
                y={el.yFt * pxPerFt}
                width={el.widthFt * pxPerFt}
                height={el.heightFt * pxPerFt}
                rotation={el.rotation}
                fill={fillFor(el)}
                stroke={violationIds.has(el.id) ? "#C0392B" : isSel ? "#D69A22" : "#352F26"}
                strokeWidth={violationIds.has(el.id) ? 2.5 : isSel ? 2 : 1}
                cornerRadius={3}
                opacity={el.kind === "infra" ? 0.85 : 1}
                listening={editable}
                draggable={editable}
                onClick={(e) => onElementClick(el.id, e)}
                onTap={(e) => onElementClick(el.id, e)}
                onDragStart={() => { if (!selectedIds.has(el.id)) setSelectedIds(new Set([el.id])); }}
                onDragMove={(e) => {
                  if (selectedIds.size > 1) return;
                  const node = e.target;
                  const moving = { ...el, xFt: node.x() / pxPerFt, yFt: node.y() / pxPerFt };
                  const r = snapToNeighbours(moving, elements.filter((o) => o.id !== el.id), pxPerFt, 8);
                  node.x(r.xFt * pxPerFt); node.y(r.yFt * pxPerFt);
                  setGuides(r.guides);
                }}
                onDragEnd={(e) => {
                  const nx = toFt(e.target.x()); const ny = toFt(e.target.y());
                  if (selectedIds.has(el.id) && selectedIds.size > 1) commit(nudge(elements, selectedIds, nx - el.xFt, ny - el.yFt));
                  else commit(d.patchOne(el.id, { xFt: nx, yFt: ny }));
                  setGuides([]);
                }}
                onTransformEnd={(e) => onTransformEnd(el.id, e.target)}
              />
            );
          })}
          {layers.labels.visible && elements.map((el) => {
            const lid = el.kind === "infra" ? "infra" : "stalls";
            if (!layers[lid].visible) return null;
            return <Text key={`t_${el.id}`} x={el.xFt * pxPerFt} y={el.yFt * pxPerFt + (el.heightFt * pxPerFt) / 2 - 4} width={el.widthFt * pxPerFt} align="center" text={el.label} fontSize={8} fill="#15120E" listening={false} />;
          })}

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
              stroke={tool === "zone" ? "#6C75F5" : tool === "pathway" ? "#BCAE94" : "#01065B"} strokeWidth={2} dash={[8, 5]} listening={false}
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
          <Transformer ref={trRef} rotateEnabled flipEnabled={false} ignoreStroke />
        </Layer>
      </Stage>
    </div>
  );
}
