import { describe, expect, it } from "vitest";
import { clampScale, fitTransform, gridLinesForView, rulerTicks, wheelFactor, worldRectFt, zoomAtPoint, type View } from "./viewport";

const viewport = { width: 900, height: 600 };
const pxPerFt = 3; // 300 ft wide world at scale 1

describe("worldRectFt", () => {
  it("identity view maps viewport to 0..w/h feet", () => {
    const r = worldRectFt({ x: 0, y: 0, scale: 1 }, viewport, pxPerFt);
    expect(r).toEqual({ x0: 0, y0: 0, x1: 300, y1: 200 });
  });

  it("zoomed out with pan shows a larger, offset window", () => {
    const r = worldRectFt({ x: 90, y: -60, scale: 0.5 }, viewport, pxPerFt);
    expect(r.x0).toBeCloseTo(-60); // (0-90)/0.5/3
    expect(r.y0).toBeCloseTo(40);
    expect(r.x1).toBeCloseTo(540);
    expect(r.y1).toBeCloseTo(440);
  });
});

describe("gridLinesForView", () => {
  it("covers the whole visible rect, splitting minor/major", () => {
    const rect = { x0: -100, y0: -50, x1: 400, y1: 300 };
    const { minor, major, stepFt } = gridLinesForView(rect, 5, pxPerFt);
    expect(stepFt).toBe(5);
    const all = [...minor, ...major];
    // vertical extremes span past both edges
    const xs = all.filter((l) => l.points[0] === l.points[2]).map((l) => l.points[0] / pxPerFt);
    expect(Math.min(...xs)).toBeLessThanOrEqual(-100);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(400);
    // every 5th line is major (x=0 is major, x=25 is major, x=5 is minor)
    expect(major.some((l) => l.points[0] === 0 && l.points[0] === l.points[2])).toBe(true);
    expect(minor.some((l) => l.points[0] === 5 * pxPerFt && l.points[0] === l.points[2])).toBe(true);
  });

  it("majors re-anchor to the plot origin", () => {
    const rect = { x0: 0, y0: 0, x1: 100, y1: 100 };
    const { major, minor } = gridLinesForView(rect, 5, pxPerFt, [20, 20]);
    const isVerticalAt = (l: { points: number[] }, ft: number) => l.points[0] === ft * pxPerFt && l.points[0] === l.points[2];
    expect(major.some((l) => isVerticalAt(l, 20))).toBe(true); // plot corner is bold
    expect(minor.some((l) => isVerticalAt(l, 0))).toBe(true); // world 0 no longer bold
    expect(major.some((l) => isVerticalAt(l, 45))).toBe(true); // 20 + 25
  });

  it("density guard doubles the step for huge windows", () => {
    const rect = { x0: 0, y0: 0, x1: 5000, y1: 5000 };
    const { stepFt } = gridLinesForView(rect, 5, pxPerFt);
    expect(stepFt).toBeGreaterThanOrEqual(40); // 5000/5=1000 lines → doubled until ≤160
    expect(5000 / stepFt).toBeLessThanOrEqual(160);
  });
});

describe("rulerTicks", () => {
  it("ticks sit on the origin-anchored 5×step cadence and label from the origin", () => {
    const ticks = rulerTicks(-60, 200, 5, 20, (ft) => ft * 2);
    // cadence 25 anchored at 20: -55, -30, -5, 20, 45, … ; first ≥ -60 is -55
    expect(ticks[0]).toEqual({ pos: -110, label: -75 });
    expect(ticks.find((t) => t.label === 0)).toEqual({ pos: 40, label: 0 }); // plot corner (world 20)
    expect(ticks.some((t) => t.label === 25)).toBe(true);
    expect(ticks.every((t) => t.pos <= 400)).toBe(true); // never past the visible end
  });
});

describe("fitTransform + clampScale", () => {
  it("centers a bbox inside the viewport", () => {
    const v = fitTransform({ x0: 0, y0: 0, x1: 300, y1: 200 }, viewport, pxPerFt, 0);
    expect(v.scale).toBeCloseTo(1); // exact fit
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(0);
  });

  it("smaller bbox scales up (capped at 4) and centers", () => {
    const v = fitTransform({ x0: 100, y0: 50, x1: 200, y1: 100 }, viewport, pxPerFt, 0);
    expect(v.scale).toBeLessThanOrEqual(4);
    // center of bbox lands at viewport center
    const cx = (150 * pxPerFt) * v.scale + v.x;
    const cy = (75 * pxPerFt) * v.scale + v.y;
    expect(cx).toBeCloseTo(viewport.width / 2);
    expect(cy).toBeCloseTo(viewport.height / 2);
  });

  it("clampScale floor tracks fit scale", () => {
    expect(clampScale(0.01, 1)).toBe(0.5);
    expect(clampScale(10, 1)).toBe(4);
    expect(clampScale(1.2, 1)).toBe(1.2);
  });
});

describe("zoomAtPoint", () => {
  it("keeps the world point under the cursor fixed", () => {
    const view: View = { x: 30, y: -20, scale: 1 };
    const pointer = { x: 450, y: 300 };
    const worldBefore = { x: (pointer.x - view.x) / view.scale, y: (pointer.y - view.y) / view.scale };
    const next = zoomAtPoint(view, pointer, 1.5, 1);
    const worldAfter = { x: (pointer.x - next.x) / next.scale, y: (pointer.y - next.y) / next.scale };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
    expect(next.scale).toBeCloseTo(1.5);
  });

  it("returns the same view when already at a clamp bound", () => {
    const view: View = { x: 0, y: 0, scale: 4 };
    expect(zoomAtPoint(view, { x: 0, y: 0 }, 2, 1)).toBe(view);
  });

  it("absolute presets: factor = target/current lands exactly on the preset (within clamps)", () => {
    const view: View = { x: 12, y: -7, scale: 1.37 };
    for (const target of [0.5, 1, 2]) {
      expect(zoomAtPoint(view, { x: 450, y: 300 }, target / view.scale, 0.5).scale).toBeCloseTo(target);
    }
    // preset above MAX clamps to 4
    expect(zoomAtPoint(view, { x: 450, y: 300 }, 10 / view.scale, 0.5).scale).toBe(4);
  });
});

describe("wheelFactor", () => {
  it("is smooth and symmetric around 1", () => {
    expect(wheelFactor(0)).toBe(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100) * wheelFactor(-100)).toBeCloseTo(1);
  });
});
