"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Label, Layer, Rect, Stage, Tag, Text } from "react-konva";
import type { RenderLayout } from "@/lib/map/render-types";
import {
  INFRA_COLOR,
  STALL_STATUS_COLORS,
  STATUS_LABEL,
  type StallStatus,
} from "@/lib/stall-colors";

interface Props {
  layout: RenderLayout;
  statuses: Record<string, StallStatus>;
  selected: Set<string>;
  onSelect: (label: string) => void;
}

export default function MapCanvas({ layout, statuses, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setWidth(containerRef.current?.clientWidth ?? 960);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pxPerFt = width / layout.canvas.widthFt;
  const height = layout.canvas.heightFt * pxPerFt;

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const factor = e.evt.deltaY > 0 ? 0.92 : 1.08;
    setScale((s) => Math.min(4, Math.max(0.5, s * factor)));
  };

  const statusOf = (label: string): StallStatus =>
    selected.has(label) ? "SELECTED" : (statuses[label] ?? "AVAILABLE");

  const hovered = hover ? layout.elements.find((e) => e.kind === "stall" && e.label === hover) : null;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border bg-card"
      style={{ touchAction: "none" }}
    >
      <Stage width={width} height={height} scaleX={scale} scaleY={scale} draggable onWheel={onWheel}>
        <Layer>
          {layout.elements.map((el, i) => {
            const x = el.xFt * pxPerFt;
            const y = el.yFt * pxPerFt;
            const w = el.widthFt * pxPerFt;
            const h = el.heightFt * pxPerFt;

            if (el.kind === "infra") {
              return (
                <Group key={i} listening={false}>
                  <Rect x={x} y={y} width={w} height={h} fill={INFRA_COLOR.fill} stroke={INFRA_COLOR.stroke} cornerRadius={3} />
                  <Text x={x} y={y + h / 2 - 5} width={w} align="center" text={el.label} fontSize={9} fill={INFRA_COLOR.text} />
                </Group>
              );
            }

            const status = statusOf(el.label);
            const c = STALL_STATUS_COLORS[status];
            const clickable = status === "AVAILABLE" || status === "SELECTED";

            return (
              <Group
                key={i}
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
                  stroke={c.stroke}
                  strokeWidth={status === "SELECTED" ? 2 : 1}
                  cornerRadius={3}
                  shadowColor="#D69A22"
                  shadowBlur={status === "SELECTED" ? 14 : 0}
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
