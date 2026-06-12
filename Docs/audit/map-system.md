# map-system.md — The Map System (Flagship Feature Spec)

> Spec 16. The map is BDQ Social's flagship — the one surface that can be genuinely better than
> every competing event platform. This document specifies it end to end: entities, calibration,
> designer UX, scoring, pricing assistance, versioning, vendor/customer/ops views, exports.
> **Zero decisions are left to development.** Where a value is needed, it is in this file.
>
> **The flagship rule.** When any trade-off appears, optimize in this order:
> **1. Vendor sales → 2. Admin usability → 3. Event operations → 4. Customer discovery** —
> never developer convenience. (Owner directive, Gate 5.)
>
> Locked rules that bind this spec: geometry is **feet** internally (display unit may be m);
> money is **integer paise**; **every price is admin-entered** — the scoring engine *suggests*,
> the admin *applies*; one active booking per stall (DB partial-unique index, untouched).

---

## 0. Vision in one paragraph

"Figma for event organizers, on real ground." The admin uploads a satellite photo of Aarush
Lawn, calibrates it with two clicks, and from then on every stall, pathway, and zone drawn on
the canvas occupies its true real-world footprint — a 10×10 ft stall is exactly 100 sq ft of
actual grass. The same single layout drives five views: the **designer** (admin planning), the
**sales view** (scores, suggested prices, revenue heatmap), the **ops view** (gates, medical,
power, exits), the **vendor booking map** ("corner stall, 40 ft from the main entrance, next to
the stage"), and the **customer festival map** (find brands, food, stages). One source of truth;
five lenses.

Phasing (Gate 5 confirmed): **V1** = calibrated underlay + all four bundles + entry-flow
designer (this document, §1–§14). **V1.5** = Mapbox real-world mode, full safety/crowd engine,
power-load planning (§15). **V2** = realistic visual mode, day/night, scenario compare, 3D,
AI layout generation, template marketplace (§15).

---

## 1. Layout JSON schema v2

One JSON document per map (stored where today's layout lives: `EventMap.layoutJson` /
`MapLayout.layoutJson`; `MapLayout.opsLayerJson` merges INTO v2 as the `ops` layer and is
dropped from use). **JSON-first: no new tables, no Prisma migration for the map phase.**
Normalized `Stall` rows continue to be derived on save exactly as today.

```ts
// src/lib/map/layout-v2.ts — single zod schema, exported types. All lengths in FEET.
interface LayoutV2 {
  v: 2;
  canvas: { widthFt: number; heightFt: number; gridFt: 1|2|5|10; displayUnit: "FT"|"M" };
  underlay?: {                       // calibrated real-world image (§2)
    url: string; publicId: string;   // Cloudinary
    ftPerPx: number;                 // set by calibration; 0 = uncalibrated (warning state)
    offsetXFt: number; offsetYFt: number; rotationDeg: number;
    opacity: number;                 // 0.2–1, default 0.7
    locked: boolean;                 // default true after calibration
  };
  boundary?: { points: [number, number][] };          // venue polygon, ≥3 points, ft coords
  obstacles: Obstacle[];             // trees, poles, buildings — placement-warning objects
  terrain: TerrainPatch[];           // ground textures
  zones: Zone[];
  pathways: Pathway[];
  elements: EditorElement[];         // v1 element shape, unchanged (stalls + infra)
  ops: OpsObject[];                  // ops layer (absorbs old opsLayerJson)
  entryFlow: EntryFlowObject[];
  layers: Record<LayerId, { visible: boolean; locked: boolean }>;
  versions: VersionSnapshot[];       // named snapshots, cap 10 (§10)
}

type LayerId = "underlay"|"terrain"|"zones"|"pathways"|"stalls"|"infra"|"ops"|"entryflow"|"labels";

interface Obstacle { id: string; type: "TREE"|"POLE"|"BUILDING"|"WALL"|"WATER_BODY";
  xFt: number; yFt: number; widthFt: number; heightFt: number; rotation: number; label?: string }

interface TerrainPatch { id: string; type: "GRASS"|"CONCRETE"|"PAVERS"|"MUD"|"CARPET"|"TURF";
  points: [number, number][] }      // polygon

interface Zone { id: string; name: string; color: ZoneColor;   // fixed palette (§6)
  points: [number, number][]; note?: string }

interface Pathway { id: string; type: "MAIN"|"SECONDARY"|"EMERGENCY";
  points: [number, number][];        // polyline centerline
  widthFt: number }                  // min: MAIN 20 / SECONDARY 12 / EMERGENCY 10 (§7)

interface OpsObject { id: string; type: "SECURITY_POST"|"MEDICAL"|"GENERATOR"|"POWER_POINT"|
  "WATER_POINT"|"RESTROOM"|"STORAGE"|"HELP_DESK"|"STAFF_POINT";
  xFt: number; yFt: number; widthFt: number; heightFt: number; rotation: number; label?: string }

interface EntryFlowObject { id: string; type: "GATE"|"QUEUE_LANE"|"SECURITY_CHECK"|"SCAN_POINT"|
  "BAG_CHECK"|"WELCOME_ZONE"; xFt: number; yFt: number; widthFt: number; heightFt: number;
  rotation: number; label?: string; lanes?: number }   // QUEUE_LANE/SCAN_POINT: lanes count

interface VersionSnapshot { id: string; name: string; createdAt: string; createdBy: string;
  data: Omit<LayoutV2, "versions"> }
```

**v1 → v2 auto-upgrade** (pure function `upgradeLayout(json): LayoutV2`, unit-tested): a v1
document (`{version:1, canvas, elements}` per `src/lib/map/designer-ops.ts:55-63`) wraps into a
v2 envelope — `elements` carried as-is, `canvas.bgImage{url,opacity}` becomes an uncalibrated
`underlay` (`ftPerPx: 0`), `opsLayerJson` items map into `ops[]`, everything else empty
defaults. Loading never mutates the DB; the upgrade is applied in-memory and persisted on the
next save. All consumers (`MapDesigner`, `MapCanvas`, `BookingFloorPlan`, `MapPreview`) read v2
only, through this one function.

**Size guard:** a layout with 10 snapshots of a 500-element map ≈ 600 KB JSONB — acceptable;
hard-block save at 2 MB with the message "Delete old versions to save" (counted client-side).

---

## 2. Calibration system (the "real map" core)

Purpose: make the underlay image true-to-scale so drawn objects occupy real ground area.

**Math.** Admin marks two points A,B on the image and enters the real distance `D` ft between
them. `pixelDist = √((Bx−Ax)² + (By−Ay)²)` in natural image pixels → `ftPerPx = D / pixelDist`.
The underlay renders at `scale = ftPerPx × pxPerFt(zoom)` so 1 image-foot = 1 canvas-foot.
Derived check shown immediately: `imageWidthFt = imgNaturalWidth × ftPerPx` (same for height).

**UX flow (Designer → toolbar "Underlay" group):**
1. **Upload** — accepts JPG/PNG/WebP ≤ 8 MB; Cloudinary signed upload (existing
   `uploadAction`); delivery transformed to `f_auto,q_auto,w_2400` (≤ ~1.5 MB). Sources:
   Google Maps screenshot, drone photo, scanned blueprint, PDF page exported as image.
2. **Calibrate** — modal with the image at full width, pan/zoom; click point A (crosshair,
   zoom-magnifier loupe at cursor), click point B; input "Real distance between points" + unit
   toggle ft/m (m converts ×3.28084). Tip text: "Use something you can verify on the ground —
   a boundary wall, gate-to-gate, a cricket pitch (66 ft)."
3. **Confirm** — screen shows: "Your image covers **{imageWidthFt} × {imageHeightFt} ft**.
   Aarush Lawn is about 230 × 160 ft — does this look right?" with [Recalibrate] [Confirm].
   This is the mis-calibration guard (failure-analysis #28): the admin must see the computed
   venue size against known reality before the underlay is usable.
4. **Position** — underlay unlocks once for drag/rotate to align with the canvas origin; then
   `locked: true` (lock toggle lives in the Layers panel; editing requires explicit unlock).
5. **Recalibrate** — always available; re-running updates `ftPerPx` and keeps offsets.

**States:** no underlay (canvas grid only — today's behavior) · uploaded-uncalibrated
(banner: "Underlay is not to scale — calibrate to enable measurements on it"; validation panel
warning) · calibrated (status bar shows `1 px = {ftPerPx.toFixed(2)} ft`). Opacity slider
0.2–1.0 in Layers panel. Underlay never exports into vendor/customer views by default
(export option, §12).

---

## 3. Measurements & distance tool

- **Live measurements:** while drawing/resizing any object, a floating label shows
  `W × H ft · {area} sq ft`; on move, X/Y in ft from canvas origin. Status bar (bottom):
  cursor position ft, zoom %, selection `W×H (area)`, total selected count.
- **Distance tool** (toolbar, shortcut `M`): click A → live rubber band with ft readout →
  click B → pinned measurement chip (dashed lavender line, label `{d} ft / {d×0.3048|m}`);
  Esc clears; chips are ephemeral (not saved). Multi-segment: keep clicking; double-click ends,
  shows segment sum ("walking distance").
- **Area readout:** select any zone/terrain/boundary polygon → inspector shows area sq ft +
  perimeter ft (shoelace formula, pure lib + tests).
- **Occupancy stats** (SummaryPanel v2): `usedSqFt` = Σ element footprints; `venueSqFt` =
  boundary area (fallback canvas W×H); occupancy % = used/venue; plus per-zone occupancy.
  Live, updates on every commit.

---

## 4. Boundary & obstacles

- **Boundary:** polygon pen tool (click vertices, click-first-point/Enter to close, ≥3 pts;
  vertices draggable; Alt-click a segment inserts a vertex, Del removes). One boundary per map.
  Render: 2 px dashed `--color-navy-500` line, outside area dimmed 20%. Irregular venues
  (Aarush Lawn's actual shape) supported by design; curves approximated by vertices (≤64).
- **Obstacles:** palette objects (TREE 6×6 default, POLE 2×2, BUILDING free-size, WALL
  free-size, WATER_BODY free-size). Render in muted brown/green with icon glyph. They live on
  the `infra`-adjacent `obstacles` collection and the stalls layer **cannot be saved while a
  stall intersects an obstacle or crosses the boundary**: violating stalls get a red outline +
  validation-panel entries; Save is allowed only after fixes or per-item "override" checkboxes
  (override is recorded in the validation panel and audit metadata — for the rare deliberate
  case). Obstacles themselves are placeable anywhere.

---

## 5. Terrain patches

Polygon patches under everything except the underlay. Types/colors (15% opacity fills, listed
in design-system.md §Map): GRASS `#3FA66A` · CONCRETE `#8C8576` · PAVERS `#A89B84` · MUD
`#7A5C43` · CARPET `#B0485A` · TURF `#46B377`. Used for visual planning only in V1 (walkability
weighting is V1.5). Aarush Lawn default: one GRASS patch covering the boundary.

---

## 6. Zones

- Draw: rectangle or polygon; name (required, ≤24 chars); color from the **fixed zone palette**
  (8 swatches — navy, lavender, green, yellow, pink, red, teal `#2C8C8C`, amber `#C9871A` —
  no custom colors, AGENT_RULES). Fill 12% opacity, 1.5 px solid border, name label at
  centroid (Exat 14 px equivalent, uppercase).
- A stall belongs to the zone whose polygon contains its center (computed, not stored — pure
  fn `zoneOf(element, zones)`).
- **Zone rollups** (SummaryPanel v2 + Sales view): stall count by status, Σ priceInPaise
  (potential), Σ booked revenue, area sq ft, occupancy %.
- Zones export to vendor/customer views as named colored regions ("Luxury Lane", "Food Court").

---

## 7. Pathways

- Polyline tool with width: type presets MAIN (default 20 ft), SECONDARY (12), EMERGENCY (10);
  width editable per pathway in inspector (4–40 ft).
- Render: filled strip (centerline ± width/2) in cream-80%/pavers tone; EMERGENCY adds red
  dashed centerline.
- **Width warnings (static check, V1):** validation panel flags `widthFt < min(type)` —
  "Main path 'Center aisle' is 14 ft; minimum 20 ft". Also flags any stall/obstacle
  intersecting a pathway strip ("Path blocked by F-12").
- **Exit reachability (lite):** every FIRE_EXIT/GATE must touch a pathway strip or open area
  (no intersecting stall within 10 ft) — otherwise "Emergency exit blocked" error. Full
  flow/crowd simulation is V1.5.

---

## 8. Entry flow designer (pulled forward, Gate 5)

Objects: GATE (12×6 default) · QUEUE_LANE (4 ft wide × length, `lanes` 1–8) · SECURITY_CHECK
(10×10) · BAG_CHECK (8×8) · SCAN_POINT (4×4, `lanes` = simultaneous scanners 1–6) ·
WELCOME_ZONE (free).

**Throughput calculator** (inspector card when a SCAN_POINT or GATE chain is selected, and a
roll-up in the validation panel): `guestsPerHour = Σ(scanPoint.lanes) × 5 scans/min × 60 ×
0.8 utilization`. Compare against `TicketType` Σ totalQty for the attached event: shows
"Gate capacity ≈ 2,400/h — expected peak arrival ≈ 60% of 5,000 in 2h = 1,500/h ✓" or a
warning when under. (5 scans/min/lane and the 60%-in-2h arrival model are the kiosk-plan
constants; single source in `src/lib/map/throughput.ts`, unit-tested.)

---

## 9. Sales & insight

### 9.1 Stall scoring engine — `src/server/map/scoring.ts` (pure, tested, like pricing/engine)
Inputs: layout v2 + the stall. Score 0–100 = Σ weighted components (weights are constants in
the lib — changing them is a spec change):

| Component | Weight | Rule |
| --- | --- | --- |
| Entrance proximity | 25 | linear falloff: ≤50 ft of a GATE/ENTRY = full, ≥300 ft = 0 |
| Anchor proximity | 20 | ≤75 ft of STAGE / food-zone centroid / ACTIVITY_ZONE = full, ≥250 ft = 0; best anchor counts |
| Pathway frontage | 20 | any edge within 4 ft of a MAIN path strip = full; SECONDARY = 60% |
| Corner position | 15 | ≥2 exposed sides (no neighbor stall within 4 ft) = full; 1 side = 50% |
| Open visibility | 10 | no stall within 15 ft of the front edge = full |
| Zone premium | 10 | stall's zone ranks in top-third by avg price = full, middle = 50% |

Display: score badge on each stall in **Sales view** (toggle `S`): 80–100 `PREMIUM` (lavender),
60–79 `STRONG` (green), 40–59 `STANDARD` (neutral), <40 `VALUE` (muted). Plus per-stall
breakdown list in the inspector ("Corner stall · 40 ft from Main Gate · on Center aisle").
These same strings power the vendor "why this stall" bullets (§11) — one generator, two
consumers: `describeStall(score): string[]` (max 3 bullets, ordered by component score).

### 9.2 Price suggestions — admin applies, never auto
`suggestedPaise = round50(stallType.priceInPaise × (1 + 0.5 × (score − 50)/100))` — i.e. a
100-score stall suggests +25% over its type base, a 0-score −25%; `round50` = nearest ₹50.
UI: inspector shows "Suggested: ₹13,500 (score 84)" with **[Apply]**; Sales view bulk bar:
"Apply suggestions to N selected / to zone". Every apply is a normal price edit → audited
(withAudit), and the locked rule holds: admin enters/accepts every price.

### 9.3 Revenue view
Sales-view sub-toggle: heatmap fill by `priceInPaise` quintiles (cream→lavender ramp) or by
score; legend with quintile bounds; zone rollup cards (potential vs booked, from §6). The old
SummaryPanel totals fold into this.

### 9.4 Search & focus
Designer search box (and admin ⌘K integration): matches stall label, zone name, ops/entry
labels, vendor brand (booked stalls). Selecting zooms to the object at 1.5× with a 600 ms
pulse highlight. Shortcut `/` focuses search.

---

## 10. Version snapshots

- **Save version** (toolbar): names default "Version {n} — {date}"; stores a full snapshot
  (cap **10**; at 8 a hint appears, at 10 saving requires deleting one). Snapshots list in a
  right-panel tab: name, when, by whom, element count, Σ potential revenue.
- **Restore**: loads snapshot into the editor as an undoable commit (history intact; current
  state is auto-snapshotted as "Before restore of …" if unsaved).
- **Compare**: pick two → side-by-side stat diff (stalls, sellable, Σ potential, occupancy %,
  zones) + visual ghost mode (other version at 30% opacity, additions green / removals red).
- Undo/redo (`useHistory`) remains the in-session mechanism; versions are deliberate save
  points that survive sessions.

---

## 11. Vendor map UX (BookingFloorPlan v2)

Desktop: full map left, stall sheet right. Mobile (≤768): **mini-map first** (mobile.md §map)
— zone chips row → tapping a zone scrolls the viewport there; map height 45vh; selected stall
opens a bottom sheet (vendor-portal.md owns the booking flow around it).

**Stall sheet contents (exact order):** label + type chip + zone chip → price (₹, from stall
override else type) → size `10 × 10 ft (100 sq ft)` → **why-this-stall bullets** (≤3, from
`describeStall`, e.g. "Corner stall", "40 ft from Main Gate", "Faces Center aisle") → distance
chips: `{d} ft from entrance`, nearest anchor → status → CTA **Reserve this stall** (flow per
vendor-portal.md). Booked stalls show "Taken" (brand name only if that vendor is APPROVED —
public-safe). The zoom-to-stall + reserve success moment is specced in delight.md (§booking
zoom-in): on select, animate viewport to the stall at 2× over 450 ms ease-out; on reserve
success, lavender pulse + "Stall F-12 is yours to finish" toast.

Vendors see: zones, pathways, terrain, infra, stalls, labels. Never: ops layer, entry-flow
internals (gates render as simple ENTRY), scores (only the derived bullets), underlay (off by
default; admin can enable "show ground photo" per map for premium effect — single boolean in
export/view settings).

**Vendor preview mode (designer):** toolbar toggle renders the designer canvas exactly through
the vendor lens above (admin clutter hidden) — what-you-sell-is-what-they-see.

## 11b. Customer map UX (MapPreview v2 — customer-portal.md §map owns the page)

Same layout, customer lens: zones, stages, food court, restrooms, water, gates, **approved
brand names on booked stalls**, category filter chips (from VendorProfile.productCategory),
search; tap stall → mini card (brand, category, zone, photo if asset exists). "Navigate to" V1
= zoom + pulse + textual hint ("In Luxury Lane, near Gate 2 — 140 ft from the main entrance");
GPS/you-are-here is V2. Replaces the fake `assignDemoStatuses` demo (R3 package reference).

## 11c. Ops mode

Designer toggle `O`: shows ops + entryflow layers prominently, stalls dimmed to outlines.
Ops objects placeable only in this mode (keeps the sales canvas clean). Powers: the printed
ops map (§12), the gate-board location labels, and day-of staff orientation. Power-load math,
cable routing, staffing coverage are V1.5.

---

## 12. Exports

All client-side from the konva stage (CORS already handled for the underlay,
`MapDesigner.tsx:75`). Naming: `{event-slug}-{variant}-{yyyy-mm-dd}.{ext}`.

| Variant | Contents | Format |
| --- | --- | --- |
| Vendor sales map | vendor lens + prices + zone names + legend | PNG (2× pixel ratio) + PDF A3 landscape |
| Ops map | ops lens + pathways + exits + gates + grid refs | PNG + PDF A3 |
| Print layout | black/white-safe: outlines + labels only, no fills | PDF A3 |
| Current view | whatever is on screen (admin ad-hoc) | PNG |

PDF via existing `@react-pdf/renderer` (already a dependency): the PNG is embedded full-bleed
with a title block (event name, date, version name, scale bar — scale bar derives from
ftPerPx: a 50 ft rule drawn bottom-left). Export dialog: variant radio + "include underlay
photo" checkbox (default off for vendor, on for ops).

---

## 13. Designer UX consolidated (toolbar/inspector/keyboard)

**Toolbar groups (left→right):** Select/Pan · Draw (Boundary, Zone, Pathway, Terrain) ·
Objects (Stall palette popover, Infra, Obstacles, Ops*, Entry flow*) (*ops-mode only) ·
Underlay (Upload, Calibrate, Opacity) · Measure (`M`) · View toggles (Grid, Snap, Sales `S`,
Ops `O`, Vendor preview) · Align/Distribute (6 ops: left/center-h/right/top/center-v/bottom +
distribute-h/v; enabled at ≥2/≥3 selected) · Bulk (resize, set type, set status, assign price,
apply suggestions) · Versions · Export · Save.

**Inspector (right panel)** adapts to selection: stall (label, type, size W/H, x/y, rotation,
status, price + suggestion chip, score breakdown) · zone (name, color swatches, rollup) ·
pathway (type, width + min warning) · underlay (calibration summary, recalibrate, opacity,
lock) · multi (count, bulk fields). Empty selection → SummaryPanel v2 (occupancy, revenue,
validation count badge).

**Keyboard (full map):** V select · H pan · M measure · Z zone · P pathway · B boundary ·
S sales view · O ops mode · / search · Del delete · Ctrl+Z/Y undo/redo · Ctrl+C/V/D
copy/paste/duplicate · arrows nudge 1 ft (Shift = gridFt) · Ctrl+A select-all-layer · Esc
cancel tool · F fit · 1 zoom 100%. (Existing handlers at `MapDesigner.tsx:192-215` extend.)

**Validation panel** (badge in status bar, drawer lists all): boundary/obstacle overlaps (§4),
pathway width + blocked (§7), exit reachability (§7), gate throughput shortfall (§8), duplicate
stall labels, sellable stalls without a price, uncalibrated underlay. Each row → click focuses
the object. Save with errors = blocked except per-item override (§4); warnings never block.

**Component split (architecture.md §map):** `MapDesigner.tsx` (24 KB) splits into
`useDesignerState` (history + selection + tool), `useDesignerKeyboard`, panel components
(`LayersPanel`, `InspectorPanel`, `ValidationPanel`, `VersionsPanel`), tool components, and a
thin `MapDesigner` shell. Konva stays the only canvas dependency (no new libs in V1).

**Performance budgets (performance.md §map):** 500 elements + underlay at 60 fps pan/zoom on a
mid-range Android (Moto G class); guides/validation recompute throttled to 50 ms; konva layers
≤ 6 (underlay/terrain+zones/strips/elements/overlay/UI); underlay delivered ≤ 1.5 MB.

---

## 14. V1 work packages (roadmap phase R2.5, inserted between R2 and R3)

| Pkg | Scope | h | Acceptance |
| --- | --- | --- | --- |
| R2.5.1 | Layout v2 schema + zod + `upgradeLayout` + designer state split (`useDesignerState`) | 10 | v1 fixtures upgrade losslessly (tests); designer loads both |
| R2.5.2 | Underlay calibration (modal, 2-point, confirm step, lock/opacity) | 8 | calibrated image renders true-scale; computed-dims confirm shown; recalibrate works |
| R2.5.3 | Boundary polygon + obstacles + overlap/out-of-bounds validation + override | 8 | stall outside boundary blocks save; override path audited in layout meta |
| R2.5.4 | Distance tool + live measurements + status bar + area lib (shoelace, tests) | 6 | A→B chip matches known fixture distances ±0.1 ft |
| R2.5.5 | Layers panel (9 fixed layers, show/hide/lock) | 5 | hidden layer excluded from export "current view"; locked layer unselectable |
| R2.5.6 | Zones (draw, palette, labels, `zoneOf`, rollups in SummaryPanel v2) | 8 | rollup totals match fixture math (tests) |
| R2.5.7 | Pathways (strips, presets, width warnings, blocked + exit-reachability checks) | 8 | validation rows appear/clear per fixture layouts |
| R2.5.8 | Terrain patches | 4 | patches render under zones; export-safe |
| R2.5.9 | Align/distribute + bulk actions v2 (incl. bulk price assign) | 6 | 6 align ops + 2 distribute correct on fixtures |
| R2.5.10 | Scoring engine lib + tests + Sales-view badges + `describeStall` | 8 | weight table reproduced in tests; badge tiers correct |
| R2.5.11 | Price suggestions + apply (single/bulk/zone) through audited mutation | 6 | apply writes price + AuditLog row; suggestion = formula in tests |
| R2.5.12 | Revenue heatmap + occupancy stats | 6 | quintile legend matches data; occupancy = used/venue (test) |
| R2.5.13 | Version snapshots (save/restore/compare, cap 10, ghost overlay) | 8 | restore is undoable; cap enforced; compare stats correct |
| R2.5.14 | Vendor preview mode + search/focus (designer + ⌘K) | 6 | preview hides admin layers; search zooms to A12 |
| R2.5.15 | Exports (PNG 2×, 3 PDF variants, scale bar, naming) | 8 | 4 artifacts generated for the seed map; scale bar = 50 ft against calibration |
| R2.5.16 | Entry-flow objects + throughput calc + ops-mode polish + validation panel shell | 10 | throughput math tested; ops print map renders gates/medical/power |

Σ **115 h**. Order: R2.5.1 first (everything depends on it) → lanes A (2,3,4,5,8), B (6,7,9),
C (10,11,12) in parallel → 13,14,15,16 last. Vendor/customer surface packages in R3/R4 consume
§11/§11b. Each package = one PR per AGENT_RULES; every pure lib lands with its tests.

---

## 15. V1.5 / V2 (specced later, parked deliberately — anti-paralysis)

**V1.5:** Mapbox/MapLibre "Real World mode" (satellite tiles + geo-anchor: pick one lat/lng +
bearing for the canvas origin; parking/traffic/access planning around the venue) · full safety
engine (crowd bottleneck detection, dead-end analysis, zone capacity model) · power planning
(load per POWER_POINT, generator capacity, cable routes) · staffing coverage view ·
walkability-weighted terrain.
**V2:** realistic visual mode + day/night lighting planner · scenario compare (multiple full
layouts ranked by revenue/capacity/walkability) · isometric 3D · AI layout generation ("100
stalls, 2 food courts, 20 ft aisles") · template marketplace · photo hotspots on customer map ·
QR-per-stall deep links · collaboration (comments/approvals).

**V2 doc backlog (owner-deferred, Gate 5):** revenue.md · growth.md · operations.md.
