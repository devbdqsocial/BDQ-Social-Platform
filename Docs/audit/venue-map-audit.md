# Venue Map Architecture Audit (R5.5 — Phase 1)

Status: **Phase 1 audit only — no code changed.** This documents the current map architecture,
data flows, and duplication, and recommends the additive consolidation path for Phases 2–10.

Headline finding: **a canonical venue model already exists — `EventMap` (built in R2.5).** The
fragmentation is not "no single model"; it is **a second, overlapping reuse model (`LayoutTemplate`)
plus a global palette (`MapElement`) and two render-entry transforms.** The launch-safe move is to
**designate `EventMap` as the canonical `VenueMap`** behind a typed facade and additively fold the
legacy models toward it — not to introduce a third parallel model.

---

## 1. Current models (storage)

| Model | Role | Key fields | Consumers |
| --- | --- | --- | --- |
| **`EventMap`** | **Canonical reusable venue** (R2.5 "library") | `name, description, locationName, unit, widthFt, heightFt, gridFt, layoutJson (LayoutV2), createdById` | `server/map/maps.ts`; `/admin/venue/maps*`, event page + wizard (`listMaps`), `MapAttach` (`attachMapToEvent`) |
| **`MapLayout`** | **Per-event working layout** | `eventId @unique, layoutJson (LayoutV2), opsLayerJson, version` | `server/events/service.ts` (`saveEventMap`, `getEventMap`); `/admin/events/[id]/map`; scoring; guide |
| **`LayoutTemplate`** | **LEGACY parallel reuse** (snapshot event → template → apply) | `name, layoutJson ({canvas, elements, stallTypes}), createdById` | `server/map/templates.ts`; `/admin/events/[id]/map` `TemplatesBar` (`saveAsTemplate`/`applyTemplate`/`listTemplates`) |
| **`MapElement`** | **Global element/palette catalog** (stall + infra sizes) | `name, kind, widthFt, heightFt, color, sellable, sortOrder` | `server/map/elements.ts`; `/admin/venue/elements`, designer palette (`venue/maps/[id]`) |
| **`StallTypeDef`** | **Per-event stall types** (priced) | `eventId, name, widthFt, heightFt, priceInPaise, color, sellable` | designer, templates, stall materialization |
| **`Stall`** | **Per-event materialized bookable stalls** | `eventId, label @unique, kind, stallTypeId, x/y/w/hFt, rotation, priceInPaise, status, holdUntil` | booking, vendor picker, public map, scoring |

`Event.mapId` is a **loose `String?`** (no FK relation) pointing at the attached `EventMap.id`.
`Event.mapLayout` is a real relation to `MapLayout`.

## 2. Canonical document — `LayoutV2`

`src/lib/map/layout-v2.ts` already defines **one layout document** read by every consumer through
**`upgradeLayout(json, opsJson?)`** (accepts v1, v2, or loose; returns a fully-defaulted `LayoutV2`).
All lengths in **feet**. Layers: `underlay, terrain, zones, pathways, stalls, infra, ops, entryflow,
labels`. Sub-collections: `obstacles, terrain, zones, pathways, elements, ops, entryFlow, versions`,
plus `canvas{widthFt,heightFt,gridFt,displayUnit}` and `underlay{url,ftPerPx,offset,rotation,...}`.
2 MB size cap. **This is the de-facto single venue document.** It is stored in **three** models'
`layoutJson` columns: `EventMap`, `MapLayout`, and (as a `{canvas,elements,stallTypes}` payload
variant) `LayoutTemplate`.

## 3. The shared map library (already substantial)

`src/lib/map/` is already a shared, mostly-pure layer — **not** a duplication hotspot:
`geometry.ts`, `calibration.ts`, `zones.ts`, `terrain.ts`, `heatmap.ts`, `throughput.ts`,
`search.ts`, `validation.ts` + `validation-report.ts`, `versions.ts`, `map-export.ts`,
`entry-ops.ts`, `designer-ops.ts`, `designer-actions.ts`, `normalize.ts`, `render-types.ts`,
`layout-v2.ts`. `src/server/map/` holds the DB services: `maps.ts` (EventMap), `templates.ts`
(LayoutTemplate), `elements.ts` (MapElement), `scoring.ts`, `guide.ts`, `stall-types.ts`,
`admin-service.ts`, plus seeds. Geometry/scoring/heatmap/etc. are **already shared** across lenses.

## 4. Render entries (the real transform duplication)

There are **two paths to a renderable layout**, producing **two different shapes**:

1. **Designer/admin path** — `EventMap`/`MapLayout.layoutJson` → `upgradeLayout` → **`LayoutV2`** →
   `DesignerCanvas` / `MapPdf` (full: zones, pathways, terrain, ops, entryflow, underlay).
2. **Booking/public/vendor path** — materialized **`Stall`** rows → **`stallsToRenderLayout`** →
   **`RenderLayout`** (`{version, canvas, elements[]}`, stalls+infra only) → **`MapCanvas`**
   (vendor picker, public map). Zones/pathways/terrain/ops are dropped in this lens.

`RenderLayout` is a strict subset of `LayoutV2`. The booking lens deliberately shows less, but it
reaches the renderer via a **separate transform** (`stallsToRenderLayout`) rather than a lens/filter
over `LayoutV2`. This is the main "duplicated transform/rendering" the consolidation targets.

## 5. Lenses (already de-facto, not yet formalized)

| Lens | Surface | Source today | Shows |
| --- | --- | --- | --- |
| **Admin** | `MapDesigner` / `DesignerCanvas` (`/admin/venue/maps/[id]`, `/admin/events/[id]/map`) | `LayoutV2` (full) | everything, editable |
| **Vendor** | `VendorStallReserve` + `MapCanvas` (`/vendor/events/[id]`) | `Stall` → `RenderLayout` + `scoreLayout`/`describeStall` | stalls + status + "why this stall" + zoom-pulse |
| **Customer** | `EventGuide` + `MapCanvas` (`/map`, guide) | `Stall` → `RenderLayout`; guide from `MapLayout`/event | read-only stalls + facilities/guide |
| **Operations** | designer `ops` layer + `entry-ops`/`throughput` | `LayoutV2.ops[]` / `MapLayout.opsLayerJson` | ops objects, entry flow, throughput |

The venue is conceptually one; the lenses already exist as separate components/transforms.

## 6. Data flows

- **Build venue:** `/admin/venue/maps/new` → `createMap` (`EventMap`) → designer edits `LayoutV2` →
  `saveMapLayout`.
- **Attach to event:** `attachMapToEvent` → `upgradeLayout(EventMap.layoutJson)` → `saveEventMap`
  (writes `MapLayout` + materializes `Stall` rows, drops `stallTypeId` links) → sets `Event.mapId`.
- **Per-event edit:** `/admin/events/[id]/map` → `MapLayout` (`LayoutV2`) → `saveEventMap`
  (re-materializes `Stall`s, preserving booked/held).
- **Template (parallel):** `saveAsTemplate` (`MapLayout` + `StallTypeDef[]` → `LayoutTemplate`
  payload) / `applyTemplate` (→ upsert `StallTypeDef` + `saveEventMap`).
- **Booking/render:** `Stall` → `stallsToRenderLayout` → `RenderLayout` → `MapCanvas`.
- **Scoring:** `scoreLayout(LayoutV2.elements, zones, pathways)` → `describeStall` (vendor sheet).

## 7. Duplication & fragmentation (ranked)

1. **Two reusable-venue models** — `EventMap` (maps.ts) **and** `LayoutTemplate` (templates.ts).
   Both store a reusable layout; both clone onto an event via `saveEventMap`. `LayoutTemplate` also
   carries `stallTypes`; `EventMap` drops the stall-type link on attach. **This is the core
   fragmentation.**
2. **`layoutJson` lives in 3 models** (`EventMap`, `MapLayout`, `LayoutTemplate`) — same `LayoutV2`
   document, three homes, three slightly different payloads.
3. **Two render-entry transforms** (`upgradeLayout`→`LayoutV2` vs `stallsToRenderLayout`→
   `RenderLayout`) — the booking lens re-derives a render shape instead of filtering `LayoutV2`.
4. **Element definitions in 3 places** — `MapElement` (global palette), `StallTypeDef` (per-event,
   priced), and inline `element.type/width/height` inside `LayoutV2.elements`.
5. **`Event.mapId` is a loose string** — no FK to `EventMap`; no referential integrity.

What is **already consolidated** (do not touch): `LayoutV2` as the single document, `upgradeLayout`
as the single normalizer, and the `lib/map/*` geometry/scoring/heatmap/validation utilities.

## 8. Dependencies / blast radius

- `LayoutV2`/`upgradeLayout`: designer, scoring, guide, exports, vendor picker (indirect), ops.
- `EventMap`: `/admin/venue/maps*`, event page, **event wizard (R5.6 Map step)**, `MapAttach`.
- `LayoutTemplate`: only `/admin/events/[id]/map` `TemplatesBar`.
- `MapElement`: only `/admin/venue/elements` + designer palette.
- `Stall`/`stallsToRenderLayout`/`MapCanvas`: vendor picker (R4.1 zoom-pulse), public map, booking.
- `Booking` partial-unique index + holds depend on `Stall` materialization — **must not regress.**

## 9. Recommendation for Phases 2–10 (additive, launch-safe)

**Phase 2 — canonical model.** Designate **`EventMap` as the canonical `VenueMap`** via a typed
facade module `src/server/venue/` (and a `VenueMap` type alias), rather than creating a third model.
Rationale: the model already exists with the right shape; a parallel new table would be redundant
churn + migration risk, against the mandate (*additive-first, launch safety > elegance, don't
over-engineer*). Optionally add an additive nullable `Event.venueMapId` **FK** later to harden the
loose `mapId` — additive, no drop.

**Phase 3–4 — additive migration.** Add nullable provenance columns to `EventMap`
(`legacyTemplateId String?`) — additive. Data-migrate each `LayoutTemplate` → an `EventMap`
(a template IS a reusable venue), preserving name/layout/stallTypes-in-payload and recording
`legacyTemplateId`. **Keep `LayoutTemplate` rows and the table** (no drop). `MapElement` stays as the
single element catalog (it is the palette/toolbox, not a venue duplicate; already singular) — no
migration, no drop.

**Phase 5 — dual-compatibility.** `templates.ts` reads continue to work; new `applyTemplate`/library
paths route through the `venue/` facade. Both `attachMapToEvent` and `applyTemplate` keep working.

**Phase 6 — consolidate render entry.** Add `layoutToRenderLayout(LayoutV2, statuses)` so the
booking lens can render via a **filter over `LayoutV2`** (single source) while `stallsToRenderLayout`
stays for the DB-`Stall` fast path (kept for compatibility). Move any remaining ad-hoc geometry into
`lib/map/geometry.ts`.

**Phase 7 — lenses.** Formalize `admin | vendor | customer | operations` as a `VenueLens` type +
a pure `applyLens(LayoutV2, lens)` filter, documented; wire opt-in where low-risk (no UI redesign).

**Phase 8–9 — backward-compat + verify.** Designer, scoring, heatmap, vendor preview, exports,
entry flow, customer guide, vendor portal, booking holds — all must pass unchanged
(typecheck + unit + gated DB tests + manual smoke).

**Phase 10 — `venue-map-architecture.md`** (old vs new, migration strategy, lens system, extension
points, known limitations, launch considerations).

## 10. Absolute-rules compliance

No UI redesign · no new customer/vendor/admin features · no R6 · **no destructive drops** ·
**`LayoutTemplate` + `MapElement` preserved** · additive-only · rollback preserved (legacy models +
rows intact; new columns nullable). The end-state "drop legacy" is explicitly **out of scope for this
package** (a later deploy, per the build plan).
