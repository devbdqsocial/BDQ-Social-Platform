# failure-analysis.md — Top 25 Ways BDQ Social Fails

> Rebuild blueprint, part 7 of 15. "If it launched tomorrow and failed — why?" Ranked by
> **Likelihood (L)** × **Impact (I)**, with **Fix difficulty (D)** and the blueprint decision
> that mitigates each. Scale 1-5 (5 = highest). Business failures rank above technical ones on
> purpose — the code is in better shape than the funnel.

| # | Failure | L | I | D | Mitigation (blueprint ref) |
| --- | --- | --- | --- | --- | --- |
| 1 | **Nobody buys** — landing converts poorly; no social proof, no scarcity, FAQ-level content; tickets are an act of faith in a first-edition event | 4 | 5 | 3 | Landing rebuild w/ proof + lineup + vendor wall (changes.md §6); abandoned-cart nudge (confirmed); paid-social + UTM funnel review |
| 2 | **Vendor supply stalls** — 100 stalls need ~150+ applications; onboarding is 6 gated steps incl. a manual call-back SLA | 4 | 5 | 2 | Call-back SLA dashboarding (48h rule, BUSINESS-RULES §2.4); admin-side booking path already exists for offline-recruited vendors; vendor funnel metrics in the 3-page analytics |
| 3 | **Cron dependency unmet** — daily-only tick in prod: missed webhooks fulfil next day, holds stick 24h | 4 | 5 | 1 | **[BLOCKER]** external scheduler @5min (launch-readiness §1) |
| 4 | **Gate meltdown** — 5k arrivals, no kiosk mode, badge logistics unplanned | 3 | 5 | 2 | Kiosk scanner (confirmed add-on) + gate math + badge packs + offline drill (launch-readiness §5.1) |
| 5 | **WhatsApp template never approved / delivery silently off** — tickets don't arrive; trust gone on day one | 3 | 5 | 2 | Meta approval lead-time in checklist (launch-readiness §2.5); email always-on; outbox FAILED alert (security §3.3) |
| 6 | **Oversell at sale spike** — fulfilment doesn't re-check capacity; no-refund policy turns it into a PR fire | 3 | 5 | 1 | Conditional soldQty guard in txn (security §3.1) + concurrent test in CI |
| 7 | **Single-founder ops** — one person is admin, support, finance, and on-call; any incident saturates them | 4 | 4 | 3 | Runbooks 1-6; alerts not dashboards; staff presets for delegation; agent-built ops strip (launch-readiness §5.3) |
| 8 | **Payment trust gap** — off-brand clay checkout modal, no receipts page, no order-status page during webhook lag ("paid but no ticket" minutes) | 3 | 4 | 2 | Brand the modal (consistency #2); post-pay pending state on /tickets with auto-refresh; reconcile within 10 min (§1 fix) |
| 9 | **Tickets unrecoverable by customers** — phone-only login, no profile/email, QR only on dashboard | 3 | 4 | 1 | Profile page + share/download (confirmed add-ons) |
| 10 | **Coupons unusable** — marketing prints codes; no input field exists online | 4 | 3 | 1 | Checkout coupon input (confirmed add-on) |
| 11 | **Tests invisible to CI** — gitignored suite; a regression in money paths ships ungated | 4 | 4 | 1 | Commit tests + blocking CI (architecture §6.1) |
| 12 | **Prod errors invisible** — console.error only; first report comes from an angry customer | 4 | 4 | 1 | Sentry + 5 alert rules (confirmed; security §3.3) |
| 13 | **Mock/demo data in prod UI** — fake Task Center, fake public-map availability erode admin & visitor trust | 4 | 3 | 1 | Remove Task Center; real-data public map (both owner-confirmed) |
| 14 | **DB rate-limit hotspot at viral spike** — upsert per request melts under a sudden 500-RPS moment | 2 | 4 | 3 | Cloudflare WAF absorbs; Upstash swap documented as the trigger-based play (performance §4.2) |
| 15 | **Neon cold start on the conversion page** — force-dynamic landing pays DB wakeup in LCP | 3 | 3 | 1 | ISR on public pages (performance §3.1); CU floor on launch week |
| 16 | **Vendor pays, approval limbo** — call-back queue silently grows; PENDING_PAYMENT windows lapse | 3 | 4 | 2 | payBy expiry cron exists; add aging alert on UNDER_REVIEW > 48h (small work package) |
| 17 | **Group-QR confusion at gate** — staff untrained on ADMIT-N + partial arrivals | 3 | 3 | 2 | Kiosk UI shows remaining count explicitly (architecture §4.2); gate drill in runbook 6 |
| 18 | **Stall map wrong on the ground** — feet-grid layout vs real lawn mismatch; vendor disputes on setup morning | 2 | 4 | 2 | Ops annotation layer exists; physical walk-through with printed map as checklist item |
| 19 | **Refund-demand storm** — "no refunds" untested against a postponement/weather event | 2 | 5 | 3 | Policy page + comp-as-goodwill playbook (comps module exists); weather clause in T&Cs review |
| 20 | **Admin lockout** (TOTP lost) mid-sale | 2 | 4 | 1 | `admin-enroll.mjs` prod path + second SUPER_ADMIN account (runbook 5) |
| 21 | **Campaign misfire** — full module kept (owner choice): a broadcast to the wrong audience or double-send | 2 | 4 | 2 | Outbox dedupeKey already guards re-sends; add send-confirm modal w/ audience count + PAUSED honored test (launch-readiness §5.4) |
| 22 | **Sponsor revenue never materializes** — sponsors module exists but no deck-to-deal pipeline owner | 3 | 3 | 3 | Sponsorship-deck doc exists; placements rendered on landing (changes.md revenue section); founder-led, not software |
| 23 | **Scope re-sprawl** — V2 backlog leaks back in; agents build unrequested features | 3 | 3 | 1 | Feature spec table is the contract (changes.md §3); work packages cite it; anything not listed = rejected in review |
| 24 | **Dependency/platform break** — Next 15/React 19 churn, Prisma majors, a CVE in payment path | 2 | 3 | 2 | Dependabot on; CI audit becomes blocking (security §3.6); pin majors during launch window |
| 25 | **Data loss** — fat-fingered prod migration on the live DB (two-DB confusion is a known past trap) | 2 | 5 | 1 | Two-step migration rule + prod-first order (architecture §6.5); PITR restore drill (launch-readiness §2.11) |

## Extension additions (2026-06-12 session 2 — companion/delight scope)

| # | Failure | L | I | D | Mitigation |
| --- | --- | --- | --- | --- | --- |
| 26 | **Companion ships hollow** — offers page with 1 offer, gallery with 3 photos, empty guide: the "festival app" reads as abandoned, worse than absent | 3 | 3 | 1 | Hard content gates: offers nav hidden until ≥1 PUBLISHED, gallery until ≥8 photos, guide non-empty (customer-portal §6; launch-readiness 3.11) |
| 27 | **Concierge template rejection/delay** — Meta approval blocks the day-of WhatsApp sequence | 3 | 3 | 1 | Submit templates during R6.5, weeks early; keyword replies use 24h session messages (no template needed); email path independent (launch-readiness 3.12) |
| 28 | **Mis-calibrated map sells wrong-sized ground** (Gate 5 scope) — a bad ftPerPx makes every stall footprint a lie; vendors arrive to less space than they paid for; on-site chaos + refund-pressure on a no-refund policy | 2 | 4 | 1 | Calibration confirm step forces the admin to see computed venue dimensions against known reality before use (map-system §2); launch gate 3.15 requires the screenshot; distance tool spot-check on two known measurements during setup |

## Reading the table

- **Do first (L×I ≥ 16, D ≤ 2):** #3 scheduler, #6 oversell guard, #11 tests-in-CI, #12 Sentry —
  all four are days, not weeks, and three were owner-confirmed already.
- **The business cluster (#1, #2, #7, #22)** is not solved by code quality. The rebuild buys
  credibility (fast, branded, trustworthy), but ticket and stall demand need founder-led
  marketing; the platform's job is to never waste a click of it.
- **The trust cluster (#5, #8, #9, #13)** is why the rebuild exists: every fake or off-brand
  surface costs conversions silently.
