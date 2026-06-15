# Launch Readiness Report — Pre-R6 (brutally honest)

Date: 2026-06-15. Scope: an honest current-state assessment, not a checklist. The execution
checklist of record is [launch-readiness.md](launch-readiness.md); this report grades reality
against it. **No coding — truth only.**

One-line verdict: **The product is feature-complete and well-tested. The launch is NOT validated.**
Almost every remaining gap is operational/config/validation, not code — which is exactly the class of
thing that breaks on launch day.

---

## 1. What is production-ready today?

Built, tested (312 unit + gated DB integration), prod-migrated, deployed to `main` (gated):

- **Customer (R3):** landing + lifecycle home modes, event detail + inline-OTP checkout, ticket
  wallet/reveal, customer map guide, schedule, discover, guide, offers, gallery. Coming-soon gate.
- **Vendor (R4):** RPA portal, onboarding spine (brand→docs→stall→agreement→pay), stall picker with
  scoring + zoom-pulse, **add-ons** (prod-migrated, idempotent webhook, oversold guard), SLA tile,
  leads/profile/documents/contract.
- **Admin (R5):** Command Center, event create wizard, content group (offers/gallery/guide), kiosk
  mode, ops status strip, staff sign-out-everywhere, **venue consolidation** (VenueMap, additive).
- **Payments core:** webhook-driven, **idempotent** (by `gatewayRef`), amount-verified fulfilment for
  tickets + stalls + add-ons; oversold guards; reconcile cron (tickets only — see §5).
- **Platform:** Prisma + Neon (two DBs), CSP nonce in prod, CI on `main`, Firebase phone OTP +
  Cloudinary + Resend configured, Sentry **wired** (inert until a DSN is set).

Honest read: the *software* is launch-grade. That is necessary, not sufficient.

## 2. What still requires staging validation?

None of these have been done end-to-end:

- **A real money path on prod:** a live Razorpay purchase → webhook → ticket issued. Webhook delivery
  to `/api/payments/razorpay/webhook` on the prod domain is **unconfigured/unverified.**
- **GATE R4** (a human completes vendor signup → pay) and **GATE R5** (a human runs
  create→publish→sell→scan from the console) — **neither rehearsal has been run.**
- **Performance:** Lighthouse/LCP/CLS budgets have **never been measured** (no lhci in the repo, R7.1
  not done). The 500-element map at 60fps on a real mid-range phone is **unverified.**
- **Load:** the k6 envelope (orders+webhook+scan at 50 RPS, launch-readiness §5.2) — **not run.**
- **The prod `/` + `/vendors` 500** (the `listApprovedVendors` Vercel-runtime crash): mitigated
  (try/catch + cache-key bump) and currently **hidden by the gate**; root cause **unconfirmed.** It
  could reappear the moment the gate flips.
- **Coming-soon flip:** `NEXT_PUBLIC_IS_COMING_SOON` is a build-time inlined var → flipping it needs a
  **redeploy**, not a toggle. Untested transition.

## 3. What still requires founder sign-off?

- **Razorpay live keys + webhook secret** on Vercel (and confirming the account is live-mode).
- **Sentry DSN** — turn observability on before launch (the SDK is wired and inert without it).
- **WhatsApp (Interakt):** not present in env. If WhatsApp confirmations/reminders are launch-expected,
  this is unconfigured. (Outbox currently shows 4 FAILED — see §6.)
- **Legal + support:** `src/lib/legal.ts` still has `[SUPPORT EMAIL]` / `[SUPPORT PHONE]` placeholders;
  vendor "rejected" / contact copy points at them.
- **Per-event pricing** (dynamic, admin-entered) entered for the real launch event.
- **The decision to flip the gate** (and on which deploy).

## 4. What remains intentionally deferred?

- **R5.1** admin console diet (delete Task Center / budgets / settlements / deep-analytics).
- **R6.x** delight (this phase) — share art, premium success, happening strip, live/post modes,
  micro-delight.
- **Drop `LayoutTemplate` / `MapElement`** (a later deploy after R5.5; legacy kept on purpose).
- **R7** hardening: ISR rollout + revalidate hooks, security S2 (upload constraints, `KYC_ENC_KEY`
  required, logout limiter, CF-Connecting-IP), k6 load suite.
- **R6.5 Concierge** (WhatsApp keyword bot) — needs Meta template approval lead time.

## 5. What could realistically break on launch day? (mechanism, not vibes)

- **Stall/add-on payments captured but never fulfilled.** The reconcile cron (`reconcilePendingPayments`)
  covers **ticket Orders only** — stall bookings and add-on orders are **webhook-only**. If the webhook
  misfires for a vendor payment, money is captured with **no fulfilment and no safety net.** (Tickets
  are safe; vendor money is not.)
- **The unconfirmed prod 500** resurfacing on `/` and `/vendors` when the gate comes down.
- **The scheduler.** launch-readiness §1 calls this *the single biggest infra dependency.* Vercel Hobby
  runs **one daily cron**; reconcile / release-holds / reminders / offer-auto-END only fire daily
  unless an **external scheduler** hits `/api/cron/tick` frequently. Not set up. (Side effect: the new
  ops "last cron tick" chip will read stale/red on a daily cron.)
- **Neon cold-starts** → one-off 5xx on the first hit to an idle route under real traffic/scaling.
- **Gate throughput** (launch-readiness §5.1): the physical entry line at 5,000 attendees — scan speed
  and kiosk behavior under a real queue are untested.
- **Blind launch:** no Sentry DSN = no error visibility on the day.

## 6. What should be monitored during the first event?

- Razorpay **webhook success rate** + the `/admin/ops` strip (last webhook, payments 24h, outbox depth).
- **Outbox FAILED** count (currently **4** queued failures even pre-launch — investigate before, not
  during).
- **PENDING_PAYMENT bookings/orders** not advancing (fulfilment lag) + the reconcile sweep.
- **Stall double-book** attempts (the partial-unique index should hold — watch for violations).
- Check-in throughput / kiosk offline-queue depth at the gate.
- 5xx rate + p95 latency on `/`, `/events/[slug]`, checkout, `/api/admin/checkin`.
- Neon connection/CPU; cron last-tick freshness.

## 7. Top 10 launch risks (ranked)

1. **Vendor payment fulfilment has no reconcile safety net** (webhook-only). Money-without-goods risk.
2. **Razorpay live webhook unconfigured/unverified on prod.**
3. **Unconfirmed prod 500** on `/` + `/vendors` post-gate-flip.
4. **No live error monitoring** (Sentry DSN unset).
5. **Scheduler dependency unresolved** (daily Hobby cron; no frequent external trigger).
6. **No performance/load validation** (Lighthouse, on-device map, k6 all unrun).
7. **Neon cold-start 5xx** under real first-traffic.
8. **WhatsApp unconfigured** + 4 standing outbox failures (notification reliability unknown).
9. **Legal/support placeholders** unfilled (compliance + trust).
10. **Gate-flip is a redeploy**, and neither human gate (R4/R5) has been rehearsed.

## 8. Top 10 highest-ROI improvements remaining (ranked)

1. **Configure + verify the Razorpay live webhook on prod**, and **extend reconcile to cover stall +
   add-on orders.** (Closes risks #1, #2 — the only money-loss class.)
2. **Set the Sentry DSN.** Cheap; converts a blind launch into an observed one.
3. **Stand up a frequent external `/api/cron/tick` trigger** (cron-job.org / GitHub Actions).
4. **Run the GATE R4 + R5 rehearsals** on an ungated preview; **confirm/fix the prod 500** there.
5. **R6.1 Ticket Share Art** — the single highest-ROI *delight*: turns every buyer into organic reach.
   Direct growth, on-brand, low complexity. (The one R6 item with measurable upside.)
6. **Measure Lighthouse on landing/event/checkout + the 500-element map on a real phone**; fix the cheap wins.
7. **Fill legal + support contact**; confirm WhatsApp (or consciously launch email-only).
8. **A ₹1 live purchase smoke** through the full path before flipping the gate.
9. **R6.3 Happening Strip** (live energy) + **R6.4 Live mode** — high perceived-quality, moderate effort.
10. **R6.6 micro-delight on empty/loading/success states** — broad polish, low risk.

## 9. What should NOT be built before launch

- **R5.1 console deletions** — zero launch value, real regression risk.
- **R6.5 Concierge** — Meta approval lead time; not launch-critical.
- **Dropping legacy map models** — no user value pre-launch.
- **Multi-event / multi-venue** — future.
- **Vendor share art / deep post-event community** — after the first event teaches you what matters.
- Anything that trades **Lighthouse/LCP/CLS/a11y** for flash (the phase's own performance rule).

## 10. Launch readiness score: **62 / 100**

Justification — graded honestly:

| Dimension | Score | Why |
| --- | --- | --- |
| Feature completeness | 9/10 | Customer + vendor + admin + map + ops all built |
| Code quality / tests | 8/10 | 312 unit + gated integration, idempotent payments, strict TS; e2e suite git-ignored |
| Payment correctness (code) | 8/10 | Idempotent, amount-verified, oversold-guarded |
| **Payment ops readiness** | **3/10** | Live webhook unverified; **no reconcile for vendor money** |
| **Observability** | **2/10** | Sentry wired but **off**; no perf/RUM |
| **Performance validated** | **2/10** | Never measured (Lighthouse / on-device / load) |
| **Operational readiness** | **4/10** | Scheduler dep unresolved; prod 500 unconfirmed; gates unrun |
| Content/legal/config | 5/10 | Placeholders; WhatsApp unset; pricing per-event pending |
| Brand/polish | 7/10 | RPA system strong; R6 delight not yet applied |

**62/100 = "feature-complete, launch-unvalidated."** The gap to a confident launch is **not more
features** — it's payment-ops hardening, observability, performance/load proof, the two human
rehearsals, and resolving the prod 500 + scheduler. **My honest recommendation: do the §8 items 1–4
(and 8) BEFORE most of R6.** R6.1 share-art is the one delight worth interleaving because it compounds
launch reach. Building the rest of R6 on top of an unvalidated payment/observability base would be
polishing a car you haven't started.

---

## Post-audit progress (2026-06-15 — owner chose "validation first")

Closed / clarified the **code-side** gaps (config/ops gaps remain founder-owned):

- **✅ Risk #1 FIXED (commit f007a18):** vendor-payment **reconcile safety net** — stall bookings +
  add-on orders are now swept by `reconcileVendorPayments` (fetch captured Razorpay payment → fulfil
  idempotently) in `runAllMaintenance` + `/api/cron/reconcile`. Also wired the previously-dead
  `releaseExpiredPayWindows` (lapsed pay-windows now cancel). Gated integration test proves recovery +
  idempotency. **Vendor money now has the same safety net as tickets.** Score for "Payment ops
  readiness" rises 3→6 once the **live webhook is verified** (still founder).
- **✅ Observability wiring CONFIRMED complete:** `instrumentation.ts` `register()` +
  `onRequestError`→`captureRequestError` would capture the prod 500 and every `logError`. Fully inert
  without a DSN. **Only `SENTRY_DSN` (Vercel env) is missing** — a 2-minute founder task, no code gap.
- **✅ Outbox "4 failures" = false alarm:** they are week-old **local demo-seed** rows (fake
  recipients, mismatched channel, simulated "SMTP timeout", attempts maxed). Not a production
  notification problem. Risk #8's outbox half is cleared; WhatsApp-config decision still stands.
- **Prod 500:** `cld()` ruled out (pure, no env); `listApprovedVendors` already hardened. No safe
  further code change without a repro — resolution = set the Sentry DSN + verify on an ungated preview.

**Remaining = founder config/ops only** (no more codeable launch-critical gaps I can close): set
Razorpay **live** keys + webhook (and verify a real capture→webhook→fulfil), set `SENTRY_DSN`, stand up
a frequent external `/api/cron/tick` trigger, run a ₹1 live purchase + the R4/R5 human rehearsals on an
ungated preview, fill legal/support placeholders, decide WhatsApp, then flip the gate (redeploy).
With the reconcile fix + Sentry-ready wiring, **revised readiness ≈ 68/100**; verifying the live
webhook + setting the DSN would put it ~80.
