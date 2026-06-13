import { describe, expect, it } from "vitest";
import { zoneOf, zoneRollups, polygonCentroid } from "./zones";
import type { EditorElement } from "@/lib/map/designer-ops";
import type { Zone } from "@/lib/map/layout-v2";

const stall = (id: string, xFt: number, yFt: number, price = 500000, status: EditorElement["status"] = "AVAILABLE"): EditorElement => ({
  id, kind: "stall", type: "Small", label: id, xFt, yFt, widthFt: 10, heightFt: 10, rotation: 0, priceInPaise: price, status,
});
const luxury: Zone = { id: "z1", name: "Luxury Lane", color: "lavender", points: [[0, 0], [50, 0], [50, 50], [0, 50]] };
const food: Zone = { id: "z2", name: "Food Court", color: "green", points: [[50, 0], [100, 0], [100, 50], [50, 50]] };

describe("zones (R2.5.6)", () => {
  it("polygonCentroid averages the vertices", () => {
    expect(polygonCentroid([[0, 0], [10, 0], [10, 10], [0, 10]])).toEqual([5, 5]);
  });

  it("zoneOf matches by the element's CENTER point", () => {
    // stall at 20,20 (center 25,25) → Luxury; at 60,20 (center 65,25) → Food
    expect(zoneOf(stall("a", 20, 20), [luxury, food])?.id).toBe("z1");
    expect(zoneOf(stall("b", 60, 20), [luxury, food])?.id).toBe("z2");
    expect(zoneOf(stall("c", 200, 200), [luxury, food])).toBeNull();
  });

  it("zoneRollups tallies stalls, sellable, and potential per zone", () => {
    const els = [
      stall("a", 10, 10), // Luxury, sellable, 5L
      stall("b", 30, 30), // Luxury, sellable, 5L
      stall("c", 20, 20, 700000, "BLOCKED"), // Luxury, blocked → not sellable, no potential
      stall("d", 60, 10), // Food, sellable, 5L
    ];
    const r = zoneRollups(els, [luxury, food]);
    const lux = r.find((x) => x.zoneId === "z1")!;
    expect(lux).toMatchObject({ stalls: 3, sellable: 2, potentialPaise: 1000000 });
    expect(lux.areaSqFt).toBe(2500); // 50×50
    const fc = r.find((x) => x.zoneId === "z2")!;
    expect(fc).toMatchObject({ stalls: 1, sellable: 1, potentialPaise: 500000 });
  });

  it("infra elements are not counted in zone rollups", () => {
    const infra = { ...stall("i", 20, 20), kind: "infra" as const };
    const r = zoneRollups([infra], [luxury]);
    expect(r[0].stalls).toBe(0);
  });
});
