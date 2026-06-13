import { describe, expect, it } from "vitest";
import { mapViolations, pointInPolygon, rectsIntersect } from "./validation";
import type { EditorElement } from "@/lib/map/designer-ops";
import type { Obstacle, Pt } from "@/lib/map/layout-v2";

const stall = (id: string, xFt: number, yFt: number, w = 10, h = 10): EditorElement => ({
  id, kind: "stall", type: "Small", label: id, xFt, yFt, widthFt: w, heightFt: h, rotation: 0, status: "AVAILABLE",
});
const tree = (xFt: number, yFt: number, w = 6, h = 6): Obstacle => ({
  id: `o-${xFt}-${yFt}`, type: "TREE", xFt, yFt, widthFt: w, heightFt: h, rotation: 0, label: "Old banyan",
});
const venue: Pt[] = [[0, 0], [100, 0], [100, 100], [0, 100]];

describe("map validation (R2.5.3)", () => {
  it("rectsIntersect — overlap vs touching vs apart", () => {
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false); // edge touch
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 5, h: 5 })).toBe(false);
  });

  it("pointInPolygon for a square", () => {
    expect(pointInPolygon([50, 50], venue)).toBe(true);
    expect(pointInPolygon([150, 50], venue)).toBe(false);
    expect(pointInPolygon([-1, 50], venue)).toBe(false);
  });

  it("flags a stall straddling the boundary", () => {
    const v = mapViolations([stall("A", 95, 50)], venue, []); // x 95..105 spills past x=100
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ elementId: "A", kind: "OUT_OF_BOUNDS" });
  });

  it("passes a stall fully inside the boundary", () => {
    expect(mapViolations([stall("A", 40, 40)], venue, [])).toHaveLength(0);
  });

  it("flags a stall overlapping an obstacle", () => {
    const v = mapViolations([stall("A", 40, 40)], venue, [tree(45, 45)]);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ kind: "OBSTACLE", detail: "overlaps Old banyan" });
  });

  it("respects per-stall overrides and ignores non-stall elements", () => {
    expect(mapViolations([stall("A", 95, 50)], venue, [], new Set(["A"]))).toHaveLength(0);
    const infra = { ...stall("I", 95, 50), kind: "infra" as const };
    expect(mapViolations([infra], venue, [])).toHaveLength(0);
  });

  it("no boundary set → only obstacle checks run", () => {
    expect(mapViolations([stall("A", 999, 999)], null, [])).toHaveLength(0);
  });
});
