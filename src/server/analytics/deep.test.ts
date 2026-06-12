import { describe, expect, it } from "vitest";
import { buildHeatmap, segmentRfm } from "./deep";

describe("buildHeatmap", () => {
  it("returns a full 7×24 grid and buckets orders in IST", () => {
    // 2026-06-08 08:30 UTC → 14:00 IST (Monday)
    const ts = new Date("2026-06-08T08:30:00.000Z");
    const grid = buildHeatmap([
      { createdAt: ts, total: 1000 },
      { createdAt: ts, total: 500 },
    ]);
    expect(grid).toHaveLength(168);
    const cell = grid.find((c) => c.day === 1 && c.hour === 14)!;
    expect(cell.count).toBe(2);
    expect(cell.revenue).toBe(1500);
    expect(grid.reduce((s, c) => s + c.count, 0)).toBe(2);
  });
});

describe("segmentRfm", () => {
  it("classifies champions, loyal, promising, at-risk and hibernating", () => {
    const r = segmentRfm([
      { userId: "a", recencyDays: 10, frequency: 4, monetary: 50000 }, // Champions
      { userId: "b", recencyDays: 100, frequency: 2, monetary: 20000 }, // Loyal
      { userId: "c", recencyDays: 20, frequency: 1, monetary: 5000 }, // Promising
      { userId: "d", recencyDays: 200, frequency: 1, monetary: 1000 }, // Hibernating
      { userId: "e", recencyDays: 150, frequency: 1, monetary: 1000 }, // At risk
    ]);
    expect(r.map((x) => x.segment)).toEqual(["Champions", "Loyal", "Promising", "Hibernating", "At risk"]);
  });
});
