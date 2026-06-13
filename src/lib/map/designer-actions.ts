import { createStall, type EditorElement, type PaletteStallType } from "./designer-ops";

/** Pure geometry ops on editor elements (multi-select tooling). Geometry is in FEET. */

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const pick = (els: EditorElement[], ids: Set<string>) => els.filter((e) => ids.has(e.id));

export function alignElements(els: EditorElement[], ids: Set<string>, mode: AlignMode): EditorElement[] {
  const sel = pick(els, ids);
  if (sel.length < 2) return els;
  const left = Math.min(...sel.map((e) => e.xFt));
  const right = Math.max(...sel.map((e) => e.xFt + e.widthFt));
  const top = Math.min(...sel.map((e) => e.yFt));
  const bottom = Math.max(...sel.map((e) => e.yFt + e.heightFt));
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const move = (e: EditorElement): Partial<EditorElement> => {
    switch (mode) {
      case "left": return { xFt: left };
      case "right": return { xFt: right - e.widthFt };
      case "hcenter": return { xFt: cx - e.widthFt / 2 };
      case "top": return { yFt: top };
      case "bottom": return { yFt: bottom - e.heightFt };
      case "vcenter": return { yFt: cy - e.heightFt / 2 };
    }
  };
  return els.map((e) => (ids.has(e.id) ? { ...e, ...move(e) } : e));
}

export function distributeElements(els: EditorElement[], ids: Set<string>, axis: "h" | "v"): EditorElement[] {
  const sel = pick(els, ids);
  if (sel.length < 3) return els;
  const sized = (e: EditorElement) => (axis === "h" ? e.widthFt : e.heightFt);
  const posOf = (e: EditorElement) => (axis === "h" ? e.xFt : e.yFt);
  const sorted = [...sel].sort((a, b) => posOf(a) - posOf(b));
  const start = posOf(sorted[0]);
  const end = posOf(sorted[sorted.length - 1]) + sized(sorted[sorted.length - 1]);
  const totalSize = sorted.reduce((s, e) => s + sized(e), 0);
  const gap = (end - start - totalSize) / (sorted.length - 1);
  const moves = new Map<string, number>();
  let cursor = start;
  for (const e of sorted) {
    moves.set(e.id, cursor);
    cursor += sized(e) + gap;
  }
  return els.map((e) =>
    moves.has(e.id) ? { ...e, [axis === "h" ? "xFt" : "yFt"]: Math.round((moves.get(e.id) as number) * 100) / 100 } : e,
  );
}

export function nudge(els: EditorElement[], ids: Set<string>, dxFt: number, dyFt: number): EditorElement[] {
  return els.map((e) => (ids.has(e.id) ? { ...e, xFt: e.xFt + dxFt, yFt: e.yFt + dyFt } : e));
}

/** Apply one partial to every selected element (bulk resize/type/status/price). Empty fields skipped by the caller. */
export function bulkPatch(els: EditorElement[], ids: Set<string>, patch: Partial<EditorElement>): EditorElement[] {
  return els.map((e) => (ids.has(e.id) ? { ...e, ...patch } : e));
}

export function relabel(els: EditorElement[], ids: Set<string>, prefix: string, start: number): EditorElement[] {
  const ordered = els.filter((e) => ids.has(e.id));
  const labelById = new Map<string, string>();
  ordered.forEach((e, i) => labelById.set(e.id, `${prefix}${start + i}`));
  return els.map((e) => (labelById.has(e.id) ? { ...e, label: labelById.get(e.id) as string } : e));
}

export interface GridOpts {
  rows: number;
  cols: number;
  gapFt: number;
  startXFt: number;
  startYFt: number;
  prefix: string;
  start: number;
}

/** Build an auto-numbered block of stalls of one type. */
export function makeGrid(type: PaletteStallType, opts: GridOpts): EditorElement[] {
  const out: EditorElement[] = [];
  let n = opts.start;
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const x = opts.startXFt + c * (type.widthFt + opts.gapFt);
      const y = opts.startYFt + r * (type.heightFt + opts.gapFt);
      out.push({ ...createStall(type, x, y), label: `${opts.prefix}${n++}` });
    }
  }
  return out;
}

/** Smart-snap a moving element's top-left to nearby elements' edges/centres. Returns guide lines (px). */
export interface SnapResult {
  xFt: number;
  yFt: number;
  guides: { points: number[] }[];
}
export function snapToNeighbours(
  moving: EditorElement,
  others: EditorElement[],
  pxPerFt: number,
  thresholdPx: number,
): SnapResult {
  const thr = thresholdPx / pxPerFt;
  let xFt = moving.xFt;
  let yFt = moving.yFt;
  const guides: { points: number[] }[] = [];
  // candidate vertical lines (x in ft): each other's left/center/right vs moving's left/center/right
  const movX = [moving.xFt, moving.xFt + moving.widthFt / 2, moving.xFt + moving.widthFt];
  const movY = [moving.yFt, moving.yFt + moving.heightFt / 2, moving.yFt + moving.heightFt];
  let bestX: { delta: number; at: number } | null = null;
  let bestY: { delta: number; at: number } | null = null;
  for (const o of others) {
    const ox = [o.xFt, o.xFt + o.widthFt / 2, o.xFt + o.widthFt];
    const oy = [o.yFt, o.yFt + o.heightFt / 2, o.yFt + o.heightFt];
    for (let i = 0; i < 3; i++) {
      for (const target of ox) {
        const d = target - movX[i];
        if (Math.abs(d) <= thr && (!bestX || Math.abs(d) < Math.abs(bestX.delta))) bestX = { delta: d, at: target };
      }
      for (const target of oy) {
        const d = target - movY[i];
        if (Math.abs(d) <= thr && (!bestY || Math.abs(d) < Math.abs(bestY.delta))) bestY = { delta: d, at: target };
      }
    }
  }
  if (bestX) {
    xFt += bestX.delta;
    guides.push({ points: [bestX.at * pxPerFt, 0, bestX.at * pxPerFt, 99999] });
  }
  if (bestY) {
    yFt += bestY.delta;
    guides.push({ points: [0, bestY.at * pxPerFt, 99999, bestY.at * pxPerFt] });
  }
  return { xFt, yFt, guides };
}
