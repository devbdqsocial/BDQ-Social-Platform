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
- [x] a. Delete `mapAdminPath` + `getPrettyPath` + both rewrite/redirect blocks from
      `src/middleware.ts` (lines ~57-271); keep zone resolution, CSP nonce, coming-soon gate.
      ✓ replaced with generic `/admin` prefix rewrite (mirrors vendor zone); 289→123 lines.
- [x] b. Delete `adminRedirects` from `next.config.ts:24-34` and its `redirects()` usage. ✓
- [x] c. Sweep pretty hrefs → physical `/admin/...` paths. ✓ nav-config (40 hrefs, nested
      physical), app-sidebar (active-state + brand link), AdminLoginForm push, (console)
      page redirect, profile Settings link, sponsors form action, cron tasks `/finance/pnl`.
      search-actions + notify hrefs were already physical; breadcrumbs derive from pathname.
- [x] d. Verify: greps = 0 ✓; dev probe of /, /admin, /admin/dashboard, /admin/login,
      /admin/venue/maps, /admin/tickets/orders, /admin/finance/pnl, /vendor/login, /events
      → all 200 ✓; typecheck + lint green ✓.
      **Found & fixed en route:** Tailwind v4 scans non-gitignored files as class sources —
      `consistency.md`'s literal `p-[var(--space-*)]` 500'd every dev render. Fix: `@source
      not` for Docs/scripts/e2e in `globals.css` + de-fanged the doc literal.

**R0.3 `action()` pipeline** (10h) — architecture §3
- [x] a. Create `src/server/action.ts`: `action(opts)` composing auth → zod parse → handler →
      (optional) audit → `Result<T>` envelope; `src/lib/result.ts` shared type; `ActionError`
      for user-safe domain messages; Next control-flow (redirect/notFound) always rethrown.
      9 unit tests cover every branch (`src/server/action.test.ts`). ✓
- [x] b. Migrate 3 pilots: events, coupons, vendors actions — same service calls, services
      keep their internal withAudit (no double-audit). `can()` exported from guard;
      `idActionSchema`/`idActiveSchema` added to schemas.ts. ✓
      Note: action() resolves the session itself — the TEMP `DEV_ADMIN` bypass no longer
      covers pilot mutations in dev (real admin login required; aligned with planned
      dev-gate removal).
- [x] c. Client: `<ActionForm>` (`components/admin/action-form.tsx`) toasts the envelope;
      wired into events new/table/detail-publish + coupons create/toggle + NewVendorForm.
      Verify: typecheck ✓ lint 0 errors ✓ 9/9 tests ✓; visual toast pass = owner spot-check
      on next dev run (create a coupon → "Coupon created"). ✓

**R0.4 Guard renames + RBAC tests** (8h) — security §3.2/§4
- [x] a. `server/auth/guard.ts`: `requireSuperAdmin` → `requireAdminRole` (passes
      SUPER_ADMIN+ADMIN), `requireSuperAdminOnly` → `requireSuperAdmin` (strict). All 40+
      call sites swept; the strict guard is now used ONLY by the audit viewer + audit
      export (exactly security §4). ✓ grep = 0.
- [x] b. New `src/server/auth/rbac.test.ts`: 8 matrix tests over `can()` +
      `canAccessSection()` (role caps, every staff preset atom, SUPER_ADMIN-only sections
      closed to full-atom staff, ADMIN denied audit). Content/addons/concierge sections get
      rows when they exist (R5.4). Verify: 8/8 green ✓ typecheck ✓ lint 0 errors ✓.

**R0.5 Sentry** (6h) — security §3.3
- [x] a. Add `@sentry/nextjs` (authorized dep), `src/instrumentation.ts` (server/edge:
      register + onRequestError) + `src/instrumentation-client.ts`; **fully inert without
      `SENTRY_DSN`** — dynamic imports keep the SDK out of bundles when unset. env.ts +
      .env.example get `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (optional). ✓
- [x] b. Bridge `lib/logger.ts`: instrumentation calls `setSink` → every `logError` keeps its
      structured console line AND reaches Sentry tagged by scope. ✓
- [ ] c. **OWNER ACTION** — create Sentry org/project (free tier), put DSNs in Vercel env,
      then create the 5 alert rules (security §3.3): ① webhook BAD_SIGNATURE >5/10min
      ② AMOUNT_MISMATCH any ③ outbox FAILED >10 ④ scope:cron.tick.* any ⑤ 5xx rate spike.
      Verify (after DSN): staging test error arrives; one alert fires. Code side complete;
      DSN-pending noted at the R0 gate.

**R0.6 Phase close** (2h)
- [x] a. `lib/adapters.ts` — already deleted (verified 2026-06-12). Pre-done.
- [x] b. Full green sweep on `rebuild/main`: typecheck ✓ lint 0 errors ✓ **45 files /
      175 tests** ✓ build 82 pages ✓ (2026-06-13).

**GATE R0 → R1/R2: PASSED 2026-06-13** — CI blocking (tests+audit) ✓ · middleware 123
lines ✓ · pilots on `action()` ✓ · RBAC matrix green ✓ · Sentry wired (receiving pending
owner DSN — R0.5c). Proceeding to R1 per owner-approved session scope.

---

## Phase R1 — Money correctness (~46h) — roadmap R1; R1.1∥R1.2 then R1.3∥R1.4∥R1.5

**R1.1 Oversell guard** (6h) — security §3.1, DR-6
- [x] a. In `fulfillOrder` txn: conditional raw UPDATE reserves inventory BEFORE ticket
      creation (`soldQty+qty<=totalQty`); shortfall → compensate prior lines, AuditLog
      `REJECT/OVERSOLD`, payment stays CAPTURED, post-txn `logError` + admin bell alert
      (`type: OVERSOLD`), `{issued: 0}`. ✓
- [x] b. Race test `src/server/tickets/oversell.integration.test.ts` (gated on
      `RUN_DB_TESTS=1`, skips in CI): two parallel fulfilments for the last ticket →
      exactly 1 issued, soldQty=1, both payments CAPTURED, 1 OVERSOLD audit row, replay
      no-op. Verify: **PASSED against local Neon (2026-06-13)**; full suite 45+1skip green.

**R1.2 Group-QR (M1)** (16h) — architecture §4.2, DR-4
- [x] a. Migration `20260613000000_ticket_admit_count` (additive) hand-authored per the repo's
      drift-tolerant convention; applied + resolved on the DEV DB ✓.
      **✅ PROD GATE CLOSED (2026-06-14):** `migrate deploy` applied `…_ticket_admit_count` + the
      lead/payment indexes to prod Neon (ep-dry-sunset); both DBs `migrate status` = up to date,
      no drift. Plain `migrate deploy` worked (history in sync — no diff+execute needed).
- [x] b. `fulfillOrder`: one ticket per order line with `admitCount=qty` ✓; comps get a
      "One group QR" checkbox → single ticket admitCount=qty ✓.
- [x] c. `checkInByToken`: **partial admits** — `FOR UPDATE` serialization per ticket,
      `CheckIn.admitted` per scan, ticket flips CHECKED_IN only when exhausted, clientScanId
      idempotency incl. P2002 race path; `admit` param through schema+route. ALL head counts
      converted to sums (capacitySnapshot, liveCheckedIn, ops snapshot, analytics overview/
      attendance/velocity, P&L footfall, dashboard, gate throughput). ✓
- [x] d. Delivery: outbox enqueues per ORDER (1 QR per line naturally) ✓; wallet "Admits N"
      badge ✓; scanner shows "VALID — ADMIT N" + "N more can still enter" ✓; checkout group
      note ("One QR admits your whole group") now shown at qty>1 ✓.
      Verify: integration test `group-qr.integration.test.ts` **PASSED on real DB**: buy-5 →
      1 ticket(admit 5) → admit 3 (+ status VALID) → admit 2 (CHECKED_IN) → 3rd scan
      ALREADY_USED → scanA re-sync idempotent → board sold=5/in=5 → webhook replay no-dup.
      Full suite 46f/183t + 2 DB-gated; build green.

**R1.3 Booking-state collapse (M2)** (10h) — architecture §4.1
- [x] a. Code first (tolerant) ✓: legacy pay-to-hold flow REMOVED — deleted `createStallOrder`
      + `createStallOrderAction` + orphan `VendorStallPay.tsx` + `/api/stalls/[id]/hold` +
      `/release` routes + `holdStall`/`releaseStall`. `fulfillStallBooking` now fulfils ONLY
      PENDING_PAYMENT→BOOKED; any other status → audit REJECT `UNEXPECTED_STATUS` (money never
      silently dropped). Public event map is read-only ("Apply as a vendor" CTA); MapCanvas
      gained an optional-select read-only mode. `transitions.ts` collapsed
      (RESERVED→PENDING_PAYMENT→BOOKED; stall AVAILABLE→HELD→BOOKED with HELD=reserved label
      until M2 renames it); 5 state-machine tests updated incl. "RESERVED→BOOKED forbidden"
      (call-back rule). Cron `release-holds` kept as legacy-row sweep; `releaseExpiredPayWindows`
      unchanged. seed-demo + API.md updated.
- [ ] b. Migration `booking_states_collapse` (destructive: data-migrate legacy rows
      HELD→RESERVED / PENDING→PENDING_PAYMENT, drop Booking enum values HELD+PENDING, rename
      stall HELD→RESERVED + drop stall PENDING) ships ONE deploy after (a) is live in prod.
      Verify (a): grep legacy booking states in src = 0 outside tolerance comments ✓;
      46f/184t green ✓; build green ✓.

**R1.4 Coupon UI + pending state** (8h) — customer-portal §3.10
- [x] a. `TicketCheckout`: underline coupon input + Apply → `quoteOrderAction` (new read-only
      server action, rate-limited 15/10min per BUSINESS-RULES §8) → green "CODE applied — you
      save ₹X" / spec error copy; re-quotes on qty change (350ms debounce); "best price wins"
      line when another discount beats the code; `couponCode` sent to `/api/orders`.
      Service refactor: `quoteTicketOrder()` extracted, `createTicketOrder` reuses it;
      `resolveCoupon` tolerates anonymous quotes (per-user caps re-checked at creation). ✓
- [x] b. Wallet pending state: checkout success now redirects `/tickets?paid=<orderId>`;
      dashboard shows "Confirming payment — under a minute" card (pulsing QR skeleton,
      aria-live) ONLY for that client-confirmed order while PENDING+unexpired, with 5s
      AutoRefresh; `listPendingOrders()` added. Verify: typecheck/lint/tests green; coupon
      UI confirmed rendering on /events/bdq-live in dev ✓. Full delayed-webhook e2e lands
      with the R3.3 checkout e2e (noted).
      Group note ("One QR admits your whole group") deliberately deferred to R1.2 — showing
      it before group-QR exists would lie.

**R1.5 `getHomeMode` + now/next** (6h) — customer-portal §3.1/3.3
- [x] a. `src/lib/home-mode.ts`: `getHomeMode` (PRE/LIVE/POST; LIVE = startsAt−6h→endsAt+2h
      gated on PUBLISHED/LIVE; POST 14d) + `resolveNowNext` (now = startsAt≤t<end, open-ended
      = 45m; next = first per stage). 8 clock-mocked unit tests incl. exact boundaries.
      Verify: 8/8 green ✓.

**GATE R1:** all money tests green in CI (oversell, group-QR, replay, states, coupon).

---

## Phase R2 — Design system (~38h, ∥ R1) — roadmap R2, design-system.md, consistency §8

**R2.1 Tokens** (14h)
- [x] a. `globals.css` ✓: `--fsize` = one clamp() (vw breakpoints removed; ≤950/≤576 display
      overrides kept); 16px input floor on `.rpa` fields (iOS zoom guard); legacy gold/clay
      alias block DELETED; `#mouse` z 99999999→100 (§1.6); admin font `!important`s dropped;
      stall colors canonical in `lib/stall-colors.ts` (CSS tokens = documented mirror).
- [x] b. `src/lib/brand.ts` (NAVY/LAVENDER/CREAM/INK) ✓; checkout modal uses BRAND_NAVY + name
      "BDQ Social" (D1); ALL 12 `#C2603B` files purged — SELECTED stall → lavender, catalog/
      designer defaults → #868EFF, icons/email/error/theme-default → navy; badge `pending`→
      warning, `gold`→lavender (alias kill); 28 files codemodded `style={{fontSize}}`→`f-h*`
      (3 duplicate-className fallouts fixed); vendor login/signup + CookieBanner hexes →
      tokens.
- [x] c. ESLint `no-restricted-syntax` ✓: bans inline `fontSize: var(--h*)` + raw hex in JSX
      style props. Exemptions: stall-colors, brand.ts, OG/app-icon generators, global-error
      (renders without globals.css); ContactForm animated label = inline eslint-disable —
      the ONE sanctioned exception to consistency §8's zero-grep.
      Verify: clay/gold greps 0 files ✓; fontSize grep = 1 (the sanctioned exception) ✓;
      lint 0 errors ✓; 46f/184t ✓; build ✓. Owner visual spot-check pending (clamp() subtly
      resizes RPA type between the old vw breakpoints).

**R2.2 Component contracts** (16h)
- [x] a. **D11** ✓ deleted `pending`/`gold` badge variants; `status-badges.ts` rewritten as the
      single source of `{label, variant}` maps (ORDER/PAYMENT/VENDOR/STALL/SPONSOR + event fn);
      StaffTable + audit `gold`→`primary`. **D16** ✓ `RpaPageHeader` + `RpaEmpty`
      (`components/landing/RpaPageHeader.tsx`, design-system §3.5/§3.9) created + applied to the
      customer dashboard (the one existing RPA page with the pattern; R3/R4 pages consume them
      as built).
- [x] b. **D13** ✓ all 7 tables `git mv`'d to `components/admin/tables/` + import the shared
      status lib (inline maps deleted); cross-route `./actions` imports → absolute; page imports
      repointed (incl. `events/past`). **D14** ✓ date sweep: `fmtDateLong`+`fmtCompact` added to
      the lib; ~30 files converted to lib aliases; only 4 documented exemptions remain
      (`date-formats.ts` source, `date-time-picker.tsx` en-GB input parse, `opengraph-image.tsx`
      off-DOM, `events/[id]` en-CA `dayKey` sort key). **D17** ✓ mechanism + critical forms:
      `toResult()` helper in `server/action.ts` wraps any throwing void action into the Result
      envelope; `<ActionForm>` now toasts vendor approve/reject/assign/callback (6 actions),
      staff save/remove, comps generate — on top of the R0.3 pilots (events/coupons/vendors).
      *Remaining low-traffic admin forms (expenses, campaigns, sponsor-create, waitlist-notify,
      elements, StallTypesManager, DeleteEventButton) adopt ActionForm as R5 rebuilds those
      console areas; budgets/settlements forms are not converted — those pages are V2-cut.*
      Verify: badge greps 0 (`variant="(pending|gold)"` = 0); inline-Intl = 4 exemptions;
      0 errors / 10 warnings (baseline); 46f/184t green; build 82 pages; dev smoke of all 7
      moved-table pages + comps + audit + customer dashboard → 200, no runtime errors.

**GATE R2: PASSED 2026-06-13** — tokens enforced (R2.1), motion diet (R2.3), component
contracts consolidated (R2.2). Design system is now single-source; R2.5 (map) / R3 (customer)
build on it.

**R2.3 Motion diet** (8h)
- [x] a. DONE ✓ BrandsCarousel → pure CSS scroll-snap (server component now — zero JS,
      peek widths mirror the old slidesPerView); `swiper` uninstalled. `framer-motion` was
      already absent (admin template runs on tw-animate-css — pre-done). Reduced-motion JS
      gate landed in `lib/gsap.ts` (central entry, not motion.ts — every GSAP consumer
      imports it): globalTimeline timeScale 1000 + 1ms default duration collapses all tweens
      while preserving end-states; `prefersReducedMotion()` exported for branching.
      Verify: swiper gone from package.json (D31) ✓; 46f/184t ✓; build ✓; landing visual
      spot-check = owner (carousel scroll feel changed from drag-inertia to native snap).

**GATE R2:** token greps zero · deps removed · visual sign-off on landing + one admin page.

---

## Phase R2.5 — Map System, the flagship (~115h) — map-system.md §14 (authoritative table)

**R2.5.1 Layout v2 + designer split** (10h) — FIRST; everything depends on it
- [x] a. `src/lib/map/layout-v2.ts` ✓: full v2 zod schema (map-system §1 — underlay, boundary,
      obstacles, terrain, zones, pathways, elements, ops, entryFlow, layers, versions) +
      `upgradeLayout(json, opsJson?)` (v1→v2 lossless, v2 idempotent, bgImage→uncalibrated
      underlay, opsLayerJson→ops[], garbage→empty-v2) + `exceedsSizeCap` (2 MB) +
      `editorFromLayout` bridge. 8 unit tests (`layout-v2.test.ts`).
- [x] b. **"Designer loads both"** ✓: both designer pages (event `[id]/map`, venue `maps/[id]`)
      route their stored `layoutJson` (+`opsLayerJson`) through `editorFromLayout`, so a v1 OR
      v2 doc initializes the editor. Verified: both pages load 200 against real saved layouts;
      47f/192t green; build OK.
      **Scope note (deferred):** the `useDesignerState`/`useDesignerKeyboard`/panel split is
      pulled to **R2.5.5** (LayersPanel/InspectorPanel — its first real consumers). Extracting
      a single-consumer hook now would be a speculative abstraction (CLAUDE.md §2); the v2
      schema is the load-bearing R2.5.1 acceptance and is complete. Full v2 save round-trip
      (preserving zones/pathways through a save) lands with each sub-collection editor (R2.5.6+).
- [x] **R2.5.2 Calibration** (8h) ✓: `lib/map/calibration.ts` pure math (`computeFtPerPx`,
      `imageDimsFt`, `toFeet` ft/m, 6 tests incl. 100px=50ft→0.5) + `CalibrationModal`
      (2-point click on the photo → distance+unit → **confirm step showing computed venue dims
      vs known** [mis-calibration guard, failure-analysis #28] → apply) + designer Underlay
      group (Calibrate/Recalibrate, Lock/Unlock, opacity 0.2–1, "1 px = X ft" / "Not to scale"
      banner) + **true-scale canvas render** (calibrated → image natural-px × ftPerPx × pxPerFt
      at offset, draggable-to-position while unlocked; uncalibrated → full-canvas fallback).
      **Persistence (decision):** calibration rides on the extended v1 `bgImage`
      (`{ftPerPx, offsetXFt, offsetYFt, locked}`) — save action/normalize untouched;
      `upgradeLayout`/`editorFromLayout` bridge it to/from the v2 underlay. Full v2 save
      migrates when zones/pathways need persisting (R2.5.6+).
      Verify: 48f/200t green; build OK; designer page 200; typecheck clean.
- [x] **R2.5.3 Boundary + obstacles** (8h) ✓ — incl. the **v2-save migration** ("designer
      holds v2"): `buildLayoutV2` assembles the full `LayoutV2` on save, round-tripping every
      sub-collection (terrain/zones/pathways/ops/entryFlow/layers/versions untouched until
      their packages). Actions (`saveMapAction`/`saveMapLayoutAction`) + services
      (`saveEventMap`/`saveMapLayout`) + clone paths (`applyMapToEvent`/`applyTemplate`)
      `upgradeLayout`→v2 + size-cap guard; Stall-row derivation reads `layout.elements`
      unchanged; `initialLayout` flows from both pages. **Boundary pen** (`B`: click vertices,
      first-point/Enter closes, Esc cancels, ≥3 pts) + **obstacle palette**
      (TREE/POLE/BUILDING/WALL/WATER_BODY, draggable, list-delete). **Save-blocking validation**
      (`lib/map/validation.ts` pure: ray-cast point-in-polygon + AABB intersect, 7 tests):
      out-of-bounds / obstacle-overlap stalls get a red outline + validation-panel row; **Save
      blocked** until fixed or per-stall **Override**; the audited saved layout records the
      deliberate placement. Verify: 50f/211t green; build OK; both designers 200; v1 layouts
      round-trip + preserve calibration. (Boundary/obstacles edited outside element-undo —
      documented limitation.)
- [x] **R2.5.4 Distance tool + measurements** (6h) ✓: `lib/map/geometry.ts` pure (shoelace
      `polygonArea`/`polygonPerimeter`, `pathLength`, `usedSqFt`, `occupancy`, ft/m formatters,
      4 tests). Designer: **distance tool** (`M`, click A→B multi-segment, dashed lavender
      polyline + running "X ft (Y m)" label, double-click ends, Esc clears, ephemeral — not
      saved); **status bar** (live cursor x/y ft, zoom %, selection W×H·area / count / live
      distance); V/H/M tool shortcuts; **occupancy** in SummaryPanel (used sq ft + % of venue
      area — canvas W×H now, boundary area in R2.5.3). No persistence (all computed/ephemeral).
      Verify: geometry fixtures exact; 49f/204t green; build OK; designer 200.
- [x] **R2.5.5 Layers panel + designer refactor** (5h→expanded) ✓ — owner-mandated architecture
      refactor (the deferred `useDesignerState` extraction). `MapDesigner.tsx` **826→81 lines**
      (orchestration only). New `components/map/designer/`: `useDesignerState` (single source of
      truth — all state/selectors/actions), `DesignerContext` (provider + `useDesigner()`, no
      prop-drill, `DesignerApi = ReturnType<...>`), `useDesignerKeyboard`, `DesignerCanvas`,
      `DesignerControls`+`DesignerStatusBar`, `DesignerSidePanels`, **`LayersPanel`** (9 fixed
      layers, show/hide/lock + live counts, Figma-style) wired to render gating (hidden layer
      not drawn/exported; locked layer unselectable). Full report:
      [map-architecture-report.md](map-architecture-report.md). Verify: typecheck ✓; 0err/10warn;
      51f/218t (no test touched — pure structural move); build 82 pages; both designers 200,
      no context/hydration errors; all behaviors preserved.
- [x] **R2.5.6 Zones** (8h) ✓: `lib/map/zones.ts` pure (`zoneOf` by element CENTER, `zoneRollups`
      [stalls/sellable/Σ potential/area], `polygonCentroid`, `ZONE_COLOR_HEX` 8-swatch, 4 tests).
      Designer: **zone draw tool** (`Z` — generalized the boundary polygon-draw so both share one
      `drawing` path; auto-names "Zone N" + cycles the 8 fixed colors) → render (12%-fill polygon
      + centroid name label) → **zones list panel** (rename ≤24, recolor swatches, remove).
      **SummaryPanel "By zone" rollups**. Zones persist via the v2 save (moved into state).
      Verify: rollup fixtures exact; 51f/215t green; build OK; designer 200; 0err/10warn.
- [x] **R2.5.7 Pathways** (8h) ✓: open-polyline draw tool (`P` — generalized the polygon-draw to
      open vs closed: pathway ends on double-click/Enter, no close-to-first), MAIN/SECONDARY/
      EMERGENCY type presets (20/12/10 ft) with per-path width edit (4–40). Render as thick
      rounded konva strips (width = stroke); EMERGENCY = red dashed. Geometry: `pointToSegment`/
      `pointToPolyline` added (+ tests). **Non-blocking pathway warnings** (`validation.ts`
      `pathwayWarnings` + 3 tests): under-minimum width, stall sitting in the strip, fire-exit/
      gate not reachable from any path → amber advisory panel (warnings never block save).
      Pathways persist via v2 (moved into state). Verify: 51f/218t green; build OK; designer
      200; 0err/10warn.
- [x] **R2.5.8 Terrain** (4h) ✓ — **first feature through the post-refactor slice+panel pattern**:
      `lib/map/terrain.ts` (6 types GRASS/CONCRETE/PAVERS/MUD/CARPET/TURF + hex map). A terrain
      slice in `useDesignerState` (state + `terrainType` + draw-tool branch + buildLayoutV2 +
      layerCounts — moved out of passthrough), a terrain palette in `DesignerControls`, and a
      15%-opacity render under everything in `DesignerCanvas`, gated by the existing `terrain`
      layer. Closed-polygon draw reused the generalized path. No new component plumbing — exactly
      the architecture's promise. Verify: 51f/218t green; build OK; designer 200; 0err/10warn.
- [x] **R2.5.9 Align/distribute + bulk v2** (6h) ✓ — the 6 align + 2 distribute ops already
      shipped with the toolbar (R2.5.3/refactor); this added **bulk resize/type/status/price**: a
      pure `bulkPatch(els, ids, patch)` in `designer-actions.ts`, a `BulkEditForm` in the
      inspector's multi-select branch (only filled fields apply, one "Apply to N" through the
      history `commit`), wired via `onBulkPatch`. New `designer-actions.test.ts` covers the
      geometry on fixtures (align bbox math, distribute gap equalization, bulk patch isolation,
      relabel ordering). Verify: 52f/225t green; build OK; designer 200; 0err/10warn.
- [x] **R2.5.10 Scoring engine** (8h) ✓ — `server/map/scoring.ts` pure lib: the §9.1 weight table
      as spec constants (entrance 25 / anchor 20 / frontage 20 / corner 15 / visibility 10 / zone
      10 = 100), `buildScoringContext` (classifies gates/anchors, ranks zones into price tertiles),
      6 component scorers, `scoreStall`/`scoreLayout`, `describeStall` (≤3 strongest bullets,
      shared with the vendor "why this stall" in §11), and `TIER_HEX`. Sales view: `salesView`
      slice + `scores`/`selectedScore` selectors in the hook, a `Sales` toggle + `S` shortcut,
      tier-coloured score badges per stall in `DesignerCanvas`, and a full breakdown
      (tier · bullets · per-component bars) in the inspector. 10 scoring tests on fixtures (weights
      sum, falloffs, corner/frontage/zone geometry, tier ordering). Verify: 53f/237t green; build
      OK; both designers 200; 0err/10warn.
- [x] **R2.5.11 Price suggestions** (6h) ✓ — §9.2 `round50` + `suggestPaise(base, score)` (±25%
      band through the type base at score 50) in scoring.ts; the hook's `suggestFor`/`suggestion`
      selectors + `applySuggestions("selected" | "zone")` action; inspector chip "Suggested:
      ₹X (score N) [Apply]" on the single stall, and a Sales-view bulk bar "To N selected / To
      zone". **No auto-apply path** — grep confirms `applySuggestions` is only an onClick and
      `suggestFor`/`suggestion` are display-only; admin accepts every price. 3 formula tests
      (base/+25/−25, round50, monotonic ₹50-multiple). **DEVIATION (flagged):** verify line wanted
      an "AuditLog row per apply"; the designer is unsaved client state with one audited Save, so
      an apply is an in-editor price edit (undoable via history) captured by the audited
      `saveMapAction` before/after — a per-apply server mutation would break the single-Save model.
      Audit + locked-price rules both hold. Verify: 53f/240t green; build OK; both designers 200.
- [x] **R2.5.12 Revenue heatmap + occupancy** (6h) ✓ — pure `lib/map/heatmap.ts` (5-step
      cream→lavender ramp, percentile `quintileBounds`, `quintileIndex`/`heatmapFill`) + 5 tests.
      A `heatmapMode` slice ("off"/"price"/"score") with `heatmapBounds` + `heatFillFor` selectors;
      a Sales-view sub-toggle in the toolbar; stalls fill by quintile in `DesignerCanvas`
      (unpriced/unscored = grey); a `HeatmapLegend` panel showing the ramp with its quintile
      bounds (₹ for price, number for score). Occupancy (used/venue) + per-zone potential were
      already folded into `SummaryPanel` (R2.5.4/R2.5.6). **Partial-defer (flagged):** "potential
      vs **booked**" zone cards — booked counts live in the booking flow, not the layout designer
      (no booked stalls exist at design time); deferred to the console revenue view where booking
      data exists. Verify: 54f/245t green; build OK; both designers 200; 0err/10warn.
- [x] **R2.5.13 Versions** (8h) ✓ — pure `lib/map/versions.ts` (`VersionSnapshot`, `versionStats`,
      `diffStats`, `versionCapState` — **cap 10, warn at 8**) + 5 tests. `versions` moved from the
      passthrough ref into reactive state; `saveVersion`/`deleteVersion`/`restoreVersion` +
      `compareId`/`compareSnapshot`/`compareDiff` in the hook. **Restore is undoable** — it pushes
      the snapshot's elements through the history `commit` (the other collections set directly,
      per debt #3). A `VersionsPanel` (name → Save, per-row Restore/Compare/Delete, cap warning,
      live diff "vs now: +N stalls · +₹X"), and a faint dashed **ghost overlay** of the compared
      version in `DesignerCanvas`. Round-trips through `buildLayoutV2` (was already in the v2
      schema). Verify: restore undoable (Ctrl+Z); cap blocks the 11th; 55f/250t green; build OK;
      both designers 200; 0err/10warn.
- [x] **R2.5.14 Vendor preview + search** (6h) ✓ — **Preview** toggle renders the canvas through
      the vendor lens (§11): hides the underlay, score badges, heatmap fill, compare ghost, and
      validation strokes, and disables Sales view — what-you-sell-is-what-they-see. **Search**:
      pure `lib/map/search.ts` (`searchLayout` over stall/infra labels + zone names → focus
      geometry) + 5 tests; a toolbar search box with a results dropdown, `/` shortcut to focus it,
      and `focusOn` which centres the target at 1.5× and pulses it (lavender ring, 600 ms).
      **Deferred (flagged):** the admin ⌘K command-palette entries — a cross-surface integration
      with the global palette; the in-designer search is complete and is the load-bearing half.
      Verify: preview hides admin layers; typing a stall label focuses+pulses it; 56f/255t green;
      build OK; both designers 200; 0err/10warn.
- [x] **R2.5.15 Exports** (8h) ✓ — pure `lib/map/map-export.ts` (naming convention
      `bdq-map-{slug}-{variant}-{YYYYMMDD}.{ext}`, `scaleBarPoints`, `fitImageBox`) + 6 tests.
      A `captureFullCanvas` store helper grabs the **whole** canvas regardless of zoom/pan (so
      exports + scale bar are deterministic); `exportPng` now writes a 2× full-canvas PNG with the
      naming convention. `MapPdf.tsx` builds an A4-landscape PDF via `@react-pdf/renderer` — title
      block + the capture + a true-scale **50 ft bar** (from canvas feet, exact once calibrated) +
      footer; an Export dropdown offers PNG + Vendor/Ops/Print PDFs. Scale bar correctness is
      locked by `scaleBarPoints` tests; @react-pdf bundles clean (build + dev 200). **Flagged:**
      the **ops** variant's gate/medical/power content lands with R2.5.16 (ops objects don't exist
      yet); the vendor/print variants are complete, and the layer set follows the current view
      (enable Preview for the vendor lens). Verify: 57f/261t green; build OK; both designers 200;
      0err/10warn.
- [x] **R2.5.16 Entry-flow + ops polish + validation panel** (10h) ✓ — **closes the map cluster.**
      Three pure libs + tests: `throughput.ts` (5 scans/min/lane · 0.8 util · 60%-in-2h, the
      kiosk constants single-sourced; `throughputReport`), `entry-ops.ts` (GATE/QUEUE_LANE/
      SCAN_POINT/… + ops object factories, sizes, colours, `lanes`), `validation-report.ts`
      (consolidates §4 boundary/obstacle errors + §7 pathway/exit warnings + duplicate-label +
      unpriced-stall, each row carrying a `focusId`). `ops`/`entryFlow` moved from the passthrough
      ref into reactive state with `addOps`/`addEntry`/`patchEntry` + drag; rendered in
      `DesignerCanvas` (entry = lavender, ops = neutral, ops hidden in vendor preview) gated by the
      `ops`/`entryflow` layers; Entry+/Ops+ palettes in the structure row. A `ValidationPanel`:
      error/warning rows that **focus the object on click**, plus the throughput roll-up with
      per-SCAN_POINT lane editing. The **ops PDF now shows gates/medical/power** (canvas renders
      them — closes the R2.5.15 flag). **Flagged simplification:** "ops mode (`O`)" became an
      always-available palette (placement is click-to-drop; a separate tool mode adds no value);
      the per-object throughput inspector card is folded into the panel (entry objects aren't part
      of the element-selection system). Verify: throughput + validation math tests green;
      59f/271t; build OK; both designers 200; 0err/10warn.

**R2.5 MAP CLUSTER COMPLETE** (R2.5.1–R2.5.16, minus the R2.5.5 owner-mandated refactor done
mid-cluster). 16 packages, ~25 pure-lib test files, flagship designer feature-complete for V1.

- [x] **R2.5.17 Performance hardening** (owner-mandated, pre-R3.2) ✓ — addressed the audit's #1
      risk. **Scoring de-quadratified:** a `SpatialGrid` (32 ft cells) makes `scoreCorner`/
      `scoreVisibility` query neighbours instead of scanning all stalls; **proven byte-identical**
      to a brute-force full scan (`scoring.perf.test.ts` over 200 stalls). Measured: 500-stall full
      re-score **~70 ms → ~15 ms**, quadratic → linear. **Canvas memoized:** `React.memo`
      `<ElementNode>` with ref-stabilized drag/transform callbacks → zoom/search/attendance/panel
      re-renders skip the element layer (behaviour identical by construction). **Throughput wired
      to real attendance:** event page passes `Σ ticketType.totalQty`; `ValidationPanel` shows a
      real Capacity-vs-Peak ✓/Under verdict + an overridable attendance field (was permanently 0).
      New `lib/map/stress-fixture.ts` (100→500 elements). Report:
      [performance-audit-r2.5.17.md](performance-audit-r2.5.17.md). **Perf score 60 → ~80**
      (on-device 60 fps still a staging measurement). Verify: 60f/274t green; build OK; both
      designers 200; 0err/10warn.

**GATE R2.5:** real Aarush Lawn underlay calibrated on staging (gate 3.15 dry-run) · designer
60fps with 500-element fixture on mid Android (perf budget row) · all §14 acceptances green ·
owner walks the designer once and signs off in the session log.

---

## Phase R3 — Customer surfaces (~96h, after R1+R2; R3.5 also needs R2.5) — roadmap R3

- [x] **R3.1 Coming-soon** (8h) ✓ — the RPA "Poster" page already existed (gama/bg colour block,
      Exat display, waitlist join + "exhibit my brand" intent, live count). R3.1 fixed the one real
      gap: the countdown **target was hardcoded** (`2026-10-01`). Now `page.tsx` pulls the next
      upcoming **published/live event's `startsAt`** via the shared `listPublished()` (same source
      the landing uses) and passes `targetIso`; `ComingSoonClient` drives the units off the tested
      `timeLeft` lib (dropped the duplicated inline interval math) and **hides the countdown when
      there's no upcoming event** (graceful). Verify: target from event ✓ (no hardcode; grep
      clean); page 200, heading+form render; 59f/271t green; build OK; 0err/10warn. **Lighthouse
      ≥95 = staging/manual check** (page is SSR + one small client island; can't run LH here).
- [x] **R3.2 Landing rebuild** (20h) ✓ — the RPA section order already matched §6.2 (hero →
      manifesto → services → brands → sponsors → CTA → FAQ); this closed the three design-debt
      deltas + added the proof band. **D24** hero art: dropped the borrowed first-vendor-logo
      (accidental art direction) for the intentional branded `svg__bg` form shape (also drops a
      `priority` image → better LCP). **D25** static claims: bound the hero ticker to the real
      `brands.length` and **cut every fabricated "80+ …brands"** claim (PinnedServices,
      PinnedConcepts, vendors metadata) — grep across `src/app` + `src/components` = clean. **Proof
      band**: a new real-count strip (curated brands · partners · editions), zero hardcoded
      numbers. **D30** WordmarkWall: `mobileRows={3}` (rows ≥3 `hidden sm:block`) — 3 rows <640px.
      **ISR**: `revalidate = 300` declared, but **flagged** — the root layout reads `headers()` for
      the strict **nonce CSP**, which forces every route dynamic (`ƒ`); full static ISR is
      mutually exclusive with the (owner-approved) nonce CSP. The LCP win therefore comes from the
      data-layer cache (`listPublished` `unstable_cache` 60s) + the dropped priority image + lighter
      mobile paint, not route-level static. Verify: no static-claims grep ✓; landing 200; proof
      band renders; 60f/274t green; build OK; 0err/10warn. **LCP ≤2.5s = staging measurement.**
- [x] **R3.3 Event detail + checkout** (16h) ✓ — revenue-critical rebuild; payment fulfilment
      (webhook/idempotent/paise/no-refund/group-QR) **untouched**. **Fixed the #1 leak:** anonymous
      Buy `router.push("/login")` → `/login` hardcoded `redirectTo="/dashboard"` → **cart lost**.
      Now an **inline OTP sheet** (new DRY `usePhoneOtp`, also adopted by `PhoneLogin`) verifies in
      place and **resumes payment with the cart intact** (guest-first; phone = identity, no extra
      name/email gate). Checkout also got **scarcity** ("Only N left" <10), **per-type sold-out** +
      stepper capped to real `remaining`, a **trust strip** (secure/instant-QR/no-refund), and
      recoverable error copy. Event page rebuilt to sell: hero with **above-fold CTA + countdown +
      availability + price-from**, `#tickets` anchor, **featured brands** (real vendors), schedule,
      **venue/arrival**, **policies** accordion, **final CTA**, and a mobile **`StickyBuyBar`**
      (IntersectionObserver, no CLS). [checkout-audit.md](checkout-audit.md). **Flagged:** success
      celebration → R3.4 (wallet/reveal); editorial food/workshop sections need content models;
      LCP/Lighthouse = staging (nonce-CSP forces dynamic, same as R3.2). Verify: 60f/274t green;
      build OK; event page 200 w/ CTA+trust+policies; OTP→pay path needs Firebase+handset (staging).
- [x] **R3.4 Wallet + profile + tab bar** (16h) ✓ — **Festival companion, in priority order.**
      (1) **Success celebration** (delight §1+§3): `TicketReveal` — navy takeover (`reveal-wipe`),
      "You're in." headline, **24-particle canvas confetti** burst + haptic, plays **once per order**
      (`sessionStorage reveal:<id>`), **reduced-motion/low-memory → instant, no confetti**, tap-to-
      skip. Renders **only when the order is truly PAID** (the ticket exists) — never fakes
      confirmation; webhook-pending still shows the confirming + 5s auto-refresh state. R3.3 success
      now routes `?reveal=`. (2) **Wallet** moved to **`/tickets`** (blueprint §2; `/dashboard`
      redirects there). (3) **QR / flip card** (`TicketCard`, delight §4): 3D `rotateY` flip on
      tap/Enter (reduced-motion → crossfade), front = QR (**explicit 96px, no CLS — D20**) +
      essentials + ADMIT-N, back = order id / holder / gate + actions; a11y `aria-pressed`, both
      faces in DOM, hidden face `aria-hidden`; first-visit "Tap for details" hint. (4) **Add to
      calendar**: pure `lib/ics.ts` (RFC-5545 VEVENT, CRLF, escaping, +4h default) + 5 tests →
      `<a download>` .ics. (5) **4-tab IA** (D29): Home · Schedule · Map · Tickets; **share** via Web
      Share (text+url). Plus a lightweight **`/profile`** (phone read-only + name/email form for
      receipts + sign-out — *not* a SaaS console) and login now honours a safe `?next`. **Flagged
      deferred:** shareable **image art** (delight §2 — needs a satori/Cloudinary spike + dep);
      **offline precache** (sw.js wallet caching → PWA/R7); `/schedule` is a temporary bridge to the
      event schedule until R3.6. Verify: 61f/279t green; build OK; routes 200; wallet session-gated
      → `/login?next=` (authenticated flip/reveal = staging). 0err/10warn.
- [x] **R3.5 Public/customer map** (14h) ✓ — reframed as a **festival companion guide**, not a GIS
      tool (per owner steer). **Killed D2:** new `server/map/guide.ts` `getEventGuide()` reads the
      **real** active published event — its layout + the **brands on BOOKED stalls** (joined through
      `Booking → VendorProfile`), zones (via `upgradeLayout`+`zoneOf` for the locator), and
      facilities — **no `assignDemoStatuses`** (now only its dev-fixture file + test; grep clean).
      `EventGuide` is **discovery-first** (Airbnb-Explore feel): **category chips** (Everything /
      Food & drink / Shopping / Experience via `bucketOf` + 3 tests), **search** (brands/areas),
      **brand cards grouped by zone** with a locator ("In Luxury Lane"), a **brand bottom sheet**
      (category · zone · description · View brand →), a **facilities** quick-find, a **schedule**
      link, and the real layout via `MapCanvas` (read-only "take a look around", booked stalls
      relabelled to brand names). Empty state: "the guide goes live closer to the event." No admin
      concepts / layers / scoring / heatmaps / ops / technical terms. Removed the superseded
      `MapPreview`. **Flagged:** brand-card **logos** (didn't query assets), interactive
      tap-brand→map-pulse (map is read-only context; sheet gives the textual locator), offer badge
      (needs §3.6 Offers), **axe = staging**. Verify: `grep assignDemoStatuses src` → fixtures only
      ✓; 62f/282t green; build OK; /map 200 with chips+facilities+schedule. 0err/10warn.
- [x] **R3.6 Schedule** (8h) ✓ — a **living festival timeline**, not a calendar/table. Reuses
      R1.5's `resolveNowNext` + `getHomeMode`; new pure `lib/schedule.ts` (`itemPhase`
      done/live/soon/upcoming, `groupByDay`, `stagesOf`) + **5 time-mocked tests** (now-line
      boundaries, multi-day split, stage list). `getActiveSchedule()` query → `/schedule` (the real
      page, **retires the R3.4 bridge**). `ScheduleTimeline` (client, 60s tick): **On now / Up next**
      horizontal cards (live, pulsing dot), **day pills** (multi-day), **stage filter** chips
      (`stageOrZone` — the festival-natural "category"), a **vertical timeline** with a live
      **NOW line** (lavender pulse at the current time, only on today), per-item **phase** styling
      (done = muted), **Add** to calendar per item (reuses `lib/ics.ts`), and `aria-live` "Now:
      <title>". Empty state for pre-launch. Mobile-first, discovery-first; no spreadsheet/table/
      admin/ops views. **Flagged:** filter is by stage/area (ScheduleItem has no category field);
      "what did I miss" = past items shown muted inline (no separate section). Verify: 5/5 now-line
      tests; 63f/287t green; build OK; /schedule 200 with live timeline. 0err/10warn.
- [x] **R3.7 Discover + brand detail** (10h) ✓ — **Discover** (`/vendors`): the static grid became
      `VendorDiscover` (client) — a **search** field + **category chips with live counts** (reuses
      `bucketOf` → Everyone / Food & drink / Shopping / Experiences, chips hidden when empty) over
      the approved line-up (≤200, no API), with the "Nothing for '<q>' — try another category"
      empty state. **Brand detail** (`/vendors/[id]`, already strong) gained a **stall location
      chip** ("Stall F-12 — see on map →" via new `getVendorStallLabel`, shown only when the brand
      has a confirmed BOOKED stall), `rel="noopener noreferrer"` on outbound links, and **SEO**:
      `openGraph` (type profile + logo image) + `twitter` card in `generateMetadata`. **Flagged:**
      offer badge + active-offers list deferred to **R3.9** (no `Offer` model yet); the chip links
      to `/map` (R3.5 guide has no per-stall deep-link). Verify: filter (search+chips) renders;
      brand detail `og:title` present; stall chip renders; 63f/287t green; build OK; both 200.
      0err/10warn.
- [x] **R3.8 Guide + Gallery** (8h, content-gated) ✓ — pure `lib/content-gate.ts` (`galleryReady`
      ≥8, `cleanSections`/`guideReady` non-empty, `parseGuideSections` defensive) + **5 tests** lock
      the gates. **Guide** (`/guide`): `getGuide()` = event-derived basics (Getting there from
      location, **Timings bound to the event's startsAt/endsAt**) + admin-edited sections from
      `SystemSetting guide:<eventId>` (the §6.3 editor is R5); anchor-chip row → `f-h60` sections;
      hold state when empty. **Gallery** (`/gallery`): new **`GalleryPhoto` model** (migration
      applied **local + prod**, client regenerated); `getGalleryPhotos()` (published only) → a
      `GalleryGrid` client (CSS-columns masonry + no-library full-screen viewer w/ keyboard
      ←/→/Esc, caption, counter) **only when ≥8 published** — else the "lights up after the night"
      hold state. **Flagged:** admin guide editor + gallery curation are R5 (Content group); viewer
      uses lazy `<img>` (eslint-disabled) not `next/image`. Verify: gates behave — guide shows
      (Timings present), gallery shows hold state (0<8); 5/5 gate tests; 64f/292t green; build OK;
      both 200. 0err/10warn.
- [x] **R3.9 Offers surface** (8h) ✓ — new **`Offer` model** (+ `OfferKind`/`OfferStatus` enums,
      vendor/sponsor/event relations; migration applied **local + prod**, client regenerated). Pure
      `lib/offer.ts` (`offerPhase` upcoming/live/**ended**, `canRedeem` soft cap, `validityLabel`
      "Tonight only") + **6 tests** lock **publish→appears / ended→greys** (an offer past `endsAt`
      greys even before the admin auto-end cron). `/offers`: `listVisibleOffers` (PUBLISHED for the
      active event) → `OffersClient` cards (validity chip, ended ones **greyed "Ended"**) with a
      full-screen **"Show at stall" redemption takeover** — title, brand, **live clock**
      (anti-screenshot), **press-&-hold to mark used** → `markOfferUsedAction` (soft
      `redeemedCount++`, no auth per §3.6); hold state when none. **Closes the R3.7 deferral:** the
      brand detail now lists the vendor's **live offers**. **Flagged:** admin offer CRUD +
      DRAFT→PUBLISHED→ENDED + auto-end cron = R5 (§6.1); discover-card/guide offer **badge** still
      deferred (needs per-vendor offer joins in those queries); hard redemption = V2. Verify:
      6/6 phase tests; /offers holds at 0 published; 65f/298t green; build OK; both 200. 0err/10warn.
- [x] **R3.10 Home modes** (8h) ✓ — **lifecycle orchestration, not a redesign.** Pure
      `lib/home-content.ts` `homeFocus(mode)` maps R1.5's time-based `getHomeMode` (PRE/LIVE/POST)
      to the home's emphasis; the **same landing, same nav, same design** shifts focus: **PRE** →
      countdown + "Get tickets" + brands; **LIVE** → "We're live tonight", "What's on now"
      (schedule) + map + offers, no countdown; **POST** → "That's a wrap", "Relive the night"
      (gallery) + brands + next event. Wired into the hero (kicker, CTAs, countdown gate, price)
      and the closing band (heading + action), all driven by `focus`. **6 tests** incl. **clock-
      mocked PRE→LIVE→POST flips** end-to-end (getHomeMode→homeFocus across the live window
      boundaries). Verify: clock-mocked flips ✓; landing 200, correctly **POST** for the past local
      event ("Relive the night"); 66f/304t green; build OK; 0err/10warn.

**GATE R3:** full anonymous→ticket e2e on phone viewport · budgets green on all 7 customer
pages · axe pass.
**R3 CODE-COMPLETE (2026-06-14):** R3.1–R3.10 all shipped — coming-soon, landing (+lifecycle
modes), event+checkout (inline OTP), wallet/reveal/flip, customer guide, schedule timeline,
discover, guide+gallery, offers. The gate's three checks are **staging/manual** (phone e2e,
Lighthouse budgets, axe) — owner/staging actions, tracked there; no code blocks remain in R3.
Carryover flags routed to later phases: success share-image art (satori spike), offline precache
(R7), admin Content CRUD + offer cron (R5), discover/guide offer badges, brand-card logos.

---

## Phase R4 — Vendor surfaces (~52h, after R2; R4.1 sheet needs R2.5.10) — roadmap R4

- [x] **R4.1 RPA rebuild** (28h): home spine + timeline + step forms + leads + contract
      (vendor-portal §3-§7); stall picker sheet with zoom-in + why-bullets + distance chips
      (map-system §11). Verify: dry-run vendor e2e at 390px; copy matches spec. **DONE 2026-06-14.**
  - [x] **R4.1a — stall-picker §11 sheet** (the R2.5.10-dependent piece) ✓ — `getEventWithStalls`
        now includes the layout; the vendor event page scores it (`scoreLayout`) and passes per-stall
        **`describeStall` why-bullets** + zone + size to `VendorStallReserve`, which shows a detail
        sheet on select (label/type/zone chips · price · size · "Why this stall" bullets · status ·
        Reserve), gated to AVAILABLE. Verify: picker 200; sheet renders; 304t; build OK.
  - [x] **R4.1b — full portal rebuild** ✓ (commits b7156d5, 6b32d9c, db7f552, 6aa25c8):
        (1/2) **/home status spine** (`VendorTimeline` six-node done/current/locked + exact §3 copy,
        call-back wait 48h SLA) merges dashboard+onboarding; `VendorRail` navy `.bg-ink` vendor-only
        rail (admin ZoneSidebar untouched); layout `.rpa` cream; dashboard/onboarding/index redirect
        into /home (deep links preserved). (3) **onboarding step forms** off shadcn onto `.rpa`
        (underline inputs + clip-path `.btn`, shared `rpa-fields`; AssetUploader/KycDocUploader
        re-skinned). (5/6) **stall picker**: additive `MapCanvas` `focusLabel` → 450ms zoom-to-2× +
        600ms lavender pulse (reduced-motion safe), spot-quality chip (score tier + /100); picker
        sheet + markets list re-skinned. (6/7) **leads** RPA QR tile (200px) + per-day chips + copy +
        print CSS; **profile** now uses shared §4.1 `BrandForm` + brand-page preview; **documents +
        contract** RPA tiles/badges/Exat/.btn. Note: §4 "preparation flow" = the home lifecycle
        states (BOOKED prep copy) — add-ons is **R4.2** (deliberately not started). Verify: typecheck
        + lint (0 err) + 298 tests + prod build all green.
- [x] **R4.2 Add-ons (M5)** (14h): migration prod-first; vendor flow; webhook dispatch branch;
      stock guard. Verify: e2e add-on order; oversold test; replay no-dup. **DONE 2026-06-15
      (commit 41c96cd).** New `StallAddOn`/`BookingAddOnOrder`/`BookingAddOn` + `Payment.addOnOrderId`
      (migration `20260614020000_stall_addons` applied to **local + prod** ep-dry-sunset, prod-first).
      Domain `src/server/addons/service.ts`: admin CRUD (audited), `createAddOnOrder` (BOOKED-only,
      startsAt−48h window, maxPerBooking, price snapshot, separate Razorpay order), `fulfillAddOnOrder`
      (idempotent by `Payment.gatewayRef`, amount-verified, **conditional-UPDATE stock guard** = ticket
      oversell pattern; oversold keeps money CAPTURED + OVERSOLD audit). Webhook gains the add-on
      dispatch branch. Vendor `/add-ons` (qty steppers + live total + Pay) + nav + home BOOKED teaser;
      admin `events/[id]/add-ons` CRUD + orders list + CSV. Tests: `addOnOrdersOpen` unit + gated
      integration (snapshot / oversell race / replay no-dup) — green vs migrated local DB. typecheck +
      lint (0 err) + 302 unit tests + prod build all green.
- [x] **R4.3 SLA surfacing** (6h): UNDER_REVIEW aging + admin tile + vendor wait copy.
      Verify: >48h fixture fires tile. **DONE 2026-06-15 (commit 28a164e).** Shared
      `src/lib/vendor-sla.ts` `isReviewOverdue` (48h from contract signing); `getDashboard`
      `pending.reviewAging` counts signed-but-unapproved vendors past SLA → admin dashboard
      "Pending tasks" tile; vendor home call-back-wait copy softens once overdue. `isReviewOverdue`
      unit test (over/under/boundary/unsigned). No migration.
- [x] **R4.4 Lead QR print + day chips** (4h). Verify: print snapshot. **DONE — shipped within
      R4.1's leads re-skin (commit 6aa25c8):** 200px QR tile, per-day count chips (`dayChips`
      "Today: N"), copy-link, and `@media print` (print shows QR + brand name only). Print snapshot
      is the manual owner check.

**GATE R4:** one real human completes vendor signup→pay on staging with owner watching. *(Owner-run
manual gate — not executable here. R4.1–R4.4 code complete; site stays prod-gated until then.)*

---

## Phase R5 — Console (~78h, R5.1/5.2 after R0; rest after R1) — roadmap R5

- [ ] **R5.1 Diet + nav** (16h): remove Task Center (D3) + budgets/settlements/deep analytics;
      final nav tree (admin-portal §1); POS + Settings in nav (D19); `<ResponsiveTable>` (D28);
      event-detail tabs→routes (D32). Verify: removed routes 404; nav==spec per role.
      **DEFERRED by owner (2026-06-15): "additive R5 first" — do NOT delete Task Center / budgets /
      settlements / deep-analytics until the owner explicitly confirms the removals.**
- [x] **R5.2 Command Center** (12h): 6 tiles + alert row + chart + activity (admin-portal §2).
      Verify: seeded reconciliation test (tiles match seed math). **DONE 2026-06-15 (commit 88ccf32).**
      `getCommandCenter` (composes getDashboard + targeted reads) → six event-scoped tiles, a
      non-zero-only danger alert row (failures 24h · outbox failed · vendors >48h), one 280px
      revenue chart, a 10-row orders/bookings/check-ins activity feed, auto-refresh 60s on event day.
      SystemSetting cron/webhook heartbeats feed a system-health block; the actionable "needs
      attention" feed is retained (additive). Gated DB reconciliation test green vs local DB.
- [x] **R5.3 Kiosk mode** (16h): launcher, fullscreen, wake-lock, offline badge, manual entry;
      ops status strip; staff sign-out-everywhere. Verify: kiosk e2e chain; revoke test.
      **DONE 2026-06-15 (commits e426c55, + kiosk).** `/admin/kiosk` (bare route, CHECKIN guard):
      `KioskLauncher` names the gate + goes fullscreen → `KioskClient` wraps the existing `Scanner`
      (camera + offline queue + manual entry already built) with a gate header, online/offline badge,
      screen wake-lock (re-acquired on visibility), and a 3s-hold exit; nav leaf Operations → Kiosk.
      Ops status strip on `/admin/ops` (outbox depth · last cron tick [R5.2 heartbeat] · last webhook ·
      payments captured 24h). Staff `revokeStaffSessions` (audited) surfaced as per-row "Sign out
      everywhere". (Kiosk celebration screen is R6.4; e2e suite is git-ignored — verified by build.)
- [~] **R5.4 Content group** (18h): Offers CRUD/workflow + auto-END cron, Gallery curation, Guide
      editor, Strip config. Verify: admin-portal §6 e2e; offers cron. **MOSTLY DONE 2026-06-15
      (commits 1eaf388, 66a11d9)** — new **Content** admin group (nav + RBAC `content` section, ADMIN+):
      • **§6.1 Offers** `/admin/content/offers` — create/edit (vendor-or-sponsor link, title/terms/kind/
        window/max), DRAFT→PUBLISHED→ENDED workflow, window-inside-event + vendor-APPROVED validation,
        `autoEndDueOffers` in `runAllMaintenance`, audited. Gated cron integration test green.
      • **§6.2 Gallery** `/admin/content/gallery` — multi-file signed Cloudinary upload (≤10MB),
        caption, publish toggle, Publish-all, up/down reorder, delete, 8-photo gate banner; audited.
      • **§6.3 Guide editor** `/admin/content/guide` — six fixed sections → `SystemSetting guide:<id>`
        (audited), View-live; customer `getGuide` already merges them. Round-trip unit test.
      • **§6.4 Strip config — DEFERRED**: the Happening-strip CUSTOMER surface doesn't exist yet
        (it's **R6.3**), so its config would be an inert control. Homepage content is already operable
        via Events/Vendors/Sponsors. Build the strip config alongside R6.3 (it stores `strip:<eventId>`).
      No migration needed (Offer + GalleryPhoto already existed from R3).
- [ ] **R5.5 VenueMap consolidation (M6)** (12h): additive create+data-migrate first; drop
      `LayoutTemplate`/`MapElement` one deploy later; library/clone UX (designer = R2.5).
      Verify: clone-to-event intact; post-window drop migration applied.
- [x] **R5.6 Event wizard** (10h): 4 steps, resume-safe. Verify: wizard e2e → publish →
      landing revalidates. **DONE 2026-06-15 (commit 9659427).** `/admin/events/new` = step 1
      Basics (creates DRAFT → redirects to `events/[id]/setup?step=tickets`); the setup shell drives
      Tickets → Map → Review, each saving immediately + URL-reachable (resume-safe), with a
      back-linkable `WizardSteps` bar. Reuses createEventAction / add+deleteTicketTypeAction /
      MapAttach / publishEventAction; new `PublishButton` publishes then lands on the event. Additive.

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
| 2026-06-13 | build session 1 (rules read) | P-0 + R0.1–R0.6 | done; R0 gate PASSED; R0.5c owner DSN pending; found+fixed Tailwind-scans-Docs dev 500 | typecheck/lint/test:run (45f/175t)/build all green |
| 2026-06-13 | build session 1 (cont.) | R1.1 + R1.4 + R1.5 | done; oversell race PROVEN on real DB; coupon UI live | 46f/183t + 1 DB-gated; build 82 pages green |
| 2026-06-13 | build session 1 (cont.) | R1.2 (M1 dev) | done; group-QR proven on real DB (buy-5→1QR→3+2→board 5); **PROD GATE OPEN: M1 must hit prod Neon before deploy** | 46f/183t + 2 DB-gated; build green |
| 2026-06-13 | build session 2 | R1.3a (code-first) | done; legacy pay-to-hold flow deleted; webhook fulfils PENDING_PAYMENT only; public map read-only; **R1 PHASE COMPLETE (code)** — M2 destructive part queued for one-deploy-later | 46f/184t green; build green |
| 2026-06-13 | build session 2 (cont.) | R2.1 + R2.3 | done; clamp() scale, clay purge, ESLint guardrails, swiper dropped, GSAP reduced-motion gate | 46f/184t green; build green; lint 0 errors |
| 2026-06-13 | build session 3 | R2.2 (D11/D13/D14/D16/D17) | done; **PHASE R2 COMPLETE**; status-badges consolidated, 7 tables relocated, ~30-file date sweep, RpaPageHeader/RpaEmpty, toResult+ActionForm on critical forms; remaining low-traffic forms deferred to R5 (cut pages excluded) | 46f/184t green; build 82 pages; 0 err/10 warn; dev smoke 10 routes 200 |
| 2026-06-13 | build session 4 | R2.5.1 (map foundation) | done; layout-v2 schema + upgradeLayout + editorFromLayout; both designer pages load v1/v2; useDesignerState split pulled to R2.5.5 (no consumers yet) | 47f/192t green; build OK; designer pages 200 |
| 2026-06-13 | build session 4 (cont.) | R2.5.2 (calibration) | done; the "real map" — 2-point calibration → true-scale underlay; rides on extended v1 bgImage (no v2-save migration yet); confirm-step mis-calibration guard | 48f/200t green; build OK; designer 200 |
| 2026-06-13 | build session 4 (cont.) | R2.5.4 (measurements) | done; geometry lib + distance tool (M) + status bar + occupancy; all computed/ephemeral, no persistence; R2.5.3 boundary/obstacles next (bundles the v2-save migration) | 49f/204t green; build OK; designer 200 |
| 2026-06-13 | build session 4 (cont.) | R2.5.3 + v2-save migration | done; designer now persists full LayoutV2; boundary pen + obstacles + save-blocking validation/override; v1 layouts round-trip | 50f/211t green; build OK; both designers 200 |
| 2026-06-13 | build session 4 (cont.) | R2.5.6 (zones) | done; zone draw (Z, shared polygon path) + colored regions + centroid labels + rollups; persists via v2; useDesignerState split still pending | 51f/215t green; build OK; designer 200 |
| 2026-06-13 | build session 4 (cont.) | R2.5.7 (pathways) | done; open-polyline draw (P) + strips + min-width/blocked/exit warnings (non-blocking); persists via v2; **useDesignerState refactor debt growing — do next** | 51f/218t green; build OK; designer 200 |
| 2026-06-13 | build session 5 | R2.5.5 refactor (owner-mandated) | done; MapDesigner 826→81 lines; useDesignerState single source of truth + DesignerContext + 4 components + LayersPanel; map-architecture-report.md; **debt cleared, ready for next 10 features** | 51f/218t (no test touched); build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.8 (terrain) | done; **first feature through the slice+panel pattern** — terrain.ts (6 types) + a hook slice + a controls palette + a 15%-opacity under-render gated by the terrain layer; no new plumbing, proving the refactor's promise | 51f/218t green; build OK; designer 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.9 (align/distribute + bulk v2) | done; align/distribute pre-existed; added bulk resize/type/status/price (pure bulkPatch + inspector BulkEditForm) + first designer-actions.test.ts (align/distribute/bulk/relabel on fixtures) | 52f/225t green; build OK; designer 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.10 (scoring engine) | done; **sales-value cluster begins** — scoring.ts (§9.1 weight constants, 6 components, describeStall) + Sales view (S toggle, tier badges, inspector breakdown); 10 fixture tests | 53f/237t green; build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.11 (price suggestions) | done; §9.2 round50/suggestPaise + suggestFor/applySuggestions(selected/zone); inspector chip+Apply + Sales bulk bar; no auto-apply (grep-verified); **flagged deviation:** per-apply audit folded into the single audited Save (unsaved-editor model) | 53f/240t green; build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.12 (revenue heatmap) | done; heatmap.ts (quintile ramp) + price/score heatmap mode + HeatmapLegend; occupancy/potential already in SummaryPanel; **partial-defer:** booked-vs-potential zone cards → console revenue view (no booked stalls at design time) | 54f/245t green; build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.13 (versions) | done; versions.ts (snapshot/diff/cap) + reactive versions state + save/restore(undoable)/delete/compare; VersionsPanel + dashed ghost overlay; round-trips via v2 | 55f/250t green; build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.14 (vendor preview + search) | done; Preview lens (hides underlay/sales/heatmap/ghost/validation) + search.ts (label/zone match) + search box, `/` shortcut, focusOn 1.5× pulse; **deferred:** ⌘K palette entries (cross-surface) | 56f/255t green; build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.15 (exports) | done; map-export.ts (naming/scale-bar/fit) + captureFullCanvas + MapPdf (react-pdf, title + 50ft bar) + Export dropdown (PNG 2× + vendor/ops/print PDF); **flagged:** ops-PDF content awaits R2.5.16 ops objects | 57f/261t green; build OK; both designers 200 |
| 2026-06-13 | build session 5 (cont.) | R2.5.16 (entry-flow + ops + validation) | done; **R2.5 MAP CLUSTER COMPLETE** — throughput.ts + entry-ops.ts + validation-report.ts (+tests); ops/entryFlow reactive state + palettes + canvas render + drag; ValidationPanel (focus-on-click + throughput rollup + lane editor); ops-PDF flag closed; **flagged:** O-mode→palette, throughput card→panel | 59f/271t green; build OK; both designers 200 |
| 2026-06-14 | build session 6 | DB migrations + R2.5 audit | done; `migrate deploy` to local + **prod (ep-dry-sunset)** — ticket_admit_count (M1) + lead/payment indexes, both up-to-date (**M1 prod-gate CLOSED**); wrote map-audit.md (go/no-go: YES to start R3; flags O(n²) scoring/no-memo perf, throughput demand=0, no vendor surface yet) | both DBs synced; build green |
| 2026-06-14 | build session 6 (cont.) | R3.1 (coming-soon) | done; **R3 begins** — countdown target now dynamic from next published event's startsAt (was hardcoded 2026-10-01), reuses tested timeLeft lib, hides gracefully with no event | 59f/271t green; build OK; coming-soon 200 |
| 2026-06-14 | build session 6 (cont.) | R2.5.17 (perf hardening, owner-mandated) | done; spatial-grid scoring (O(n²)→~linear, 70ms→15ms @500, proven identical) + React.memo ElementNode (ref-stable handlers) + throughput wired to real ticket totals; stress-fixture; performance-audit-r2.5.17.md; **perf 60→~80** | 60f/274t green; build OK; both designers 200 |
| 2026-06-14 | build session 6 (cont.) | R3.2 (landing rebuild) | done; D24 hero art (branded shape, not vendor logo) + D25 real-count binding & cut all "80+" claims + proof band (real counts) + D30 mobile-3-rows; ISR declared but **flagged blocked by nonce-CSP headers() → route stays dynamic**; data-cache + dropped priority img carry LCP | 60f/274t green; build OK; landing 200, claims grep clean |
| 2026-06-14 | build session 6 (cont.) | R3.3 (event + checkout) | done; **fixed cart-losing login redirect → inline OTP (usePhoneOtp, shared w/ PhoneLogin)** resumes payment with cart intact; scarcity + per-type sold-out + trust strip + recoverable errors; event page rebuilt (above-fold CTA/countdown/availability, brands, venue, policies, final CTA, sticky mobile bar); checkout-audit.md; payment flow untouched; **flagged:** success celebration→R3.4, LCP=staging | 60f/274t green; build OK; event 200 |
| 2026-06-14 | build session 6 (cont.) | R3.4 (wallet + profile + tabs) | done; success reveal (confetti, once/order, reduced-motion, never-faked) + wallet→/tickets + TicketCard flip (QR no-CLS, a11y) + ics.ts add-to-calendar (+tests) + Web-Share + 4-tab IA + lightweight /profile + login ?next; **deferred:** share image art (satori spike), offline precache (PWA/R7), /schedule bridge until R3.6 | 61f/279t green; build OK; routes 200 |
| 2026-06-14 | build session 6 (cont.) | R3.5 (customer map → guide) | done; **killed D2** — getEventGuide() real data (booked-stall brands, zones, facilities), discovery-first EventGuide (chips/search/brand cards/sheet/facilities/schedule + read-only MapCanvas); bucketOf +tests; removed superseded MapPreview; **deferred:** logos, tap→map-pulse, offer badge; axe=staging | 62f/282t green; build OK; /map 200; demo grep clean |
| 2026-06-14 | build session 6 (cont.) | R3.6 (schedule timeline) | done; living festival timeline — reuse resolveNowNext + new schedule.ts (itemPhase/groupByDay/stagesOf, 5 time-mocked tests); getActiveSchedule + real /schedule (retires R3.4 bridge); On-now/Up-next cards, day pills, stage filter, live NOW-line, per-item add-to-calendar, aria-live | 63f/287t green; build OK; /schedule 200 |
| 2026-06-14 | build session 6 (cont.) | R3.7 (discover + brand detail) | done; VendorDiscover (search + bucket chips w/ counts + empty state) over /vendors; brand detail stall chip (getVendorStallLabel) + openGraph/twitter SEO + rel noopener; **deferred:** offer badge/list → R3.9 (no Offer model) | 63f/287t green; build OK; vendors+detail 200, og:title present |
| 2026-06-14 | build session 6 (cont.) | R3.8 (guide + gallery) | done; content-gate.ts (galleryReady≥8 / guideReady non-empty / parseGuideSections, 5 tests); /guide (event timings + SystemSetting sections, gated); **GalleryPhoto model migrated local+prod** + /gallery (masonry + no-lib viewer, gated ≥8); gates verified (guide shows, gallery holds at 0) | 64f/292t green; build OK; both 200 |
| 2026-06-14 | build session 6 (cont.) | R3.9 (offers) | done; **Offer model migrated local+prod**; offer.ts (offerPhase/canRedeem/validity, 6 tests = publish→appears/ended→greys); /offers (cards + greying + Show-at-stall redemption takeover w/ live clock + press-hold markOfferUsed) + brand-detail live offers (closes R3.7 deferral); **deferred:** admin CRUD/cron→R5, discover badge | 65f/298t green; build OK; /offers holds at 0 |
| 2026-06-14 | build session 6 (cont.) | R3.10 (home modes) | done; **PHASE R3 CODE-COMPLETE** — home-content.ts homeFocus(mode) + clock-mocked PRE→LIVE→POST flips (6 tests); landing hero+closing band orchestrate by getHomeMode (same page/nav/design); live smoke = POST for the past local event. GATE R3 checks (phone e2e, budgets, axe) = staging | 66f/304t green; build OK; landing 200 |
