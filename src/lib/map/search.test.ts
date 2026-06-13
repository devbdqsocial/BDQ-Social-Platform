import { describe, expect, it } from "vitest";
import { searchLayout } from "./search";
import type { EditorElement } from "./designer-ops";
import type { Zone } from "./layout-v2";

const el = (id: string, label: string, kind: EditorElement["kind"] = "stall"): EditorElement => ({
  id, kind, type: "FOOD", label, xFt: 5, yFt: 6, widthFt: 10, heightFt: 10, rotation: 0,
});
const zone = (id: string, name: string): Zone => ({ id, name, color: "green", points: [[0, 0], [20, 0], [20, 20], [0, 20]] });

const els = [el("1", "A-12"), el("2", "A-13"), el("3", "STAGE", "infra"), el("4", "B-1")];
const zones = [zone("z1", "Food Court"), zone("z2", "VIP")];

describe("searchLayout", () => {
  it("returns nothing for an empty query", () => {
    expect(searchLayout("", els, zones)).toEqual([]);
    expect(searchLayout("   ", els, zones)).toEqual([]);
  });

  it("matches stall labels case-insensitively and carries focus geometry", () => {
    const r = searchLayout("a-1", els, zones);
    expect(r.map((m) => m.label)).toEqual(["A-12", "A-13"]);
    expect(r[0].kind).toBe("stall");
    expect(r[0].focus.id).toBe("1");
    expect(r[0].focus.widthFt).toBe(10);
  });

  it("matches a zone by name and focuses its centroid (no width)", () => {
    const r = searchLayout("food", els, zones);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("zone");
    expect(r[0].focus).toMatchObject({ xFt: 10, yFt: 10 });
    expect(r[0].focus.widthFt).toBeUndefined();
  });

  it("matches infra labels too", () => {
    expect(searchLayout("stage", els, zones).map((m) => m.kind)).toEqual(["infra"]);
  });

  it("caps results at the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => el(`s${i}`, `Z-${i}`));
    expect(searchLayout("z-", many, [], 8)).toHaveLength(8);
  });
});
