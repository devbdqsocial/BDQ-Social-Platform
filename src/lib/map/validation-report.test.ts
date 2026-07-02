import { describe, expect, it } from "vitest";
import { validationReport } from "./validation-report";
import type { EditorElement } from "./designer-ops";

const stall = (id: string, x: number, y: number, extra: Partial<EditorElement> = {}): EditorElement => ({
  id, kind: "stall", type: "FOOD", label: id, xFt: x, yFt: y, widthFt: 10, heightFt: 10, rotation: 0, priceInPaise: 1000000, ...extra,
});

const base = { boundary: null, obstacles: [], pathways: [], overrides: new Set<string>() };

describe("validationReport", () => {
  it("flags an unpriced sellable stall (warning, focusable)", () => {
    const r = validationReport({ ...base, elements: [stall("A-1", 0, 0, { priceInPaise: undefined })] });
    const item = r.find((i) => i.key.startsWith("price:"));
    expect(item?.severity).toBe("warning");
    expect(item?.focusId).toBe("A-1");
  });

  it("does not flag a BLOCKED stall as unpriced", () => {
    const r = validationReport({ ...base, elements: [stall("A-1", 0, 0, { priceInPaise: undefined, status: "BLOCKED" })] });
    expect(r.find((i) => i.key.startsWith("price:"))).toBeUndefined();
  });

  it("does not flag a stall priced via its stall type", () => {
    const el = stall("A-1", 0, 0, { priceInPaise: undefined, stallTypeId: "st1" });
    expect(validationReport({ ...base, elements: [el], pricedTypeIds: new Set(["st1"]) }).find((i) => i.key.startsWith("price:"))).toBeUndefined();
    // same stall with an unpriced type still warns
    expect(validationReport({ ...base, elements: [el], pricedTypeIds: new Set() }).find((i) => i.key.startsWith("price:"))).toBeDefined();
  });

  it("flags duplicate labels once per group", () => {
    const r = validationReport({ ...base, elements: [stall("F-1", 0, 0, { label: "F-1" }), stall("x", 20, 0, { label: "F-1" }), stall("y", 40, 0, { label: "F-1" })] });
    const dups = r.filter((i) => i.key.startsWith("dup:"));
    expect(dups).toHaveLength(1);
    expect(dups[0].message).toContain("3 stalls");
  });

  it("surfaces a boundary error from §4", () => {
    const boundary: [number, number][] = [[0, 0], [50, 0], [50, 50], [0, 50]];
    const r = validationReport({ ...base, boundary, elements: [stall("out", 100, 100)] });
    expect(r.some((i) => i.severity === "error" && i.focusId === "out")).toBe(true);
  });

  it("is clean for a single well-formed priced stall", () => {
    expect(validationReport({ ...base, elements: [stall("A-1", 0, 0)] })).toEqual([]);
  });
});
