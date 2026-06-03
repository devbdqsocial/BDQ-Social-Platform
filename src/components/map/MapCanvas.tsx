"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Label, Layer, Rect, Stage, Tag, Text } from "react-konva";
import { ZoomIn, ZoomOut, Maximize, Search } from "lucide-react";
import type { RenderLayout } from "@/lib/map/render-types";
import { INFRA_COLOR, STALL_STATUS_COLORS, STATUS_LABEL, type StallStatus } from "@/lib/stall-colors";

interface Props {
  layout: RenderLayout;
  statuses: Record<string, StallStatus>;
  selected: Set<string>;
  onSelect: (label: string) => void;
}

const clampScale = (s: number) => Math.min(6, Math.max(0.4, s));

export default function MapCanvas({ layout, statuses, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const pinch = useRef(0);
  const [width, setWidth] = useState(960);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    const update = () => setWidth(containerRef.current?.clientWidth ?? 960);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pxPerFt = width / layout.canvas.widthFt;
  const height = layout.canvas.heightFt * pxPerFt;

  const q = search.trim().toLowerCase();
  const isMatch = (label: string) => q.length > 0 && label.toLowerCase().includes(q);

  // centre the first search match
  useEffect(() => {
    if (!q) return;
    const hit = layout.elements.find((e) => e.kind === "stall" && e.label.toLowerCase().includes(q));
    const stage = stageRef.current;
    if (!hit || !stage) return;
    const s = clampScale(2);
    setScale(s);
    const cx = (hit.xFt + hit.widthFt / 2) * pxPerFt;
    const cy = (hit.yFt + hit.heightFt / 2) * pxPerFt;
    stage.position({ x: width / 2 - cx * s, y: height / 2 - cy * s });
  }, [q, layout.elements, pxPerFt, width, height]);

  const zoom = (factor: number) => setScale((s) => clampScale(s * factor));
  const reset = () => { setScale(1); stageRef.current?.position({ x: 0, y: 0 }); };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    zoom(e.evt.deltaY > 0 ? 0.92 : 1.08);
  };
  const onTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches;
    if (t.length !== 2) return;
    e.evt.preventDefault();
    const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    if (pinch.current) setScale((s) => clampScale(s * (dist / pinch.current)));
    pinch.current = dist;
  };

  const statusOf = (label: string): StallStatus =>
    selected.has(label) ? "SELECTED" : statuses[label] ?? "AVAILABLE";

  const hovered = hover ? layout.elements.find((e) => e.kind === "stall" && e.label === hover) : null;
  const btn = "grid size-8 place-items-center rounded-md border border-border bg-background/90 text-foreground shadow-sm hover:bg-muted";

  const matchCount = useMemo(
    () => (q ? layout.elements.filter((e) => e.kind === "stall" && e.label.toLowerCase().includes(q)).length : 0),
    [q, layout.elements],
  );

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-border bg-card" style={{ touchAction: "none" }}>
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/90 px-1.5 shadow-sm">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find stall…"
            className="h-8 w-28 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {q && <span className="pr-1 text-xs text-muted-foreground">{matchCount}</span>}
        </div>
        <label className="flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2 py-1.5 text-xs shadow-sm">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
          Available only
        </label>
      </div>

      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
        <button type="button" aria-label="Zoom in" className={btn} onClick={() => zoom(1.25)}><ZoomIn className="size-4" /></button>
        <button type="button" aria-label="Zoom out" className={btn} onClick={() => zoom(0.8)}><ZoomOut className="size-4" /></button>
        <button type="button" aria-label="Reset view" className={btn} onClick={reset}><Maximize className="size-4" /></button>
      </div>

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        draggable
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { pinch.current = 0; }}
      >
        <Layer>
          {layout.elements.map((el, i) => {
            const x = el.xFt * pxPerFt;
            const y = el.yFt * pxPerFt;
            const w = el.widthFt * pxPerFt;
            const h = el.heightFt * pxPerFt;

            if (el.kind === "infra") {
              return (
                <Group key={i} listening={false} opacity={availableOnly ? 0.3 : 1}>
                  <Rect x={x} y={y} width={w} height={h} fill={INFRA_COLOR.fill} stroke={INFRA_COLOR.stroke} cornerRadius={3} />
                  <Text x={x} y={y + h / 2 - 5} width={w} align="center" text={el.label} fontSize={9} fill={INFRA_COLOR.text} />
                </Group>
              );
            }

            const status = statusOf(el.label);
            const c = STALL_STATUS_COLORS[status];
            const clickable = status === "AVAILABLE" || status === "SELECTED";
            const match = isMatch(el.label);
            const dimmed = availableOnly && status !== "AVAILABLE" && status !== "SELECTED";

            return (
              <Group
                key={i}
                opacity={dimmed ? 0.2 : 1}
                onMouseEnter={() => setHover(el.label)}
                onMouseLeave={() => setHover((prev) => (prev === el.label ? null : prev))}
                onClick={() => clickable && onSelect(el.label)}
                onTap={() => clickable && onSelect(el.label)}
              >
                <Rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={c.fill}
                  stroke={match ? "#D69A22" : c.stroke}
                  strokeWidth={match ? 3 : status === "SELECTED" ? 2 : 1}
                  cornerRadius={3}
                  shadowColor="#D69A22"
                  shadowBlur={match ? 18 : status === "SELECTED" ? 14 : 0}
                />
                <Text x={x} y={y + h / 2 - 4} width={w} align="center" text={el.label} fontSize={8} fill={c.text} listening={false} />
              </Group>
            );
          })}

          {hovered && hovered.kind === "stall" && (
            <Label x={hovered.xFt * pxPerFt} y={hovered.yFt * pxPerFt - 16}>
              <Tag fill="#15120E" cornerRadius={3} />
              <Text
                text={` ${hovered.label} · ${hovered.type} · ${hovered.widthFt}×${hovered.heightFt}ft · ${STATUS_LABEL[statusOf(hovered.label)]} `}
                fontSize={10}
                fill="#FBF7F0"
                padding={3}
              />
            </Label>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
