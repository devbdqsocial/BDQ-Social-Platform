# Venue Map Architecture (R5.5)

Companion to [venue-map-audit.md](venue-map-audit.md). Describes the consolidated architecture after
R5.5: **one canonical venue model, one venue document, multiple lenses.** Additive only — no drops,
rollback preserved.

## 1. Old architecture (fragmented)

- Two reusable-venue models: **`EventMap`** (library) and **`LayoutTemplate`** (per-event "save as
  template / apply").
- The `LayoutV2` document stored in three columns (`EventMap`, `MapLayout`, `LayoutTemplate`).
- Two render entries: designer rendered `LayoutV2`; booking/customer/vendor re-derived a separate
  `RenderLayout` from materialized `Stall` rows.
- `MapElement` global palette; `Event.mapId` a loose string (no FK).

## 2. New architecture (consolidated)

```
                         VenueMap  (= EventMap, the canonical model)
                              │  layoutJson : LayoutV2  (the ONE venue document)
                              │
        ┌──────────┬──────────┼──────────┬───────────────┐
   Admin lens  Vendor lens  Customer lens  Operations lens         ← applyLens(LayoutV2, lens)
        └──────────┴──────────┴──────────┴───────────────┘
                              │
        Shared rendering · geometry · measurement · scaling · coordinate system   (lib/map/*)
```

- **Canonical model:** `EventMap` is **designated `VenueMap`** (no parallel table). The one import
  surface is `src/server/venue/service.ts` (`VenueMap` type, `listVenueMaps/getVenueMap/
  createVenueMap/saveVenueLayout/attachVenueToEvent`, and `loadVenueLayout` — the one read entry that
  always returns a fully-defaulted `LayoutV2`).
- **Canonical document:** `LayoutV2` (`lib/map/layout-v2.ts`) via `upgradeLayout` — unchanged.
- **One render entry:** `layoutToRenderLayout(LayoutV2)` (`lib/map/normalize.ts`) projects the venue
  document to the renderer's `RenderLayout`. `stallsToRenderLayout` stays as the DB-`Stall`
  fast-path (live booking status). Both produce the same `RenderLayout` shape.
- **Lenses:** `VenueLens = admin | vendor | customer | operations` with `applyLens(LayoutV2, lens)`
  (`lib/map/lens.ts`) — a pure projection that hides layers a lens doesn't need; the venue is never
  changed. Admin returns the layout unchanged.
- **Provenance:** `EventMap.legacyTemplateId` records a folded-in `LayoutTemplate`.

## 3. Migration strategy (additive, reversible)

| Phase | Change | Reversible? |
| --- | --- | --- |
| 3 | `ALTER TABLE EventMap ADD COLUMN legacyTemplateId` (+ unique index) | yes (nullable, unused if ignored) |
| 4 | `scripts/venue-backfill.mjs` folds each `LayoutTemplate` → a `VenueMap` (idempotent by `legacyTemplateId`) | yes (delete the generated VenueMaps; templates untouched) |
| — | `LayoutTemplate` + `MapElement` tables/rows **kept** | n/a — nothing dropped |

Applied to **local + prod** (prod-first discipline). Local folded 1 template → VenueMap; prod had 0
templates (no-op). Re-running the backfill is safe (idempotent).

## 4. Data flow (after)

- Build venue: `/admin/venue/maps` → `createVenueMap` → designer edits `LayoutV2` → `saveVenueLayout`.
- Attach to event: `attachVenueToEvent` → `upgradeLayout` → `saveEventMap` (materializes `Stall`s).
- Per-event edit: `/admin/events/[id]/map` → `MapLayout` (`LayoutV2`) → `saveEventMap`.
- Read for any lens: `loadVenueLayout({eventId|venueMapId})` → `LayoutV2` → `applyLens` →
  (`layoutToRenderLayout` for the canvas, or the designer for full edit).
- Booking fast-path (unchanged): `Stall` → `stallsToRenderLayout` → `MapCanvas` (live status).

## 5. Lens system

| Lens | Reveals | Used by |
| --- | --- | --- |
| `admin` | everything (editable) | designer |
| `vendor` | zones, pathways, stalls, infra, labels | vendor stall picker |
| `customer` | zones, pathways, stalls, infra, labels | public map / guide |
| `operations` | + ops, entry flow | ops planning |

The lens controls **visibility only**. Geometry/measurements/scaling are identical across lenses
(`lib/map/*`). `applyLens` is pure and DB-free, so any surface (server or client) can project.

## 6. Future extension points

- **Multi-event / multi-venue:** a `VenueMap` is already event-independent (it's a reusable venue);
  attach the same `VenueMap` to many events. A future nullable `Event.venueMapId` **FK** can harden
  the loose `Event.mapId` (additive).
- **Templates:** folded into `VenueMap`; the library is the single template surface going forward.
- **New lenses** (e.g. "sponsor", "press"): add a `VenueLens` key + `LENS_LAYERS` row.
- **New layers:** add to `LAYER_IDS` + `layoutV2Schema`; `upgradeLayout` back-fills older docs.

## 7. Known limitations (intentional, launch-safe)

- `EventMap` table is **not renamed** to `VenueMap` (the name lives in the typed facade) — renaming a
  live table is churn + risk against the additive mandate. The facade is the canonical name.
- `LayoutTemplate` + `MapElement` remain (legacy). `templates.ts`/`TemplatesBar` still work; they are
  candidates for removal in a **later** package (one deploy after this), not here.
- `Event.mapId` stays a loose string this package (FK is a future additive step).
- Existing consumers were **not** rewired to `layoutToRenderLayout`/`applyLens` (regression-avoidance);
  the canonical helpers are available and adopted incrementally.

## 8. Launch considerations

- Fully additive: migration is `ADD COLUMN`; data migration is idempotent + reversible; no model
  dropped; no UI redesign; no feature change. Rollback = ignore the new column + facade.
- Verified: typecheck, lint (0 errors), `lens` unit (4), gated `backfill` integration (1), full suite
  green. Prod migration applied. Backward compatibility (designer, scoring, heatmap, vendor preview,
  exports, entry flow, customer guide, vendor portal, booking holds) preserved — no consumer changed.
- Success criteria met: one canonical venue model (`VenueMap`/`EventMap`), reduced duplication
  (templates folded; one render entry; formal lenses), all consumers conceptually read one venue,
  no regressions, additive-first, rollback intact.
