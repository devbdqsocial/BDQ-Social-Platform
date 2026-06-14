import type { EditorElement } from "@/lib/map/designer-ops";
import type { Pathway, Zone } from "@/lib/map/layout-v2";
import { pointToPolyline, type Pt } from "@/lib/map/geometry";
import { zoneOf } from "@/lib/map/zones";

/**
 * Stall scoring engine (map-system.md §9.1). Pure + DB-free so it's unit-testable and usable
 * client-side for Sales-view badges. Geometry is in FEET. Score 0–100 = Σ weighted components;
 * **the weights are spec constants — changing them is a spec change.**
 */

export const SCORE_WEIGHTS = {
  entrance: 25,
  anchor: 20,
  frontage: 20,
  corner: 15,
  visibility: 10,
  zone: 10,
} as const;

export type ComponentKey = keyof typeof SCORE_WEIGHTS;

export type ScoreTier = "PREMIUM" | "STRONG" | "STANDARD" | "VALUE";

export interface ScoreComponent {
  key: ComponentKey;
  score: number; // 0..weight
  max: number; // the weight
  note: string; // human bullet for describeStall / inspector
}

export interface StallScore {
  total: number; // 0..100, rounded
  tier: ScoreTier;
  components: ScoreComponent[];
}

// ── geometry helpers ────────────────────────────────────────────────────────

interface Rect { xFt: number; yFt: number; widthFt: number; heightFt: number }
const centerOf = (r: Rect): Pt => [r.xFt + r.widthFt / 2, r.yFt + r.heightFt / 2];

/** Distance from a point to a rectangle (0 if inside), in feet. */
function pointToRect([px, py]: Pt, r: Rect): number {
  const dx = Math.max(r.xFt - px, 0, px - (r.xFt + r.widthFt));
  const dy = Math.max(r.yFt - py, 0, py - (r.yFt + r.heightFt));
  return Math.hypot(dx, dy);
}

/** Axis-aligned rectangle overlap (touching counts as overlap). */
function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.xFt <= b.xFt + b.widthFt && a.xFt + a.widthFt >= b.xFt && a.yFt <= b.yFt + b.heightFt && a.yFt + a.heightFt >= b.yFt;
}

/** Linear falloff: 1 at/under `full` ft, 0 at/over `zero` ft. */
function falloff(dist: number, full: number, zero: number): number {
  if (dist <= full) return 1;
  if (dist >= zero) return 0;
  return (zero - dist) / (zero - full);
}

const round = (n: number): number => Math.round(n);
const tierOf = (total: number): ScoreTier => (total >= 80 ? "PREMIUM" : total >= 60 ? "STRONG" : total >= 40 ? "STANDARD" : "VALUE");

// ── spatial index (R2.5.17 perf) ─────────────────────────────────────────────
// A uniform grid over stalls so the corner/visibility neighbour checks query only
// nearby cells instead of scanning every stall — turns the old O(n²) into ~O(n).
// Correctness is size-independent: a stall is inserted into EVERY cell its bbox
// overlaps, and `near()` returns the union of stalls in all cells overlapping the
// (padded) query rect, so it is always a superset; the precise rectsOverlap test
// downstream is unchanged → identical results.
const GRID_CELL_FT = 32;

class SpatialGrid {
  private buckets = new Map<string, EditorElement[]>();
  constructor(stalls: EditorElement[], private cell = GRID_CELL_FT) {
    for (const s of stalls) this.forCells(s, 0, (k) => {
      const arr = this.buckets.get(k);
      if (arr) arr.push(s); else this.buckets.set(k, [s]);
    });
  }
  private forCells(r: Rect, pad: number, fn: (key: string) => void) {
    const c0 = Math.floor((r.xFt - pad) / this.cell), c1 = Math.floor((r.xFt + r.widthFt + pad) / this.cell);
    const r0 = Math.floor((r.yFt - pad) / this.cell), r1 = Math.floor((r.yFt + r.heightFt + pad) / this.cell);
    for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) fn(`${cx},${cy}`);
  }
  /** Stalls whose cells overlap `rect` expanded by `pad` ft (a superset of true neighbours). */
  near(rect: Rect, pad = 0): EditorElement[] {
    const seen = new Set<string>(); const out: EditorElement[] = [];
    this.forCells(rect, pad, (k) => {
      const arr = this.buckets.get(k); if (!arr) return;
      for (const s of arr) if (!seen.has(s.id)) { seen.add(s.id); out.push(s); }
    });
    return out;
  }
}

// ── scoring context (precomputed once for a whole layout) ────────────────────

export interface ScoringContext {
  stalls: EditorElement[];
  gates: EditorElement[]; // infra ENTRY
  anchors: { label: string; rect: Rect }[]; // STAGE / ACTIVITY_ZONE infra + food-zone centroids
  zones: Zone[];
  pathways: Pathway[];
  /** zoneId → tertile rank: 2 = top third by avg price, 1 = middle, 0 = bottom. */
  zoneRank: Map<string, 0 | 1 | 2>;
  /** stallId → its (first-match, draw-order) zone id — precomputed once (R2.5.17). */
  zoneIdByStall: Map<string, string>;
  /** spatial index over stalls for O(1)-avg neighbour queries (R2.5.17). */
  grid: SpatialGrid;
}

const FOOD_ZONE = /food|f&b|dining|eat/i;

/** Build the shared context: classify infra, rank zones by average sellable price. */
export function buildScoringContext(elements: EditorElement[], zones: Zone[], pathways: Pathway[]): ScoringContext {
  const stalls = elements.filter((e) => e.kind === "stall");
  const infra = elements.filter((e) => e.kind === "infra");
  const gates = infra.filter((e) => e.type === "ENTRY");

  const anchors: { label: string; rect: Rect }[] = infra
    .filter((e) => e.type === "STAGE" || e.type === "ACTIVITY_ZONE")
    .map((e) => ({ label: e.label || (e.type === "STAGE" ? "Stage" : "Activity zone"), rect: e }));
  for (const z of zones) {
    if (z.points.length >= 3 && FOOD_ZONE.test(z.name)) {
      const cx = z.points.reduce((s, p) => s + p[0], 0) / z.points.length;
      const cy = z.points.reduce((s, p) => s + p[1], 0) / z.points.length;
      anchors.push({ label: z.name, rect: { xFt: cx, yFt: cy, widthFt: 0, heightFt: 0 } });
    }
  }

  // zone tertile ranking by average sellable price
  const avg = new Map<string, number>();
  for (const z of zones) {
    const inZone = stalls.filter((s) => s.status !== "BLOCKED" && zoneOf(s, [z]) !== null);
    const priced = inZone.filter((s) => s.priceInPaise != null);
    avg.set(z.id, priced.length ? priced.reduce((s, e) => s + (e.priceInPaise ?? 0), 0) / priced.length : 0);
  }
  const ordered = [...avg.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const zoneRank = new Map<string, 0 | 1 | 2>();
  const third = Math.ceil(ordered.length / 3);
  ordered.forEach(([id], i) => zoneRank.set(id, i < third ? 2 : i < third * 2 ? 1 : 0));

  // precompute each stall's (first-match) zone once, so scoreZone is an O(1) lookup
  const zoneIdByStall = new Map<string, string>();
  for (const s of stalls) { const z = zoneOf(s, zones); if (z) zoneIdByStall.set(s.id, z.id); }

  return { stalls, gates, anchors, zones, pathways, zoneRank, zoneIdByStall, grid: new SpatialGrid(stalls) };
}

// ── component scorers ────────────────────────────────────────────────────────

function scoreEntrance(stall: EditorElement, ctx: ScoringContext): ScoreComponent {
  const max = SCORE_WEIGHTS.entrance;
  const c = centerOf(stall);
  let best = Infinity, gate: EditorElement | null = null;
  for (const g of ctx.gates) {
    const d = pointToRect(c, g);
    if (d < best) { best = d; gate = g; }
  }
  const f = gate ? falloff(best, 50, 300) : 0;
  const note = gate ? `${round(best)} ft from ${gate.label || "the entrance"}` : "No entrance set";
  return { key: "entrance", score: max * f, max, note };
}

function scoreAnchor(stall: EditorElement, ctx: ScoringContext): ScoreComponent {
  const max = SCORE_WEIGHTS.anchor;
  const c = centerOf(stall);
  let best = Infinity, label = "";
  for (const a of ctx.anchors) {
    const d = pointToRect(c, a.rect);
    if (d < best) { best = d; label = a.label; }
  }
  const f = ctx.anchors.length ? falloff(best, 75, 250) : 0;
  return { key: "anchor", score: max * f, max, note: f > 0 ? `Near the ${label}` : "Away from anchors" };
}

function scoreFrontage(stall: EditorElement, ctx: ScoringContext): ScoreComponent {
  const max = SCORE_WEIGHTS.frontage;
  const c = centerOf(stall);
  const reach = Math.min(stall.widthFt, stall.heightFt) / 2 + 4; // stall edge within 4 ft of the strip edge
  let mainOn = false, secondaryOn = false;
  for (const p of ctx.pathways) {
    if (p.points.length < 2) continue;
    const edgeDist = pointToPolyline(c, p.points as Pt[]) - p.widthFt / 2 - reach;
    if (edgeDist <= 0) {
      if (p.type === "MAIN") mainOn = true;
      else if (p.type === "SECONDARY") secondaryOn = true;
    }
  }
  const f = mainOn ? 1 : secondaryOn ? 0.6 : 0;
  return { key: "frontage", score: max * f, max, note: mainOn ? "On a main aisle" : secondaryOn ? "On a side aisle" : "Off the aisles" };
}

function scoreCorner(stall: EditorElement, ctx: ScoringContext): ScoreComponent {
  const max = SCORE_WEIGHTS.corner;
  const G = 4; // gap that counts as "a neighbor"
  // only stalls within G ft of this stall's bbox can touch any of its 4 bands (R2.5.17 grid)
  const others = ctx.grid.near(stall, G).filter((s) => s.id !== stall.id);
  const sides: Rect[] = [
    { xFt: stall.xFt - G, yFt: stall.yFt, widthFt: G, heightFt: stall.heightFt }, // left
    { xFt: stall.xFt + stall.widthFt, yFt: stall.yFt, widthFt: G, heightFt: stall.heightFt }, // right
    { xFt: stall.xFt, yFt: stall.yFt - G, widthFt: stall.widthFt, heightFt: G }, // top
    { xFt: stall.xFt, yFt: stall.yFt + stall.heightFt, widthFt: stall.widthFt, heightFt: G }, // bottom
  ];
  const exposed = sides.filter((band) => !others.some((o) => rectsOverlap(band, o))).length;
  const f = exposed >= 2 ? 1 : exposed === 1 ? 0.5 : 0;
  return { key: "corner", score: max * f, max, note: exposed >= 2 ? "Corner stall" : exposed === 1 ? "End-of-row stall" : "Interior stall" };
}

function scoreVisibility(stall: EditorElement, ctx: ScoringContext): ScoreComponent {
  const max = SCORE_WEIGHTS.visibility;
  // "front" = the side facing the nearest entrance (shopper approach); fallback bottom.
  const c = centerOf(stall);
  let dir: Pt = [0, 1];
  let best = Infinity;
  for (const g of [...ctx.gates, ...ctx.anchors.map((a) => ({ ...a.rect } as Rect))]) {
    const d = pointToRect(c, g);
    if (d < best) { best = d; const gc = centerOf(g); dir = [gc[0] - c[0], gc[1] - c[1]]; }
  }
  const horizontal = Math.abs(dir[0]) >= Math.abs(dir[1]);
  const D = 15;
  const front: Rect = horizontal
    ? dir[0] >= 0
      ? { xFt: stall.xFt + stall.widthFt, yFt: stall.yFt, widthFt: D, heightFt: stall.heightFt }
      : { xFt: stall.xFt - D, yFt: stall.yFt, widthFt: D, heightFt: stall.heightFt }
    : dir[1] >= 0
      ? { xFt: stall.xFt, yFt: stall.yFt + stall.heightFt, widthFt: stall.widthFt, heightFt: D }
      : { xFt: stall.xFt, yFt: stall.yFt - D, widthFt: stall.widthFt, heightFt: D };
  // only stalls overlapping the front band can block it (R2.5.17 grid)
  const clear = !ctx.grid.near(front).some((s) => s.id !== stall.id && rectsOverlap(front, s));
  return { key: "visibility", score: clear ? max : 0, max, note: clear ? "Open frontage" : "Faces other stalls" };
}

function scoreZone(stall: EditorElement, ctx: ScoringContext): ScoreComponent {
  const max = SCORE_WEIGHTS.zone;
  const zoneId = ctx.zoneIdByStall.get(stall.id) ?? null;
  const rank = zoneId ? ctx.zoneRank.get(zoneId) ?? 0 : 0;
  const f = rank === 2 ? 1 : rank === 1 ? 0.5 : 0;
  return { key: "zone", score: max * f, max, note: rank === 2 ? "Premium zone" : rank === 1 ? "Mid-tier zone" : zoneId ? "Value zone" : "Outside a zone" };
}

// ── public API ────────────────────────────────────────────────────────────────

/** Score one stall against a prebuilt context. */
export function scoreStall(stall: EditorElement, ctx: ScoringContext): StallScore {
  const components = [
    scoreEntrance(stall, ctx),
    scoreAnchor(stall, ctx),
    scoreFrontage(stall, ctx),
    scoreCorner(stall, ctx),
    scoreVisibility(stall, ctx),
    scoreZone(stall, ctx),
  ];
  const total = round(components.reduce((s, c) => s + c.score, 0));
  return { total, tier: tierOf(total), components };
}

/** Score every sellable stall in a layout. Infra is skipped. Returns a map by element id. */
export function scoreLayout(elements: EditorElement[], zones: Zone[], pathways: Pathway[]): Map<string, StallScore> {
  const ctx = buildScoringContext(elements, zones, pathways);
  const out = new Map<string, StallScore>();
  for (const s of ctx.stalls) out.set(s.id, scoreStall(s, ctx));
  return out;
}

/** Up to 3 "why this stall" bullets, ordered by component strength (map-system §9.1/§11). */
export function describeStall(score: StallScore): string[] {
  return score.components
    .filter((c) => c.score / c.max >= 0.5)
    .sort((a, b) => b.score / b.max - a.score / a.max)
    .slice(0, 3)
    .map((c) => c.note);
}

/** Nearest ₹50 in paise (map-system §9.2). */
export const round50 = (paise: number): number => Math.round(paise / 5000) * 5000;

/**
 * Suggested price for a stall (map-system §9.2): a 100-score stall suggests +25% over its type
 * base, a 0-score −25%, linear through the base at score 50. **Never auto-applied** — admin
 * accepts via [Apply]; the locked rule holds (admin enters/accepts every price).
 */
export function suggestPaise(basePaise: number, score: number): number {
  return round50(basePaise * (1 + 0.5 * (score - 50) / 100));
}

/** Tailwind/Konva tier colours for Sales-view badges (map-system §9.1). */
export const TIER_HEX: Record<ScoreTier, string> = {
  PREMIUM: "#868EFF",
  STRONG: "#3FA66A",
  STANDARD: "#6B7280",
  VALUE: "#9CA3AF",
};
