import { describe, expect, it } from "vitest";
import { upgradeLayout } from "./layout-v2";
import { applyLens } from "./lens";
import { layoutToRenderLayout } from "./normalize";

/** R5.5 Phases 6–7: one venue document, projected per lens / to the renderer. */
function sample() {
  const l = upgradeLayout({});
  l.elements = [
    { id: "e1", kind: "stall", type: "Standard", label: "A-1", xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, rotation: 0, status: "BLOCKED" },
    { id: "e2", kind: "infra", type: "Stage", label: "Stage", xFt: 20, yFt: 0, widthFt: 30, heightFt: 20, rotation: 0 },
  ];
  l.zones = [{ id: "z1", name: "Food", color: "green", points: [[0, 0], [10, 0], [10, 10]] }];
  l.ops = [{ id: "o1", type: "MEDICAL", xFt: 5, yFt: 5, widthFt: 5, heightFt: 5, rotation: 0 }];
  l.entryFlow = [{ id: "g1", type: "GATE", xFt: 0, yFt: 0, widthFt: 10, heightFt: 5, rotation: 0 }];
  return l;
}

describe("applyLens", () => {
  it("admin returns the venue unchanged", () => {
    const l = sample();
    expect(applyLens(l, "admin")).toBe(l);
  });

  it("customer hides ops + entry flow, keeps zones + elements", () => {
    const c = applyLens(sample(), "customer");
    expect(c.ops).toHaveLength(0);
    expect(c.entryFlow).toHaveLength(0);
    expect(c.zones).toHaveLength(1);
    expect(c.elements).toHaveLength(2);
  });

  it("operations keeps ops + entry flow", () => {
    const o = applyLens(sample(), "operations");
    expect(o.ops).toHaveLength(1);
    expect(o.entryFlow).toHaveLength(1);
  });
});

describe("layoutToRenderLayout", () => {
  it("maps the venue document to a render layout + stall statuses", () => {
    const { layout, statuses } = layoutToRenderLayout(sample());
    expect(layout.canvas).toEqual({ widthFt: 230, heightFt: 160 });
    expect(layout.elements).toHaveLength(2);
    expect(layout.elements[0]).toMatchObject({ kind: "stall", type: "Standard", label: "A-1" });
    expect(statuses["A-1"]).toBe("BLOCKED");
    expect(statuses["Stage"]).toBeUndefined(); // infra carries no booking status
  });
});
