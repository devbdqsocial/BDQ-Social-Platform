# build-plan.md — Step-by-Step Execution Checklist

> Spec 18. The point-to-point companion to [implementation-roadmap.md](implementation-roadmap.md)
> (which stays the scope/hours/acceptance authority). This file is the **working checklist**:
> every package broken into ordered sub-steps with exact files, commands, and proof. Agents tick
> here as they go. Conduct rules: [AGENT_RULES.md](AGENT_RULES.md).

## 0. How to use

- **Status:** `[ ]` todo · `[~]` in progress · `[x]` done (ONLY after its Verify passes) ·
  `[s]` skipped-with-reason (reason inline). Tick in the same PR as the work.
- **One package = one branch = one PR.** Branch `rebuild/<pkg>-<slug>` (e.g.
  `rebuild/r2.5.2-calibration`), based on the integration branch (see P-0.3). Commit style
  `<area>(<pkg>): <what>`.
- **Verify is the law.** Every step names its proof. No proof, no tick. Failures are reported
  honestly in the session log (§12).
- **The spec decides.** Each package cites its spec section; read it BEFORE coding. Unanswered
  question → stop, ask owner, record answer as a doc amendment in the same PR.
- **Per-PR checklist (every PR):** typecheck ✓ lint ✓ `test:run` ✓ build ✓ · tests for new
  logic in-PR · design-debt.md rows closed if touched · no new deps · no scope outside
  changes.md §3 · build-plan ticks updated · session log row added.

---

## P-0. Pre-flight (one session, before any package)

- [x] **P-0.1** Commit the blueprint: `git add Docs/audit && git commit` on
      `feature/security-hardening` — message `docs(blueprint): 18-doc rebuild blueprint`.
      Verify: `git status` clean; 18 files in `git show --stat HEAD`. ✓ 18 files, +3527.
- [x] **P-0.2** Owner decision recorded: merge `feature/security-hardening` → `main` now, or
      rebuild on top of it (it is 17 commits ahead, all launch hardening). Default if no answer:
      **rebuild branches base off `feature/security-hardening`**; record choice here:
      **default taken — rebuild/main based off feature/security-hardening (2026-06-12)**.
      Workflow amendment ✔owner: one verified commit per package directly on `rebuild/main`,
      no PR ceremony (AGENT_RULES updated).
- [x] **P-0.3** Create integration branch `rebuild/main` off the P-0.2 base. All package
      commits land on `rebuild/main`; it merges to the deploy branch at phase gates only.
      Verify: branch pushed; CI runs on it. ✓ pushed to origin.
- [x] **P-0.4** Baseline green on `rebuild/main`: `npm run typecheck && npm run lint &&
      npm run test:run && npm run build`. Verify: all four exit 0; record vitest file/test
      counts here: **43 files / 158 tests, all passing; build 82 pages; lint 0 errors
      (10 pre-existing warnings in test files)**.
- [ ] **P-0.5** Ops accounts timeline (start now, needed later):
      - [ ] Sentry org + project, DSN into Vercel env (**needed by R0.5**)
      - [ ] External scheduler account (cron-job.org or GitHub Actions schedule) — configure in
            R8, create account now (**launch blocker, failure-analysis #3**)
      - [ ] Meta WhatsApp Cloud API: WABA verified, phone number, then submit
            `event_tomorrow` / `event_today` / `event_thanks` templates (**during R6.5 — weeks
            of lead time**)
      - [ ] Confirm Cloudinary/Razorpay/Resend/Neon prod creds present in Vercel env
            (`.env.example` is the key list)
- [x] **P-0.6** Read-once ritual for every participating agent: AGENT_RULES.md + the spec docs
      for their assigned phase. Verify: session log row says "rules read". ✓ session 1.

---

## Phase R0 — Foundations (serial, ~40h) — roadmap R0, architecture §3/§6, security §3.6

**R0.1 Tests into git + CI** (4h)
- [x] a. Remove the test-ignore lines from `.gitignore` (the block covering `*.test.ts`,
      `vitest.config.ts`, `e2e/`); `git add` all 43 test files + `vitest.config.ts`,
      `vitest.server-only.stub.ts`, `playwright.config.ts`, `e2e/`.
      Verify: `git ls-files '*.test.ts' | wc -l` ≥ 43. ✓ 43 committed.
- [x] b. `.github/workflows/ci.yml`: add `npm run test:run` step after typecheck; make
      `npm audit --omit=dev --audit-level=high` blocking (remove `continue-on-error`).
      Verify: local `test:run` green (158/158) + CI watched on push; deliberate-failure drill
      deferred to first real red. ✓
- [x] c. Add e2e smoke job gated on repo var `E2E_ENABLED=true` + `secrets.DATABASE_URL_TEST`
      (skips cleanly when unset). Verify: job listed as skipped in workflow run. ✓

**R0.2 Middleware diet** (6h) — architecture §2, changes DR-2
- [ ] a. Delete `mapAdminPath` + `getPrettyPath` + both rewrite/redirect blocks from
      `src/middleware.ts` (lines ~57-271); keep zone resolution, CSP nonce, coming-soon gate.
- [ ] b. Delete `adminRedirects` from `next.config.ts:24-34` and its `redirects()` usage.
- [ ] c. Sweep pretty hrefs → physical `/admin/...` paths: `components/admin/nav-config.ts`
      (all `href:` values), `breadcrumbs.tsx`, `command-palette.tsx`, `user-menu.tsx`,
      `notifications-bell.tsx`, admin `login/page.tsx` redirect, server-side notification
      hrefs: `server/cron/tasks.ts` (`/finance/pnl`), `server/notifications/admin.ts` callers
      (grep `href: "/` in `src/server` + `src/components/admin`).
- [ ] d. Verify: `grep -r "mapAdminPath\|getPrettyPath" src` = 0; dev server: every nav leaf
      + event-switcher + bell links resolve (e2e crawl or manual click-through, list checked
      pages in PR); admin login → `/admin/dashboard`.

**R0.3 `action()` pipeline** (10h) — architecture §3
- [ ] a. Create `src/server/action.ts`: `action(opts)(handler)` composing auth → zod parse →
      handler → audit → `Result<T>` envelope (`{ok:true,data}|{ok:false,error:{code,message}}`);
      `src/lib/result.ts` for the shared type. Unit tests for every branch (unauthZ, invalid,
      handler throw, audit failure non-blocking).
- [ ] b. Migrate 3 pilots: `admin/(console)/events/actions.ts`,
      `tickets/coupons/actions.ts`, `vendors/actions.ts`. No behavior change.
- [ ] c. Client: `useActionToast()` (or equivalent) wiring sonner success/error from `Result`.
      Verify: pilot mutations show toasts; AuditLog rows written; tests green.

**R0.4 Guard renames + RBAC tests** (8h) — security §3.2/§4
- [ ] a. `server/auth/guard.ts`: `requireSuperAdmin` → `requireAdminRole` (passes
      SUPER_ADMIN+ADMIN), `requireSuperAdminOnly` → `requireSuperAdmin` (strict). Update ALL
      call sites (grep both old names to zero).
- [ ] b. New `src/server/auth/rbac.test.ts`: matrix from security.md §4 — every
      role×section/action expectation, incl. new sections (content, addons, concierge).
      Verify: `grep -r "requireSuperAdminOnly" src` = 0; matrix tests green.

**R0.5 Sentry** (6h) — security §3.3
- [ ] a. Add `@sentry/nextjs` (authorized dep), `instrumentation.ts` + config; no-op when
      `SENTRY_DSN` unset (dev).
- [ ] b. Bridge `lib/logger.ts`: `logError` → Sentry capture with context tags.
- [ ] c. Dashboard: create the 5 alert rules (security §3.3: webhook BAD_SIGNATURE spike,
      AMOUNT_MISMATCH any, outbox FAILED>10, cron task error, 5xx rate) — checklist in PR.
      Verify: thrown staging error appears with release tag; one test alert fired.

**R0.6 Phase close** (2h)
- [x] a. `lib/adapters.ts` — already deleted (verified 2026-06-12). Pre-done.
- [ ] b. Full green sweep on `rebuild/main` after merges. Verify: CI green; tick phase gate.

**GATE R0 → R1/R2:** CI blocking (tests+audit) · middleware ≤ ~120 lines · pilots on
`action()` · RBAC matrix green · Sentry receiving. All ticks above `[x]`.

---

## Phase R1 — Money correctness (~46h) — roadmap R1; R1.1∥R1.2 then R1.3∥R1.4∥R1.5

**R1.1 Oversell guard** (6h) — security §3.1, DR-6
- [ ] a. In `fulfillOrder` txn (`server/tickets/service.ts`): replace unconditional
      `soldQty: { increment }` with conditional raw UPDATE
      (`... SET "soldQty"="soldQty"+qty WHERE id=? AND "soldQty"+qty<=totalQty`); affected-rows
      check → on shortfall: no tickets, AuditLog `REJECT OVERSOLD`, ops alert, keep payment
      CAPTURED for manual resolution (no auto-refund — locked rule).
- [ ] b. Concurrency test: two PENDING orders for the last ticket, parallel fulfil → exactly
      one issues. Verify: test green; AMOUNT_MISMATCH path untouched (existing test still green).

**R1.2 Group-QR (M1)** (16h) — architecture §4.2, DR-4
- [ ] a. Migration `ticket_admit_count` (additive): `Ticket.admitCount`, `CheckIn.admitted`.
      **Apply to prod Neon (ep-dry-sunset) BEFORE merging dependent code.**
- [ ] b. `fulfillOrder`: one ticket per order line with `admitCount=qty` (replaces qty×rows);
      comps service same.
- [ ] c. `checkInByToken`: admit flow returns `admitCount`; `CheckIn.admitted` recorded;
      idempotency by `clientScanId` unchanged. Capacity/board queries → `sum(admitted)`.
- [ ] d. Delivery: 1 QR per line; wallet shows "Admits N".
      Verify: e2e buy-5 → one QR → scan admits 5 → board shows 5; webhook replay no-dup;
      unit tests for partial-line orders (2×General+1×VIP → 2 tickets).

**R1.3 Booking-state collapse (M2)** (10h) — architecture §4.1
- [ ] a. Code first (tolerant): map HELD→RESERVED, PENDING→PENDING_PAYMENT in services + admin
      UI + cron (`release-holds`, payBy expiry). State-machine unit tests
      (RESERVED→PENDING_PAYMENT→BOOKED, expiries, admin reject).
- [ ] b. Migration `booking_states_collapse` (destructive: enum value drops) ships ONE deploy
      after (a) is live. Verify: `grep -rn "\"HELD\"\|\"PENDING\"" src/server src/app` → 0
      booking-context hits (D23); cron expiry e2e green.

**R1.4 Coupon UI + pending state** (8h) — customer-portal §3.10
- [ ] a. `TicketCheckout`: coupon input (apply → server-priced total, "saves ₹X" line, error
      copy per spec); passes `couponCode` to `/api/orders` (API already accepts it).
- [ ] b. Wallet pending-payment state: order PAID-pending poll (5s, max 2min) with "payment
      confirmed — tickets appearing" skeleton. Verify: e2e coupon purchase; delayed-webhook
      test shows pending then ticket.

**R1.5 `getHomeMode` + now/next** (6h) — customer-portal §3.1/3.3
- [ ] a. Pure utils + queries (PRE/LIVE/POST mode; now/next per stage, IST edge tests,
      open-ended `endsAt` = start+45m). Verify: unit tests incl. clock mocks.

**GATE R1:** all money tests green in CI (oversell, group-QR, replay, states, coupon).

---

## Phase R2 — Design system (~38h, ∥ R1) — roadmap R2, design-system.md, consistency §8

**R2.1 Tokens** (14h)
- [ ] a. `globals.css`: clamp()-based RPA scale + 16px input floor; delete legacy gold/clay
      aliases; z-scale per design-system §1.6; remove `!important`s; stall-color single source.
- [ ] b. `BRAND_NAVY` const → `razorpay-checkout.ts:50` (kills `#C2603B`, D1).
- [ ] c. ESLint rule banning inline `fontSize` styles + raw hex outside `globals.css`.
      Verify: consistency §8 greps all zero (D1,D6,D7,D9,D10,D12,D22,D27 closed in
      design-debt.md).

**R2.2 Component contracts** (16h)
- [ ] a. `RpaPageHeader`, empty-state rollout, badge variant cleanup (D11).
- [ ] b. Move 7 page-dir tables → `components/admin/tables/` (D13); `lib/date-formats.ts`
      adoption sweep (D14); toast rollout to all actions (D17, needs R0.3).
      Verify: greps in the closed debt rows; visual diff pass on admin list pages.

**R2.3 Motion diet** (8h)
- [ ] a. BrandsCarousel → CSS scroll-snap (drop `swiper`); admin template transition → CSS
      (drop `framer-motion`); reduced-motion JS gate in `lib/motion.ts`.
      Verify: both deps gone from `package.json` (D31); landing motion visually intact;
      `prefers-reduced-motion` kills GSAP timelines.

**GATE R2:** token greps zero · deps removed · visual sign-off on landing + one admin page.

---

## Phase R2.5 — Map System, the flagship (~115h) — map-system.md §14 (authoritative table)

**R2.5.1 Layout v2 + designer split** (10h) — FIRST; everything depends on it
- [ ] a. `src/lib/map/layout-v2.ts`: zod schema (§1) + `upgradeLayout(v1)` + size guard.
- [ ] b. Split `MapDesigner.tsx`: `useDesignerState`, `useDesignerKeyboard`, panel + tool
      components; thin shell. No behavior change.
      Verify: v1 fixtures (incl. current Aarush seed + a saved prod-shape layout) upgrade
      losslessly (tests); designer loads/saves both; all existing designer features still work.
- [ ] **R2.5.2 Calibration** (8h): upload→2-point modal (loupe zoom)→distance input (ft/m)→
      **confirm step with computed venue dims**→position+lock; banner when uncalibrated.
      Verify: known fixture (100px=50ft) → ftPerPx 0.5; stall drawn over photo = true footprint.
- [ ] **R2.5.3 Boundary + obstacles** (8h): polygon pen (≥3 pts, vertex edit), obstacle palette
      (TREE/POLE/BUILDING/WALL/WATER_BODY), out-of-bounds + overlap save-block w/ per-item
      override. Verify: fixture violations block; override saves + recorded.
- [ ] **R2.5.4 Distance tool + measurements** (6h): `M` distance tool (multi-segment, ft+m),
      live W×H/area labels, status bar, shoelace area lib + tests. Verify: fixtures ±0.1 ft.
- [ ] **R2.5.5 Layers panel** (5h): 9 fixed layers, show/hide/lock (design-system §4.8).
      Verify: hidden excluded from current-view export; locked unselectable.
- [ ] **R2.5.6 Zones** (8h): draw, 8-swatch palette, centroid labels, `zoneOf`, rollups in
      SummaryPanel v2. Verify: rollup math tests.
- [ ] **R2.5.7 Pathways** (8h): polyline strips, MAIN/SECONDARY/EMERGENCY presets, min-width +
      blocked + exit-reachability checks → validation entries. Verify: fixture layouts
      raise/clear each rule.
- [ ] **R2.5.8 Terrain** (4h): 6 patch types, render under zones. Verify: visual + export-safe.
- [ ] **R2.5.9 Align/distribute + bulk v2** (6h): 6 align + 2 distribute ops; bulk resize/
      type/status/price. Verify: geometry tests on fixtures.
- [ ] **R2.5.10 Scoring engine** (8h): `server/map/scoring.ts` pure lib with §9.1 weight table
      + `describeStall`; Sales-view badges (`S` toggle). Verify: weight tests; badge tiers.
- [ ] **R2.5.11 Price suggestions** (6h): §9.2 formula (`round50`, ±25% band), inspector chip +
      Apply (single/bulk/zone) through audited mutation. Verify: formula tests; AuditLog row
      per apply; **no auto-apply path exists** (grep).
- [ ] **R2.5.12 Revenue heatmap + occupancy** (6h): quintile fills, legend, zone cards;
      occupancy = used/venue. Verify: math tests.
- [ ] **R2.5.13 Versions** (8h): named snapshots (cap 10, warn at 8), restore-as-commit,
      compare (stat diff + ghost overlay). Verify: restore undoable; cap enforced.
- [ ] **R2.5.14 Vendor preview + search** (6h): preview lens toggle; search/focus (`/`) +
      admin ⌘K entries. Verify: preview hides admin layers; "A12" zooms+pulses.
- [ ] **R2.5.15 Exports** (8h): PNG 2×; PDF vendor/ops/print via `@react-pdf/renderer`
      (existing dep) with title block + 50 ft scale bar from calibration; naming convention.
      Verify: 4 artifacts from the seed map; scale bar measures correctly against ftPerPx.
- [ ] **R2.5.16 Entry-flow + ops polish + validation panel** (10h): entry objects w/ lanes,
      throughput calc (`lib/map/throughput.ts`, tested), ops objects palette in ops mode (`O`),
      validation drawer consolidating §4/§7/§8 checks + duplicate-label + unpriced-stall.
      Verify: throughput math tests; ops PDF shows gates/medical/power; panel rows focus objects.

**GATE R2.5:** real Aarush Lawn underlay calibrated on staging (gate 3.15 dry-run) · designer
60fps with 500-element fixture on mid Android (perf budget row) · all §14 acceptances green ·
owner walks the designer once and signs off in the session log.

---

## Phase R3 — Customer surfaces (~96h, after R1+R2; R3.5 also needs R2.5) — roadmap R3

- [ ] **R3.1 Coming-soon** (8h): "Poster" direction, dynamic countdown target (D8, D26).
      Verify: Lighthouse ≥95; target from event/SystemSetting.
- [ ] **R3.2 Landing rebuild** (20h): customer-portal/changes §6.2 section order, proof band,
      real-count bindings (D24, D25, D30), ISR. Verify: LCP ≤2.5s; no static-claims grep.
- [ ] **R3.3 Event detail + checkout** (16h): sticky CTA, inline OTP sheet, skeleton (D18),
      ISR. Verify: anonymous→buy e2e at 390px; budget met.
- [ ] **R3.4 Wallet + profile + tab bar** (16h): 4-tab IA (D20, D29), flip-card structure,
      share/download, offline precache. Verify: e2e flip+share; offline render.
- [ ] **R3.5 Public/customer map** (14h): map-system §11b lens (zones, anchors, brand sheet,
      category chips, search, navigate-to) replacing demo statuses (D2).
      Verify: `grep assignDemoStatuses src` → dev fixtures only; axe pass.
- [ ] **R3.6 Schedule** (8h): now/next via R1.5. Verify: time-mocked now-line test.
- [ ] **R3.7 Discover + brand detail** (10h). Verify: filter e2e; SEO meta.
- [ ] **R3.8 Guide + Gallery** (8h, content-gated). Verify: gates behave (≥8 photos, non-empty).
- [ ] **R3.9 Offers surface** (8h). Verify: publish→appears; ended→greys.
- [ ] **R3.10 Home modes** (8h): PRE/LIVE/POST wiring. Verify: clock-mocked flips.

**GATE R3:** full anonymous→ticket e2e on phone viewport · budgets green on all 7 customer
pages · axe pass.

---

## Phase R4 — Vendor surfaces (~52h, after R2; R4.1 sheet needs R2.5.10) — roadmap R4

- [ ] **R4.1 RPA rebuild** (28h): home spine + timeline + step forms + leads + contract
      (vendor-portal §3-§7); stall picker sheet with zoom-in + why-bullets + distance chips
      (map-system §11). Verify: dry-run vendor e2e at 390px; copy matches spec.
- [ ] **R4.2 Add-ons (M5)** (14h): migration prod-first; vendor flow; webhook dispatch branch;
      stock guard. Verify: e2e add-on order; oversold test; replay no-dup.
- [ ] **R4.3 SLA surfacing** (6h): UNDER_REVIEW aging + admin tile + vendor wait copy.
      Verify: >48h fixture fires tile.
- [ ] **R4.4 Lead QR print + day chips** (4h). Verify: print snapshot.

**GATE R4:** one real human completes vendor signup→pay on staging with owner watching.

---

## Phase R5 — Console (~78h, R5.1/5.2 after R0; rest after R1) — roadmap R5

- [ ] **R5.1 Diet + nav** (16h): remove Task Center (D3) + budgets/settlements/deep analytics;
      final nav tree (admin-portal §1); POS + Settings in nav (D19); `<ResponsiveTable>` (D28);
      event-detail tabs→routes (D32). Verify: removed routes 404; nav==spec per role.
- [ ] **R5.2 Command Center** (12h): 6 tiles + alert row + chart + activity (admin-portal §2).
      Verify: seeded reconciliation test (tiles match seed math).
- [ ] **R5.3 Kiosk mode** (16h): launcher, fullscreen, wake-lock, offline badge, manual entry;
      ops status strip; staff sign-out-everywhere. Verify: kiosk e2e chain; revoke test.
- [ ] **R5.4 Content group (M3+M4 prod-first)** (18h): Offers CRUD/workflow + auto-END cron,
      Gallery curation, Guide editor, Strip config. Verify: admin-portal §6 e2e; offers cron.
- [ ] **R5.5 VenueMap consolidation (M6)** (12h): additive create+data-migrate first; drop
      `LayoutTemplate`/`MapElement` one deploy later; library/clone UX (designer = R2.5).
      Verify: clone-to-event intact; post-window drop migration applied.
- [ ] **R5.6 Event wizard** (10h): 4 steps, resume-safe. Verify: wizard e2e → publish →
      landing revalidates.

**GATE R5:** owner runs create-event→publish→sell→scan rehearsal entirely from the new console.

---

## Phase R6 — Delight (~46h; deps per package) — delight.md

- [ ] **R6.1 Ticket reveal + confetti + flip** (12h, needs R3.4). Verify: storyboard timings
      ±10%; reduced-motion jump; plays once.
- [ ] **R6.2 Share art (M7)** (12h, needs R3.4): generator spike (satori+resvg vs Cloudinary
      overlay — acceptance decides, dep authorization in AGENT_RULES), fulfilment hook,
      share/download. Verify: PNG <300KB <800ms; fallback test; **QR never on the image**.
- [ ] **R6.3 Happening strip + config** (6h, needs R1.5+R5.4). Verify: window/priority tests.
- [ ] **R6.4 Kiosk celebration** (8h, needs R5.3+R1.2). Verify: fixture page matches state
      table; included in gate drill.
- [ ] **R6.5 Concierge** (12h, needs R5.4): inbound webhook (Meta signature), keyword router,
      T−24h/T−2h/post sequence, admin keyword manager. **Submit Meta templates at package
      start.** Verify: webhook auth test; routing units; template submissions screenshotted.

---

## Phase R7 — Performance & hardening (~28h) — roadmap R7

- [ ] **R7.1** ISR rollout + revalidate hooks + QR pre-generation + Geist scope + firebase
      dynamic import (12h). Verify: budgets in CI green (performance §1 incl. designer row).
- [ ] **R7.2** Security S2: upload constraints (incl. underlay rules, security §3.4),
      `KYC_ENC_KEY` required, logout limiter, CF-Connecting-IP (8h). Verify: tests + headers.
- [ ] **R7.3** k6 load suite: orders+webhook+scan at 50 RPS (8h). Verify: thresholds green.

---

## Phase R8 — Launch

- [ ] Run [launch-readiness.md](launch-readiness.md) top-to-bottom as the checklist of record:
      scheduler live (§1) · env+migration order · gates 3.1–3.16 (incl. **3.15 venue
      calibration + 3.16 map sales pack**) · ₹1 live purchase · drills · runbooks ·
      go/no-go sign-off. No merges after go/no-go except incident fixes.

---

## 12. Session log (append one row per agent session)

| Date | Agent/session | Package(s) | Result (done/blocked+why) | Verify run |
| --- | --- | --- | --- | --- |
| 2026-06-12 | blueprint session | docs 1-18 | blueprint complete | n/a |
