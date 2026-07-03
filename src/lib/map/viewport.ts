/**
 * Viewport math for the map designer (pure, DB-free). The Konva stage is a controlled camera:
 * `View` is its position + scale, and every grid/fit/zoom computation derives from it so the
 * canvas reads as endless graph paper — the grid covers whatever world rect is visible, at any
 * zoom or pan. All world geometry is in feet; conversion to stage px is `ft * pxPerFt`.
 */

export interface View {
  x: number;
  y: number;
  scale: number;
}

/** Visible world window in feet, derived from the camera and the viewport size in px. */
export interface WorldRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const MAX_SCALE = 4;

export function worldRectFt(view: View, viewport: { width: number; height: number }, pxPerFt: number): WorldRect {
  const toWorldFt = (screen: number, offset: number) => (screen - offset) / view.scale / pxPerFt;
  return {
    x0: toWorldFt(0, view.x),
    y0: toWorldFt(0, view.y),
    x1: toWorldFt(viewport.width, view.x),
    y1: toWorldFt(viewport.height, view.y),
  };
}

export interface GridLines {
  minor: { points: number[] }[];
  major: { points: number[] }[];
  /** effective step after density guard, in feet */
  stepFt: number;
}

const MAJOR_EVERY = 5;

/** Grid lines (stage px) covering a world rect. Density-guarded like the old canvas grid; every
 * 5th line is "major". Majors anchor at `majorOrigin` (the plot corner when one exists) so the
 * ruler's labeled ticks land exactly on bold lines and the plot corner reads 0. */
export function gridLinesForView(rect: WorldRect, gridFt: number, pxPerFt: number, majorOrigin: [number, number] = [0, 0]): GridLines {
  let step = gridFt > 0 ? gridFt : 5;
  while ((rect.x1 - rect.x0) / step > 160 || (rect.y1 - rect.y0) / step > 160) step *= 2;

  const minor: { points: number[] }[] = [];
  const major: { points: number[] }[] = [];
  const y0px = rect.y0 * pxPerFt;
  const y1px = rect.y1 * pxPerFt;
  const x0px = rect.x0 * pxPerFt;
  const x1px = rect.x1 * pxPerFt;

  const startX = Math.floor(rect.x0 / step) * step;
  for (let x = startX; x <= rect.x1 + step / 2; x += step) {
    const line = { points: [x * pxPerFt, y0px, x * pxPerFt, y1px] };
    (Math.round((x - majorOrigin[0]) / step) % MAJOR_EVERY === 0 ? major : minor).push(line);
  }
  const startY = Math.floor(rect.y0 / step) * step;
  for (let y = startY; y <= rect.y1 + step / 2; y += step) {
    const line = { points: [x0px, y * pxPerFt, x1px, y * pxPerFt] };
    (Math.round((y - majorOrigin[1]) / step) % MAJOR_EVERY === 0 ? major : minor).push(line);
  }
  return { minor, major, stepFt: step };
}

export interface RulerTick {
  /** screen px along the axis (via the caller's camera transform) */
  pos: number;
  /** feet from the ruler origin (the plot corner reads 0) */
  label: number;
}

/** Ruler tick marks on the origin-anchored major cadence, covering the visible world range. */
export function rulerTicks(
  startFt: number,
  endFt: number,
  stepFt: number,
  originFt: number,
  toScreen: (ft: number) => number,
): RulerTick[] {
  const tick = stepFt * MAJOR_EVERY;
  const first = Math.ceil((startFt - originFt) / tick) * tick + originFt;
  const out: RulerTick[] = [];
  for (let f = first; f <= endFt; f += tick) out.push({ pos: toScreen(f), label: Math.round(f - originFt) });
  return out;
}

/** Camera that centers a world bbox (feet) in the viewport with a px margin. */
export function fitTransform(
  bbox: { x0: number; y0: number; x1: number; y1: number },
  viewport: { width: number; height: number },
  pxPerFt: number,
  marginPx = 24,
): View {
  const wPx = Math.max(1, (bbox.x1 - bbox.x0) * pxPerFt);
  const hPx = Math.max(1, (bbox.y1 - bbox.y0) * pxPerFt);
  const scale = Math.min(
    MAX_SCALE,
    (viewport.width - 2 * marginPx) / wPx,
    (viewport.height - 2 * marginPx) / hPx,
  );
  return {
    scale,
    x: (viewport.width - wPx * scale) / 2 - bbox.x0 * pxPerFt * scale,
    y: (viewport.height - hPx * scale) / 2 - bbox.y0 * pxPerFt * scale,
  };
}

/** Zoom floor tracks the fit scale (half of "everything visible"); ceiling is MAX_SCALE. */
export function clampScale(scale: number, fitScale: number): number {
  const lo = Math.min(Math.max(fitScale, 0.01) * 0.5, MAX_SCALE);
  return Math.min(MAX_SCALE, Math.max(lo, scale));
}

/** Zoom keeping the world point under `pointer` (viewport px) fixed on screen. */
export function zoomAtPoint(view: View, pointer: { x: number; y: number }, factor: number, fitScale: number): View {
  const scale = clampScale(view.scale * factor, fitScale);
  if (scale === view.scale) return view;
  const worldX = (pointer.x - view.x) / view.scale;
  const worldY = (pointer.y - view.y) / view.scale;
  return { scale, x: pointer.x - worldX * scale, y: pointer.y - worldY * scale };
}

/** Smooth, delta-proportional wheel zoom factor (trackpads give small deltas, wheels large). */
export function wheelFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.0015);
}
