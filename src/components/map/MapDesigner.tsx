"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  DEFAULT_CANVAS,
  duplicate,
  createInfra,
  createStall,
  seedToEditor,
  snapToGrid,
  validateLayout,
  type CanvasMeta,
  type DesignerLayout,
  type EditorElement,
  type PaletteStallType,
} from "@/lib/map/designer-ops";
import { INFRA_COLOR } from "@/lib/stall-colors";
import type { SeedInfraType } from "@/server/map/seed-aarush-lawn";
import { Button } from "@/components/ui/button";
import { DesignerToolbar } from "./DesignerToolbar";
import { DesignerInspector } from "./DesignerInspector";

export interface MapDesignerProps {
  eventId?: string;
  initialElements?: EditorElement[];
  initialCanvas?: CanvasMeta;
  stallTypes?: PaletteStallType[];
  saveAction?: (eventId: string, layout: DesignerLayout) => Promise<void>;
}

const STORAGE_KEY = "bdq:designer:layout:v1";
const fmtInt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

export default function MapDesigner({ eventId, initialElements, initialCanvas, stallTypes = [], saveAction }: MapDesignerProps = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [width, setWidth] = useState(900);
  const [scale, setScale] = useState(1);
  const [snap, setSnap] = useState(true);
  const [gridFt, setGridFt] = useState(initialCanvas?.gridFt ?? 5);
  const [canvas, setCanvas] = useState<CanvasMeta>(initialCanvas ?? DEFAULT_CANVAS);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const eventMode = !!(eventId && saveAction);
  const colorById = useMemo(() => Object.fromEntries(stallTypes.map((t) => [t.id, t.color])), [stallTypes]);
  const fillFor = useCallback(
    (el: EditorElement): string =>
      el.kind === "stall" ? (el.stallTypeId ? colorById[el.stallTypeId] : undefined) ?? "#3FA66A" : INFRA_COLOR.fill,
    [colorById],
  );

  // initial elements: event's saved layout, else localStorage (scratch), else empty — client-only
  useEffect(() => {
    if (initialElements) {
      setElements(initialElements);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setElements(JSON.parse(saved));
        return;
      } catch {
        /* fall through */
      }
    }
    setElements([]);
  }, [initialElements]);

  const handleSave = async () => {
    if (!eventId || !saveAction) return;
    setSaving(true);
    setSaveStatus(null);
    const res = validateLayout({ version: 1, canvas: { ...canvas, gridFt }, elements });
    if (!res.ok) {
      setSaveStatus(res.error);
      setSaving(false);
      return;
    }
    try {
      await saveAction(eventId, res.layout);
      setSaveStatus("Saved to event.");
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // autosave (scratch mode only)
  useEffect(() => {
    if (!eventMode && elements.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  }, [elements, eventMode]);

  // responsive width
  useEffect(() => {
    const update = () => setWidth(wrapRef.current?.clientWidth ?? 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pxPerFt = width / canvas.widthFt;
  const height = canvas.heightFt * pxPerFt;
  const toFt = (px: number) =>
    snap ? snapToGrid(px / pxPerFt, gridFt) : Math.round((px / pxPerFt) * 100) / 100;

  const selected = useMemo(() => elements.find((e) => e.id === selectedId) ?? null, [elements, selectedId]);

  // visible grid lines (coarsen so huge venues don't draw thousands of lines)
  const gridLines = useMemo(() => {
    let step = gridFt > 0 ? gridFt : 5;
    while (canvas.widthFt / step > 120 || canvas.heightFt / step > 120) step *= 2;
    const lines: { points: number[] }[] = [];
    for (let x = 0; x <= canvas.widthFt + 0.001; x += step) lines.push({ points: [x * pxPerFt, 0, x * pxPerFt, height] });
    for (let y = 0; y <= canvas.heightFt + 0.001; y += step) lines.push({ points: [0, y * pxPerFt, width, y * pxPerFt] });
    return lines;
  }, [gridFt, canvas.widthFt, canvas.heightFt, pxPerFt, width, height]);

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements, scale, width, canvas.widthFt, canvas.heightFt]);

  const patch = useCallback(
    (id: string, p: Partial<EditorElement>) =>
      setElements((els) => els.map((e) => (e.id === id ? { ...e, ...p } : e))),
    [],
  );

  const add = (el: EditorElement) => {
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const factor = e.evt.deltaY > 0 ? 0.92 : 1.08;
    setScale((s) => Math.min(4, Math.max(0.2, s * factor)));
  };

  const onTransformEnd = (id: string, node: Konva.Node) => {
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    patch(id, {
      xFt: toFt(node.x()),
      yFt: toFt(node.y()),
      widthFt: Math.max(1, toFt(node.width() * sx)),
      heightFt: Math.max(1, toFt(node.height() * sy)),
      rotation: Math.round(node.rotation()),
    });
  };

  const setCanvasDim = (key: "widthFt" | "heightFt", v: number) =>
    setCanvas((c) => ({ ...c, [key]: Math.max(10, Math.min(5000, Math.round(v))) }));

  const dimCls = "h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        {eventMode && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save to event"}
            </Button>
            {saveStatus && <span className="text-sm text-muted-foreground">{saveStatus}</span>}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Venue length (ft)
            <input type="number" min={10} value={canvas.widthFt} onChange={(e) => setCanvasDim("widthFt", Number(e.target.value))} className={dimCls} />
          </label>
          <span className="pb-2 text-muted-foreground">×</span>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Venue width (ft)
            <input type="number" min={10} value={canvas.heightFt} onChange={(e) => setCanvasDim("heightFt", Number(e.target.value))} className={dimCls} />
          </label>
          <p className="pb-1.5 text-sm">
            <span className="text-muted-foreground">Area:</span>{" "}
            <span className="font-medium">{fmtInt(canvas.widthFt * canvas.heightFt)} sq ft</span>
          </p>
        </div>

        <DesignerToolbar
          stallTypes={stallTypes}
          snap={snap}
          gridFt={gridFt}
          hasSelection={!!selected}
          onSnap={setSnap}
          onGrid={setGridFt}
          onAddStall={(t: PaletteStallType) => add(createStall(t))}
          onAddInfra={(t: SeedInfraType) => add(createInfra(t))}
          onDuplicate={() => selected && add(duplicate(selected))}
          onDelete={() => {
            if (!selected) return;
            setElements((els) => els.filter((e) => e.id !== selected.id));
            setSelectedId(null);
          }}
          onLoadTemplate={() => {
            setElements(seedToEditor());
            setSelectedId(null);
          }}
          onClear={() => {
            setElements([]);
            setSelectedId(null);
          }}
          getLayout={() => ({ version: 1 as const, canvas: { ...canvas, gridFt }, elements })}
          onImport={(els) => {
            setElements(els);
            setSelectedId(null);
          }}
        />

        <div ref={wrapRef} className="overflow-hidden rounded-xl border border-border bg-card" style={{ touchAction: "none" }}>
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            scaleX={scale}
            scaleY={scale}
            draggable
            onWheel={onWheel}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
          >
            <Layer listening={false}>
              <Rect x={0} y={0} width={width} height={height} fill="#FBF7F0" />
              {gridLines.map((l, i) => (
                <Line key={i} points={l.points} stroke="#E3DAC9" strokeWidth={1} />
              ))}
            </Layer>
            <Layer>
              {elements.map((el) => (
                <Rect
                  key={el.id}
                  id={el.id}
                  x={el.xFt * pxPerFt}
                  y={el.yFt * pxPerFt}
                  width={el.widthFt * pxPerFt}
                  height={el.heightFt * pxPerFt}
                  rotation={el.rotation}
                  fill={fillFor(el)}
                  stroke={el.id === selectedId ? "#D69A22" : "#352F26"}
                  strokeWidth={el.id === selectedId ? 2 : 1}
                  cornerRadius={3}
                  opacity={el.kind === "infra" ? 0.85 : 1}
                  draggable
                  onClick={() => setSelectedId(el.id)}
                  onTap={() => setSelectedId(el.id)}
                  onDragEnd={(e) => patch(el.id, { xFt: toFt(e.target.x()), yFt: toFt(e.target.y()) })}
                  onTransformEnd={(e) => onTransformEnd(el.id, e.target)}
                />
              ))}
              {elements.map((el) => (
                <Text
                  key={`t_${el.id}`}
                  x={el.xFt * pxPerFt}
                  y={el.yFt * pxPerFt + (el.heightFt * pxPerFt) / 2 - 4}
                  width={el.widthFt * pxPerFt}
                  align="center"
                  text={el.label}
                  fontSize={8}
                  fill="#15120E"
                  listening={false}
                />
              ))}
              <Transformer ref={trRef} rotateEnabled flipEnabled={false} ignoreStroke />
            </Layer>
          </Stage>
        </div>
      </div>

      <DesignerInspector element={selected} onChange={(p) => selected && patch(selected.id, p)} />
    </div>
  );
}
