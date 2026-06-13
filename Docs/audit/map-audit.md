# map-audit.md — R2.5 Map System Final Acceptance Audit (GO / NO-GO)

> Brutally honest go/no-go for leaving Phase R2.5. Grounded in the actual code (commit `a3bee3a`),
> not the feature list. Personas: Product Architect · Event-Ops Consultant · Staff FE · Perf
> Engineer · UX Researcher · Venue Planner · Vendor-Experience Designer · QA Lead. **No features
> built, no refactors — validation only.** Companion to [map-system.md](map-system.md),
> [map-architecture-report.md](map-architecture-report.md), [build-plan.md](build-plan.md) R2.5.

---

## TL;DR

The **admin designer is genuinely feature-complete and unusually well-tested for an MVP** (25+
pure-lib test files, 271 tests). The architecture (post-R2.5.5 refactor) is clean and will absorb
more features. But three things are honestly half-true relative to the spec, and one is unproven:

1. **Perf at 500 elements is UNPROVEN and architecturally at risk** — scoring is O(stalls²)
   recomputed on every edit, and `DesignerCanvas` re-renders on any store change with no
   memoization or windowing. Fine at Aarush's 105 elements; likely to jank at 500.
2. **Throughput capacity-vs-demand is not wired** — `throughputReport(entryFlow, 0)`: the ticket
   total is hard-coded `0`, so the "expected peak arrival" half of §8 is dead. Capacity shows;
   the verdict ("✓ / under") is meaningless.
3. **There is no vendor-facing map surface yet** — `describeStall` (the "why this stall"
   generator) exists and is tested, but the only place it could render (the vendor portal map,
   §11) is R3.5/R4. The designer's "Vendor Preview" is a canvas lens, not the stall sheet.
4. Several "complete" items are **flagged simplifications** (ops-mode→palette, per-apply
   audit→single Save, ⌘K entries deferred, PDF variants follow current view not an enforced
   layer set, entry objects not selectable).

**Verdict: YES, R2.5 may close and R3 may begin** — because the admin flagship is done and the
remaining gaps are either owner/staging actions (the 500-element device test, the staging
calibration) or genuinely live in R3/R4 (the vendor map). But none of the launch-blocking items
below may be skipped before go-live.

---

## PHASE 1 — Real-world venue audit (Aarush Lawn)

Seed: `AARUSH_LAWN_CANVAS = 230 × 160 ft = 36,800 sq ft (~0.84 acre)`; template = **105 elements
(94 stalls + 11 infra)** (locked by `designer-ops.test`). Calibration (R2.5.2) makes the canvas
grid true real-world feet once two points + a known distance are entered, so a 10×10 stall is
exactly 100 sq ft of ground.

| Dimension | State | Honest concern |
| --- | --- | --- |
| Venue size / scale | ✅ Calibrated underlay → true ft | Single flat-plane underlay only; no multi-level, no Mapbox (V1.5, known) |
| Boundary accuracy | ✅ Pen tool + out-of-bounds validation | Boundary edits aren't on the undo stack (debt #3) |
| Stall placement | ✅ Snap, align, distribute, bulk | rotation ignored in all area/overlap math (bounding-box only) |
| Path widths | ✅ Type presets + min-width warnings (§7) | static check only; no crowd-flow sim (V1.5, known) |
| Entry / exit placement | ⚠ Objects exist; exit-reachability is "lite" | "blocked exit" = a stall within 10 ft & off-path; no real egress modelling |
| Parking / food / sponsor / ops areas | ⚠ Expressible as zones + ops objects | No first-class "parking" or "sponsor" concept — they're generic zones; no capacity math |

**Would a real organizer trust this layout?** For *planning and selling* — yes, the scale is real
and the validation catches gross errors. For *event-day ops* — not yet (see Phase 6).
**A vendor?** Can't — there's no vendor-facing view (Phase 5). **An ops team?** Partially — they
can place gates/medical/power, but throughput's demand side is dead and there's no run-of-show.

Assumptions baked in: flat ground, axis-aligned footprints for math, one venue plane, "food zone"
detected by zone *name* matching `/food|f&b|dining|eat/i` (a stringly-typed heuristic, not a flag).

---

## PHASE 2 — 100-stall scenario

100 stalls + 2 food courts + workshop + lounge + VIP + sponsor zone + parking + ops + exits is
**well within the seed's proven envelope** (105 elements already ship). At this size:

- **Occupancy / revenue** — `SummaryPanel` gives used-area %, Σ potential, per-zone potential;
  the heatmap (price/score quintiles) reads instantly. Solid.
- **Visibility / walkability** — scoring's frontage/corner/visibility components surface the good
  and bad stalls; pathway min-width + blocked-stall warnings catch aisle problems. Solid.
- **Crowd flow** — only static path checks; no density/bottleneck simulation. Acceptable for V1.
- **Vendor experience** — see Phase 5; the *data* (score, why-this-stall, suggested price) is all
  computed, but nothing vendor-facing renders it.

**Problems:** "food court" / "VIP" / "sponsor" are not modelled types — they're zones whose
premium-ness is inferred from price tertiles, and the food-anchor bonus depends on someone naming
a zone "Food". A mis-named zone silently loses the anchor score. **Opportunities:** promote
parking/sponsor/food to first-class zone *kinds* with their own rules (V2).

---

## PHASE 3 — 500-element stress review (architecture)

This is the **weakest area** and it is structural, not cosmetic.

**The two real risks (verified in code):**

1. **Scoring is O(n²), recomputed on every elements change.** `scores = useMemo(scoreLayout(...),
   [elements, zones, pathways])`. `scoreLayout` scores every stall, and `scoreCorner` /
   `scoreVisibility` each scan *all other stalls* → ~n² per recompute. At n=500 that's ~250k
   stall-pair tests **on every drag, nudge, bulk edit, or price change**. At 105 it's ~11k —
   invisible. At 500 it will stutter, and bulk ops (which call `commit` once with all elements)
   trigger a full rescore.
2. **`DesignerCanvas` re-renders on any store change** — no `React.memo`, no element windowing /
   virtualization (documented debt #1 in the architecture report). Konva redraws all 500 rects +
   labels + badges each time. `listening` is disabled on locked/hidden layers (good), but the
   draw cost remains.

**Lower risks:** versioning stores full snapshots in memory (10 × 500 elements ≈ fine);
search/heatmap/bulk are all O(n) and cheap; the heatmap recomputes quintiles per render but only
over priced/scored values (O(n)).

**Mitigation plan (do before the 500-element gate is claimed green):**
- Throttle/debounce the `scores` recompute (e.g. 50 ms, per map-system §13 budget), or make
  scoring incremental (only rescore stalls whose neighbourhood changed).
- Replace the O(n²) corner/visibility scans with a spatial grid/bucket index (neighbours only).
- `React.memo` `DesignerCanvas` + split static vs interactive Konva layers; window elements beyond
  ~300. All four are listed as deferred debt and are the right next perf tasks — **none are done.**

**Conclusion: the 500-element gate cannot be signed off from code inspection — it must be measured
on a mid Android device, and will very likely fail without the scoring throttle + memo above.**

---

## PHASE 4 — Owner walkthrough simulation

| Scenario | Works? | Friction (honest) |
| --- | --- | --- |
| A. Create event from scratch | ✅ | Seed template or blank; calibration is a 3-step modal — good. The toolbar is now **very dense** (one wrapping row of ~22 controls + a structure row + search) — discoverability suffers. |
| B. Sell 100 stalls | ✅ | Bulk grid + bulk price/type/status + suggestions + relabel cover it well. But "sell" stops at the layout; actual selling is the booking flow (R1/R4), not here. |
| C. Generate vendor layout | ⚠ | Preview hides admin clutter and you export a Vendor PDF — but it's the *same canvas image*; there's no interactive vendor view, no stall sheet, no "why this stall". |
| D. Generate sponsor layout | ⚠ | No sponsor concept — you'd colour a zone and export. Functional, not purpose-built. |
| E. Event-day ops layout | ⚠ | Ops objects + ops PDF exist; throughput capacity shows; but no run-of-show, no staffing, and the demand comparison is dead. |

**Cross-cutting UX:** the right column is now a long stack (Layers · Inspector · Heatmap legend ·
Summary · Validation · Versions) — on a laptop that's a lot of scrolling. Entry-object lane editing
lives *only* in the validation panel (entry objects aren't selectable on canvas), which is
non-obvious. No keyboard hint surface for the many shortcuts.

---

## PHASE 5 — Vendor experience audit

**This is the most over-claimed area.** The R2.5.14 "Vendor Preview" is a *designer* toggle that
hides admin layers on the canvas. It is **not** the vendor's booking surface. The spec's §11
vendor stall sheet (label, price, size, why-this-stall bullets, distance chips, Reserve CTA) is
**R3.5/R4 and does not exist.**

- **Would a vendor understand why A-12 costs more than B-18?** The *data* exists (`describeStall`
  → "Corner stall · 40 ft from Main Gate", suggested price from score) and is unit-tested — but
  **no vendor-facing pixel renders it today.** So: no.
- **Confident to buy? Excited?** Unanswerable from R2.5 — there's no vendor screen.

**This is not an R2.5 defect** (the vendor portal is R4), but it means "Vendor Experience" cannot
be scored on shipped surface area — only on the readiness of the generator feeding it (which is
good).

---

## PHASE 6 — Event operations audit

- **Entry/exit/security/medical/power/water** — placeable as ops + entry objects ✅; render +
  drag + layer + PDF ✅.
- **Throughput** — capacity (`Σ scan lanes × 5/min × 60 × 0.8`) is correct and tested; **the
  demand side is hard-coded `0`** (`throughputReport(entryFlow, 0)`), so the headline §8 verdict
  ("capacity ≈ 2,400/h vs peak ≈ 1,500/h ✓") never appears. **Must wire to the event's TicketType
  Σ totalQty before this is real.**
- **Parking / crowd management / emergency planning** — not modelled beyond generic objects + the
  "lite" exit check. No capacity, no flow, no staffing.

**Could it support event-day planning today?** As a *static map* of where things go — yes. As an
*ops planning tool* — no, not until throughput compares to real demand and a run-of-show exists.
**Must exist before launch:** throughput wired to tickets; the ops PDF (now has content ✅).
**Can wait for V2:** crowd sim, staffing, parking capacity, multi-level.

---

## PHASE 7 — Product audit (premium vs prototype)

**Feels premium / world-class:** calibration-to-real-scale; the scoring → suggestion → heatmap
sales loop (genuinely differentiated vs BookMyShow-class tools); versioning with ghost-compare;
true-scale PDF with a 50 ft bar; the clean pure-lib + test discipline under the hood.

**Feels MVP / prototype:** the wall-of-buttons toolbar; entry-object editing hidden in a side
panel; "vendor preview" that's just a lens; throughput that shows half a sentence; food/sponsor/
parking as stringly-typed zones; no perf proof at scale; no onboarding/empty-state guidance for a
first-time organizer.

**Honest:** the *engine* is world-class; the *surface polish and scale-hardening* are MVP.

---

## PHASE 8 — Technical debt audit

**Current architecture:** `useDesignerState` (single source of truth, ~560 lines) → `Designer
Context` → pure render components (Canvas/Controls/SidePanels/Layers/Heatmap/Versions/Validation).
~14 pure libs in `lib/map/*` + `server/map/scoring.ts`, each unit-tested. v2 JSON is the single
load/save path.

**Strengths:** clean slice+panel pattern (adding a feature = a hook slice + a panel, proven 9×
this cluster); exceptional pure-lib test coverage; no `any`; deterministic geometry; v2 round-trip.

**Weaknesses / known limitations:**
1. **O(n²) scoring** recomputed on every edit (Phase 3) — the #1 risk.
2. **No `DesignerCanvas` memo / windowing** (#1 debt) — redraws everything every change.
3. **Throughput demand hard-coded `0`** — half of §8 dead.
4. **Structural edits (boundary/obstacles/zones/pathways/ops/entry) bypass undo** (#3 debt) — only
   `elements` ride `useHistory`; restore-a-version is undoable but a zone delete isn't.
5. **Entry objects aren't selectable** on canvas — lane editing only via the validation panel.
6. **PDF "variants" follow the current view**, not an enforced per-audience layer set — a vendor
   PDF with the ops layer left on leaks ops.
7. **Two lock concepts** coexist (underlay `bgImage.locked` vs `layers.underlay.locked`) (#2 debt).
8. **Stringly-typed semantics** — food anchor by zone-name regex; no parking/sponsor kinds.
9. **No persisted UI prefs** (layer visibility persists in v2; preview/heatmap/sales mode don't).
10. **Deferred/flagged:** ⌘K palette entries, per-apply audit (folded into Save), "ops mode (O)"
    (became a palette), booked-vs-potential zone cards (→ console).

**Performance notes:** budgets in map-system §13 are not yet measured. The throttle + spatial-index
+ memo + windowing quartet is specced but unbuilt. Memory is fine (snapshots bounded at 10).

**Recommended refactors (priority order):** (1) throttle + spatial-index scoring; (2) memo +
window the canvas; (3) wire throughput to TicketType totals; (4) fold structural edits into
history; (5) make entry/ops objects selectable through the element system; (6) enforce PDF layer
sets per variant.

**V2 opportunities:** Mapbox underlay, multi-level, crowd-flow simulation, first-class parking/
sponsor/food kinds, AI auto-layout, real-time collaboration.

---

## PHASE 9 — GO / NO-GO

| Dimension | Score /100 | Basis |
| --- | --- | --- |
| Map System | **82** | Feature-rich, well-tested core; half-wired throughput + unproven scale |
| UX | **76** | Powerful but dense; hidden entry-object editing; no onboarding |
| Performance | **60** | Unproven at 500; O(n²) scoring + no memo/windowing |
| Vendor Experience | **55** | Generator ready; **no vendor surface shipped** (R4) |
| Operations | **68** | Objects + capacity exist; demand dead; no run-of-show |
| Architecture | **88** | Clean slice+panel, strong test discipline, v2 single path |
| **Launch Readiness** | **72** | Admin flagship done; perf + throughput + vendor surface outstanding |

**Can R2.5 be considered complete? → YES** (to close R2.5 and unblock R3).

The admin-facing flagship — the actual deliverable of R2.5 — is complete and well-tested. The
remaining gaps are (a) owner/staging actions the gate already names (500-element device test,
staging calibration, owner walk), or (b) genuinely R3/R4 work (the vendor map surface). Holding
R2.5 open for those would be mis-scoping.

**Non-negotiable follow-ups before LAUNCH (not before R3):**
1. Prove or fix 500-element perf — throttle scoring + memo/window the canvas (**blocking for any
   large venue**).
2. Wire throughput to the event's TicketType Σ totalQty (**blocking for the ops claim**).
3. Ship the vendor map surface (§11) in R4 — render score/why-this-stall/price/Reserve.
4. Enforce PDF layer sets per variant (**vendor PDF must not leak the ops layer**).

**Recommended (not blocking):** fold structural edits into undo; make entry objects selectable;
de-densify the toolbar; promote food/parking/sponsor to first-class kinds; ⌘K entries.

---

## FINAL QUESTION — Would I charge for this as standalone SaaS?

**Yes — but as a mid-tier "pro" tool today, not a top-tier one.** The calibration-to-real-scale
plus the scoring → price-suggestion → revenue-heatmap loop is a real, defensible wedge that most
event-mapping tools don't have, and the versioning/compare + true-scale PDF are genuinely
sellable. The engineering underneath is clean and tested enough to stand behind.

**What it needs before premium pricing:**
1. **Proven performance at real scale** (500+ stalls smooth on a mid laptop/tablet) — today this
   is the single biggest credibility risk.
2. **The vendor-facing experience** — the whole "why this stall costs more" story is computed but
   invisible; that's the part a buyer would demo and the part that justifies the premium.
3. **Throughput that finishes its sentence** — capacity vs real expected demand.
4. **Surface polish** — toolbar density, onboarding/empty states, an export that can't leak the
   wrong layer.

Charge now at "pro"; charge premium once #1–#2 land. The bones deserve the premium tier — the
finish doesn't have it yet.
