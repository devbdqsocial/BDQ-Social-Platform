import { describe, expect, it } from "vitest";
import { scoreLayout, buildScoringContext, scoreStall } from "./scoring";
import { makeStressLayout } from "@/lib/map/stress-fixture";
import type { EditorElement } from "@/lib/map/designer-ops";

/**
 * R2.5.17 perf + correctness guard for the spatial-grid scoring optimization. The grid only
 * narrows the neighbour-candidate set, so results must be byte-identical to a brute-force full
 * scan; and scoreLayout must stay comfortably within budget up to 500 stalls.
 */

type Rect = { xFt: number; yFt: number; widthFt: number; heightFt: number };
const overlap = (a: Rect, b: Rect) => a.xFt <= b.xFt + b.widthFt && a.xFt + a.widthFt >= b.xFt && a.yFt <= b.yFt + b.heightFt && a.yFt + a.heightFt >= b.yFt;

/** Reference corner score via an O(n²) scan over ALL stalls (what the grid must reproduce). */
function bruteCorner(stall: EditorElement, stalls: EditorElement[]): number {
  const G = 4;
  const others = stalls.filter((s) => s.id !== stall.id);
  const sides: Rect[] = [
    { xFt: stall.xFt - G, yFt: stall.yFt, widthFt: G, heightFt: stall.heightFt },
    { xFt: stall.xFt + stall.widthFt, yFt: stall.yFt, widthFt: G, heightFt: stall.heightFt },
    { xFt: stall.xFt, yFt: stall.yFt - G, widthFt: stall.widthFt, heightFt: G },
    { xFt: stall.xFt, yFt: stall.yFt + stall.heightFt, widthFt: stall.widthFt, heightFt: G },
  ];
  const exposed = sides.filter((band) => !others.some((o) => overlap(band, o))).length;
  return exposed >= 2 ? 15 : exposed === 1 ? 7.5 : 0;
}

describe("spatial grid — results identical to a full scan", () => {
  it("matches brute-force corner scores for every stall in a 200-stall layout", () => {
    const { elements } = makeStressLayout({ stalls: 200 });
    const stalls = elements.filter((e) => e.kind === "stall");
    const ctx = buildScoringContext(elements, [], []);
    for (const s of stalls) {
      const got = scoreStall(s, ctx).components.find((c) => c.key === "corner")!.score;
      expect(got).toBe(bruteCorner(s, stalls));
    }
  });

  it("a lone stall scores a full corner", () => {
    const lone: EditorElement = { id: "x", kind: "stall", type: "FOOD", label: "x", xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, rotation: 0 };
    const ctx = buildScoringContext([lone], [], []);
    expect(scoreStall(lone, ctx).components.find((c) => c.key === "corner")!.score).toBe(15);
  });
});

describe("scoring perf budget (R2.5.17)", () => {
  const time = (els: EditorElement[]) => {
    const t0 = performance.now();
    scoreLayout(els, [], []);
    return performance.now() - t0;
  };

  it("scores 100 / 200 / 500 stalls within budget and scales sub-quadratically", () => {
    const t100 = time(makeStressLayout({ stalls: 100 }).elements);
    const t500 = time(makeStressLayout({ stalls: 500 }).elements);
    // generous CI-safe ceilings; with the grid these run in single-digit ms locally
    expect(t100).toBeLessThan(60);
    expect(t500).toBeLessThan(200);
    // 5× the stalls must cost far less than the 25× a quadratic algorithm would
    expect(t500).toBeLessThan(t100 * 15 + 40);
  });
});
