import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, buildScoringContext, scoreStall, scoreLayout, describeStall, round50, suggestPaise } from "./scoring";
import type { EditorElement } from "@/lib/map/designer-ops";
import type { Pathway, Zone } from "@/lib/map/layout-v2";

const stall = (id: string, x: number, y: number, w = 10, h = 10, extra: Partial<EditorElement> = {}): EditorElement => ({
  id, kind: "stall", type: "FOOD", label: id, xFt: x, yFt: y, widthFt: w, heightFt: h, rotation: 0, ...extra,
});
const infra = (id: string, type: string, x: number, y: number, w = 10, h = 10): EditorElement => ({
  id, kind: "infra", type, label: type, xFt: x, yFt: y, widthFt: w, heightFt: h, rotation: 0,
});

const comp = (els: EditorElement[], id: string, key: string) => {
  const ctx = buildScoringContext(els, [], []);
  return scoreStall(els.find((e) => e.id === id)!, ctx).components.find((c) => c.key === key)!;
};

describe("SCORE_WEIGHTS", () => {
  it("sum to 100 (a full-spread stall caps at 100)", () => {
    expect(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("entrance proximity", () => {
  it("full within 50 ft, zero beyond 300 ft, linear between", () => {
    const gate = infra("g", "ENTRY", 0, 0);
    const near = stall("near", 40, 0); // center ~45 ft from gate edge
    const far = stall("far", 400, 0);
    const mid = stall("mid", 165, 0); // center 170 from edge → ~halfway in 50..300
    expect(comp([gate, near], "near", "entrance").score).toBe(SCORE_WEIGHTS.entrance);
    expect(comp([gate, far], "far", "entrance").score).toBe(0);
    const m = comp([gate, mid], "mid", "entrance").score;
    expect(m).toBeGreaterThan(5);
    expect(m).toBeLessThan(SCORE_WEIGHTS.entrance);
  });

  it("scores 0 and notes it when no entrance exists", () => {
    const c = comp([stall("s", 10, 10)], "s", "entrance");
    expect(c.score).toBe(0);
    expect(c.note).toMatch(/no entrance/i);
  });
});

describe("corner position", () => {
  it("isolated stall is a corner (2+ exposed sides) → full", () => {
    const c = comp([stall("a", 0, 0)], "a", "corner");
    expect(c.score).toBe(SCORE_WEIGHTS.corner);
    expect(c.note).toMatch(/corner/i);
  });

  it("a stall boxed in on all four sides scores 0", () => {
    const center = stall("c", 20, 20);
    const around = [
      stall("L", 8, 20), stall("R", 32, 20), stall("T", 20, 8), stall("B", 20, 32),
    ];
    const c = comp([center, ...around], "c", "corner");
    expect(c.score).toBe(0);
    expect(c.note).toMatch(/interior/i);
  });
});

describe("pathway frontage", () => {
  it("a stall hugging a MAIN aisle gets full; off the aisle gets 0", () => {
    const main: Pathway = { id: "p", type: "MAIN", widthFt: 12, points: [[0, 25], [200, 25]] };
    const ctx = buildScoringContext([stall("on", 0, 5), stall("off", 0, 200)], [], [main]);
    const on = scoreStall(stall("on", 0, 5), ctx).components.find((c) => c.key === "frontage")!;
    const off = scoreStall(stall("off", 0, 200), ctx).components.find((c) => c.key === "frontage")!;
    expect(on.score).toBe(SCORE_WEIGHTS.frontage);
    expect(off.score).toBe(0);
  });
});

describe("zone premium", () => {
  it("top-third-by-price zone scores full, mid 50%, bottom 0", () => {
    const box = (x: number): [number, number][] => [[x, 0], [x + 100, 0], [x + 100, 100], [x, 100]];
    const zHi: Zone = { id: "hi", name: "VIP", color: "lavender", points: box(0) };
    const zMid: Zone = { id: "mid", name: "Mid", color: "yellow", points: box(200) };
    const zLo: Zone = { id: "lo", name: "Back", color: "green", points: box(400) };
    const els = [
      stall("h1", 10, 10, 10, 10, { priceInPaise: 2000000 }),
      stall("m1", 210, 10, 10, 10, { priceInPaise: 1000000 }),
      stall("l1", 410, 10, 10, 10, { priceInPaise: 400000 }),
    ];
    const ctx = buildScoringContext(els, [zHi, zMid, zLo], []);
    const z = (el: EditorElement) => scoreStall(el, ctx).components.find((c) => c.key === "zone")!.score;
    expect(z(els[0])).toBe(SCORE_WEIGHTS.zone);
    expect(z(els[1])).toBe(SCORE_WEIGHTS.zone / 2);
    expect(z(els[2])).toBe(0);
  });
});

describe("price suggestions (§9.2)", () => {
  it("round50 snaps paise to the nearest ₹50", () => {
    expect(round50(1234567)).toBe(1235000); // ₹12,345.67 → ₹12,350
    expect(round50(1212400)).toBe(1210000); // ₹12,124 → ₹12,100
  });

  it("score 50 keeps the base; 100 is +25%; 0 is −25%", () => {
    const base = 1000000; // ₹10,000
    expect(suggestPaise(base, 50)).toBe(1000000);
    expect(suggestPaise(base, 100)).toBe(1250000); // +25%
    expect(suggestPaise(base, 0)).toBe(750000); // −25%
  });

  it("is monotonic in score and always a ₹50 multiple", () => {
    const base = 1500000;
    const lo = suggestPaise(base, 30), hi = suggestPaise(base, 84);
    expect(hi).toBeGreaterThan(lo);
    expect(hi % 5000).toBe(0);
  });
});

describe("scoreLayout + tier + describeStall", () => {
  it("scores only stalls, never infra, and totals cap at 100", () => {
    const els = [infra("g", "ENTRY", 0, 0), stall("a", 30, 0), stall("b", 500, 500)];
    const m = scoreLayout(els, [], []);
    expect(m.has("g")).toBe(false);
    expect(m.size).toBe(2);
    for (const s of m.values()) { expect(s.total).toBeGreaterThanOrEqual(0); expect(s.total).toBeLessThanOrEqual(100); }
  });

  it("a well-placed stall outranks an isolated far one", () => {
    const els = [
      infra("g", "ENTRY", 0, 0), infra("st", "STAGE", 40, 0, 20, 20),
      stall("good", 20, 25), stall("bad", 600, 600),
    ];
    const m = scoreLayout(els, [], []);
    expect(m.get("good")!.total).toBeGreaterThan(m.get("bad")!.total);
  });

  it("describeStall returns at most 3 strong bullets, ordered by strength", () => {
    const els = [infra("g", "ENTRY", 0, 0), infra("st", "STAGE", 25, 0, 10, 10), stall("a", 15, 0)];
    const ctx = buildScoringContext(els, [], []);
    const bullets = describeStall(scoreStall(els[2], ctx));
    expect(bullets.length).toBeLessThanOrEqual(3);
    expect(bullets.length).toBeGreaterThan(0);
  });
});
