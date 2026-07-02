"use client";

import { Circle, Group, Line } from "react-konva";
import { insertMidpoint, movePoint, removePoint } from "@/lib/map/plot";
import type { Pt } from "@/lib/map/geometry";
import { useDesigner } from "./DesignerContext";

/**
 * On-canvas vertex editor for the active `vertexEdit` target (plot boundary, zone, pathway,
 * terrain). Drag a corner to move it (snapped on release), click a midpoint dot to add a corner,
 * double-click a corner to remove it. Rendered inside the stage's interactive layer.
 */
export function PolygonEditor() {
  const d = useDesigner();
  const vp = d.vertexPoints;
  if (!vp) return null;

  const { points, closed } = vp;
  const px = d.pxPerFt;
  const r = 6 / d.view.scale; // constant on-screen size at any zoom
  const mids: { at: Pt; index: number }[] = [];
  const last = closed ? points.length : points.length - 1;
  for (let i = 0; i < last; i++) {
    const next = points[(i + 1) % points.length];
    mids.push({ at: [(points[i][0] + next[0]) / 2, (points[i][1] + next[1]) / 2], index: i });
  }

  return (
    <Group>
      <Line
        points={points.flatMap(([x, y]) => [x * px, y * px])}
        closed={closed}
        stroke="#6C75F5"
        strokeWidth={2}
        strokeScaleEnabled={false}
        dash={[6, 4]}
        listening={false}
      />
      {mids.map((m) => (
        <Circle
          key={`mid-${m.index}`}
          x={m.at[0] * px}
          y={m.at[1] * px}
          radius={r * 0.66}
          fill="#FFFFFF"
          stroke="#6C75F5"
          strokeWidth={1.5}
          strokeScaleEnabled={false}
          onClick={() => d.updateVertexPoints(insertMidpoint(points, m.index, closed))}
          onTap={() => d.updateVertexPoints(insertMidpoint(points, m.index, closed))}
        />
      ))}
      {points.map(([x, y], i) => (
        <Circle
          key={`v-${i}`}
          x={x * px}
          y={y * px}
          radius={r}
          fill="#6C75F5"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          strokeScaleEnabled={false}
          draggable
          onDragMove={(e) => d.updateVertexPoints(movePoint(points, i, [e.target.x() / px, e.target.y() / px]))}
          onDragEnd={(e) => d.updateVertexPoints(movePoint(points, i, [d.toFt(e.target.x()), d.toFt(e.target.y())]))}
          onDblClick={() => d.updateVertexPoints(removePoint(points, i, closed))}
          onDblTap={() => d.updateVertexPoints(removePoint(points, i, closed))}
        />
      ))}
    </Group>
  );
}
