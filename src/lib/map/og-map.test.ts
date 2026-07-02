import { describe, expect, it } from "vitest";
import { upgradeLayout } from "./layout-v2";
import { OG_MAP_ELEMENT_CAP, ogMapShapes } from "./og-map";

const stall = (id: string, x: number, y: number) => ({
  id, kind: "stall" as const, type: "S", label: id, xFt: x, yFt: y, widthFt: 10, heightFt: 10, rotation: 0,
});

describe("ogMapShapes", () => {
  it("scales the canvas into the box and maps shapes", () => {
    const l = upgradeLayout({ v: 2, canvas: { widthFt: 200, heightFt: 100 } });
    l.elements = [stall("a", 0, 0), stall("b", 100, 50)];
    l.boundary = { points: [[0, 0], [200, 0], [200, 100], [0, 100]] };
    const out = ogMapShapes(l, 400, 400)!;
    expect(out.width).toBe(400); // limited by width: k = 2
    expect(out.height).toBe(200);
    expect(out.stalls[1]).toMatchObject({ x: 200, y: 100, w: 20, h: 20 });
    expect(out.boundary).toContain("400.0,200.0");
  });

  it("returns null for an empty layout or one over the element cap", () => {
    expect(ogMapShapes(upgradeLayout({}), 400, 400)).toBeNull();
    const l = upgradeLayout({});
    l.elements = Array.from({ length: OG_MAP_ELEMENT_CAP + 1 }, (_, i) => stall(`s${i}`, i, 0));
    expect(ogMapShapes(l, 400, 400)).toBeNull();
  });
});
