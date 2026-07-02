"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Arrow, Group, Label, Layer, Line, Rect, Stage, Tag, Text } from "react-konva";
import { ZoomIn, ZoomOut, Maximize, Search } from "lucide-react";
import type { RenderExtras, RenderLayout } from "@/lib/map/render-types";
import { INFRA_COLOR, STALL_STATUS_COLORS, STATUS_LABEL, type StallStatus } from "@/lib/stall-colors";
import { ZONE_COLOR_HEX, polygonCentroid } from "@/lib/map/zones";
import { ENTRY_HEX, OPS_HEX } from "@/lib/map/entry-ops";
import { catalogLabel } from "@/lib/map/catalog";

interface Props {
  layout: RenderLayout;
  statuses: Record<string, StallStatus>;
  /** Omit both for a read-only view (public event layout). */
  selected?: Set<string>;
  onSelect?: (label: string) => void;
  /** When set, animate-zoom to this stall (450ms ease-out, 2×) + a 600ms pulse (map-system §11). */
  focusLabel?: string | null;
  /** Lens-filtered venue context (zones/walkways/gates/signage) — omit for exactly the old render. */
  extras?: RenderExtras;
}

const clampScale = (s: number) => Math.min(6, Math.max(0.4, s));

const NO_SELECTION: Set<string> = new Set();

export default function MapCanvas({ layout, statuses, selected = NO_SELECTION, onSelect, focusLabel, extras }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const pinch = useRef(0);
  const raf = useRef(0);
  const [width, setWidth] = useState(960);
  const [scale, setScale] = useState(1);
  const [pulse, setPulse] = useState(0);
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

  // Animate-zoom + pulse to a chosen stall (map-system §11). 450ms ease-out to 2× + centre,
  // then a 600ms shadow pulse. Reduced-motion → jump straight there, no pulse.
  useEffect(() => {
    if (!focusLabel) return;
    const hit = layout.elements.find((e) => e.kind === "stall" && e.label === focusLabel);
    const stage = stageRef.current;
    if (!hit || !stage) return;
    const s = clampScale(2);
    const cx = (hit.xFt + hit.widthFt / 2) * pxPerFt;
    const cy = (hit.yFt + hit.heightFt / 2) * pxPerFt;
    const toX = width / 2 - cx * s;
    const toY = height / 2 - cy * s;

    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setScale(s);
      stage.position({ x: toX, y: toY });
      return;
    }

    const from = { x: stage.x(), y: stage.y(), s: stage.scaleX() || scale };
    const t0 = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const animate = (now: number) => {
      const tz = Math.min(1, (now - t0) / 450);
      const k = easeOut(tz);
      setScale(from.s + (s - from.s) * k);
      stage.position({ x: from.x + (toX - from.x) * k, y: from.y + (toY - from.y) * k });
      if (tz < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        const p0 = performance.now();
        const pulseStep = (pn: number) => {
          const tp = Math.min(1, (pn - p0) / 600);
          setPulse(Math.sin(tp * Math.PI)); // 0 → 1 → 0
          if (tp < 1) raf.current = requestAnimationFrame(pulseStep);
          else setPulse(0);
        };
        raf.current = requestAnimationFrame(pulseStep);
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLabel, layout.elements, pxPerFt, width, height]);

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
  // after:-inset-1.5 widens the touch hit area to ~44px without changing the visual size
  const btn = "relative grid size-8 place-items-center rounded-md border border-border bg-background/90 text-foreground shadow-sm hover:bg-muted after:absolute after:-inset-1.5";

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
          {/* venue context under the stalls: zones → walkways → plot outline (all read-only) */}
          {extras?.zones?.map((z) => {
            const hex = ZONE_COLOR_HEX[z.color];
            const [cx, cy] = polygonCentroid(z.points);
            return (
              <Group key={`z_${z.id}`} listening={false}>
                <Line points={z.points.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])} closed fill={hex} opacity={0.1} stroke={hex} strokeWidth={1} />
                <Text x={cx * pxPerFt - 40} y={cy * pxPerFt - 5} width={80} align="center" text={z.name.toUpperCase()} fontSize={9} fontStyle="bold" fill={hex} opacity={0.85} />
              </Group>
            );
          })}
          {extras?.pathways?.map((p) => p.points.length >= 2 && (
            <Line
              key={`p_${p.id}`}
              points={p.points.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])}
              stroke={p.type === "EMERGENCY" ? "#C0392B" : "#BCAE94"}
              strokeWidth={p.widthFt * pxPerFt}
              opacity={0.35} lineCap="round" lineJoin="round"
              dash={p.type === "EMERGENCY" ? [p.widthFt * pxPerFt * 0.8, p.widthFt * pxPerFt * 0.5] : undefined}
              listening={false}
            />
          ))}
          {extras?.boundary && (
            <Line points={extras.boundary.flatMap(([x, y]) => [x * pxPerFt, y * pxPerFt])} closed stroke="#01065B" strokeWidth={1.5} dash={[8, 5]} opacity={0.6} listening={false} />
          )}

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
            const clickable = !!onSelect && (status === "AVAILABLE" || status === "SELECTED");
            const match = isMatch(el.label);
            const focused = pulse > 0 && el.label === focusLabel;
            const dimmed = availableOnly && status !== "AVAILABLE" && status !== "SELECTED";

            return (
              <Group
                key={i}
                opacity={dimmed ? 0.2 : 1}
                onMouseEnter={() => setHover(el.label)}
                onMouseLeave={() => setHover((prev) => (prev === el.label ? null : prev))}
                onClick={() => clickable && onSelect?.(el.label)}
                onTap={() => clickable && onSelect?.(el.label)}
              >
                <Rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={c.fill}
                  stroke={focused ? "#868EFF" : match ? "#D69A22" : c.stroke}
                  strokeWidth={focused ? 2 + pulse * 2 : match ? 3 : status === "SELECTED" ? 2 : 1}
                  cornerRadius={3}
                  shadowColor={focused ? "#868EFF" : "#D69A22"}
                  shadowBlur={focused ? 14 + pulse * 24 : match ? 18 : status === "SELECTED" ? 14 : 0}
                />
                <Text x={x} y={y + h / 2 - 4} width={w} align="center" text={el.label} fontSize={8} fill={c.text} listening={false} />
              </Group>
            );
          })}

          {/* gates / ticket counters / scan points + ops (operations lens only) + signage */}
          {extras?.entryFlow?.map((o) => (
            <Group key={`e_${o.id}`} listening={false} opacity={availableOnly ? 0.4 : 1}>
              <Rect x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt} fill={ENTRY_HEX[o.type]} opacity={0.5} stroke="#01065B" strokeWidth={1} cornerRadius={2} rotation={o.rotation} />
              <Text x={o.xFt * pxPerFt} y={o.yFt * pxPerFt + (o.heightFt * pxPerFt) / 2 - 4} width={o.widthFt * pxPerFt} align="center" text={o.label || catalogLabel(o.type)} fontSize={7} fill="#01065B" />
            </Group>
          ))}
          {extras?.ops?.map((o) => (
            <Group key={`o_${o.id}`} listening={false}>
              <Rect x={o.xFt * pxPerFt} y={o.yFt * pxPerFt} width={o.widthFt * pxPerFt} height={o.heightFt * pxPerFt} fill={OPS_HEX[o.type]} opacity={0.55} stroke="#15120E" strokeWidth={1} cornerRadius={2} rotation={o.rotation} />
              <Text x={o.xFt * pxPerFt} y={o.yFt * pxPerFt + (o.heightFt * pxPerFt) / 2 - 4} width={o.widthFt * pxPerFt} align="center" text={o.label || catalogLabel(o.type)} fontSize={7} fill="#FFFFFF" />
            </Group>
          ))}
          {extras?.annotations?.map((a) => (
            <Group key={`a_${a.id}`} x={a.xFt * pxPerFt} y={a.yFt * pxPerFt} rotation={a.rotation} listening={false}>
              {a.type === "ARROW" ? (
                <>
                  <Arrow points={[0, 0, a.lengthFt * pxPerFt, 0]} stroke="#01065B" fill="#01065B" strokeWidth={2.5} pointerLength={9} pointerWidth={9} />
                  {a.label && <Text x={0} y={5} width={a.lengthFt * pxPerFt} align="center" text={a.label} fontSize={9} fontStyle="bold" fill="#01065B" />}
                </>
              ) : (
                <Text text={a.label || "Text"} fontSize={a.fontSize} fontStyle="bold" fill="#15120E" />
              )}
            </Group>
          ))}

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
