# implementation-roadmap.md — The Execution Bible

> Spec 15. **Supersedes changes.md §7.** Every work package an agent needs, with scope,
> files, schema changes, effort, dependencies, and acceptance commands. Zero decisions remain —
> each package cites the spec section that already made them. One package = one PR on
> `rebuild/<phase>-<slug>`; merge requires its acceptance green in CI.
> **[build-plan.md](build-plan.md) is the step-by-step companion** (task order, commands,
> verify proofs); this file stays the scope/estimate authority. Agent conduct:
> [AGENT_RULES.md](AGENT_RULES.md).
>
> Effort = focused agent-hours (review included ×1.3). Σ ≈ 595h (incl. R2.5 map phase, 115h)
> ≈ 12 agent-weeks serial, ~7 weeks with the stated parallelism. No calendar pressure (owner)
> — gates are gates.

## Schema change ledger (all migrations, in order)

| # | Migration | Models | Introduced by |
| --- | --- | --- | --- |
| M1 | `ticket_admit_count` | `Ticket.admitCount Int @default(1)` · `CheckIn.admitted Int @default(1)` | R1.2 |
| M2 | `booking_states_collapse` | map HELD→RESERVED, PENDING→PENDING_PAYMENT; drop enum values; Stall enum collapse | R1.3 |
| M3 | `offer` | `Offer` (customer-portal §3.6 shape) | R5.4 |
| M4 | `gallery_photo` | `GalleryPhoto` | R5.4 |
| M5 | `stall_addons` | `StallAddOn` · `BookingAddOn` · `AddOnOrder` (gatewayOrderId unique) | R4.2 |
| M6 | `venue_map_consolidation` | `VenueMap`; data-migrate LayoutTemplate/MapElement; drop both | R5.5 |
| M7 | `order_share_card` | `Order.shareCardUrl String?` | R6.2 |
| — | *Map phase R2.5: NO migration* | layout JSON v2 lives in existing `layoutJson` columns (map-system §1) | R2.5.1 |
Rule: additive first; destructive parts (enum drops, table drops) ship one deploy AFTER the
tolerant code (architecture §6.5). Prod = Vercel Neon (ep-dry-sunset); migrate prod before
deploying dependent code.

## Phase R0 — Foundations (serial, 1 agent, ~40h)

| Pkg | Scope (spec) | Key files | h | Acceptance |
| --- | --- | --- | --- | --- |
| R0.1 | Tests into git: remove `.gitignore` test block; commit `**/*.test.ts`, vitest+playwright configs, `/e2e/`; CI adds `test:run` + e2e smoke + blocking `npm audit --omit=dev --audit-level=high` | `.gitignore`, `.github/workflows/ci.yml` | 4 | CI fails on a deliberately broken test; `git ls-files '*.test.ts' \| wc -l` > 40 |
| R0.2 | Middleware diet: delete `mapAdminPath`/`getPrettyPath` (`src/middleware.ts:57-203`) + `adminRedirects` (`next.config.ts:24-34`); nav hrefs → physical paths | middleware, next.config, `components/admin/nav-config.ts`, `app-sidebar` | 6 | grep `mapAdminPath\|getPrettyPath` = 0; e2e visits every nav leaf |
| R0.3 | `action()` pipeline + `Result<T>` + client toast hook; migrate 3 pilot actions (events, coupons, vendors) | new `src/server/action.ts`, pilots' `actions.ts` | 10 | Envelope unit tests; pilot mutations audited + toast on success/error (closes D5, D17 start) |
| R0.4 | Guard renames (`requireSuperAdmin`→`requireAdminRole`, strict→`requireSuperAdmin`) + RBAC matrix tests incl. new sections content/addons/concierge | `server/auth/guard.ts`, all call sites, new `rbac.test.ts` | 8 | Matrix sweep green (security §4); grep old names = 0 (D21) |
| R0.5 | Sentry: SDK, `lib/logger.ts` bridge, 5 alert rules (security §3.3) | `lib/logger.ts`, instrumentation | 6 | Thrown test error arrives w/ release tag; alert fires |
| R0.6 | `npx tsc`/lint/build all green post-R0; delete `lib/adapters.ts` if still orphaned | — | 2 | CI green |

## Phase R1 — Money correctness (after R0; R1.1∥R1.2, then R1.3∥R1.4; ~46h)

| Pkg | Scope | Key files | h | Acceptance |
| --- | --- | --- | --- | --- |
| R1.1 | Oversell guard: conditional `soldQty` raw update inside fulfilment txn; ops alert on reject | `server/tickets/service.ts` | 6 | Concurrency test: 2 PENDING for last ticket → exactly 1 fulfils; AMOUNT path untouched |
| R1.2 | Group-QR (M1): one ticket per type-line w/ admitCount; checkin partial-admit; capacity `sum(admitCount)`; delivery 1 QR; comps group support | tickets, checkin, comps services; webhook untouched | 16 | e2e buy-5→1 QR→admit 3+2→board=5; replayed webhook no-dup |
| R1.3 | Booking collapse (M2): service+UI status maps; cron payBy/hold expiry paths verified | `server/bookings/*`, admin vendor screens | 10 | State-machine tests; grep legacy states = 0 (D23) |
| R1.4 | Coupon UI + pending-payment state on wallet (5s poll) | `TicketCheckout`, wallet page | 8 | e2e coupon ("saves ₹X" line); delayed-webhook test shows pending then ticket |
| R1.5 | `getHomeMode` util + now/next schedule queries (pure, tested — consumed by R3/R6) | `server/events/`, `lib/` | 6 | Unit tests incl. open-ended items, IST edges |

## Phase R2 — Design system (after R0; ∥ with R1; ~38h)

| Pkg | Scope | h | Acceptance |
| --- | --- | --- | --- |
| R2.1 | Tokens: clamp() scale + input 16px floor, delete aliases, `BRAND_NAVY` const (D1), stall-color single source, z-scale, `!important` removal, ESLint inline-fontSize ban | 14 | consistency §8 greps; D1,D6,D7,D9,D10,D12,D22,D27 closed |
| R2.2 | Contracts: `RpaPageHeader`, empty states, badge variant cleanup (D11), tables→`components/admin/tables` (D13), date-format adoption (D14), toast rollout to all actions (D17) | 16 | greps; visual diff suite |
| R2.3 | Motion: drop swiper (scroll-snap BrandsCarousel) + framer-motion (CSS admin transition); reduced-motion JS gate in `lib/motion.ts` | 8 | deps absent from package.json (D31); landing motion visually intact |

## Phase R2.5 — Map System, the flagship (after R2; before R3/R4 map surfaces; ~115h)

Full spec + per-package acceptance: **[map-system.md](map-system.md) §14** (authoritative).
Summary: R2.5.1 layout v2 schema + `upgradeLayout` + designer state split (10h, everything
depends on it) → lane A: R2.5.2 calibration (8) · R2.5.3 boundary+obstacles (8) · R2.5.4
distance/measurements (6) · R2.5.5 layers panel (5) · R2.5.8 terrain (4); lane B: R2.5.6
zones (8) · R2.5.7 pathways+width checks (8) · R2.5.9 align/bulk (6); lane C: R2.5.10 scoring
engine (8) · R2.5.11 price suggestions (6) · R2.5.12 revenue heatmap (6) → finishers:
R2.5.13 versions (8) · R2.5.14 vendor preview+search (6) · R2.5.15 exports (8) · R2.5.16
entry-flow+throughput+ops polish+validation panel (10). JSON-only (no migration). No new
dependencies. Konva stays the sole canvas lib.

## Phase R3 — Customer surfaces (after R1+R2; up to 3 agents; ~96h)

| Pkg | Scope (spec) | h | Acceptance |
| --- | --- | --- | --- |
| R3.1 | Coming-soon "Poster" direction + dynamic countdown target (D8, D26) | 8 | Lighthouse ≥95; target from event/SystemSetting |
| R3.2 | Landing rebuild: §6.2 order, proof band, real-count bindings (D24, D25, D30), ISR | 20 | LCP ≤2.5s budget; no static claims grep |
| R3.3 | Event detail + checkout: sticky CTA, inline OTP sheet, loading skeleton (D18), ISR | 16 | e2e anonymous→buy on 390px; budget met |
| R3.4 | Wallet + profile + 4-tab bar (D20, D29): flip card structure (motion in R6.1), share/download actions, offline precache | 16 | e2e wallet flip + share; offline render test |
| R3.5 | Public map real-data brand view + sheet + list fallback (D2) — consumes map-system §11b (zones, anchors, category chips, search) | 14 | grep `assignDemoStatuses` only in dev fixtures; axe pass |
| R3.6 | Schedule page (now/next via R1.5) | 8 | time-mocked now-line test |
| R3.7 | Discover + brand detail (search, chips, offer badges) | 10 | filter e2e; SEO meta |
| R3.8 | Guide + Gallery customer pages (content-gated) | 8 | gates behave (≥8 photos, non-empty guide) |
| R3.9 | Offers customer surface + redemption view | 8 | publish→appears; ended→greys |
| R3.10 | Home modes wiring (PRE/LIVE/POST via R1.5) | 8 | clock-mocked mode flips |

## Phase R4 — Vendor surfaces (after R2; ∥ with R3; ~52h)

| Pkg | Scope | h | Acceptance |
| --- | --- | --- | --- |
| R4.1 | RPA rebuild of all pages: home spine + timeline + step forms + leads + contract (vendor-portal §3-§7; D4, D15, D16, D18, D20); stall sheet + why-bullets + zoom-in per map-system §11 | 28 | dry-run vendor e2e on 390px; copy matches spec exactly |
| R4.2 | Add-ons (M5): vendor flow + payment branch in webhook dispatch + stock guard | 14 | e2e add-on order; oversold-stock test; replay no-dup |
| R4.3 | SLA surfacing: UNDER_REVIEW aging query + admin alert tile + vendor wait copy | 6 | aging >48h fires tile |
| R4.4 | Lead QR print CSS + day chips | 4 | print snapshot |

## Phase R5 — Console (after R0; heavier parts after R1; ~78h)

| Pkg | Scope | h | Acceptance |
| --- | --- | --- | --- |
| R5.1 | Diet + nav: remove Task Center (D3)/budgets/settlements/deep analytics; final nav tree; POS+Settings in nav (D19); `<ResponsiveTable>` (D28); event-detail tabs→routes (D32) | 16 | Removed routes 404; nav==spec per role; phone table cards |
| R5.2 | Command Center: 6 tiles + alert row + chart + activity (admin-portal §2) | 12 | seeded reconciliation test |
| R5.3 | Kiosk mode (launcher, fullscreen, wake-lock, offline badge, manual entry) + ops status strip + staff sign-out-everywhere | 16 | kiosk e2e chain; revoke test |
| R5.4 | Content group (M3, M4): Offers CRUD/workflow (+cron auto-END), Gallery curation, Guide editor, Strip config | 18 | admin-portal §6 e2e; offers cron test |
| R5.5 | VenueMap consolidation (M6) + designer palette embed (designer itself is R2.5; this is the library/clone UX around it) | 12 | clone-to-event intact; old tables dropped post-window |
| R5.6 | Event-create wizard (4 steps, resume-safe) | 10 | wizard e2e → publish → landing revalidates |

## Phase R6 — Delight (after R3/R5 deps named; ~46h)

| Pkg | Scope (delight.md) | Deps | h | Acceptance |
| --- | --- | --- | --- | --- |
| R6.1 | Ticket reveal + confetti + flip motion (§1, §3, §4) | R3.4 | 12 | storyboard timings ±10%; reduced-motion jump; plays once |
| R6.2 | Share art (M7): generator spike (satori vs Cloudinary overlay — acceptance decides), fulfilment hook, share/download (§2) | R3.4 | 12 | PNG <300KB <800ms; fallback path test |
| R6.3 | Happening strip + admin config (§5) | R1.5, R5.4 | 6 | window/priority tests; never-empty |
| R6.4 | Kiosk celebration states (§6) | R5.3, R1.2 | 8 | fixture page matches state table; gate drill sign-off |
| R6.5 | Concierge: inbound webhook (signature), keyword router, T−24h/T−2h/post templates, admin manager (§7) | R5.4 | 12 | webhook auth test; routing units; templates submitted to Meta (checklist) |

## Phase R7 — Performance & hardening (~28h)

R7.1 ISR rollout + revalidate hooks + QR pre-generation + Geist-out-of-root + firebase dynamic
import (performance §2-3) — 12h; budgets in CI. · R7.2 Security S2: upload constraints,
`KYC_ENC_KEY` required, logout limiter, CF-Connecting-IP (security §5) — 8h; tests. ·
R7.3 k6 load suite (orders+webhook+scan 50RPS) + fixes — 8h; thresholds green.

## Phase R8 — Launch

Run [launch-readiness.md](launch-readiness.md) top to bottom: scheduler (§1), env+migration
order, ₹1 live purchase, WhatsApp template approvals (started during R6.5!), drills, runbooks,
go/no-go. No package merges after go/no-go except incident fixes.

## Dependency graph (summary)

```
R0 ──► R1 ──────────────► R3 ──► R6.1/6.2
  └──► R2 ──► R2.5 (map) ─┤
  └──► R5.1/5.2 ──► R5.3/5.4/5.5/5.6 ──► R6.3/6.4/6.5
        R2 ──► R4 (∥ R3; R4.1 stall sheet needs R2.5.10)
R3.5 needs R2.5 (zones/anchors) · R5.5 needs R2.5.1
R3+R4+R5 ──► R7 ──► R8
```

## Standing rules for every package

1. Read the cited spec sections first; the spec decides, not the agent.
2. Tests ship in the same PR; debt rows closed in the same PR update design-debt.md.
3. No new dependencies without a spec citation (currently authorized: Sentry SDK, satori+resvg
   pending R6.2 spike).
4. Feature-flag anything user-visible that lands before its phase completes
   (`NEXT_PUBLIC_*` flags are build-inlined — flip requires redeploy).
5. Anything not in changes.md §3 feature spec = out of scope; open a V2 note instead.
