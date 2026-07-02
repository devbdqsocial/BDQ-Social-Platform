import { describe, expect, it } from "vitest";
import { polygonArea } from "./geometry";
import { canvasForPlot, insertMidpoint, lShapePlot, movePoint, rectPlot, removePoint } from "./plot";

describe("plot presets", () => {
  it("rectangle has w×d area", () => {
    expect(polygonArea(rectPlot(400, 250))).toBe(100000);
  });

  it("L-shape area = rectangle minus the cut", () => {
    expect(polygonArea(lShapePlot(400, 250, 100, 80))).toBe(400 * 250 - 100 * 80);
  });

  it("L-shape clamps an oversized cut", () => {
    const pts = lShapePlot(100, 100, 500, 500);
    expect(polygonArea(pts)).toBeGreaterThan(0);
  });
});

describe("canvasForPlot", () => {
  it("translates the plot inside a margin and sizes the canvas to bbox + 2×margin", () => {
    const { points, widthFt, heightFt } = canvasForPlot(rectPlot(400, 250), 20);
    expect(points[0]).toEqual([20, 20]);
    expect(widthFt).toBe(440);
    expect(heightFt).toBe(290);
  });

  it("clamps tiny and huge plots like setCanvasDim", () => {
    expect(canvasForPlot(rectPlot(2, 2), 1).widthFt).toBe(10);
    expect(canvasForPlot(rectPlot(9000, 9000), 20).widthFt).toBe(5000);
  });
});

describe("vertex helpers", () => {
  const square = rectPlot(10, 10);

  it("movePoint replaces one vertex", () => {
    expect(movePoint(square, 1, [12, -2])[1]).toEqual([12, -2]);
    expect(movePoint(square, 1, [12, -2])).toHaveLength(4);
  });

  it("insertMidpoint splits a segment (wrapping when closed)", () => {
    const out = insertMidpoint(square, 3, true); // between last and first
    expect(out).toHaveLength(5);
    expect(out[4]).toEqual([0, 5]);
  });

  it("removePoint respects the closed minimum of 3", () => {
    const tri = removePoint(square, 0, true);
    expect(tri).toHaveLength(3);
    expect(removePoint(tri, 0, true)).toHaveLength(3); // refuses below 3
  });

  it("removePoint respects the open minimum of 2", () => {
    const line: [number, number][] = [[0, 0], [5, 5]];
    expect(removePoint(line, 0, false)).toHaveLength(2);
  });
});
