import { describe, expect, it } from "vitest";
import { buildAarushLawnTemplate } from "./seed-aarush-lawn";
import { assignDemoStatuses } from "./demo-status";

const SELLABLE = new Set(["AVAILABLE", "HELD", "PENDING", "BOOKED", "BLOCKED"]);

describe("assignDemoStatuses", () => {
  const layout = buildAarushLawnTemplate();

  it("covers exactly the sellable stalls (94), not infra", () => {
    const keys = Object.keys(assignDemoStatuses(layout));
    expect(keys).toHaveLength(94);
    expect(keys).toContain("F-1");
    expect(keys).toContain("P-1");
    expect(keys.some((k) => k.startsWith("Main Stage"))).toBe(false);
  });

  it("is deterministic", () => {
    expect(assignDemoStatuses(layout)).toEqual(assignDemoStatuses(layout));
  });

  it("only assigns valid stall statuses", () => {
    expect(Object.values(assignDemoStatuses(layout)).every((s) => SELLABLE.has(s))).toBe(true);
  });
});
