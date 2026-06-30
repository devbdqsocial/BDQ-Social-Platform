# launch-readiness.md — Go-Live Quality Gate & Event-Day Readiness

> Rebuild blueprint, part 6 of 15. No deadline pressure (owner-confirmed) — every item here is a
> quality gate: it must be TRUE before the coming-soon page comes down, however long that takes.
> Items marked **[BLOCKER]** stop go-live; the rest are required before the first event day.

---

## 1. The single biggest infrastructure dependency

**[BLOCKER] Cron cadence.** `vercel.json` has exactly one cron: `/api/cron/tick` daily at 04:00
(Vercel Hobby allows ≤2 daily jobs). But the platform's correctness assumes much faster sweeps —
`Docs/FAILURE-MODES.md` itself documents release-holds @1m, notify-retry @1m, reconcile @5m,
reminders @1h. On the daily-only schedule:

- a missed Razorpay webhook → customer waits **up to 24h** for a paid ticket (reconcile),
- an expired stall hold blocks a stall for **up to 24h** (release-holds),
- a failed WhatsApp/email send retries **once a day** (notify-retry).

`runAllMaintenance` is idempotent and `tick` accepts external callers by design
(`api/cron/tick/route.ts` comment). **Required:** provision an external scheduler
(cron-job.org / GitHub Actions schedule / UptimeRobot) hitting
`POST /api/cron/tick` with `CRON_SECRET` **every 5 minutes**, OR upgrade to Vercel Pro and split
the crons properly. Then fix the doc/code mismatch in FAILURE-MODES.md. Verify: two consecutive
scheduler hits visible in logs; a test PENDING order with a simulated missed webhook fulfils
within 10 minutes.

---

## 2. Infrastructure checklist

| # | Item | Verify |
| --- | --- | --- |
| 2.1 | **[BLOCKER]** External scheduler (§1) | see §1 |
| 2.2 | **[BLOCKER]** Prod env vars set on Vercel: `SESSION_SECRET` (≥32), `CRON_SECRET` (≥32), `RAZORPAY_*` (live keys + webhook secret), `DATABASE_URL(+_DIRECT)`, Firebase public config, `SENDGRID_API_KEY`+`EMAIL_FROM`, Cloudinary trio, `KYC_ENC_KEY`, `CAMPAIGN_WEBHOOK_SECRET`, `APP_BASE_DOMAIN`; `ADMIN_NO_2FA_EMAILS`/`DEV_*` **absent** | Deploy boots (env.ts enforces); `scripts/preflight.mjs` |
| 2.3 | **[BLOCKER]** Prod DB migrated BEFORE deploying schema-dependent code — prod is the Vercel Neon (ep-dry-sunset), not the local-.env DB | `prisma migrate deploy` against prod direct URL; `migrate status` clean |
| 2.4 | **[BLOCKER]** Razorpay live mode: webhook URL `https://bdqsocial.com/api/payments/razorpay/webhook` registered for `payment.captured` + `order.paid`, secret matches env; a real ₹1 purchase end-to-end (P4.7) | ₹1 ticket arrives on email; webhook log 200 |
| 2.5 | WhatsApp: Cloud API token + phone id live, `ticket_confirmation` template **approved by Meta** (lead time!), or provider consciously left dormant (email-only delivery at launch is acceptable — decide, don't drift) | `scripts/verify-outbox.mjs` against prod config |
| 2.6 | DNS: apex + `vendors.` + `admin.` on Cloudflare (orange cloud), SSL Full (Strict); Vercel origin not directly reachable or rate-limit uses `CF-Connecting-IP` | curl each host; spoofed XFF test |
| 2.7 | Neon: pooled URL in runtime, autoscaling floor ≥0.25CU during launch week (cold starts hurt LCP until ISR lands), connection limit sized to Vercel concurrency | load test §5 |
| 2.8 | Firebase: phone-auth abuse protection + (optionally) App Check ON; OTP regions restricted to IN | console screenshot in runbook |
| 2.9 | `NEXT_PUBLIC_IS_COMING_SOON` flip rehearsed: build inlines it (memory: it's inlined at build) → going live = env change **+ redeploy**, not just env change | staging rehearsal |
| 2.10 | Sentry DSN live + 5 alert rules (security.md §3.3) | test event fires alert |
| 2.11 | Backups: Neon PITR window confirmed (≥7d); restore drill once | restore to branch, row-count match |

---

## 3. Product quality gates (before coming-soon comes down)

| # | Gate | Proof |
| --- | --- | --- |
| 3.1 | Money paths green in CI: purchase, group-QR fulfilment, webhook replay no-dup, oversell-guard concurrent test, stall hold race, coupon caps | `npm run test:run` + e2e in CI (architecture.md §8) |
| 3.2 | Coupon input exists at checkout (owner add-on) — otherwise don't create coupons | e2e applies a coupon |
| 3.3 | Customer can recover tickets: dashboard + share/download (owner add-on) + email resend path | manual pass |
| 3.4 | Vendor full journey on a phone: signup → brand → KYC upload → stall pick on map → e-sign → (admin approve) → pay → BOOKED | one real dry-run vendor |
| 3.5 | Admin: event create → ticket types/prices → publish → appears on landing within 60s (ISR revalidate) | manual |
| 3.6 | Public pages: real event data only (public map shows real layout — owner-confirmed; no demo statuses, no fake counts) | grep `assignDemoStatuses` → only dev/preview |
| 3.7 | Legal/footer pages reachable in coming-soon mode (Razorpay verification needs them — already in `ALWAYS_PUBLIC`, keep) | curl while flag on |
| 3.8 | Lighthouse budgets met (performance.md §1) on the 7 audited pages | CI Lighthouse run |
| 3.9 | a11y: axe pass on the same 7 pages; keyboard-only purchase possible; reduced-motion honored on landing | CI axe + manual |
| 3.10 | 404/500/offline pages on-brand in all three zones | manual |
| 3.11 | Companion content loaded (extension ✔owner): guide sections non-empty; ≥1 PUBLISHED offer if Offers nav shows; gallery hidden until ≥8 photos; schedule has the real lineup | content checklist + gates e2e |
| 3.12 | Concierge + day-of WhatsApp templates (`event_tomorrow`, `event_today`, `event_thanks`) **approved by Meta** — submit during R6.5, weeks before go-live | template status screenshot |
| 3.13 | Delight moments verified: reveal plays once + reduced-motion path; share art generates < 800ms with fallback; happening strip renders only with real items | delight.md §9 tests |
| 3.14 | Day-of live-mode rehearsal: clock-mocked LIVE flip on staging; kiosk celebratory ADMIT-N included in the gate drill (§5.1) | staging drill |
| 3.15 | Map ground truth (Gate 5 ✔owner): real venue underlay uploaded + **calibrated with the confirm step** (computed dims match known venue size); boundary polygon drawn; validation panel clean (no blocked paths/exits, no unpriced sellable stalls) | calibration screenshot + validation panel zero errors |
| 3.16 | Map sales pack: scoring reviewed + prices applied (suggestions accepted/edited by admin), vendor preview signed off by owner, vendor + ops PDF exports generated and stored in Docs/runbooks/ | export artifacts exist |

---

## 4. Runbooks (write before launch, store in Docs/runbooks/)

1. **Payment incident** — webhook signature failures spike / amount mismatch alert: how to read
   the audit rows, when to comp a ticket (no-refund world), Razorpay dashboard cross-check.
2. **Delivery incident** — outbox FAILED backlog: re-drive via `processOutbox`, provider status
   check, switch WhatsApp→email-only flag.
3. **Coming-soon rollback** — flag + redeploy, expected propagation, what to tell users.
4. **DB incident** — Neon status, `/api/health` semantics, error-boundary behavior, PITR restore.
5. **Admin lockout** — TOTP reset path via `scripts/admin-enroll.mjs` against prod, who is
   allowed to run it.
6. **Event-day triage** — see §5; includes who carries which phone and the POS cash float note.

---

## 5. Event-day readiness (5,000 attendees · 100 vendors · 10 staff)

### 5.1 Gate math (the line is the product)

5,000 attendees, peak arrival ~60% in 2 hours → ~25 admits/minute sustained, bursts 3×.
One scan ≈ 4-6s (aim + decode + result + badge handoff) → a single device does ~10-12/min.
**Requirement: ≥4 scanning devices** at the main gate + 1 floating. With group-QR (one scan
admits a party of N — owner's model) effective throughput roughly doubles for group-heavy
crowds; the badge handoff becomes the bottleneck — pre-bundle badges in 2s/3s/5s packs.

| Need | Status | Action |
| --- | --- | --- |
| Kiosk scanner mode (fullscreen, gate select, wake-lock, big VALID/ADMIT-N/USED) | Owner-confirmed add-on, not built | Work package in changes.md |
| Offline scan queue + idempotent sync | Built (`clientScanId`, `lib/scan-queue.ts`) | Drill it: airplane-mode scan → reconnect → no dup |
| 4+ devices with STAFF/CHECKIN accounts | Ops task | Pre-provision logins; test TOTP-less STAFF role flow |
| Capacity board at the gate | Built (`CapacityBoard.tsx` + cheap groupBy) | Add `sum(admitCount)` math with group-QR change |
| POS cash sales at gate | Built; being added to nav (owner-confirmed) | Cash float + reconciliation line in runbook 6 |
| Venue connectivity plan | — | One 4G hotspot per gate device pair; offline queue covers gaps |

### 5.2 Load envelope

- Checkout burst: announcement-driven spikes ~50 RPS on `/api/orders` + Razorpay modal. Rate
  limits must not throttle legitimate buyers: review `orders` limiter window before sale days.
- Webhook burst: Razorpay delivers per payment; handler is fast (HMAC + 2 queries) — fine.
- Scanner: ~25 req/min × 5 devices — trivial; the risk is DB cold-start latency, not volume
  (Neon floor §2.7).
- Run the k6 script (performance.md §8) against a preview deploy as the proof.

### 5.3 Live monitoring on the day

Live Monitor (20s refresh) + Capacity board + Sentry alerts + `/api/health` on an uptime pinger.
Missing and cheap to add: a single **ops status strip** on `/admin/ops` showing: outbox queue
depth, last webhook received at, last cron tick at, reconcile fulfilled count — all queries
already exist in services; it's one page section (work package).

### 5.4 Emergency levers

| Lever | Exists? | Gap |
| --- | --- | --- |
| Pause ticket sales (event → unpublish) | Yes (status flip) | Document in runbook; verify ISR revalidates fast |
| Stop a campaign mid-send | Campaign status PAUSED exists | Verify processOutbox respects it (test) |
| Revoke a staff device | `revokeSessions` tokenVersion bump | Surface a "sign out everywhere" button on Staff admin page (tiny work package) |
| Comp a stuck paying customer | Comps module built | Runbook 1 references it |
| Kill switch: coming-soon back on | Flag + redeploy | Rehearsed per 2.9 |

---

## 6. Go / No-Go checklist (the morning you flip it)

```
[ ] §1 scheduler firing (last tick < 10 min ago)
[ ] §2.2-2.4 env + migration + ₹1 live purchase done TODAY
[ ] CI green on main (tests included)
[ ] Sentry quiet for 24h on staging traffic
[ ] One dry-run vendor BOOKED end-to-end on prod
[ ] One dry-run group order: 1 QR, kiosk admits N, capacity board correct
[ ] Runbooks 1-6 written; phone tree agreed
[ ] Coming-soon flip rehearsed on preview
```

Anything unchecked = no-go. There is no date pressure; the gate is the gate.
