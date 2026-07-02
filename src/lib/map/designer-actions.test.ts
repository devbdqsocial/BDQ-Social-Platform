import { describe, expect, it } from "vitest";
import { alignElements, bringToFront, distributeElements, bulkPatch, relabel, sendToBack, type AlignMode } from "./designer-actions";
import type { EditorElement } from "./designer-ops";

const el = (id: string, x: number, y: number, w = 10, h = 10): EditorElement => ({
  id, kind: "stall", type: "FOOD", label: id, xFt: x, yFt: y, widthFt: w, heightFt: h, rotation: 0,
});

// three boxes at varied positions/sizes; ids a,b,c selected
const fixture = (): EditorElement[] => [el("a", 0, 0, 10, 10), el("b", 30, 5, 20, 8), el("c", 100, 40, 10, 10)];
const all = new Set(["a", "b", "c"]);

describe("alignElements", () => {
  const x = (els: EditorElement[], id: string) => els.find((e) => e.id === id)!.xFt;
  const y = (els: EditorElement[], id: string) => els.find((e) => e.id === id)!.yFt;

  it("left/right/hcenter align on the selection bbox", () => {
    expect(x(alignElements(fixture(), all, "left"), "c")).toBe(0); // min left = 0
    expect(x(alignElements(fixture(), all, "right"), "a")).toBe(110 - 10); // right edge 110, minus width
    // bbox center x = (0 + 110) / 2 = 55 → box b (w20) lands at 45
    expect(x(alignElements(fixture(), all, "hcenter"), "b")).toBe(45);
  });

  it("top/bottom/vcenter align on the selection bbox", () => {
    expect(y(alignElements(fixture(), all, "top"), "c")).toBe(0); // min top = 0
    expect(y(alignElements(fixture(), all, "bottom"), "a")).toBe(50 - 10); // bottom edge 50
    // bbox center y = (0 + 50) / 2 = 25 → box b (h8) lands at 21
    expect(y(alignElements(fixture(), all, "vcenter"), "b")).toBe(21);
  });

  it("is a no-op for fewer than 2 selected", () => {
    const f = fixture();
    expect(alignElements(f, new Set(["a"]), "left")).toEqual(f);
  });

  it("never touches unselected elements", () => {
    const out = alignElements(fixture(), new Set(["a", "b"]), "left");
    expect(out.find((e) => e.id === "c")!.xFt).toBe(100);
  });
});

describe("distributeElements", () => {
  it("equalizes horizontal gaps between sorted boxes", () => {
    // a(0..10) b(30..50) c(100..110): span 0..110, sizes 10+20+10=40, gap=(110-40)/2=35
    const out = distributeElements(fixture(), all, "h");
    const x = (id: string) => out.find((e) => e.id === id)!.xFt;
    expect(x("a")).toBe(0); // anchored at start
    expect(x("b")).toBe(45); // 10 + 35
    expect(x("c")).toBe(100); // 45 + 20 + 35
  });

  it("is a no-op for fewer than 3 selected", () => {
    const f = fixture();
    expect(distributeElements(f, new Set(["a", "b"]), "h")).toEqual(f);
  });
});

describe("bulkPatch", () => {
  it("applies one partial to every selected element", () => {
    const out = bulkPatch(fixture(), new Set(["a", "c"]), { widthFt: 12, status: "BLOCKED" });
    expect(out.find((e) => e.id === "a")).toMatchObject({ widthFt: 12, status: "BLOCKED" });
    expect(out.find((e) => e.id === "c")).toMatchObject({ widthFt: 12, status: "BLOCKED" });
    expect(out.find((e) => e.id === "b")!.widthFt).toBe(20);
    expect(out.find((e) => e.id === "b")!.status).toBeUndefined();
  });

  it("preserves identity of fields not in the patch", () => {
    const out = bulkPatch(fixture(), all, { priceInPaise: 1500000 });
    expect(out.map((e) => e.xFt)).toEqual([0, 30, 100]);
    expect(out.every((e) => e.priceInPaise === 1500000)).toBe(true);
  });
});

describe("relabel", () => {
  it("renumbers the selection in element order from a prefix+start", () => {
    const out = relabel(fixture(), all, "A-", 5);
    expect(out.map((e) => e.label)).toEqual(["A-5", "A-6", "A-7"]);
  });
});

describe("z-order", () => {
  it("bringToFront moves the selection to the end, preserving order", () => {
    expect(bringToFront(fixture(), new Set(["a"])).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(bringToFront(fixture(), new Set(["a", "b"])).map((e) => e.id)).toEqual(["c", "a", "b"]);
  });

  it("sendToBack moves the selection to the start; empty selection is a no-op", () => {
    expect(sendToBack(fixture(), new Set(["c"])).map((e) => e.id)).toEqual(["c", "a", "b"]);
    const els = fixture();
    expect(sendToBack(els, new Set())).toBe(els);
  });
});

// keep AlignMode referenced so the type import is load-bearing
const _modes: AlignMode[] = ["left", "hcenter", "right", "top", "vcenter", "bottom"];
void _modes;
