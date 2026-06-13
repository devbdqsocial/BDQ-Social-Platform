# map-architecture-report.md — Map Designer Refactor (R2.5.5)

> Strategic architecture refactor of the flagship Map Designer. **No product features added** —
> this leaves the editor able to absorb the next ~10 features without becoming a 2000-line
> monolith. Companion to [map-system.md](map-system.md) §13 and [build-plan.md](build-plan.md)
> R2.5.5.

## Before → After

| | Before | After |
| --- | --- | --- |
| `MapDesigner.tsx` | **826 lines** — state tree, 5 effects, ~25 handlers, geometry, validation wiring, 430-line render, all panels inline | **81 lines** — orchestration only: build the store, share it, compose components |
| State ownership | One component owned 22 `useState` + refs + history | One hook (`useDesignerState`) is the single source of truth |
| Business logic in render | area/occupancy/violations/grid math inline | all in pure libs (`geometry`, `validation`, `zones`) + hook selectors |
| Prop drilling | n/a (everything was local) | none — components read the store via `useDesigner()` |
| Layers | none | Figma-style `LayersPanel` with show/hide/lock + render gating |

## Files created (`src/components/map/designer/`)

| File | Role |
| --- | --- |
| `useDesignerState.ts` | **The single source of truth.** All state (history/selection/tool/viewport/canvas/underlay/collections/layers/measure/UI), derived selectors (`violations`, `pathWarnings`, `gridLines`, `fillFor`, `measureLine`, `layerCounts`), and every action (add/delete/duplicate/align/distribute/draw/save/calibrate). Returns one `DesignerApi` object. The keyboard effect is the only piece kept out (its own hook). |
| `DesignerContext.tsx` | `DesignerProvider` + `useDesigner()`. `DesignerApi = ReturnType<typeof useDesignerState>` — the API type is derived, never hand-maintained. |
| `useDesignerKeyboard.ts` | Effect-only hook: global shortcuts (V/H/M/B/Z/P, undo/redo, copy/paste/dup, delete, arrows, Enter/Esc), reading the store. |
| `DesignerCanvas.tsx` | Pure Konva render surface. Reads the store; renders grid, underlay, elements, zones, pathways, boundary, obstacles, measure, guides, marquee, transformer — each gated by layer visibility/lock. |
| `DesignerControls.tsx` | `DesignerControls` (save bar · ground-plan/calibration · palette toolbar · power toolbar · structure row) + `DesignerStatusBar`. |
| `DesignerSidePanels.tsx` | Right-column editable lists + advisories: violations, zones, pathway warnings, pathways, obstacles. |
| `LayersPanel.tsx` | The new Figma-style layers panel (Phase 5). |

## Files modified

- `src/components/map/MapDesigner.tsx` — reduced to the 81-line orchestrator.
- (No changes to `DesignerToolbar`, `DesignerInspector`, `SummaryPanel`, `BulkGridDialog`,
  `CalibrationModal`, or any `lib/map/*` — they were already separated.)

## State extracted into `useDesignerState`

History (elements + undo/redo) · selection (`selectedIds`/`selected`) · active tool + draft draw
state · viewport (width/scale/zoom/pan via stage) · canvas + underlay (calibration) · editor prefs
(snap/gridFt) · v2 collections (boundary/obstacles/zones/pathways/overrides + passthrough for
terrain/ops/entry-flow/versions) · **layers visibility/lock (new, reactive)** · measure state ·
UI flags (bulk/calibrate/save). Plus all derived selectors and actions.

## Layers Panel (Phase 5)

Nine fixed layers (map-system §1) with friendly labels: Ground plan · Terrain · Zones · Pathways ·
Stalls · Facilities · Operations · Entry flow · Labels. Per-layer **show/hide** (eye) and
**lock/unlock**, live **counts**, and **Show all / Hide all**. Wired through the store:
- **Visibility** gates the canvas render (a hidden layer isn't drawn, and is excluded from the
  PNG "current view").
- **Lock** disables selection/drag for that layer's objects (stalls/facilities/underlay).
Empty layers (terrain/ops/entry-flow) stay listed so future content slots in without UI work.

## Performance notes (Phase 7 — maintainability-first, no premature optimization)

- All cross-effect callbacks are `useCallback`-stabilized; derived values are `useMemo`'d
  (`gridLines`, `violations`, `pathWarnings`, `layerCounts`, `measureLine`, `selected`, `colorById`).
- The keyboard effect re-binds only on the reactive bits its branches read (selection/tool/
  drawing/history), not on every setter.
- Konva listening is disabled on non-interactive layers + locked/hidden element layers, cutting
  hit-testing work.
- Deliberately NOT done (future, when the layout grows): `React.memo` on `DesignerCanvas`,
  windowing/virtualization of >500 elements, throttling guide/validation recompute to 50 ms
  (map-system §13 budget). Flagged as remaining debt, not done speculatively.

## Type safety (Phase 8)

No `any`. `DesignerApi` is `ReturnType<typeof useDesignerState>` (always in sync). `Tool` and
`LayerId` are string-literal unions; layer state is `Record<LayerId, {visible,locked}>`; the
draw tools branch on `isDrawTool`/`isClosed` helpers rather than scattered string checks.

## Future-feature readiness (Phase 4 — designed for, not built)

Each future feature is now a **slice + panel**, never a component rewrite:

| Feature | How it slots in |
| --- | --- |
| Terrain (R2.5.8) | add `terrain` state + setters to the hook; a `TerrainPalette` in controls; render under zones in `DesignerCanvas`; gate by the existing `terrain` layer. |
| Scoring (R2.5.10) | pure `server/map/scoring.ts` (already specced) → a `scores` selector in the hook → a Sales-view toggle reads it; badges render in `DesignerCanvas`. |
| Price suggestions (R2.5.11) | a selector computes suggestions from scores; an "Apply" action calls the audited mutation. |
| Revenue heatmap (R2.5.12) | a derived `heatmapFill(el)` selector; `DesignerCanvas` swaps `fillFor`. |
| Versions (R2.5.13) | `versions` state already round-trips; add save/restore actions + a `VersionsPanel`. |
| Exports (R2.5.15) | an `exportVariants` action on the hook; an export dialog. |
| Entry flow (R2.5.16) | mirrors obstacles: a collection slice + palette + render + the `entryflow` layer. |
| Future (AI gen / collaboration / simulation) | all consume the same store; AI sets collections, collaboration syncs the store, simulation reads it read-only. |

## Verification (Phase 9)

`npm run typecheck` ✓ · `npm run lint` 0 errors / 10 warnings (baseline) ✓ · `npm run test:run`
51 files / 218 tests ✓ (no test touched — pure structural move) · `npm run build` 82 pages ✓ ·
dev smoke both designer pages (event + venue) → 200, no context/hydration/runtime errors. Behavior
preserved: grid, zoom/pan, placement, drag+snap, single/multi-select, marquee, measure, boundary/
zone/pathway draw, obstacles, calibration, undo/redo, keyboard shortcuts, save/round-trip.

## Remaining technical debt

1. **Konva render perf at scale** — `DesignerCanvas` re-renders on any store change; fine at
   current sizes, but add `React.memo` + element windowing before 500+ stalls (map-system §13).
2. **Underlay layer-lock vs position-lock** — two lock concepts coexist (`bgImage.locked` for
   drag, `layers.underlay.locked` for the panel); both are honored, but worth unifying later.
3. **Boundary/obstacles outside element-undo** — structural edits aren't on the `useHistory`
   stack (carried over from R2.5.3); fold them in when versioning lands (R2.5.13).
4. **`passthrough` is a ref** — terrain/ops/entry-flow round-trip but aren't reactive until their
   packages give them editors + state (intentional, documented).

## Recommended next steps

1. R2.5.8 Terrain (smallest, proves the "slice + panel" pattern end to end).
2. R2.5.10–12 Scoring → price suggestions → revenue heatmap (the sales-value cluster).
3. Address debt #1 (memo + windowing) once a real 100-stall layout exists to profile against.
