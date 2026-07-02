import { describe, expect, it } from "vitest";
import { constrainAxis, polygonArea, polygonPerimeter, pathLength, usedSqFt, occupancy, type Pt } from "./geometry";
import type { EditorElement } from "@/lib/map/designer-ops";

const sq: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]];

describe("geometry (R2.5.4)", () => {
  it("polygonArea via shoelace — square + triangle, orientation-independent", () => {
    expect(polygonArea(sq)).toBe(100);
    expect(polygonArea([...sq].reverse())).toBe(100); // CW vs CCW same
    expect(polygonArea([[0, 0], [4, 0], [0, 3]])).toBe(6);
    expect(polygonArea([[0, 0], [1, 1]])).toBe(0); // < 3 points
  });

  it("polygonPerimeter closes the loop", () => {
    expect(polygonPerimeter(sq)).toBe(40);
    expect(polygonPerimeter([[0, 0], [3, 4]])).toBe(10); // there-and-back (3-4-5 ×2)
  });

  it("pathLength sums open polyline segments (distance tool)", () => {
    expect(pathLength([[0, 0], [3, 4]])).toBe(5);
    expect(pathLength([[0, 0], [3, 4], [3, 4]])).toBe(5); // duplicate adds nothing
    expect(pathLength([[0, 0], [10, 0], [10, 10]])).toBe(20);
    expect(pathLength([[5, 5]])).toBe(0);
  });

  it("usedSqFt + occupancy aggregate element footprints", () => {
    const els = [
      { widthFt: 10, heightFt: 10 },
      { widthFt: 15, heightFt: 12 },
    ] as EditorElement[];
    expect(usedSqFt(els)).toBe(280);
    expect(occupancy(els, 1000)).toBeCloseTo(0.28, 5);
    expect(occupancy(els, 0)).toBe(0);
  });
});

describe("constrainAxis", () => {
  it("projects onto the dominant axis", () => {
    expect(constrainAxis([0, 0], [10, 3])).toEqual([10, 0]);
    expect(constrainAxis([0, 0], [2, -9])).toEqual([0, -9]);
    expect(constrainAxis([5, 5], [15, 15])).toEqual([15, 5]); // tie goes horizontal
  });
});
