"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Hand, MousePointer2,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween, Grid2x2, Image as ImageIcon,
} from "lucide-react";
import {
  DEFAULT_CANVAS, duplicate, createInfra, createStall, seedToEditor, snapToGrid,
  validateLayout, type CanvasMeta, type DesignerLayout, type EditorElement, type PaletteStallType,
} from "@/lib/map/designer-ops";
import {
  alignElements, distributeElements, nudge, relabel, makeGrid, snapToNeighbours, type AlignMode,
} from "@/lib/map/designer-actions";
import { INFRA_COLOR, STALL_STATUS_COLORS } from "@/lib/stall-colors";
import type { SeedInfraType } from "@/server/map/seed-aarush-lawn";
import type { UploadSignature } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { DesignerToolbar } from "./DesignerToolbar";
import { DesignerInspector } from "./DesignerInspector";
import { SummaryPanel } from "./SummaryPanel";
import { BulkGridDialog } from "./BulkGridDialog";
import { useHistory } from "./useHistory";

export interface MapDesignerProps {
  eventId?: string;
  initialElements?: EditorElement[];
  initialCanvas?: CanvasMeta;
  stallTypes?: PaletteStallType[];
  saveAction?: (eventId: string, layout: DesignerLayout) => Promise<void>;
  uploadAction?: () => Promise<UploadSignature>;
}

const STORAGE_KEY = "bdq:designer:layout:v1";
const fmtInt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

export default function MapDesigner({ eventId, initialElements, initialCanvas, stallTypes = [], saveAction, uploadAction }: MapDesignerProps = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const clipboard = useRef<EditorElement[]>([]);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const eventMode = !!(eventId && saveAction);

  const initial = useMemo<EditorElement[]>(() => {
    if (initialElements) return initialElements;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    }
    return [];
  }, [initialElements]);

  const { present: elements, commit, reset, undo, redo, canUndo, canRedo } = useHistory<EditorElement[]>(initial);

  const [width, setWidth] = useState(900);
  const [scale, setScale] = useState(1);
  const [snap, setSnap] = useState(true);
  const [gridFt, setGridFt] = useState(initialCanvas?.gridFt ?? 5);
  const [canvas, setCanvas] = useState<CanvasMeta>(initialCanvas ?? DEFAULT_CANVAS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [guides, setGuides] = useState<{ points: number[] }[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);

  // load the background reference image (CORS-anon so PNG export isn't tainted)
  useEffect(() => {
    const url = canvas.bgImage?.url;
    if (!url) { setBgImg(null); return; }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImg(img);
    img.src = url;
  }, [canvas.bgImage?.url]);

  const onUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadAction) return;
    try {
      const sig = await uploadAction();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      const res = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { secure_url: string };
      setCanvas((c) => ({ ...c, bgImage: { url: json.secure_url, opacity: c.bgImage?.opacity ?? 0.5 } }));
    } catch {
      setSaveStatus("Image upload failed.");
    }
  };

  const colorById = useMemo(() => Object.fromEntries(stallTypes.map((t) => [t.id, t.color])), [stallTypes]);
  const fillFor = useCallback(
    (el: EditorElement): string => {
      if (el.kind === "infra") return INFRA_COLOR.fill;
      if (el.status === "BLOCKED") return STALL_STATUS_COLORS.BLOCKED.fill;
      return (el.stallTypeId ? colorById[el.stallTypeId] : undefined) ?? "#3FA66A";
    },
    [colorById],
  );

  // autosave scratch only
  useEffect(() => {
    if (!eventMode && elements.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  }, [elements, eventMode]);

  useEffect(() => {
    const update = () => setWidth(wrapRef.current?.clientWidth ?? 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pxPerFt = width / canvas.widthFt;
  const height = canvas.heightFt * pxPerFt;
  const toFt = (px: number) => (snap ? snapToGrid(px / pxPerFt, gridFt) : Math.round((px / pxPerFt) * 100) / 100);

  const selectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const selected = useMemo(() => elements.find((e) => e.id === selectedId) ?? null, [elements, selectedId]);

  const gridLines = useMemo(() => {
    let step = gridFt > 0 ? gridFt : 5;
    while (canvas.widthFt / step > 120 || canvas.heightFt / step > 120) step *= 2;
    const lines: { points: number[] }[] = [];
    for (let x = 0; x <= canvas.widthFt + 0.001; x += step) lines.push({ points: [x * pxPerFt, 0, x * pxPerFt, height] });
    for (let y = 0; y <= canvas.heightFt + 0.001; y += step) lines.push({ points: [0, y * pxPerFt, width, y * pxPerFt] });
    return lines;
  }, [gridFt, canvas.widthFt, canvas.heightFt, pxPerFt, width, height]);

  // transformer attaches to a single selection
  useEffect(() => {
    const tr = trRef.current; const stage = stageRef.current;
    if (!tr || !stage) return;
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements, scale, width, canvas.widthFt, canvas.heightFt]);

  const patchOne = (id: string, p: Partial<EditorElement>) => elements.map((e) => (e.id === id ? { ...e, ...p } : e));
  const addElements = useCallback((els: EditorElement[]) => {
    commit([...elements, ...els]);
    setSelectedIds(new Set(els.map((e) => e.id)));
  }, [elements, commit]);
  const deleteSelected = useCallback(() => {
    if (!selectedIds.size) return;
    commit(elements.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  }, [elements, selectedIds, commit]);

  const onTransformEnd = (id: string, node: Konva.Node) => {
    const sx = node.scaleX(); const sy = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    commit(patchOne(id, {
      xFt: toFt(node.x()), yFt: toFt(node.y()),
      widthFt: Math.max(1, toFt(node.width() * sx)), heightFt: Math.max(1, toFt(node.height() * sy)),
      rotation: Math.round(node.rotation()),
    }));
  };

  const onElementClick = (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const evt = e.evt as { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };
    const multi = !!(evt.shiftKey || evt.metaKey || evt.ctrlKey);
    setSelectedIds((prev) => {
      if (!multi) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "c") { clipboard.current = elements.filter((el) => selectedIds.has(el.id)); return; }
      if (mod && e.key.toLowerCase() === "v") {
        if (!clipboard.current.length) return;
        e.preventDefault();
        const copies = clipboard.current.map(duplicate);
        addElements(copies);
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const copies = elements.filter((el) => selectedIds.has(el.id)).map(duplicate);
        if (copies.length) addElements(copies);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); return; }
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d && selectedIds.size) { e.preventDefault(); commit(nudge(elements, selectedIds, d[0], d[1])); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [elements, selectedIds, commit, undo, redo, deleteSelected, addElements]);

  const handleSave = async () => {
    if (!eventId || !saveAction) return;
    setSaving(true); setSaveStatus(null);
    const res = validateLayout({ version: 1, canvas: { ...canvas, gridFt }, elements });
    if (!res.ok) { setSaveStatus(res.error); setSaving(false); return; }
    try { await saveAction(eventId, res.layout); setSaveStatus("Saved to event."); }
    catch (err) { setSaveStatus(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const setCanvasDim = (key: "widthFt" | "heightFt", v: number) =>
    setCanvas((c) => ({ ...c, [key]: Math.max(10, Math.min(5000, Math.round(v))) }));

  const fit = () => { setScale(1); stageRef.current?.position({ x: 0, y: 0 }); };
  const zoom = (factor: number) => setScale((s) => Math.min(4, Math.max(0.2, s * factor)));

  const exportPng = () => {
    const uri = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!uri) return;
    const a = document.createElement("a");
    a.href = uri; a.download = "event-layout.png"; a.click();
  };

  const doAlign = (m: AlignMode) => { if (selectedIds.size > 1) commit(alignElements(elements, selectedIds, m)); };
  const doDistribute = (axis: "h" | "v") => { if (selectedIds.size > 2) commit(distributeElements(elements, selectedIds, axis)); };

  // marquee selection (select tool, empty-canvas drag)
  const relPointer = () => stageRef.current?.getRelativePointerPosition() ?? null;
  const onStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (tool !== "select") return;
    const p = relPointer();
    if (!p) return;
    if (!(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)) setSelectedIds(new Set());
    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onStageMouseMove = () => {
    if (!marquee) return;
    const p = relPointer();
    if (!p) return;
    setMarquee((m) => (m ? { ...m, w: p.x - m.x, h: p.y - m.y } : m));
  };
  const onStageMouseUp = () => {
    if (!marquee) return;
    const x1 = Math.min(marquee.x, marquee.x + marquee.w) / pxPerFt;
    const y1 = Math.min(marquee.y, marquee.y + marquee.h) / pxPerFt;
    const x2 = Math.max(marquee.x, marquee.x + marquee.w) / pxPerFt;
    const y2 = Math.max(marquee.y, marquee.y + marquee.h) / pxPerFt;
    if (Math.abs(marquee.w) > 4 && Math.abs(marquee.h) > 4) {
      const hit = elements.filter((el) => el.xFt < x2 && el.xFt + el.widthFt > x1 && el.yFt < y2 && el.yFt + el.heightFt > y1);
      setSelectedIds((prev) => new Set([...prev, ...hit.map((e) => e.id)]));
    }
    setMarquee(null);
  };

  const iconBtn = "h-9 w-9 p-0";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        {eventMode && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            {saveStatus && <span className="text-sm text-muted-foreground">{saveStatus}</span>}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Venue length (ft)
            <input type="number" min={10} value={canvas.widthFt} onChange={(e) => setCanvasDim("widthFt", Number(e.target.value))} className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm" />
          </label>
          <span className="pb-2 text-muted-foreground">×</span>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Venue width (ft)
            <input type="number" min={10} value={canvas.heightFt} onChange={(e) => setCanvasDim("heightFt", Number(e.target.value))} className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm" />
          </label>
          <p className="pb-1.5 text-sm"><span className="text-muted-foreground">Area:</span> <span className="font-medium">{fmtInt(canvas.widthFt * canvas.heightFt)} sq ft</span></p>
          {uploadAction && (
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => bgFileRef.current?.click()}>
                <ImageIcon className="size-4" /> {canvas.bgImage ? "Change ground plan" : "Add ground plan"}
              </Button>
              <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={onUploadBg} />
              {canvas.bgImage && (
                <>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Opacity
                    <input type="range" min={0} max={1} step={0.1} value={canvas.bgImage.opacity}
                      onChange={(e) => setCanvas((c) => (c.bgImage ? { ...c, bgImage: { ...c.bgImage, opacity: Number(e.target.value) } } : c))} />
                  </label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCanvas((c) => ({ ...c, bgImage: undefined }))}>Remove</Button>
                </>
              )}
            </div>
          )}
        </div>

        <DesignerToolbar
          stallTypes={stallTypes}
          snap={snap}
          gridFt={gridFt}
          hasSelection={selectedIds.size > 0}
          onSnap={setSnap}
          onGrid={setGridFt}
          onAddStall={(t) => addElements([createStall(t)])}
          onAddInfra={(t: SeedInfraType) => addElements([createInfra(t)])}
          onDuplicate={() => { const c = elements.filter((e) => selectedIds.has(e.id)).map(duplicate); if (c.length) addElements(c); }}
          onDelete={deleteSelected}
          onLoadTemplate={() => { reset(seedToEditor()); setSelectedIds(new Set()); }}
          onClear={() => { reset([]); setSelectedIds(new Set()); }}
          getLayout={() => ({ version: 1 as const, canvas: { ...canvas, gridFt }, elements })}
          onImport={(els) => { reset(els); setSelectedIds(new Set()); }}
        />

        {/* power toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2">
          <Button variant={tool === "select" ? "secondary" : "ghost"} size="sm" className={iconBtn} title="Select" onClick={() => setTool("select")}><MousePointer2 className="size-4" /></Button>
          <Button variant={tool === "pan" ? "secondary" : "ghost"} size="sm" className={iconBtn} title="Pan" onClick={() => setTool("pan")}><Hand className="size-4" /></Button>
          <span className="mx-1 h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" className={iconBtn} title="Zoom out" onClick={() => zoom(0.8)}><ZoomOut className="size-4" /></Button>
          <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" className={iconBtn} title="Zoom in" onClick={() => zoom(1.25)}><ZoomIn className="size-4" /></Button>
          <Button variant="ghost" size="sm" className={iconBtn} title="Fit" onClick={fit}><Maximize className="size-4" /></Button>
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
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Grid2x2 className="size-4" /> Bulk grid</Button>
          <Button variant="outline" size="sm" onClick={exportPng}><ImageIcon className="size-4" /> PNG</Button>
        </div>

        <div ref={wrapRef} className="overflow-hidden rounded-xl border border-border bg-card" style={{ touchAction: "none", maxHeight: "72vh" }}>
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
          >
            <Layer listening={false}>
              <Rect x={0} y={0} width={width} height={height} fill="#FAFAFA" />
              {bgImg && <KonvaImage image={bgImg} x={0} y={0} width={width} height={height} opacity={canvas.bgImage?.opacity ?? 0.5} />}
              {gridLines.map((l, i) => <Line key={i} points={l.points} stroke="#E5E7EB" strokeWidth={1} />)}
              {/* venue boundary box (the area to design inside) */}
              <Rect x={0} y={0} width={width} height={height} stroke="#94A3B8" strokeWidth={2} dash={[6, 4]} />
            </Layer>
            <Layer>
              {elements.map((el) => {
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
                    stroke={isSel ? "#D69A22" : "#352F26"}
                    strokeWidth={isSel ? 2 : 1}
                    cornerRadius={3}
                    opacity={el.kind === "infra" ? 0.85 : 1}
                    draggable={tool === "select"}
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
                      if (selectedIds.has(el.id) && selectedIds.size > 1) {
                        commit(nudge(elements, selectedIds, nx - el.xFt, ny - el.yFt));
                      } else {
                        commit(patchOne(el.id, { xFt: nx, yFt: ny }));
                      }
                      setGuides([]);
                    }}
                    onTransformEnd={(e) => onTransformEnd(el.id, e.target)}
                  />
                );
              })}
              {elements.map((el) => (
                <Text key={`t_${el.id}`} x={el.xFt * pxPerFt} y={el.yFt * pxPerFt + (el.heightFt * pxPerFt) / 2 - 4} width={el.widthFt * pxPerFt} align="center" text={el.label} fontSize={8} fill="#15120E" listening={false} />
              ))}
              {guides.map((g, i) => <Line key={`g${i}`} points={g.points} stroke="#C2603B" strokeWidth={1} dash={[4, 4]} listening={false} />)}
              {marquee && <Rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#C2603B22" stroke="#C2603B" strokeWidth={1} listening={false} />}
              <Transformer ref={trRef} rotateEnabled flipEnabled={false} ignoreStroke />
            </Layer>
          </Stage>
        </div>
      </div>

      <div className="space-y-4">
        <DesignerInspector
          element={selected}
          multiCount={selectedIds.size}
          onChange={(p) => selected && commit(patchOne(selected.id, p))}
          onRelabel={(prefix, start) => { if (selectedIds.size) commit(relabel(elements, selectedIds, prefix, start)); }}
        />
        <SummaryPanel elements={elements} stallTypes={stallTypes} />
      </div>

      {bulkOpen && (
        <BulkGridDialog
          stallTypes={stallTypes}
          onClose={() => setBulkOpen(false)}
          onCreate={(type, opts) => { addElements(makeGrid(type, opts)); setBulkOpen(false); }}
        />
      )}
    </div>
  );
}
