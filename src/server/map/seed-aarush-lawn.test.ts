import { describe, expect, it } from "vitest";
import { buildAarushLawnTemplate, countByType } from "./seed-aarush-lawn";

describe("Aarush Lawn seed template", () => {
  const layout = buildAarushLawnTemplate();
  const counts = countByType(layout);

  it("has the typed sellable-stall breakdown (36/32/16/10)", () => {
    expect(counts.SMALL).toBe(36);
    expect(counts.LANE).toBe(32);
    expect(counts.PREMIUM).toBe(16);
    expect(counts.FOOD).toBe(10);
  });

  it("has 94 sellable stalls total", () => {
    const sellable = layout.elements.filter((e) => e.kind === "stall");
    expect(sellable).toHaveLength(94);
    expect(sellable.every((s) => s.kind === "stall" && s.sellable)).toBe(true);
  });

  it("uses the reference feet sizes per type", () => {
    const byType = (t: string) =>
      layout.elements.find((e) => e.kind === "stall" && e.type === t)!;
    expect([byType("PREMIUM").widthFt, byType("PREMIUM").heightFt]).toEqual([15, 12]);
    expect([byType("SMALL").widthFt, byType("SMALL").heightFt]).toEqual([10, 10]);
  });

  it("includes infra (stage 40x24 + 4 activity zones) with no prices", () => {
    const stage = layout.elements.find((e) => e.kind === "infra" && e.type === "STAGE")!;
    expect([stage.widthFt, stage.heightFt]).toEqual([40, 24]);
    expect(counts.INFRA_ACTIVITY_ZONE).toBe(4);
    // no element carries a price field
    expect(layout.elements.every((e) => !("priceInPaise" in e))).toBe(true);
  });

  it("canvas is 230 x 160 ft", () => {
    expect(layout.canvas).toEqual({ widthFt: 230, heightFt: 160 });
  });
});
