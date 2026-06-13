import { describe, expect, it } from "vitest";
import { MAX_VERSIONS, WARN_VERSIONS, versionStats, diffStats, versionCapState, type VersionSnapshot } from "./versions";
import type { EditorElement } from "./designer-ops";

const stall = (id: string, price?: number, status?: EditorElement["status"]): EditorElement => ({
  id, kind: "stall", type: "FOOD", label: id, xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, rotation: 0, priceInPaise: price, status,
});
const infra = (id: string): EditorElement => ({ id, kind: "infra", type: "STAGE", label: id, xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, rotation: 0 });

const snap = (els: EditorElement[]): VersionSnapshot => ({ elements: els, zones: [], pathways: [], terrain: [], obstacles: [], boundary: null });

describe("versionStats", () => {
  it("counts stalls/infra/sellable and sums non-blocked value", () => {
    const s = versionStats(snap([stall("a", 1000000), stall("b", 500000), stall("c", 900000, "BLOCKED"), infra("g")]));
    expect(s).toEqual({ stalls: 3, infra: 1, sellable: 2, valuePaise: 1500000 });
  });
});

describe("diffStats", () => {
  it("reports b − a deltas (added value and stalls)", () => {
    const a = snap([stall("a", 1000000)]);
    const b = snap([stall("a", 1000000), stall("b", 500000)]);
    const d = diffStats(a, b);
    expect(d.stalls).toBe(1);
    expect(d.valuePaise).toBe(500000);
  });

  it("reports negative deltas when b removes value", () => {
    const a = snap([stall("a", 1000000), stall("b", 800000)]);
    const b = snap([stall("a", 1000000)]);
    expect(diffStats(a, b).valuePaise).toBe(-800000);
  });
});

describe("versionCapState", () => {
  it("allows below the warn threshold with no message", () => {
    expect(versionCapState(3)).toEqual({ canSave: true, warn: null });
  });

  it("warns from 8 and blocks at the 10 cap", () => {
    expect(versionCapState(WARN_VERSIONS).canSave).toBe(true);
    expect(versionCapState(WARN_VERSIONS).warn).toBeTruthy();
    expect(versionCapState(MAX_VERSIONS).canSave).toBe(false);
  });
});
