import { describe, expect, it } from "vitest";
import { elementsToStallRows, stallsToRenderLayout } from "./normalize";
import type { EditorElement } from "./designer-ops";

const el = (over: Partial<EditorElement>): EditorElement => ({
  id: "x",
  kind: "stall",
  type: "SMALL",
  label: "S-1",
  xFt: 0,
  yFt: 0,
  widthFt: 10,
  heightFt: 10,
  rotation: 0,
  ...over,
});

describe("elementsToStallRows", () => {
  it("maps kind, carries price, defaults status AVAILABLE", () => {
    const rows = elementsToStallRows("evt", [
      el({ label: "S-1", priceInPaise: 1500000 }),
      el({ kind: "infra", type: "STAGE", label: "Main Stage" }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ eventId: "evt", kind: "STALL", priceInPaise: 1500000, status: "AVAILABLE" });
    expect(rows[1]).toMatchObject({ kind: "INFRA", priceInPaise: null });
  });

  it("dedupes duplicate labels", () => {
    const rows = elementsToStallRows("evt", [el({ label: "A" }), el({ label: "A" }), el({ label: "A" })]);
    expect(rows.map((r) => r.label)).toEqual(["A", "A-2", "A-3"]);
  });
});

describe("stallsToRenderLayout", () => {
  it("builds render elements + status map (non-infra only)", () => {
    const { layout, statuses } = stallsToRenderLayout([
      { kind: "STALL", status: "BOOKED", label: "S-1", xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, rotation: 0 },
      { kind: "INFRA", status: "AVAILABLE", label: "Stage", xFt: 0, yFt: 0, widthFt: 40, heightFt: 24, rotation: 0 },
    ]);
    expect(layout.elements).toHaveLength(2);
    expect(layout.elements[0]).toMatchObject({ kind: "stall", label: "S-1" });
    expect(statuses).toEqual({ "S-1": "BOOKED" });
  });
});
