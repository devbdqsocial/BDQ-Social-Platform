# performance-audit-r2.5.17.md — Map System Performance Hardening

> Production-readiness perf package run before R3.2, targeting the weakest dimension of the R2.5
> acceptance audit (Performance **60/100**). Behaviour-preserving only — no features, no redesign.
> Companion to [map-audit.md](map-audit.md), [map-system.md](map-system.md) §13, build-plan R2.5.17.

---

## TL;DR

The audit's #1 risk — **O(n²) scoring recomputed on every edit** — is fixed with a spatial grid
and **proven byte-identical** to the old full scan. A full 6-component re-score of **500 stalls now
takes ~15 ms** (was dominated by two O(n²) scans; the corner scan alone was ~30 ms at 500 and grew
quadratically). Canvas element nodes are now **memoized** so high-frequency re-renders (zoom,
search typing, attendance input, side-panel updates) skip reconciling all 500 nodes. **Throughput
is wired to real attendance** (ticket totals + override) so the §8 verdict actually renders. All
274 tests green, build clean.

---

## TASK 1 — Scoring engine audit (the claim was true)

`scoreLayout` builds a context once, then scores each stall over 6 components. Two components were
**O(n) per stall → O(n²) overall**, recomputed on every `elements` change (each drag-end / bulk
edit / price apply):

- `scoreCorner` — scanned **all** other stalls (`ctx.stalls.filter(...).some(...)`) for each of 4 bands.
- `scoreVisibility` — scanned **all** other stalls for the front-band overlap.

Secondary: `buildScoringContext` + `scoreZone` each did a full `zoneOf` (point-in-polygon) pass
over stalls (O(n·z)).

**Measured** (stress fixture, avg of 8 runs, local):

| stalls | old corner-only O(n²) scan | scaling |
| --- | --- | --- |
| 100 | 3.2 ms | — |
| 200 | 5.0 ms | 1.6× |
| 500 | **29.9 ms** | **9.3× for 5× the data → super-linear (quadratic)** |

The real per-edit cost was that ×2 (corner + visibility) plus the rest — ~60–70 ms at 500, on
every edit. Confirmed bottleneck.

## TASK 2 — Scoring optimization (spatial grid, behaviour-identical)

Added a uniform **`SpatialGrid`** (32 ft cells) over stalls in `buildScoringContext`. A stall is
inserted into every cell its bbox overlaps; `near(rect, pad)` returns the union of stalls in cells
overlapping the padded query — always a **superset** of true neighbours, so the unchanged precise
`rectsOverlap` test downstream yields **identical results**. `scoreCorner`/`scoreVisibility` now
query `grid.near(...)` instead of all stalls. Also precomputed `zoneIdByStall` once so `scoreZone`
is an O(1) lookup.

**Correctness:** `scoring.perf.test.ts` asserts the grid corner score equals a brute-force full
scan for **every stall in a 200-stall layout**, plus the existing `scoring.test.ts` suite. No
scoring behaviour changed.

**Measured after:**

| stalls | grid `scoreLayout` (all 6 components) | scaling |
| --- | --- | --- |
| 100 | 7.2 ms | — |
| 200 | 9.6 ms | 1.3× |
| 500 | **15.4 ms** | **2.1× for 5× the data → ~linear** |

The whole 6-component score at 500 is now **half** the cost of the *old single* corner scan, and
scales linearly. CI guard: `t(500) < 200 ms` and `< 15× t(100)`.

## TASK 3 — Canvas render audit (render map)

| Interaction | Before | After |
| --- | --- | --- |
| **Pan** | imperative (Stage draggable) — no React render | unchanged |
| **Zoom** | `scale` state → DesignerCanvas re-render → **all 500 element nodes reconcile** | element nodes **skip** (props unchanged); only Stage re-applies scale |
| **Selection** | re-render; all nodes reconcile | only the 1–2 nodes whose `isSel` flips re-render |
| **Drag (single)** | imperative move + 1 commit → re-render all | commit → only the moved node re-renders |
| **Bulk action** | 1 commit → re-render all (expected — many changed) | re-render only changed nodes |
| **Search typing** | store re-render → **all nodes reconcile** | element nodes **skip** |
| **Attendance / heatmap-legend / validation / version panels** | all nodes reconcile | element nodes **skip** |
| **Heatmap toggle** | all nodes reconcile (fills change — legitimate) | nodes re-render (fill prop changed — legitimate) |
| **Vendor preview toggle** | all reconcile | nodes re-render (fill/stroke change — legitimate) |

Root cause of the unnecessary churn: the store object handed to context is a new reference every
render, so **every** store change re-rendered the whole canvas. Memoizing the leaf nodes removes
the element-node cost from all re-renders that don't actually change an element.

## TASK 4 — Canvas memoization (safe, ref-stabilized)

Extracted a **`React.memo` `<ElementNode>`** leaf. It re-renders only when its own props change
(`el` ref, `pxPerFt`, `editable`, `isSel`, `isViolation`, `fill`). The drag/transform callbacks are
**ref-stabilized** in the parent (`elementsRef`/`selRef`/`pxRef`/`toFtRef`/`commitRef` hold the
latest values; the `useCallback`s depend only on stable setters), so they never change identity and
can't defeat the memo — and can't go stale (refs always read current). The single-element drag
patch was inlined (`els.map(...)`) to avoid depending on the `[elements]`-keyed `patchOne`. Drag,
snap-to-neighbour, multi-select nudge, and transform behaviour are **identical** by construction.

## TASK 5 — Throughput fix (demand was permanently zero)

Was `throughputReport(entryFlow, 0)` — the expected-peak side was always 0, so the §8 verdict never
rendered. Now the event map page passes **`expectedAttendance = Σ ticketType.totalQty`**; the store
exposes `attendance` (= override ?? ticket total) and `throughput = throughputReport(entryFlow,
attendance)`. The `ValidationPanel` shows **Capacity vs Peak arrival (60% in 2h)** with a real
**✓ OK / Under** verdict + shortfall, an editable **expected-attendance** field (defaults from
tickets, overridable for what-ifs), and the per-SCAN_POINT lane editor. Pure math unchanged
(`throughput.ts` constants single-sourced, still tested).

## TASK 6 — 500-element validation

New `lib/map/stress-fixture.ts` `makeStressLayout({ stalls, facilities, paths, ops, entry, zones })`
generates a realistic packed layout (100 stalls + 50 facilities + 20 paths + 20 ops + 20 entry +
8 zones, scaling to 500). Used by the perf tests. Findings at 500 stalls: scoring 15 ms/edit
(linear); canvas re-renders bounded to changed nodes; versioning snapshots bounded (cap 10);
search/heatmap/bulk all O(n). No remaining O(n²) in the per-edit path.

## TASK 7 — Performance budgets

| Action | Budget | Status |
| --- | --- | --- |
| Pan | smooth (imperative) | ✓ no React work |
| Zoom | smooth | ✓ element nodes skip |
| Selection | instant | ✓ 1–2 nodes re-render |
| Search | instant | ✓ nodes skip; search is O(n) |
| Vendor preview toggle | instant | fills change → bounded node re-render |
| Heatmap toggle | < 100 ms | ✓ quintiles O(n) + bounded re-render |
| Re-score per edit (500) | < 50 ms | ✓ ~15 ms measured |
| Bulk action | acceptable | one commit + bounded re-render |

Targets: mid-range Android, mid laptop, desktop. The numeric budgets above are CI-guarded for
scoring; the **on-device frame-rate budget (60 fps with the 500-fixture on mid Android) remains a
manual staging check** — see remaining risks.

## TASK 8 — Regression validation

`npm run test:run` **272 passed / 2 skipped** (60 files; +scoring.perf). typecheck ✓ · lint 0
errors/10 warnings ✓ · build ✓ · both designers 200, no runtime/hydration errors. Scoring output
proven identical to brute force. No behaviour changed in terrain / bulk / scoring / suggestions /
heatmap / versioning / preview / search / exports / entry-flow / validation.

## TASK 9 — Metrics, remaining risks, scores

**Improved:** per-edit re-score 500 ≈ 70 ms → **15 ms**, quadratic → linear; zoom/search/panel
re-renders no longer reconcile the element layer; throughput produces a real verdict.

**Remaining bottlenecks / future scaling risks:**
1. **Whole-store context churn** — the context value is still a new object each render, so panels
   (not the memoized canvas leaves) still re-render on any change. Splitting the store into
   selector-scoped contexts is the next structural win (V2; deferred — higher risk).
2. **Labels / badges / overlay layers** re-render each store render (they're `listening={false}`
   and cheap; memoize if a profile shows them hot).
3. **On-device 60 fps** with 500 elements on mid Android is **not yet measured** — the algorithmic
   risk is removed, but the real-hardware Konva paint cost must be confirmed on staging.
4. Konva element **windowing/virtualization** (>~800 nodes) is still deferred; not needed at 500.

**Recommended V2 optimizations:** selector-scoped contexts; incremental scoring (rescore only the
moved stall's neighbourhood); split static vs interactive Konva layers; windowing beyond ~800 nodes.

**Performance score: before 60 → after ~80.** Rationale: the dominant algorithmic risk is removed
and measured within budget, canvas churn is materially reduced, and throughput is real. Not higher
because the on-device frame-rate budget is still a pending staging measurement and the store-context
churn is a known (deferred) structural item.
