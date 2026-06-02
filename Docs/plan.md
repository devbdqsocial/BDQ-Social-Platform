# BDQ Social — Build Plan

> Step-by-step development roadmap. Scope = core spec in [project.md](project.md) (incl. promoted
> features), sequenced P0-P4. UI per [design.md](design.md); architecture per
> [ARCHITECTURE.md](ARCHITECTURE.md). [suggested-features.md](suggested-features.md) is
> the backlog and is intentionally NOT scheduled here.

---

## 0. How to use this plan

- **Task id:** `P{phase}.{n}` (e.g. `P1.4`). Sub-steps use letters.
- **Status:** `[ ]` todo, `[~]` in progress, `[x]` done. Tick only after **Verify** passes.
- **Verify:** every task states how to prove it works (run it, hit the route, see the row). Do not
  mark done without it.
- **Dependencies:** listed as `dep:` — do not start a task before its deps are `[x]`.
- **Definition of Done (phase):** the checklist at the end of each phase; a phase ships only when
  all its tasks + DoD pass.
- **Agent hint:** suggested AG Kit agent for the phase (this repo ships them under `.agents/`).
- **Branching:** per repo convention, one branch per phase/feature: `feature/{slug}`.

---

## 1. Prerequisites — accounts, keys, repo (P-1)

Do these once before P0. Keep all secrets server-side; fill `.env` (see [project.md](project.md) §18).

- [ ] **P-1.1** Create GitHub repo; init locally (Next.js comes in P0). Verify: repo cloned, CI stub runs.
- [ ] **P-1.2** Provision **Neon** project + a `dev` branch DB. Verify: pooled + direct connection strings saved; `psql`/Studio connects.
- [ ] **P-1.3** Create **Firebase** project; enable **Phone** auth; generate web config + Admin SDK service account. Verify: web config + admin creds saved.
- [ ] **P-1.4** Create **Razorpay** account (Test mode); get key id/secret; configure a webhook secret (URL set in P1). Verify: test keys saved.
- [ ] **P-1.5** Create **Interakt** account (WhatsApp BSP); get API key/base URL; start ticket template approval. Verify: API key saved, template submitted.
- [ ] **P-1.6** Create **Resend** account; verify sending domain/`EMAIL_FROM`. Verify: test email sends.
- [ ] **P-1.7** Create **Cloudinary** account; get cloud name/key/secret; an upload preset. Verify: a manual test upload works.
- [ ] **P-1.8** Create **Vercel** project linked to the repo; plan wildcard domain `*.bdqsocial.com` + apex (DNS in P0.13). Verify: empty deploy succeeds.

---

## 2. Phase P0 — Foundation
Agent hint: `database-architect` + `backend-specialist`. Goal: a deployed skeleton with all 4
zones routing, auth+RBAC+audit plumbing, and the design system wired. No business features yet.

- [ ] **P0.1** Scaffold **Next.js 15** (App Router, TS, ESLint) + **Tailwind v4** + **shadcn/ui** + **lucide-react**. dep: P-1.1. Verify: `npm run dev` renders a styled page.
- [ ] **P0.2** Wire **design tokens** from [design.md](design.md) §3-4 into `globals.css` `@theme` (clay/pine/gold ramps, semantic light+dark, radius/shadow/glow); add Fraunces + Inter fonts. Verify: a token test page shows correct colors in light + dark; no purple anywhere.
- [ ] **P0.3** Add **Prisma**; connect to Neon (pooled runtime, direct for migrate); create `src/server/db.ts` singleton. dep: P-1.2. Verify: `prisma db pull`/`migrate` connects.
- [ ] **P0.4** Author **initial schema** (User, Event minimal, AuditLog, + enums for role/permissions); first migration. dep: P0.3. Verify: tables exist in Neon.
- [ ] **P0.5** **Env management:** `.env.example` with all keys; load + typed `env.ts` (Zod-validated). Verify: app boots only with required envs present.
- [ ] **P0.6** **Subdomain middleware** (`src/middleware.ts`): map `apex/www → public/customer`, `vendors. → /vendor/*`, `admin. → /admin/*`; create route groups `(public)`, `(customer)`, `vendor/`, `admin/`. Verify: locally via `localhost` host overrides or `*.localtest.me`, each host renders its placeholder zone.
- [ ] **P0.7** **Firebase auth wiring:** client SDK (phone OTP UI stub) + Admin SDK token verify; `POST /api/auth/verify` mints an **httpOnly session cookie**; `getSession()` helper. dep: P-1.3. Verify: OTP login on a test number sets a session; `getSession()` returns the user.
- [ ] **P0.8** **RBAC layer:** `withAuth(roleOrPerm)` wrapper + zone guard in middleware; role enum `CUSTOMER|VENDOR|STAFF|SUPER_ADMIN` + STAFF `permissions[]`. dep: P0.7. Verify: hitting an admin route as a customer is denied; as admin is allowed.
- [ ] **P0.9** **Validation + Audit cross-cutting:** `withValidation(zod)` and **`withAudit(action)`** wrappers; audit writes append-only `AuditLog` (actor, action, entity, before/after, ip, ua). dep: P0.4. Verify: a sample admin mutation writes an AuditLog row with before/after.
- [ ] **P0.10** **PWA shell:** manifest, icons, service worker (next-pwa/Serwist), theme-color espresso. Verify: Lighthouse PWA installable; offline shell loads.
- [ ] **P0.11** **Base layout + theming:** app shell, light/dark toggle (persisted), per-zone nav shells (public header, customer bottom-tab, vendor/admin sidebar) per [design.md](design.md) §10-12. Verify: each zone shows its nav; theme toggle works.
- [ ] **P0.12** **Ops basics:** `/api/health` (DB + deps), structured logging, error tracking (e.g. Sentry) hookup. Verify: `/api/health` returns ok; a thrown error is captured.
- [ ] **P0.13** **Deploy + DNS:** push to Vercel; configure wildcard `*.bdqsocial.com` + apex. dep: P-1.8. Verify: all four hostnames resolve to the right zone in production.
- [ ] **P0.14** **Seed super-admin** script (+ TOTP enrolment scaffold). dep: P0.8. Verify: seeded admin can log into `admin.` with 2FA.
- **DoD P0:** four zones route in prod; OTP login + session works; RBAC denies cross-zone; an audited mutation logs before/after; PWA installable; CI (typecheck/lint/build/prisma validate) green.

---

## 3. Phase P1 — Ticketing MVP
Agent hint: `frontend-specialist` + `backend-specialist`. Goal: a customer can discover an event
and buy a ticket that arrives on WhatsApp + email.

- [ ] **P1.1** **Landing page** (SSR/ISR): hero, attractions, gallery, event cards, countdown, FAQ; SEO metadata + OG. Verify: Lighthouse SEO ≥ 95; renders server-side.
- [ ] **P1.2** **Event model + admin Event CRUD** (super-admin): name, description, location, dates, status, theme. dep: P0.9. Verify: create/edit/publish an event; appears on landing.
- [ ] **P1.3** **Event detail page** + **TicketType** model + admin ticket-type CRUD (name, price, qty). dep: P1.2. Verify: detail page shows types + prices.
- [ ] **P1.4** **Timetable:** `ScheduleItem` model + admin **timetable CRUD** + public/vendor **timetable view**. dep: P1.2. Verify: admin adds schedule items; they show on event detail to customers + vendors.
- [ ] **P1.5** **Customer OTP login** end-to-end (real UI from P0.7 stub) + minimal profile (name, email). dep: P0.7. Verify: new user logs in, profile saved.
- [ ] **P1.6** **Cart + pricing engine:** add tickets one-by-one; reads **per-event prices/config** (ticket prices, `bulkTiers`, `earlyBird` — all admin-entered, none hardcoded); **bulk discount when qty > 5** (admin-set %); server-side price calc (never trust client). dep: P1.3. Verify: unit tests for bulk/early-bird math with event-supplied config; cart total correct.
- [ ] **P1.7** **Coupon** model + admin coupon CRUD + **server-side validation** (active window, caps, min order, scope; best-single-discount wins). dep: P1.6. Verify: valid coupon applies, expired/over-cap rejected.
- [ ] **P1.8** **Razorpay order**: `POST /api/orders` creates `Order(PENDING)` + RZP order; checkout on client. dep: P1.6, P-1.4. Verify: test checkout opens with correct amount.
- [ ] **P1.9** **Webhook fulfilment:** `POST /api/payments/razorpay/webhook` — **verify signature**, **idempotent by gatewayRef**, txn: Order→PAID + issue Tickets + enqueue notifications. dep: P1.8. Verify: test-mode payment marks order paid exactly once (replay webhook = no dup).
- [ ] **P1.10** **Ticket + signed QR:** one `Ticket` per seat with a **signed `qrToken`**; QR image via `qrcode`. dep: P1.9. Verify: ticket row created; QR decodes to a valid token.
- [ ] **P1.11** **Notifications outbox:** write outbox rows on issue; sender sends **Interakt WhatsApp** (QR media) + **Resend email**; retries; **WhatsApp→email/SMS fallback**; idempotent send. dep: P1.10, P-1.5, P-1.6. Verify: paid test order delivers WhatsApp + email within ~60s; forced WA failure falls back.
- [ ] **P1.12** **My Tickets** page (QR, status, share/download; offline-cached). dep: P1.10. Verify: tickets list shows; QR viewable offline.
- [ ] **P1.13** **Growth bits:** waitlist/notify-me, **UTM capture** on entry links (store on Order), social-share reward coupon. dep: P1.7. Verify: UTM persisted on an order; waitlist signup stored; share yields a coupon.
- [ ] **P1.14** **Basic analytics** (admin): registrations, ticket sales over time, revenue. dep: P1.9. Verify: dashboard numbers match seeded test sales.
- **DoD P1:** a customer buys (single + 6+ bulk + coupon), pays in Razorpay test, and receives a valid QR on WhatsApp + email; admin sees the sale in analytics; no duplicate fulfilment on webhook replay.

---

## 4. Phase P2 — Vendor + Map
Agent hint: `frontend-specialist` (canvas) + `backend-specialist`. Goal: vendors book stalls on a
live, feet-accurate map; admin designs the map and approves vendors; no double-booking.

- [ ] **P2.1** **Vendor zone + separate login** (`vendors.`, OTP/email), isolated from customer session. dep: P0.6-P0.8. Verify: vendor login works on `vendors.`; a customer session cannot enter it.
- [ ] **P2.2** **Vendor registration + profile** (brand, category, description, website, socials). dep: P2.1. Verify: profile saved + editable.
- [ ] **P2.3** **Asset upload** via **Cloudinary signed direct upload** (logo/banner/products), type/size validated. dep: P2.2, P-1.7. Verify: image uploads, url+publicId stored, previews show.
- [ ] **P2.4** **KYC** model + form (PAN all; FSSAI food; GSTIN optional) — **verify-only, no GST billing**. dep: P2.2. Verify: KYC stored; shown to admin for review.
- [ ] **P2.5** **StallTypeDef** per event (admin defines types + **enters prices**: name, widthFt, heightFt, priceInPaise, color, sellable — no hardcoded prices). dep: P1.2. Verify: admin creates reference-sized types (Small 10x10, Lane 10x10, Premium 15x12, Food 10x10) with admin-entered prices.
- [ ] **P2.6** **Map data model** (`MapLayout` JSON + normalized `Stall` rows) + JSON schema per [project.md](project.md) §7.3. dep: P2.5. Verify: a layout saves + reloads; stalls normalized.
- [ ] **P2.7** **MapCanvas (react-konva) booking view** — render stalls by status color + legend, hover tooltip, select-to-hold, zoom/pan, mobile sheet; **accessible stall list fallback**. dep: P2.6. Verify: public/vendor map renders the seed layout; statuses color-correct.
- [ ] **P2.8** **MapDesigner (admin)** — ft grid + snap, add stall (by type)/infra/label, move/resize/rotate, inspector (x/y/w/h ft, price, status), save/load, undo/redo, **ops annotation layer**. dep: P2.6. Verify: admin lays out + edits stalls; saved layout matches.
- [ ] **P2.9** **Seed "Aarush Lawn" template** (101 stalls: 36 small + 32 lane + 16 premium + 10 food, stage 40x24, 4 zones 25x25, water, lounges, entry/LED/fire-exit, aisles) — **geometry + sizes only, no prices**; clonable. dep: P2.8. Verify: cloning produces the full 101-stall layout; prices come from the event's StallTypeDefs.
- [ ] **P2.10** **Stall hold + booking** — `holdStall` txn (`AVAILABLE→HELD`, `holdUntil`); `Booking` create; **partial-unique index** guarantees one active booking/stall. dep: P2.6. Verify: concurrent hold test — only one succeeds; second sees taken.
- [ ] **P2.11** **Vendor payment** (Razorpay online or **offline**) → `Booking PENDING`; **simple receipt** (no GST invoice). dep: P2.10, P1.8. Verify: online pay → PENDING + receipt; offline path records intent.
- [ ] **P2.12** **Verification workflow** — `Submitted→Under Review (team call)→Approved/Rejected`; approve = txn `Booking→BOOKED`, `Stall→BOOKED`, notify vendor; reject releases hold. dep: P2.11. Verify: approving flips stall to BOOKED on the live map; rejecting frees it.
- [ ] **P2.13** **Admin-side booking** — admin creates a booking, enters vendor details, assigns stall, records payment (online/offline), audited. dep: P2.10. Verify: admin books a stall without a vendor account; audit logs it.
- [ ] **P2.14** **Live map status** (polling) reflecting holds/bookings/approvals. dep: P2.7, P2.12. Verify: a booking in one tab updates the map in another within a refresh cycle.
- [ ] **P2.15** **Vendor extras:** brand directory page (SEO), vendor **waitlist + auto-offer** on release, **e-sign contract** before confirmation. dep: P2.12. Verify: approved vendor appears in directory; released stall offers to next waitlister; contract sign recorded.
- [ ] **P2.16** **Crons:** `release-holds` (expire HELD + unpaid orders) + `reconcile-payments` (missed webhooks). dep: P2.10, P1.9. Verify: an expired hold auto-releases; a simulated missed webhook reconciles.
- **DoD P2:** admin designs/clones the Aarush Lawn map; a vendor registers, uploads assets+KYC, holds a stall, pays, gets verified+approved; stall shows BOOKED live; double-book is impossible; expired holds auto-release.

---

## 5. Phase P3 — Staff + Ops + Growth
Agent hint: `frontend-specialist` + `qa-automation-engineer`. Goal: run the event day and see the
full picture.

- [ ] **P3.1** **Staff accounts + permission presets** (default staff, `SCANNER_ONLY`, `SUPPORT_ONLY`, `FINANCE_VIEW`); staff cannot edit events/payments/map. dep: P0.8. Verify: a scanner-only staff can only reach check-in.
- [ ] **P3.2** **PWA QR scanner** (`html5-qrcode`) — validate (exists/unused/this-event) → `CHECKED_IN`; big VALID/USED/INVALID states + haptic/sound. dep: P1.10, P3.1. Verify: scanning a valid ticket checks in; re-scan = "already used".
- [ ] **P3.3** **Offline scan queue** — IndexedDB queue + optimistic result + sync on reconnect; authoritative resolve server-side. dep: P3.2. Verify: scan offline, reconnect, queue syncs; conflicts resolved.
- [ ] **P3.4** **Capacity/crowd count** (`CheckIn.direction` in/out; live headcount). dep: P3.2. Verify: in/out scans move the live count.
- [ ] **P3.5** **Comp-ticket bulk generation** (sponsor/VIP) with QR, audited. dep: P1.10. Verify: a batch of comp tickets issues + delivers.
- [ ] **P3.6** **Sponsorship module** — `Sponsor` model + placements on site/map/tickets; lead-data flag. dep: P1.2, P2.6. Verify: a sponsor logo renders on landing + ticket; map ad slot shows.
- [ ] **P3.7** **Full analytics** — stall occupancy %, revenue per stall, footfall over time, **heatmaps**, **cohort/repeat** analysis. dep: P2.12, P3.2. Verify: dashboards match seeded data.
- [ ] **P3.8** **Post-event report export** (PDF/CSV: revenue, attendance, top vendors). dep: P3.7. Verify: export downloads with correct figures.
- [ ] **P3.9** **Audit log viewer** (super-admin): filter by actor/entity/date/action + export. dep: P0.9. Verify: every prior admin action is searchable.
- [ ] **P3.10** **Reminders cron** (event-day WhatsApp/email/push) + **lead capture** at stall (scan vendor QR → consented contact). dep: P1.11, P2.3. Verify: reminder sends on schedule; a lead is captured.
- **DoD P3:** staff check people in (online + offline), live capacity updates, admin sees full analytics + heatmaps and exports a post-event report; sponsors render across surfaces; audit viewer shows all actions.

---

## 6. Phase P4 — Polish & Launch
Agent hint: `qa-automation-engineer` + `security-auditor` + `performance-optimizer`.

- [ ] **P4.1** **SEO + performance** pass (Core Web Vitals, image/bundle, ISR). Verify: Lighthouse Perf + SEO ≥ 90 on landing + event pages.
- [ ] **P4.2** **Accessibility (WCAG AA)** — contrast (design.md §3.7), focus, keyboard, ARIA, map list fallback, reduced motion. Verify: axe/Lighthouse a11y ≥ 95; manual keyboard pass.
- [ ] **P4.3** **Dark mode finalize**, **ratings/reviews**, **white-label theming** per event. Verify: dark mode clean across zones; per-event theme applies.
- [ ] **P4.4** **Security hardening** — rate limiting (OTP/coupon/login/checkout), bot protection, **CSP/security headers**, CSRF, upload validation, secrets audit; full review. Verify: `security_scan` + headers test pass; rate limits trip under abuse.
- [ ] **P4.5** **Multi-event** verification (two concurrent events isolated). Verify: events do not leak stalls/tickets/analytics.
- [ ] **P4.6** **Failure-mode tests** — missed webhook, WhatsApp down, DB blip, Firebase down. Verify: tickets never lost; bookings never partial; graceful fallbacks fire.
- [ ] **P4.7** **Production cutover** — live Razorpay keys, approved Interakt templates, real DNS, monitoring/alerts on webhooks + outbox + health. Verify: a real ₹1 live purchase delivers a ticket end-to-end.
- [ ] **P4.8** **Launch checklist** sign-off (below). Verify: every item checked.
- **DoD P4 / Launch gate:** real payment → real ticket on WhatsApp + email; no double-book under load; a11y + security + perf thresholds met; monitoring live; rollback plan documented.

---

## 7. Cross-cutting workstreams (apply throughout)

- **Testing:** unit (pricing, state machines, QR, coupon), integration (webhook fulfilment, hold/book, check-in), e2e (Playwright: buy ticket, book stall, scan). Add tests with each task, not after.
- **CI:** typecheck + lint + `prisma validate` + build + tests on every PR; preview deploy per PR.
- **Observability:** structured logs + error tracking + business audit + payment/webhook alerts from P0 onward.
- **Security:** validate-everything, server-side authz on every mutation, secrets server-only — every phase.

---

## 8. Sequencing, risks & backlog

- **Hard order:** P0 → P1 → P2 → P3 → P4. Within a phase, follow `dep:`.
- **Parallelizable:** landing/UI polish can proceed alongside backend within a phase (different files).
- **Top risks:** Razorpay webhook reliability (mitigated by reconcile cron), Interakt template approval lead time (start at P-1.5), Firebase OTP cost at sale spikes (SMS-provider swap behind auth adapter), canvas performance/a11y (list fallback).
- **Backlog:** pull from [suggested-features.md](suggested-features.md) only after launch; nothing there is scheduled in P0-P4.

---

## 9. Quick phase summary

| Phase | Outcome | Gate |
| --- | --- | --- |
| P0 | Deployed skeleton: zones, auth, RBAC, audit, design system, PWA | 4 zones + login + audited mutation |
| P1 | Buy a ticket → QR on WhatsApp + email | end-to-end purchase, no dup fulfil |
| P2 | Vendor books stall on live map; admin designs map + approves | no double-book, verified approval |
| P3 | Event-day check-in + full analytics + sponsors | offline scan + reports + audit viewer |
| P4 | Hardened + launched | real payment → real ticket, thresholds met |
