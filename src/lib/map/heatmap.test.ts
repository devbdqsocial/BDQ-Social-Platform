import { describe, expect, it } from "vitest";
import { HEATMAP_RAMP, quintileBounds, quintileIndex, heatmapFill } from "./heatmap";

describe("quintileBounds", () => {
  it("returns 4 ascending cut points", () => {
    const b = quintileBounds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(b).toHaveLength(4);
    expect(b[0]).toBeLessThan(b[1]);
    expect(b[1]).toBeLessThan(b[2]);
    expect(b[2]).toBeLessThan(b[3]);
  });

  it("collapses to equal bounds for a uniform set", () => {
    expect(quintileBounds([5, 5, 5, 5])).toEqual([5, 5, 5, 5]);
  });
});

describe("quintileIndex + heatmapFill", () => {
  const bounds = quintileBounds([10, 20, 30, 40, 50]);

  it("buckets the extremes to the bottom and top ramp steps", () => {
    expect(quintileIndex(10, bounds)).toBe(0);
    expect(quintileIndex(50, bounds)).toBe(4);
    expect(heatmapFill(10, bounds)).toBe(HEATMAP_RAMP[0]);
    expect(heatmapFill(50, bounds)).toBe(HEATMAP_RAMP[4]);
  });

  it("never indexes out of the 5-step ramp", () => {
    expect(quintileIndex(9999, bounds)).toBe(HEATMAP_RAMP.length - 1);
    expect(quintileIndex(-9999, bounds)).toBe(0);
    expect(HEATMAP_RAMP).toHaveLength(5);
  });

  it("a uniform set keeps everything in the lowest bucket", () => {
    const ub = quintileBounds([7, 7, 7]);
    expect(quintileIndex(7, ub)).toBe(0);
  });
});
