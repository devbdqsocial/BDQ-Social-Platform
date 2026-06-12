import { describe, expect, it } from "vitest";
import {
  createInfra,
  createStall,
  duplicate,
  seedToEditor,
  snapToGrid,
  validateLayout,
  type PaletteStallType,
} from "./designer-ops";

const stallDef = (name: string, w: number, h: number): PaletteStallType => ({
  id: `def-${name}`,
  name,
  widthFt: w,
  heightFt: h,
  priceInPaise: 0,
  color: "#3FA66A",
  sellable: true,
});

describe("snapToGrid", () => {
  it("snaps to the nearest grid step", () => {
    expect(snapToGrid(13, 5)).toBe(15);
    expect(snapToGrid(12, 5)).toBe(10);
    expect(snapToGrid(7.4, 0)).toBe(7.4); // no grid → 2dp
  });
});

describe("factories", () => {
  it("createStall uses the type's reference ft size", () => {
    expect([createStall(stallDef("PREMIUM", 15, 12)).widthFt, createStall(stallDef("PREMIUM", 15, 12)).heightFt]).toEqual([15, 12]);
    expect([createStall(stallDef("SMALL", 10, 10)).widthFt, createStall(stallDef("SMALL", 10, 10)).heightFt]).toEqual([10, 10]);
  });

  it("createStall/createInfra produce unique ids and no price", () => {
    const a = createStall(stallDef("FOOD", 12, 10));
    const b = createStall(stallDef("FOOD", 12, 10));
    expect(a.id).not.toBe(b.id);
    // Non-sellable stalls produce undefined priceInPaise
    const ns = createStall({ ...stallDef("FOOD", 12, 10), sellable: false });
    expect(ns.priceInPaise).toBeUndefined();
    expect(createInfra("STAGE").kind).toBe("infra");
  });

  it("duplicate offsets position and makes a new id", () => {
    const a = createStall(stallDef("LANE", 8, 6), 20, 30);
    const d = duplicate(a);
    expect(d.id).not.toBe(a.id);
    expect([d.xFt, d.yFt]).toEqual([25, 35]);
  });
});

describe("seedToEditor + validateLayout", () => {
  it("seed yields 105 editable elements (94 stalls + 11 infra)", () => {
    const els = seedToEditor();
    expect(els).toHaveLength(105);
    expect(els.filter((e) => e.kind === "stall")).toHaveLength(94);
  });

  it("validates a good layout and rejects a bad one", () => {
    const good = validateLayout({
      version: 1,
      canvas: { widthFt: 230, heightFt: 160 },
      elements: seedToEditor(),
    });
    expect(good.ok).toBe(true);
    expect(validateLayout({ version: 2, canvas: {}, elements: [] }).ok).toBe(false);
  });
});
