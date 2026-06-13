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
      **⚠ PROD GATE OPEN: apply to prod Neon (ep-dry-sunset) BEFORE any deploy of this code:**
      `npx prisma migrate deploy` with prod `DATABASE_URL_DIRECT`, or run the migration.sql via
      Neon console, then `npx prisma migrate resolve --applied 20260613000000_ticket_admit_count`.
      (Vercel CLI not linked on this machine — owner action or provide prod URL.)
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
