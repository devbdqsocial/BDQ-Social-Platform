import { describe, expect, it } from "vitest";
import { buildCatalog, catalogLabel, OBSTACLE_TYPES } from "./catalog";
import { INFRA_TYPES } from "./designer-ops";
import { ENTRY_TYPES, OPS_TYPES } from "./entry-ops";

describe("catalog", () => {
  it("covers every placeable enum member", () => {
    const keys = new Set(buildCatalog().flatMap((c) => c.items.map((i) => i.key)));
    for (const t of [...INFRA_TYPES, ...ENTRY_TYPES, ...OPS_TYPES, ...OBSTACLE_TYPES, "ARROW", "TEXT"]) {
      expect(keys.has(t), `missing ${t}`).toBe(true);
    }
  });

  it("uses flea-market language for key objects", () => {
    expect(catalogLabel("SCAN_POINT")).toBe("QR scan point");
    expect(catalogLabel("TICKET_COUNTER")).toBe("Ticket counter");
    expect(catalogLabel("RESTROOM")).toBe("Toilets");
    expect(catalogLabel("WATER_POINT")).toBe("Drinking water");
    expect(catalogLabel("UNKNOWN_THING")).toBe("Unknown Thing"); // humanize fallback
  });
});
