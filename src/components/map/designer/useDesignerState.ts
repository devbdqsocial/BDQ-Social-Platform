"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import {
  createAnnotation, createInfra, createStall, duplicate, rectPatchFromNode, snapToGrid, DEFAULT_CANVAS,
  type CanvasMeta, type EditorElement, type PaletteStallType,
} from "@/lib/map/designer-ops";
import { ghostSizeFor, OBSTACLE_SIZES, type PlaceKind } from "@/lib/map/catalog";
import type { SeedInfraType } from "@/server/map/seed-aarush-lawn";
import { ZONE_COLORS, type Annotation, type LayoutV2, type Obstacle, type Pathway, type TerrainPatch, type Zone, type ZoneColor, type OpsObject, type EntryFlowObject } from "@/lib/map/layout-v2";
import { createOps, createEntry, type OpsType, type EntryType } from "@/lib/map/entry-ops";
import type { TerrainType } from "@/lib/map/terrain";
import { mapViolations, pathwayWarnings, MIN_PATH_WIDTH } from "@/lib/map/validation";
import { validationReport } from "@/lib/map/validation-report";
import { throughputReport } from "@/lib/map/throughput";
import { alignElements, bringToFront, distributeElements, nudge, sendToBack, type AlignMode } from "@/lib/map/designer-actions";
import { INFRA_COLOR, STALL_STATUS_COLORS } from "@/lib/stall-colors";
import { constrainAxis, pathLength, type Pt } from "@/lib/map/geometry";
import { scoreLayout, suggestPaise } from "@/server/map/scoring";
import { zoneOf } from "@/lib/map/zones";
import { searchLayout } from "@/lib/map/search";
import { exportFilename } from "@/lib/map/map-export";
import { quintileBounds, heatmapFill, type HeatmapMode } from "@/lib/map/heatmap";
import { diffStats, versionCapState, type VersionMeta, type VersionSnapshot } from "@/lib/map/versions";
import { fitTransform, gridLinesForView, wheelFactor, worldRectFt, zoomAtPoint, type View } from "@/lib/map/viewport";
import { canvasForPlot } from "@/lib/map/plot";
import type { UploadSignature } from "@/lib/cloudinary";
import { useHistory } from "../useHistory";

/**
 * useDesignerState — the SINGLE source of truth for the Map Designer (build-plan R2.5.5,
 * map-system §13). All editor state, derived selectors, and actions live here so the designer
 * components stay pure render + wiring. New features (terrain/scoring/heatmap/versions/exports)
 * plug a slice into this hook + a panel into the context, never back into a 750-line component.
 */

export type Tool = "select" | "pan" | "measure" | "boundary" | "zone" | "pathway" | "terrain";

export const LAYER_IDS = ["underlay", "terrain", "zones", "pathways", "stalls", "infra", "ops", "entryflow", "annotations", "labels"] as const;
export type LayerId = (typeof LAYER_IDS)[number];
export const LAYER_LABELS: Record<LayerId, string> = {
  underlay: "Ground plan", terrain: "Terrain", zones: "Zones", pathways: "Pathways",
  stalls: "Stalls", infra: "Facilities", ops: "Operations", entryflow: "Entry flow", annotations: "Signage", labels: "Labels",
};
export interface LayerState { visible: boolean; locked: boolean }

const STORAGE_KEY = "bdq:designer:layout:v1";

/** Ghost-placement mode: a palette pick arms this; a snapped ghost follows the cursor and each
 * click stamps one object. Stays armed for repeat stamping; Esc / tool switch disarms. */
export interface Placing {
  kind: PlaceKind;
  key: string;
  label: string;
  stallType?: PaletteStallType;
}
const isDrawTool = (t: Tool) => t === "boundary" || t === "zone" || t === "pathway" || t === "terrain";
const isClosed = (t: Tool) => t === "boundary" || t === "zone" || t === "terrain"; // pathway is an OPEN polyline

/** Non-element canvas objects that are click-selectable + transformer-editable. */
export type ObjKind = "ops" | "entry" | "obstacle" | "annotation";
export type SelectedObjData =
  | { kind: "ops"; data: OpsObject }
  | { kind: "entry"; data: EntryFlowObject }
  | { kind: "obstacle"; data: Obstacle }
  | { kind: "annotation"; data: Annotation };

/** Structural patch shared by every object kind — each patch fn narrows it to its own type. */
export type ObjPatch = Partial<{
  xFt: number; yFt: number; widthFt: number; heightFt: number; rotation: number;
  label: string; lanes: number; lengthFt: number; fontSize: number;
}>;

export interface UseDesignerStateProps {
  eventId?: string;
  initialElements?: EditorElement[];
  initialCanvas?: CanvasMeta;
  initialLayout?: LayoutV2;
  stallTypes?: PaletteStallType[];
  /** Σ of the event's ticket-type totalQty — the real attendance for throughput (R2.5.17). */
  expectedAttendance?: number;
  saveAction?: (eventId: string, layout: LayoutV2) => Promise<void>;
  uploadAction?: () => Promise<UploadSignature>;
}

export function useDesignerState({
  eventId, initialElements, initialCanvas, initialLayout, stallTypes = [], expectedAttendance = 0, saveAction, uploadAction,
}: UseDesignerStateProps) {
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

  // viewport + prefs — the stage is a controlled camera (see lib/map/viewport.ts)
  const [width, setWidth] = useState(900);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const scale = view.scale;
  const [snap, setSnap] = useState(true);
  const [gridFt, setGridFt] = useState(initialCanvas?.gridFt ?? 5);
  const [displayUnit, setDisplayUnit] = useState<"FT" | "M">(initialLayout?.canvas.displayUnit ?? "FT");
  const [canvas, setCanvas] = useState<CanvasMeta>(initialCanvas ?? DEFAULT_CANVAS);

  // selection + tools
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>("select");
  // pan model: drag empty canvas pans; Shift+drag marquees; Space-hold pans over anything
  const [spaceDown, setSpaceDown] = useState(false);
  const [shiftDown, setShiftDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const marqueeDidSelect = useRef(false);
  const [placing, setPlacing] = useState<Placing | null>(null);
  // unified click-to-edit: any non-element object can hold the selection (mutually exclusive
  // with element selection — one inspector surface for everything on the canvas)
  const [selectedObj, setSelectedObj] = useState<{ kind: ObjKind; id: string } | null>(null);
  // double-click inline rename (floating input over the canvas)
  const [renaming, setRenaming] = useState<{ kind: "element" | "annotation"; id: string } | null>(null);
  const [pathType, setPathType] = useState<Pathway["type"]>("MAIN");
  const [measurePts, setMeasurePts] = useState<Pt[]>([]);
  const [measureCursor, setMeasureCursor] = useState<Pt | null>(null);
  const [cursorFt, setCursorFt] = useState<Pt | null>(null);
  const [drawing, setDrawing] = useState<Pt[] | null>(null);
  const [guides, setGuides] = useState<{ points: number[] }[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // v2 collections (boundary/obstacles/zones/pathways editable; the rest round-trip untouched)
  const [boundary, setBoundary] = useState<Pt[] | null>(initialLayout?.boundary?.points ?? null);
  const [obstacles, setObstacles] = useState<Obstacle[]>(initialLayout?.obstacles ?? []);
  const [zones, setZones] = useState<Zone[]>(initialLayout?.zones ?? []);
  const [pathways, setPathways] = useState<Pathway[]>(initialLayout?.pathways ?? []);
  const [terrain, setTerrain] = useState<TerrainPatch[]>(initialLayout?.terrain ?? []);
  const [terrainType, setTerrainType] = useState<TerrainType>("GRASS");
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [ops, setOps] = useState<OpsObject[]>(initialLayout?.ops ?? []);
  const [entryFlow, setEntryFlow] = useState<EntryFlowObject[]>(initialLayout?.entryFlow ?? []);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialLayout?.annotations ?? []);
  // point-by-point polygon editing (plot/zones/pathways/terrain) — replaces redraw-only shapes
  const [vertexEdit, setVertexEdit] = useState<{ target: "boundary" | "zone" | "pathway" | "terrain"; id?: string } | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>((initialLayout?.versions ?? []) as VersionMeta[]);
  const [compareId, setCompareId] = useState<string | null>(null);

  // layers (visibility/lock) — reactive (R2.5.5 layers panel)
  const [layers, setLayers] = useState<Record<LayerId, LayerState>>(() => {
    const stored = (initialLayout?.layers ?? {}) as Partial<Record<LayerId, LayerState>>;
    return Object.fromEntries(LAYER_IDS.map((id) => [id, stored[id] ?? { visible: true, locked: false }])) as Record<LayerId, LayerState>;
  });
  const toggleLayerVisible = useCallback((id: LayerId) => setLayers((l) => ({ ...l, [id]: { ...l[id], visible: !l[id].visible } })), []);
  const toggleLayerLock = useCallback((id: LayerId) => {
    setLayers((l) => ({ ...l, [id]: { ...l[id], locked: !l[id].locked } }));
    // Locking an element layer drops the selection so resize handles don't linger on locked nodes.
    if (id === "stalls" || id === "infra") setSelectedIds(new Set());
  }, []);
  const setAllLayersVisible = useCallback((visible: boolean) => setLayers((l) => Object.fromEntries(LAYER_IDS.map((id) => [id, { ...l[id], visible }])) as Record<LayerId, LayerState>), []);

  // UI flags
  const [bulkOpen, setBulkOpen] = useState(false);
  const [salesView, setSalesView] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("off");
  const [attendanceOverride, setAttendanceOverride] = useState<number | null>(null); // throughput what-if (§8)
  const [previewMode, setPreviewMode] = useState(false); // vendor lens (§11)
  const [pulseId, setPulseId] = useState<string | null>(null); // search focus highlight
  const [searchQuery, setSearchQuery] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyFirstRun = useRef(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);

  // ── effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = canvas.bgImage?.url;
    if (!url) { setBgImg(null); return; }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImg(img);
    img.src = url;
  }, [canvas.bgImage?.url]);

  // Scratch (non-event) mode persists to localStorage — debounced so rapid drags don't stutter.
  useEffect(() => {
    if (eventMode || !elements.length) return;
    const t = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(elements)), 500);
    return () => clearTimeout(t);
  }, [elements, eventMode]);

  useEffect(() => {
    const update = () => setWidth(wrapRef.current?.clientWidth ?? 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Dirty tracking: exactly what buildLayoutV2 serializes — view/zoom/selection never trip it.
  // (Undoing back to the saved state still reads dirty — accepted cheap approach.)
  useEffect(() => {
    if (dirtyFirstRun.current) { dirtyFirstRun.current = false; return; }
    setDirty(true);
  }, [elements, boundary, obstacles, zones, pathways, terrain, ops, entryFlow, annotations, canvas, gridFt, displayUnit, layers, versions]);

  // Space/Shift trackers for the pan model. Space preventDefaults (page scroll) unless typing;
  // both reset on window blur so a missed keyup can't leave the canvas stuck in pan mode.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftDown(true);
      if (e.code === "Space") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftDown(false);
      if (e.code === "Space") setSpaceDown(false);
    };
    const blur = () => { setSpaceDown(false); setShiftDown(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (!dirty || !eventMode) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, eventMode]);

  // ── derived geometry ─────────────────────────────────────────────────────
  const pxPerFt = width / canvas.widthFt;
  const height = canvas.heightFt * pxPerFt;
  const toFt = useCallback(
    (px: number) => (snap ? snapToGrid(px / pxPerFt, gridFt) : Math.round((px / pxPerFt) * 100) / 100),
    [snap, pxPerFt, gridFt],
  );

  const selectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const selected = useMemo(() => elements.find((e) => e.id === selectedId) ?? null, [elements, selectedId]);

  const violations = useMemo(() => mapViolations(elements, boundary, obstacles, overrides), [elements, boundary, obstacles, overrides]);
  const violationIds = useMemo(() => new Set(violations.map((v) => v.elementId)), [violations]);
  const pathWarnings = useMemo(() => pathwayWarnings(pathways, elements), [pathways, elements]);
  // Consolidated validation drawer (§4/§7/§8 + dup-label + unpriced) + throughput rollup (R2.5.16)
  const pricedTypeIds = useMemo(() => new Set(stallTypes.filter((t) => t.priceInPaise > 0).map((t) => t.id)), [stallTypes]);
  const validation = useMemo(
    () => validationReport({ elements, boundary, obstacles, pathways, overrides, pricedTypeIds }),
    [elements, boundary, obstacles, pathways, overrides, pricedTypeIds],
  );
  // Throughput demand is REAL now (R2.5.17): the event's ticket total, overridable for what-ifs.
  const attendance = attendanceOverride ?? expectedAttendance;
  const throughput = useMemo(() => throughputReport(entryFlow, attendance), [entryFlow, attendance]);

  // Endless graph paper: grid + background always cover the VISIBLE world window, not just the
  // canvas rect, so zooming out or panning never runs off the paper.
  const worldRect = useMemo(() => worldRectFt(view, { width, height }, pxPerFt), [view, width, height, pxPerFt]);
  const gridLines = useMemo(() => gridLinesForView(worldRect, gridFt, pxPerFt), [worldRect, gridFt, pxPerFt]);

  // Fit targets the plot (boundary bbox) when one exists, else the canvas rect.
  const fitBbox = useMemo(() => {
    if (boundary && boundary.length >= 3) {
      const xs = boundary.map((p) => p[0]);
      const ys = boundary.map((p) => p[1]);
      return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    }
    return { x0: 0, y0: 0, x1: canvas.widthFt, y1: canvas.heightFt };
  }, [boundary, canvas.widthFt, canvas.heightFt]);
  const fitScale = useMemo(() => fitTransform(fitBbox, { width, height }, pxPerFt).scale, [fitBbox, width, height, pxPerFt]);

  const colorById = useMemo(() => Object.fromEntries(stallTypes.map((t) => [t.id, t.color])), [stallTypes]);
  const fillFor = useCallback(
    (el: EditorElement): string => {
      if (el.kind === "infra") return INFRA_COLOR.fill;
      if (el.status === "BLOCKED") return STALL_STATUS_COLORS.BLOCKED.fill;
      return (el.stallTypeId ? colorById[el.stallTypeId] : undefined) ?? "#3FA66A";
    },
    [colorById],
  );

  // Sales view: stall scores (map-system §9.1). Recomputed only when geometry/zones/pathways change.
  const scores = useMemo(() => scoreLayout(elements, zones, pathways), [elements, zones, pathways]);
  const selectedScore = selected && selected.kind === "stall" ? scores.get(selected.id) ?? null : null;

  // Price suggestions (§9.2): suggest = round50(typeBase × score factor); applied only on demand.
  const stallBaseById = useMemo(() => Object.fromEntries(stallTypes.map((t) => [t.id, t.priceInPaise])), [stallTypes]);
  const suggestFor = useCallback((el: EditorElement): number | null => {
    const base = el.kind === "stall" && el.stallTypeId ? stallBaseById[el.stallTypeId] : undefined;
    const sc = scores.get(el.id);
    return base == null || !sc ? null : suggestPaise(base, sc.total);
  }, [stallBaseById, scores]);
  const suggestion = selected ? suggestFor(selected) : null;
  const applySuggestions = useCallback((scope: "selected" | "zone") => {
    let ids = selectedIds;
    if (scope === "zone") {
      const zoneIds = new Set([...selectedIds].map((id) => zoneOf(elements.find((e) => e.id === id)!, zones)?.id).filter(Boolean));
      ids = new Set(elements.filter((e) => e.kind === "stall" && zoneIds.has(zoneOf(e, zones)?.id ?? "")).map((e) => e.id));
    }
    commit(elements.map((e) => {
      if (e.kind !== "stall" || !ids.has(e.id)) return e;
      const s = suggestFor(e);
      return s == null ? e : { ...e, priceInPaise: s };
    }));
  }, [selectedIds, elements, zones, suggestFor, commit]);

  // Revenue/score heatmap (§9.3): quintile fill by price or score; bounds power the legend.
  const heatmapValueOf = useCallback((el: EditorElement): number | null => {
    if (el.kind !== "stall") return null;
    return heatmapMode === "score" ? scores.get(el.id)?.total ?? null : el.priceInPaise ?? null;
  }, [heatmapMode, scores]);
  const heatmapBounds = useMemo(() => {
    if (heatmapMode === "off") return [];
    const vals = elements.map(heatmapValueOf).filter((v): v is number => v != null);
    return vals.length ? quintileBounds(vals) : [];
  }, [heatmapMode, elements, heatmapValueOf]);
  const heatFillFor = useCallback((el: EditorElement): string | null => {
    if (heatmapMode === "off") return null;
    const v = heatmapValueOf(el);
    return v == null ? "#E5E7EB" : heatmapFill(v, heatmapBounds);
  }, [heatmapMode, heatmapValueOf, heatmapBounds]);

  // Versions (§9 / R2.5.13): named snapshots of the editable collections; cap 10, warn at 8.
  const snapshotNow = useCallback((): VersionSnapshot => ({ elements, zones, pathways, terrain, obstacles, boundary, annotations }), [elements, zones, pathways, terrain, obstacles, boundary, annotations]);
  const versionCap = versionCapState(versions.length);
  const saveVersion = useCallback((name: string) => {
    if (!versionCapState(versions.length).canSave) return;
    const v: VersionMeta = { id: `ver_${Date.now().toString(36)}`, name: name.trim() || `Version ${versions.length + 1}`, createdAt: new Date().toISOString(), createdBy: "admin", data: snapshotNow() };
    setVersions((vs) => [...vs, v]);
  }, [versions.length, snapshotNow]);
  const deleteVersion = useCallback((id: string) => {
    setVersions((vs) => vs.filter((v) => v.id !== id));
    setCompareId((c) => (c === id ? null : c));
  }, []);
  const restoreVersion = useCallback((id: string) => {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    const snap = v.data as VersionSnapshot;
    setZones(snap.zones ?? []);
    setPathways(snap.pathways ?? []);
    setTerrain(snap.terrain ?? []);
    setObstacles(snap.obstacles ?? []);
    setBoundary(snap.boundary ?? null);
    setAnnotations(snap.annotations ?? []); // pre-signage snapshots restore clean
    commit(snap.elements ?? []); // elements ride the undo stack → restore is undoable
  }, [versions, commit, setZones, setPathways, setTerrain, setObstacles, setBoundary]);
  const compareSnapshot = useMemo<VersionSnapshot | null>(() => {
    const v = compareId ? versions.find((x) => x.id === compareId) : null;
    return v ? (v.data as VersionSnapshot) : null;
  }, [compareId, versions]);
  const compareDiff = useMemo(() => (compareSnapshot ? diffStats(compareSnapshot, snapshotNow()) : null), [compareSnapshot, snapshotNow]);

  const calibrated = !!(canvas.bgImage && (canvas.bgImage.ftPerPx ?? 0) > 0);
  const measureLine = useMemo(() => [...measurePts, ...(tool === "measure" && measureCursor ? [measureCursor] : [])], [measurePts, tool, measureCursor]);
  const measureDist = pathLength(measureLine);

  const layerCounts = useMemo<Record<LayerId, number>>(() => ({
    underlay: bgImg ? 1 : 0,
    terrain: terrain.length,
    zones: zones.length,
    pathways: pathways.length,
    stalls: elements.filter((e) => e.kind === "stall").length,
    infra: elements.filter((e) => e.kind === "infra").length,
    ops: ops.length,
    entryflow: entryFlow.length,
    annotations: annotations.length,
    labels: elements.length,
  }), [bgImg, terrain, zones, pathways, elements, ops, entryFlow, annotations]);

  // transformer attaches to the single live selection (element OR canvas object) — never on a
  // locked layer's node
  useEffect(() => {
    const tr = trRef.current; const stage = stageRef.current;
    if (!tr || !stage) return;
    let node: Konva.Node | null | undefined = null;
    if (selectedId) {
      const sel = elements.find((e) => e.id === selectedId);
      const layerLocked = sel ? layers[sel.kind === "infra" ? "infra" : "stalls"].locked : false;
      node = !layerLocked ? stage.findOne(`#${selectedId}`) : null;
    } else if (selectedObj) {
      const locked =
        selectedObj.kind === "ops" ? layers.ops.locked :
        selectedObj.kind === "entry" ? layers.entryflow.locked :
        selectedObj.kind === "annotation" ? layers.annotations.locked : false;
      node = !locked ? stage.findOne(`#${selectedObj.id}`) : null;
    }
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, selectedObj, elements, ops, entryFlow, obstacles, annotations, layers, scale, width, canvas.widthFt, canvas.heightFt]);

  // ── actions ──────────────────────────────────────────────────────────────
  const patchOne = useCallback((id: string, p: Partial<EditorElement>) => elements.map((e) => (e.id === id ? { ...e, ...p } : e)), [elements]);
  const addElements = useCallback((els: EditorElement[], select = true) => {
    commit([...elements, ...els]);
    if (select) setSelectedIds(new Set(els.map((e) => e.id)));
  }, [elements, commit]);
  const deleteSelected = useCallback(() => {
    if (!selectedIds.size) return;
    commit(elements.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  }, [elements, selectedIds, commit]);
  const duplicateSelected = useCallback(() => {
    const copies = elements.filter((el) => selectedIds.has(el.id)).map((el) => duplicate(el, gridFt));
    if (copies.length) addElements(copies);
  }, [elements, selectedIds, addElements, gridFt]);
  const copySelected = useCallback(() => { clipboard.current = elements.filter((el) => selectedIds.has(el.id)); }, [elements, selectedIds]);
  const pasteClipboard = useCallback(() => { if (clipboard.current.length) addElements(clipboard.current.map((el) => duplicate(el, gridFt))); }, [addElements, gridFt]);
  const nudgeSelected = useCallback((dx: number, dy: number) => { if (selectedIds.size) commit(nudge(elements, selectedIds, dx, dy)); }, [elements, selectedIds, commit]);

  const addObstacle = useCallback((type: Obstacle["type"], xFt = 20, yFt = 20) => {
    const [w, h] = OBSTACLE_SIZES[type];
    const label = type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
    setObstacles((o) => [...o, { id: `obs_${Date.now().toString(36)}`, type, xFt, yFt, widthFt: w, heightFt: h, rotation: 0, label }]);
  }, []);

  const addOps = useCallback((type: OpsType, xFt?: number, yFt?: number) => setOps((o) => [...o, createOps(type, xFt, yFt)]), []);
  const addEntry = useCallback((type: EntryType, xFt?: number, yFt?: number) => setEntryFlow((o) => [...o, createEntry(type, xFt, yFt)]), []);
  const patchOps = useCallback((id: string, p: Partial<OpsObject>) => setOps((arr) => arr.map((o) => (o.id === id ? { ...o, ...p } : o))), []);
  const patchEntry = useCallback((id: string, p: Partial<EntryFlowObject>) => setEntryFlow((arr) => arr.map((e) => (e.id === id ? { ...e, ...p } : e))), []);
  const patchObstacle = useCallback((id: string, p: Partial<Obstacle>) => setObstacles((arr) => arr.map((o) => (o.id === id ? { ...o, ...p } : o))), []);
  const addAnnotation = useCallback((type: Annotation["type"], xFt?: number, yFt?: number) => setAnnotations((a) => [...a, createAnnotation(type, xFt, yFt)]), []);
  const patchAnnotation = useCallback((id: string, p: Partial<Annotation>) => setAnnotations((arr) => arr.map((a) => (a.id === id ? { ...a, ...p } : a))), []);
  const removeAnnotation = useCallback((id: string) => setAnnotations((arr) => arr.filter((a) => a.id !== id)), []);

  // ── unified object selection ─────────────────────────────────────────────
  const onObjClick = useCallback((kind: ObjKind, id: string) => {
    setSelectedObj({ kind, id });
    setSelectedIds(new Set());
  }, []);
  const selectedObjData = useMemo((): SelectedObjData | null => {
    if (!selectedObj) return null;
    const { kind, id } = selectedObj;
    if (kind === "ops") { const o = ops.find((x) => x.id === id); return o ? { kind, data: o } : null; }
    if (kind === "entry") { const o = entryFlow.find((x) => x.id === id); return o ? { kind, data: o } : null; }
    if (kind === "obstacle") { const o = obstacles.find((x) => x.id === id); return o ? { kind, data: o } : null; }
    const o = annotations.find((x) => x.id === id);
    return o ? { kind: "annotation", data: o } : null;
  }, [selectedObj, ops, entryFlow, obstacles, annotations]);
  const patchObj = useCallback((kind: ObjKind, id: string, p: ObjPatch) => {
    if (kind === "ops") patchOps(id, p as Partial<OpsObject>);
    else if (kind === "entry") patchEntry(id, p as Partial<EntryFlowObject>);
    else if (kind === "obstacle") patchObstacle(id, p as Partial<Obstacle>);
    else patchAnnotation(id, p as Partial<Annotation>);
  }, [patchOps, patchEntry, patchObstacle, patchAnnotation]);
  const deleteSelectedObj = useCallback(() => {
    if (!selectedObj) return;
    const { kind, id } = selectedObj;
    if (kind === "ops") setOps((a) => a.filter((x) => x.id !== id));
    else if (kind === "entry") setEntryFlow((a) => a.filter((x) => x.id !== id));
    else if (kind === "obstacle") setObstacles((a) => a.filter((x) => x.id !== id));
    else removeAnnotation(id);
    setSelectedObj(null);
  }, [selectedObj, removeAnnotation]);
  /** Delete key / toolbar: whichever selection is live — canvas object or elements. */
  const deleteSelection = useCallback(() => {
    if (selectedObj) deleteSelectedObj();
    else deleteSelected();
  }, [selectedObj, deleteSelectedObj, deleteSelected]);

  // ── right-click context menu ─────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: { type: "element"; id: string } | { type: "obj"; kind: ObjKind; id: string } } | null>(null);
  const duplicateObj = useCallback((kind: ObjKind, id: string) => {
    const off = gridFt;
    const newId = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const copy = <T extends { id: string; xFt: number; yFt: number }>(arr: T[], prefix: string): T[] => {
      const o = arr.find((x) => x.id === id);
      return o ? [...arr, { ...o, id: newId(prefix), xFt: o.xFt + off, yFt: o.yFt + off }] : arr;
    };
    if (kind === "ops") setOps((a) => copy(a, "ops"));
    else if (kind === "entry") setEntryFlow((a) => copy(a, "ent"));
    else if (kind === "obstacle") setObstacles((a) => copy(a, "obs"));
    else setAnnotations((a) => copy(a, "ann"));
  }, [gridFt]);
  /** Resolve a right-clicked konva node id → select it + open the menu at screen coords. */
  const openContextMenu = useCallback((id: string, pos: { x: number; y: number }) => {
    if (!id) { setCtxMenu(null); return; }
    if (elements.some((e) => e.id === id)) {
      setSelectedObj(null);
      setSelectedIds((prev) => (prev.has(id) ? prev : new Set([id])));
      setCtxMenu({ ...pos, target: { type: "element", id } });
      return;
    }
    const kind: ObjKind | null =
      ops.some((o) => o.id === id) ? "ops" :
      entryFlow.some((o) => o.id === id) ? "entry" :
      obstacles.some((o) => o.id === id) ? "obstacle" :
      annotations.some((a) => a.id === id) ? "annotation" : null;
    if (!kind) { setCtxMenu(null); return; }
    onObjClick(kind, id);
    setCtxMenu({ ...pos, target: { type: "obj", kind, id } });
  }, [elements, ops, entryFlow, obstacles, annotations, onObjClick]);

  const doAlign = useCallback((m: AlignMode) => { if (selectedIds.size > 1) commit(alignElements(elements, selectedIds, m)); }, [elements, selectedIds, commit]);
  const doDistribute = useCallback((axis: "h" | "v") => { if (selectedIds.size > 2) commit(distributeElements(elements, selectedIds, axis)); }, [elements, selectedIds, commit]);
  const bringSelectedToFront = useCallback(() => { if (selectedIds.size) commit(bringToFront(elements, selectedIds)); }, [elements, selectedIds, commit]);
  const sendSelectedToBack = useCallback(() => { if (selectedIds.size) commit(sendToBack(elements, selectedIds)); }, [elements, selectedIds, commit]);

  const setCanvasDim = useCallback((key: "widthFt" | "heightFt", v: number) =>
    setCanvas((c) => ({ ...c, [key]: Math.max(10, Math.min(5000, Math.round(v))) })), []);
  const patchBg = useCallback((p: Partial<NonNullable<CanvasMeta["bgImage"]>>) =>
    setCanvas((c) => (c.bgImage ? { ...c, bgImage: { ...c.bgImage, ...p } } : c)), []);
  const applyCalibration = useCallback((ftPerPx: number) => {
    patchBg({ ftPerPx, offsetXFt: 0, offsetYFt: 0, locked: true });
    setCalibrating(false);
  }, [patchBg]);

  // Resolved vertex-edit surface: which polygon/polyline is being edited + how to write it back.
  const vertexPoints = useMemo((): { points: Pt[]; closed: boolean } | null => {
    if (!vertexEdit) return null;
    if (vertexEdit.target === "boundary") return boundary ? { points: boundary, closed: true } : null;
    if (vertexEdit.target === "zone") {
      const z = zones.find((x) => x.id === vertexEdit.id);
      return z ? { points: z.points as Pt[], closed: true } : null;
    }
    if (vertexEdit.target === "pathway") {
      const p = pathways.find((x) => x.id === vertexEdit.id);
      return p ? { points: p.points as Pt[], closed: false } : null;
    }
    const t = terrain.find((x) => x.id === vertexEdit.id);
    return t ? { points: t.points as Pt[], closed: true } : null;
  }, [vertexEdit, boundary, zones, pathways, terrain]);
  const updateVertexPoints = useCallback((pts: Pt[]) => {
    if (!vertexEdit) return;
    if (vertexEdit.target === "boundary") setBoundary(pts);
    else if (vertexEdit.target === "zone") setZones((zs) => zs.map((z) => (z.id === vertexEdit.id ? { ...z, points: pts } : z)));
    else if (vertexEdit.target === "pathway") setPathways((ps) => ps.map((p) => (p.id === vertexEdit.id ? { ...p, points: pts } : p)));
    else setTerrain((ts) => ts.map((t) => (t.id === vertexEdit.id ? { ...t, points: pts } : t)));
  }, [vertexEdit]);

  // Plot-first: place a preset plot — boundary set, canvas sized to the plot + margin, view reset.
  const applyPlot = useCallback((rawPoints: Pt[]) => {
    const placed = canvasForPlot(rawPoints);
    setCanvas((c) => ({ ...c, widthFt: placed.widthFt, heightFt: placed.heightFt }));
    setBoundary(placed.points);
    setView({ x: 0, y: 0, scale: 1 });
  }, []);

  const fit = useCallback(() => setView(fitTransform(fitBbox, { width, height }, pxPerFt)), [fitBbox, width, height, pxPerFt]);
  const zoom = useCallback((factor: number) =>
    setView((v) => zoomAtPoint(v, { x: width / 2, y: height / 2 }, factor, fitScale)), [width, height, fitScale]);
  /** Jump to an absolute zoom level (e.g. 0.5 / 1 / 2), centred on the viewport. */
  const zoomTo = useCallback((target: number) =>
    setView((v) => zoomAtPoint(v, { x: width / 2, y: height / 2 }, target / v.scale, fitScale)), [width, height, fitScale]);
  /** Cursor-anchored smooth wheel zoom; pointer is in stage-container px. */
  const wheelZoom = useCallback((pointer: { x: number; y: number }, deltaY: number) =>
    setView((v) => zoomAtPoint(v, pointer, wheelFactor(deltaY), fitScale)), [fitScale]);

  // Search focus (§9.4): center a target at 1.5× and pulse it for 600 ms.
  const focusOn = useCallback((target: { xFt: number; yFt: number; widthFt?: number; heightFt?: number; id?: string }) => {
    const z = 1.5;
    const cx = (target.xFt + (target.widthFt ?? 0) / 2) * pxPerFt;
    const cy = (target.yFt + (target.heightFt ?? 0) / 2) * pxPerFt;
    setView({ scale: z, x: width / 2 - z * cx, y: height / 2 - z * cy });
    if (target.id) {
      setSelectedIds(new Set([target.id]));
      setSelectedObj(null);
      setPulseId(target.id);
      setTimeout(() => setPulseId((p) => (p === target.id ? null : p)), 600);
    }
  }, [pxPerFt, width, height]);

  const searchMatches = useMemo(() => searchLayout(searchQuery, elements, zones), [searchQuery, elements, zones]);

  const mapName = eventMode ? "event-map" : "venue-map";

  // Capture the WHOLE canvas (not just the viewport) regardless of zoom/pan, so exports and the
  // PDF scale bar are deterministic (map-system §12 / R2.5.15).
  const captureFullCanvas = useCallback((): { dataUrl: string; widthFt: number; heightFt: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const dataUrl = stage.toDataURL({
      x: stage.x(), y: stage.y(),
      width: canvas.widthFt * pxPerFt * scale, height: canvas.heightFt * pxPerFt * scale,
      pixelRatio: 2 / scale,
    });
    return { dataUrl, widthFt: canvas.widthFt, heightFt: canvas.heightFt };
  }, [canvas.widthFt, canvas.heightFt, pxPerFt, scale]);

  const exportPng = useCallback(() => {
    const cap = captureFullCanvas();
    if (!cap) return;
    const a = document.createElement("a");
    a.href = cap.dataUrl; a.download = exportFilename("print", mapName, new Date(), "png"); a.click();
  }, [captureFullCanvas, mapName]);

  const onUploadBg = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      fd.append("allowed_formats", sig.allowedFormats);
      const res = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { secure_url: string };
      setCanvas((c) => ({ ...c, bgImage: { url: json.secure_url, opacity: c.bgImage?.opacity ?? 0.5 } }));
    } catch {
      setSaveStatus("Image upload failed.");
    }
  }, [uploadAction]);

  // tool + polygon/polyline draw
  const selectTool = useCallback((t: Tool) => {
    setTool(t);
    if (t !== "measure") { setMeasurePts([]); setMeasureCursor(null); }
    setDrawing(isDrawTool(t) ? [] : null);
    setPlacing(null); // switching tools disarms ghost placement
  }, []);

  // ── ghost placement ──────────────────────────────────────────────────────
  const armPlacement = useCallback((p: Placing) => {
    setTool("select");
    setDrawing(null);
    setMeasurePts([]);
    setMeasureCursor(null);
    setSelectedIds(new Set());
    setSelectedObj(null);
    setPlacing(p);
  }, []);
  const placingGhost = useMemo(() => (placing ? ghostSizeFor(placing.kind, placing.key, placing.stallType) : null), [placing]);
  const ghostFt = useMemo((): Pt | null => {
    if (!placing || !cursorFt) return null;
    return snap ? [snapToGrid(cursorFt[0], gridFt), snapToGrid(cursorFt[1], gridFt)] : cursorFt;
  }, [placing, cursorFt, snap, gridFt]);
  const stampPlacement = useCallback(() => {
    if (!placing || !ghostFt) return;
    const [x, y] = ghostFt;
    if (placing.kind === "stall" && placing.stallType) addElements([createStall(placing.stallType, x, y)], false);
    else if (placing.kind === "infra") addElements([createInfra(placing.key as SeedInfraType, x, y)], false);
    else if (placing.kind === "entry") addEntry(placing.key as EntryType, x, y);
    else if (placing.kind === "ops") addOps(placing.key as OpsType, x, y);
    else if (placing.kind === "obstacle") addObstacle(placing.key as Obstacle["type"], x, y);
    else if (placing.kind === "annotation") addAnnotation(placing.key as Annotation["type"], x, y);
  }, [placing, ghostFt, addElements, addEntry, addOps, addObstacle, addAnnotation]);
  const finishDrawing = useCallback((pts: Pt[]) => {
    const minPts = isClosed(tool) ? 3 : 2;
    if (pts.length >= minPts) {
      if (tool === "boundary") setBoundary(pts);
      else if (tool === "zone") {
        const color = ZONE_COLORS[zones.length % ZONE_COLORS.length] as ZoneColor;
        setZones((zs) => [...zs, { id: `zone_${Date.now().toString(36)}`, name: `Zone ${zs.length + 1}`, color, points: pts }]);
      } else if (tool === "pathway") {
        setPathways((ps) => [...ps, { id: `path_${Date.now().toString(36)}`, type: pathType, widthFt: MIN_PATH_WIDTH[pathType], points: pts }]);
      } else if (tool === "terrain") {
        setTerrain((ts) => [...ts, { id: `terr_${Date.now().toString(36)}`, type: terrainType, points: pts }]);
      }
    }
    setDrawing(null);
    setTool("select");
  }, [tool, zones.length, pathType, terrainType]);

  const onTransformEnd = useCallback((id: string, node: Konva.Node) => {
    const sx = node.scaleX(); const sy = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    commit(patchOne(id, rectPatchFromNode({ x: node.x(), y: node.y(), width: node.width(), height: node.height(), scaleX: sx, scaleY: sy, rotation: node.rotation() }, toFt)));
  }, [commit, patchOne, toFt]);

  /** Transformer write-back for canvas objects. Annotations are rotate-only (their Group scales
   * caption text) — position + rotation write back; rect kinds take the full patch. */
  const onObjTransformEnd = useCallback((kind: ObjKind, id: string, node: Konva.Node) => {
    const sx = node.scaleX(); const sy = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    if (kind === "annotation") {
      patchAnnotation(id, { xFt: toFt(node.x()), yFt: toFt(node.y()), rotation: Math.round(node.rotation()) });
      return;
    }
    patchObj(kind, id, rectPatchFromNode({ x: node.x(), y: node.y(), width: node.width(), height: node.height(), scaleX: sx, scaleY: sy, rotation: node.rotation() }, toFt));
  }, [toFt, patchAnnotation, patchObj]);

  const onElementClick = useCallback((id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const evt = e.evt as { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };
    const multi = !!(evt.shiftKey || evt.metaKey || evt.ctrlKey);
    setSelectedObj(null);
    setSelectedIds((prev) => {
      if (!multi) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const relPointer = useCallback(() => stageRef.current?.getRelativePointerPosition() ?? null, []);
  const ptToFt = useCallback((p: { x: number; y: number }): Pt => [Math.round((p.x / pxPerFt) * 10) / 10, Math.round((p.y / pxPerFt) * 10) / 10], [pxPerFt]);

  const onStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    if (spaceDown) return; // space-hold = pan, overrides every tool
    const p = relPointer();
    if (!p) return;
    if (tool === "measure") { setMeasurePts((pts) => [...pts, ptToFt(p)]); return; }
    if (isDrawTool(tool)) {
      let v = ptToFt(p);
      const prev = drawing?.length ? drawing[drawing.length - 1] : null;
      if (e.evt.shiftKey && prev) v = constrainAxis(prev, v); // Shift = draw straight
      if (isClosed(tool) && drawing && drawing.length >= 3) {
        const [fx, fy] = drawing[0];
        if (Math.hypot(v[0] - fx, v[1] - fy) <= 8) { finishDrawing(drawing); return; }
      }
      setDrawing((pts) => [...(pts ?? []), v]);
      return;
    }
    if (tool !== "select" || placing) return;
    // drag-empty = pan (the stage is draggable); Shift+drag = marquee multi-select
    if (e.evt.shiftKey) { setSelectedObj(null); setMarquee({ x: p.x, y: p.y, w: 0, h: 0 }); }
  }, [tool, drawing, relPointer, ptToFt, finishDrawing, spaceDown, placing]);

  const onStageMouseMove = useCallback((e?: Konva.KonvaEventObject<MouseEvent>) => {
    const p = relPointer();
    if (p) setCursorFt(ptToFt(p));
    if ((tool === "measure" || isDrawTool(tool)) && p) {
      let v = ptToFt(p);
      const prev = drawing?.length ? drawing[drawing.length - 1] : null;
      if (e?.evt.shiftKey && prev && isDrawTool(tool)) v = constrainAxis(prev, v);
      setMeasureCursor(v);
    }
    setMarquee((m) => (m && p ? { ...m, w: p.x - m.x, h: p.y - m.y } : m));
  }, [tool, drawing, relPointer, ptToFt]);

  const onStageMouseUp = useCallback(() => {
    if (!marquee) return;
    const x1 = Math.min(marquee.x, marquee.x + marquee.w) / pxPerFt;
    const y1 = Math.min(marquee.y, marquee.y + marquee.h) / pxPerFt;
    const x2 = Math.max(marquee.x, marquee.x + marquee.w) / pxPerFt;
    const y2 = Math.max(marquee.y, marquee.y + marquee.h) / pxPerFt;
    if (Math.abs(marquee.w) > 4 && Math.abs(marquee.h) > 4) {
      const hit = elements.filter((el) => el.xFt < x2 && el.xFt + el.widthFt > x1 && el.yFt < y2 && el.yFt + el.heightFt > y1);
      setSelectedIds((prev) => new Set([...prev, ...hit.map((e) => e.id)]));
      marqueeDidSelect.current = true; // the click that follows must not deselect
    }
    setMarquee(null);
  }, [marquee, pxPerFt, elements]);

  /** Plain click on empty canvas deselects. Konva suppresses click after a real drag, so pans
   * never deselect; a marquee that just selected consumes its trailing click. */
  const onStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (placing) { stampPlacement(); return; } // armed: any canvas click stamps (stays armed)
    if (e.target !== e.target.getStage()) return;
    if (marqueeDidSelect.current) { marqueeDidSelect.current = false; return; }
    const evt = e.evt as { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };
    if (tool === "select" && !(evt.shiftKey || evt.metaKey || evt.ctrlKey)) { setSelectedIds(new Set()); setSelectedObj(null); }
  }, [tool, placing, stampPlacement]);

  // Stage drags (pan). Elements are draggable nodes and win over the stage; draw/measure/vertex
  // editing and ghost placement keep the stage pinned so clicks act instead of panning.
  const stageDraggable = spaceDown || tool === "pan" || (tool === "select" && !shiftDown && !vertexEdit && !placing);

  // ── persistence ──────────────────────────────────────────────────────────
  const buildLayoutV2 = useCallback((): LayoutV2 => {
    const g = ([1, 2, 5, 10] as number[]).includes(gridFt) ? (gridFt as 1 | 2 | 5 | 10) : 5;
    const bg = canvas.bgImage;
    return {
      v: 2,
      canvas: { widthFt: canvas.widthFt, heightFt: canvas.heightFt, gridFt: g, displayUnit },
      ...(bg
        ? { underlay: { url: bg.url, publicId: "", ftPerPx: bg.ftPerPx ?? 0, offsetXFt: bg.offsetXFt ?? 0, offsetYFt: bg.offsetYFt ?? 0, rotationDeg: 0, opacity: bg.opacity, locked: bg.locked ?? false } }
        : {}),
      boundary: boundary && boundary.length >= 3 ? { points: boundary } : undefined,
      obstacles, terrain, zones, pathways, elements,
      ops, entryFlow, annotations, layers, versions,
    };
  }, [gridFt, displayUnit, canvas, boundary, obstacles, terrain, zones, pathways, elements, ops, entryFlow, annotations, layers, versions]);

  // Duplicate labels get auto-renamed at save time ("A-2" → "A-2-2") — surface that BEFORE it
  // happens: first Save click warns, second click (without label edits in between) proceeds.
  const dupAckRef = useRef(false);
  const dupCount = useMemo(() => validation.filter((v) => v.key.startsWith("dup:")).length, [validation]);
  useEffect(() => { dupAckRef.current = false; }, [elements]);

  const handleSave = useCallback(async () => {
    if (!eventId || !saveAction) return;
    if (violations.length > 0) {
      setSaveStatus(`${violations.length} stall(s) cross the boundary or an obstacle — fix or override them first.`);
      return;
    }
    if (dupCount > 0 && !dupAckRef.current) {
      dupAckRef.current = true;
      setSaveStatus(`${dupCount} duplicate label${dupCount === 1 ? "" : "s"} will be auto-renamed on save (e.g. A-2 → A-2-2). Fix them in the validation panel, or press Save again to continue.`);
      return;
    }
    setSaving(true); setSaveStatus(null);
    try { await saveAction(eventId, buildLayoutV2()); setSaveStatus("Saved to event."); setDirty(false); }
    catch (err) { setSaveStatus(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }, [eventId, saveAction, violations.length, dupCount, buildLayoutV2]);

  return {
    // config + refs
    eventMode, stallTypes, uploadAction, wrapRef, stageRef, trRef, bgFileRef,
    // history
    elements, commit, reset, undo, redo, canUndo, canRedo,
    // viewport + prefs
    width, scale, view, setView, worldRect, pxPerFt, height, zoom, zoomTo, fit, wheelZoom, snap, setSnap, gridFt, setGridFt, toFt,
    displayUnit, setDisplayUnit,
    // canvas + underlay
    canvas, setCanvas, setCanvasDim, bgImg, patchBg, calibrated, applyCalibration, onUploadBg, exportPng,
    // tools + draw
    tool, selectTool, pathType, setPathType, drawing, setDrawing, finishDrawing, isDrawTool, isClosed,
    // selection
    selectedIds, setSelectedIds, selectedId, selected,
    // measure
    measurePts, setMeasurePts, measureCursor, setMeasureCursor, cursorFt, setCursorFt, measureLine, measureDist,
    // collections
    boundary, setBoundary, obstacles, setObstacles, addObstacle, zones, setZones, pathways, setPathways,
    terrain, setTerrain, terrainType, setTerrainType, overrides, setOverrides,
    // plot + vertex editing (plot-first model)
    applyPlot, vertexEdit, setVertexEdit, vertexPoints, updateVertexPoints,
    // ops + entry-flow objects (§8 / R2.5.16)
    ops, setOps, addOps, entryFlow, setEntryFlow, addEntry, patchEntry,
    // signage (annotations layer)
    annotations, addAnnotation, patchAnnotation, removeAnnotation,
    // layers
    layers, toggleLayerVisible, toggleLayerLock, setAllLayersVisible, layerCounts,
    // derived
    violations, violationIds, pathWarnings, validation, throughput, gridLines, fillFor,
    // throughput attendance (§8 / R2.5.17)
    attendance, attendanceFromTickets: expectedAttendance, attendanceOverride, setAttendanceOverride,
    // sales view (scoring §9.1) + price suggestions (§9.2) + heatmap (§9.3)
    salesView, setSalesView, scores, selectedScore, suggestion, applySuggestions,
    heatmapMode, setHeatmapMode, heatFillFor, heatmapBounds,
    // versions (§9 / R2.5.13)
    versions, versionCap, saveVersion, restoreVersion, deleteVersion,
    compareId, setCompareId, compareSnapshot, compareDiff,
    // vendor preview + search (§9.4 / §11 / R2.5.14)
    previewMode, setPreviewMode, pulseId, searchQuery, setSearchQuery, searchMatches, focusOn,
    // exports (§12 / R2.5.15)
    mapName, captureFullCanvas,
    // pan model
    spaceDown, panning, setPanning, stageDraggable, onStageClick,
    // ghost placement
    placing, setPlacing, armPlacement, placingGhost, ghostFt,
    // unified object selection
    selectedObj, setSelectedObj, selectedObjData, onObjClick, onObjTransformEnd, patchObj,
    patchOps, patchObstacle, deleteSelectedObj, deleteSelection,
    // context menu
    ctxMenu, setCtxMenu, openContextMenu, duplicateObj,
    // inline rename
    renaming, setRenaming,
    // guides + marquee + handlers
    guides, setGuides, marquee, patchOne, onTransformEnd, onElementClick, onStageMouseDown, onStageMouseMove, onStageMouseUp,
    // element actions
    addElements, deleteSelected, duplicateSelected, copySelected, pasteClipboard, nudgeSelected, doAlign, doDistribute,
    bringSelectedToFront, sendSelectedToBack,
    // save + ui
    saving, saveStatus, setSaveStatus, handleSave, buildLayoutV2, dirty,
    bulkOpen, setBulkOpen, calibrating, setCalibrating, helpOpen, setHelpOpen,
  };
}

export type DesignerApi = ReturnType<typeof useDesignerState>;
