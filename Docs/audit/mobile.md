# mobile.md — Mobile-First Layout Specification

> Spec 9/15. 70–90% of BDQ traffic will be phones. This file defines the layout of **every
> surface at every QA breakpoint** so no responsive decision is made ad-hoc. Token/type values
> come from [design-system.md](design-system.md); screen content from
> [customer-portal.md](customer-portal.md) / [vendor-portal.md](vendor-portal.md) /
> [admin-portal.md](admin-portal.md).

## 1. Global rules

- **QA breakpoints:** 320 (floor — nothing may break) · 375/390/414 (primary design targets) ·
  768 (tablet) · 1024+ (desktop). Code uses Tailwind `sm:640 md:768 lg:1024 xl:1280` only.
- **Touch targets ≥44×44px** everywhere; interactive rows ≥48px tall; thumb-zone rule: the
  primary action of any mobile screen lives in the bottom 40% of the viewport (sticky if needed).
- **Safe areas:** every fixed bottom element pads `env(safe-area-inset-bottom)`; fixed headers
  pad `env(safe-area-inset-top)` in standalone PWA mode (already partially done per commit
  a15c49c — verify per-surface below).
- **Type floor:** computed body ≥14px at 320 (the clamp() scale guarantees this); inputs ≥16px
  rendered to prevent iOS zoom-on-focus (`f-paragraph` at the clamp floor = 14px — **inputs get
  an explicit 16px floor**: `input { font-size: max(1em, 16px) }` in the RPA layer).
- **No horizontal scroll ever** except deliberate carousels/marquees and admin tables inside
  their own scroll container. CI check: 320px viewport, `document.documentElement.scrollWidth
  <= 320`.
- One-hand reachability: destructive/back actions top, confirm actions bottom.

## 2. Public zone

### 2.1 Coming-soon (`/coming-soon`)
- 320–414: single column, centered; countdown 4 units in one row (digits `f-h100` →
  mobile override keeps them ≤58px so 4 units fit at 320 — verified: 4×2ch at 58px ≈ 280px);
  phone field full-width, `+91` prefix inline; Join `.btn` below field (stacked — current
  `sm:flex-row` switch stays at 640); stall-interest checkbox wraps to 2 lines max.
- 768+: form row inline (field + button side by side), max-w-[42rem] centered.

### 2.2 Landing (`/`)
| Section | 320–639 | 640–1023 | 1024+ |
| --- | --- | --- | --- |
| Hero | 1-col; headline `--h133` mobile override (≈40px @390); masked image HIDDEN (current `hidden lg:block` kept); CTA row wraps, Tickets `.btn` first | same, image still hidden | 2-col grid, image right, parallax |
| Facts marquee | full-bleed, single row, 32s | same | same |
| Manifesto | `--h100` override, text-indent 2em kept | same | same |
| PinnedServices | **stacked full-height slides, native scroll** (built: `pinned-track` column ≤950px) | same | pinned horizontal at ≥951px |
| Brands | 1.2-card peek carousel, scroll-snap, snap-mandatory | 2.5 cards | 3 cards + arrows |
| Happening-tonight strip (event week) | sticky under header, 40px tall, marquee | same | static row, no marquee |
| Sponsors marquee | 2 rows as built | same | same |
| CTA wall | headline `--h133` override; WordmarkWall rows reduce 5→3 (perf) | 4 rows | 5 rows |
| FAQ | full-width rows, summary text `--h60` override (≈27px @390), `+` glyph 44px target | max-w-[60rem] | same |

### 2.3 Events list / Event detail
- List: 1-col cards at <640, 2-col at 768, 3-col 1024+.
- Detail at 320–639: order = hero (name, date, venue, from-price) → **sticky bottom CTA bar**
  (56px + safe-area: "Tickets from ₹X" left, `.btn` "Buy" right; appears after hero scrolls
  out, `position: sticky` bottom) → schedule preview (3 rows + "Full schedule →") → ticket
  types (checkout module §2.4) → map teaser (static image + "Explore the map →") → FAQ.
- 1024+: 2-col — content left (8 cols), checkout module sticky right (4 cols, top 96px).

### 2.4 Checkout module (TicketCheckout)
- 320: each type row = name+price left, stepper right; steppers 44px targets (design-system
  §3.2); coupon input (new) full-width underline field + "Apply" text-link right; total block:
  `f-h60` total, count kicker; Buy `.btn` full-width (`width: 100%` override at <640 — the only
  full-width `.btn` allowed).
- Razorpay opens its own sheet; on dismiss return state per customer-portal.md §5.

## 3. Customer portal

Tab bar (≤639px): fixed bottom, 4 tabs × ≥80px wide, 56px + safe-area tall, icons size-5 +
11px labels. ≥640: top header links instead (tab bar hidden).

| Screen | 320–639 | 768+ |
| --- | --- | --- |
| Login | single column; left navy panel hidden (current `hidden lg:flex` kept); h2 `--h60` | 2-col split as built |
| Home (pre-event) | 1-col: next-event card → my tickets shortcut → discover strip (1.2-peek) | 2-col: event left, tickets right |
| Home (day-of live mode) | ticket QR card FIRST (full-width), then now-playing strip, map+guide shortcut row | same order, 2-col |
| Wallet | ticket cards full-width, QR right at ≥375 (image 96px), stacked QR-below at 320; flip-card tap target = whole card | grid 2-col, max-w-[62rem] |
| Schedule | vertical timeline, day-pills horizontal scroll header (48px), NOW line sticky | 2-col: stages side-by-side |
| Map | **full-viewport canvas minus header/tab bar; stall tap → bottom sheet** (design-system §3.7) with brand info; legend = horizontal chip scroll over the map bottom; pinch-zoom + pan; "List view" toggle top-right (a11y fallback) | canvas + right rail list 360px |
| Discover | category chips scroll row (40px) → 2-col card grid at ≥375 (1-col at 320) → search field top | 3-col, filters left rail |
| Guide | single column, anchor-link chip row at top | max-w-[60rem] |
| Offers | 1-col offer cards (vendor logo, offer `f-h42`, terms small, "Show at stall" full-width state) | 2-col |
| Gallery | 2-col masonry at ≥375 (1-col 320), tap → full-screen swipe viewer | 4-col |
| Profile | single column form, save sticky bottom | centered max-w-md |

## 4. Vendor portal (RPA rebuild)

≤639: `ZoneSidebar` becomes a bottom sheet triggered by a fixed hamburger (top-left, 44px);
content full-width `p-[--space-lg]`. 640+: rail left as built (restyled RPA).

| Screen | 320–639 spec |
| --- | --- |
| Onboarding | stepper = horizontal scroll pills (current step centered, done = filled); one card per step, full-width; field rows stack; doc upload tiles 2-col grid (min 140px) |
| Stall picker | same pattern as customer map: full-viewport konva + bottom sheet stall detail with price + "Reserve" `.btn`; type legend chips scroll row; **landscape hint** if viewport <360w ("rotate for a wider view" toast, dismissible) |
| Contract | document scroll area max-h-[60vh] inside bordered tile; name input + sign `.btn` sticky bottom |
| Payment | amount `f-h60` + PayStep button full-width |
| Dashboard/status timeline | vertical timeline full-width, current state pulsing lavender dot |
| Leads | QR card centered (QR 200px at ≥375 / 160px at 320), link `break-all`; lead rows 56px, export full-width outline button |

## 5. Admin console (functional, not redesigned)

- ≤767: `ui/sidebar.tsx` mobile mode = sheet (built-in shadcn behavior — verify); header keeps
  event-switcher (collapses to icon) + bell + search trigger.
- **Tables → card rule:** at <640, DataTables render as stacked cards (each row = card with
  label/value pairs of the 3 most important columns + chevron to detail). Applies to: orders,
  attendees, vendors, payments, stalls. Implementation: one `<ResponsiveTable>` wrapper, not
  per-page rewrites.
- KPI grids: 1-col at <640 (current `sm:grid-cols-2 xl:grid-cols-4` ok).
- MapDesigner: desktop-only feature — at <1024 show a notice card ("Map design needs a bigger
  screen") + read-only preview. Never attempt touch-editing. **Tablet (1024–1279, map-system
  designer):** full designer allowed; right panels (Layers/Inspector) collapse to slide-overs
  toggled from the toolbar; toolbar groups overflow into a "More" menu beyond 9 visible
  buttons; konva pinch-zoom enabled, two-finger pan; calibration modal requires ≥768w.
- Vendor/customer map sheets: stall sheet max-h 70vh with drag handle; why-bullets clamp to 3
  lines; distance chips wrap to one scrollable row (map-system §11/§11b).
- Charts: height 220px at <640 (280 desktop); axis labels rotate 0°, tick count ≤5.
- POS: large touch grid — ticket-type buttons ≥64px tall, qty steppers 44px, total `text-3xl`,
  confirm full-width h-12.

## 6. Kiosk scanner (its own mode — phone-first by definition)

Locked portrait; fullscreen (no console chrome); camera viewport top 55%; result zone bottom
45% with states per delight.md §6 (VALID/ADMIT-N text ≥64px, color-blind-safe glyphs ✓/✕/↺ in
addition to color); gate selector behind a long-press (avoid accidental switch); wake-lock API
on; offline badge top-right when queue active (count shown); manual code-entry fallback button
(44px) bottom-left.

## 7. Code-derived current issues (fix list)

| # | Where | Issue | Fix ref |
| --- | --- | --- | --- |
| 1 | `.rpa` root `font-size: 1.25vw` | breaks zoom/user font prefs; sub-14px body possible between breakpoints | clamp() scale (design-system §1.2) |
| 2 | RPA inputs at clamp floor 14px | iOS zoom-on-focus | 16px input floor (§1 above) |
| 3 | `(customer)/dashboard` QR `<img className="size-24">` no width/height attrs | CLS on slow loads | explicit dims (consistency #24) |
| 4 | Landing hero image `hidden lg:block` | fine — but no mobile visual at all; hero is text-only on phones | proof-band imagery covers it (changes.md §6.2) or masked image at ≥768 |
| 5 | `CustomerTabBar` only 3 destinations today | new IA needs 4 tabs incl. Map/Schedule | customer-portal.md §2 |
| 6 | Vendor stall picker has no mobile sheet pattern (`VendorStallReserve` inline panel) | cramped at 390 | §4 stall picker spec |
| 7 | Admin tables horizontal-scroll only on phones | unusable for gate-day staff | `<ResponsiveTable>` card rule (§5) |
| 8 | Checkout `.btn` fixed `8.5em` width | small target at 320 | full-width <640 rule (§2.4) |

## 8. Verification

- Playwright viewport matrix (320/390/768/1280) screenshot suite over the 12 key screens;
  scrollWidth assert at 320.
- Manual device pass: one iPhone SE-class (375), one 6.5" Android (412), one iPad (768) over:
  buy ticket, view wallet, open map sheet, vendor reserve flow, kiosk scan.
- Lighthouse mobile budgets (performance.md §1) unchanged by responsive work.
