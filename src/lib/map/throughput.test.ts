import { describe, expect, it } from "vitest";
import { totalScanLanes, guestsPerHour, expectedPeakPerHour, throughputReport } from "./throughput";
import type { EntryFlowObject } from "./layout-v2";

const scan = (id: string, lanes?: number): EntryFlowObject => ({ id, type: "SCAN_POINT", xFt: 0, yFt: 0, widthFt: 4, heightFt: 4, rotation: 0, lanes });
const gate = (id: string): EntryFlowObject => ({ id, type: "GATE", xFt: 0, yFt: 0, widthFt: 12, heightFt: 6, rotation: 0 });

describe("totalScanLanes", () => {
  it("sums SCAN_POINT lanes (default 1) and ignores other objects", () => {
    expect(totalScanLanes([scan("a", 4), scan("b", 2), scan("c"), gate("g")])).toBe(7);
  });
});

describe("guestsPerHour", () => {
  it("applies 5 scans/min/lane × 60 × 0.8 utilization", () => {
    // 8 lanes × 5 × 60 × 0.8 = 1920
    expect(guestsPerHour(8)).toBe(1920);
    expect(guestsPerHour(0)).toBe(0);
  });
});

describe("expectedPeakPerHour", () => {
  it("models 60% of guests arriving over 2h", () => {
    // 5000 × 0.6 / 2 = 1500
    expect(expectedPeakPerHour(5000)).toBe(1500);
  });
});

describe("throughputReport", () => {
  it("flags ok when capacity ≥ peak", () => {
    const r = throughputReport([scan("a", 8)], 5000); // cap 1920 ≥ peak 1500
    expect(r.scanLanes).toBe(8);
    expect(r.capacityPerHour).toBe(1920);
    expect(r.expectedPeakPerHour).toBe(1500);
    expect(r.ok).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("reports a shortfall when under capacity", () => {
    const r = throughputReport([scan("a", 4)], 8000); // cap 960, peak 2400
    expect(r.ok).toBe(false);
    expect(r.shortfall).toBe(2400 - 960);
  });
});
