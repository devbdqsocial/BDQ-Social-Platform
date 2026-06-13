import { describe, expect, it } from "vitest";
import { upgradeLayout, layoutV2Schema, exceedsSizeCap, LAYER_IDS, type LayoutV2 } from "./layout-v2";

const v1 = {
  version: 1 as const,
  canvas: { widthFt: 230, heightFt: 160, gridFt: 5 },
  elements: [
    { id: "a", kind: "stall" as const, type: "Small", label: "A-1", xFt: 10, yFt: 10, widthFt: 10, heightFt: 10, rotation: 0, priceInPaise: 500000, stallTypeId: "st1", status: "AVAILABLE" as const },
    { id: "b", kind: "infra" as const, type: "STAGE", label: "Stage", xFt: 50, yFt: 5, widthFt: 40, heightFt: 24, rotation: 0 },
  ],
};

describe("upgradeLayout (R2.5.1)", () => {
  it("upgrades a v1 doc losslessly — elements carried, defaults filled", () => {
    const out = upgradeLayout(v1);
    expect(out.v).toBe(2);
    expect(out.canvas).toMatchObject({ widthFt: 230, heightFt: 160, gridFt: 5, displayUnit: "FT" });
    expect(out.elements).toEqual(v1.elements);
    expect(out.obstacles).toEqual([]);
    expect(out.zones).toEqual([]);
    expect(out.pathways).toEqual([]);
    expect(out.ops).toEqual([]);
    expect(out.entryFlow).toEqual([]);
    expect(out.versions).toEqual([]);
    // every layer present; underlay locked by default
    LAYER_IDS.forEach((id) => expect(out.layers[id]).toBeDefined());
    expect(out.layers.underlay.locked).toBe(true);
    expect(out.layers.stalls.visible).toBe(true);
  });

  it("maps a v1 bgImage to an UNCALIBRATED underlay (ftPerPx 0, unlocked)", () => {
    const out = upgradeLayout({ ...v1, canvas: { ...v1.canvas, bgImage: { url: "https://x/y.jpg", opacity: 0.5 } } });
    expect(out.underlay).toMatchObject({ url: "https://x/y.jpg", opacity: 0.5, ftPerPx: 0, locked: false });
  });

  it("is idempotent — re-upgrading a v2 doc returns it unchanged", () => {
    const once = upgradeLayout(v1);
    const twice = upgradeLayout(once);
    expect(twice).toEqual(once);
  });

  it("folds a legacy opsLayerJson blob into ops[]", () => {
    const ops = [{ id: "o1", type: "MEDICAL", xFt: 20, yFt: 20, widthFt: 10, heightFt: 10, rotation: 0 }];
    const out = upgradeLayout(v1, ops);
    expect(out.ops).toHaveLength(1);
    expect(out.ops[0]).toMatchObject({ id: "o1", type: "MEDICAL" });
  });

  it("ignores opsJson when a v2 doc already has ops", () => {
    const v2: LayoutV2 = { ...upgradeLayout(v1), ops: [{ id: "keep", type: "GENERATOR", xFt: 1, yFt: 1, widthFt: 5, heightFt: 5, rotation: 0 }] };
    const out = upgradeLayout(v2, [{ id: "drop", type: "MEDICAL", xFt: 0, yFt: 0, widthFt: 1, heightFt: 1, rotation: 0 }]);
    expect(out.ops.map((o) => o.id)).toEqual(["keep"]);
  });

  it("handles empty / garbage input → valid empty v2 with default canvas", () => {
    for (const bad of [null, undefined, {}, { foo: 1 }, []]) {
      const out = upgradeLayout(bad);
      expect(layoutV2Schema.safeParse(out).success).toBe(true);
      expect(out.canvas.widthFt).toBe(230);
      expect(out.elements).toEqual([]);
    }
  });

  it("drops malformed v1 elements rather than throwing", () => {
    const out = upgradeLayout({ canvas: { widthFt: 100, heightFt: 100 }, elements: [v1.elements[0], { id: "bad" }] });
    expect(out.elements).toHaveLength(1);
    expect(out.elements[0].id).toBe("a");
  });

  it("size cap flags an oversized layout", () => {
    const small = upgradeLayout(v1);
    expect(exceedsSizeCap(small)).toBe(false);
    const huge = { ...small, elements: Array.from({ length: 60000 }, (_, i) => ({ ...v1.elements[0], id: `e${i}` })) };
    expect(exceedsSizeCap(huge as LayoutV2)).toBe(true);
  });
});
