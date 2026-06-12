# security.md — Threat Model, Control Architecture & Hardening Roadmap

> Rebuild blueprint, part 4 of 15. The current posture is unusually strong for a project this age —
> the 2026-06-04 audit's three criticals are all fixed (re-verified §1). This doc defines the
> target control architecture the rebuild carries forward verbatim, the remaining gaps, and the
> phased plan.

---

## 1. What is already right (carry over verbatim — do not rewrite these)

Re-verified against current code on 2026-06-12:

| Control | Where | Status |
| --- | --- | --- |
| Strict nonce CSP, enforced in prod, per-request nonce minted in middleware | `src/middleware.ts:209-221`, `src/lib/csp.ts`; `/api` covered by static policy (`next.config.ts:45-52`) | ✅ |
| Security headers (HSTS preload, XFO DENY, nosniff, COOP/CORP, Permissions-Policy) | `next.config.ts:9-18` | ✅ |
| `?zone=` override gated to non-production | `src/middleware.ts:24` | ✅ fixed |
| `ADMIN_NO_2FA_EMAILS` gated to `NODE_ENV === "development"` | `src/app/api/auth/admin/route.ts:48-54` | ✅ fixed |
| Prod boot requires `SESSION_SECRET` (≥32), `CRON_SECRET` (≥32), `RAZORPAY_WEBHOOK_SECRET`, `DATABASE_URL`; loud warnings for stray dev flags | `src/lib/env.ts:56-82` | ✅ fixed |
| Webhook: HMAC verify → amount match → idempotent fulfil → **always 2xx** on processing error, reconcile cron as net | `api/payments/razorpay/webhook/route.ts`, `server/tickets/service.ts:130-144` | ✅ fixed |
| Sessions: jose-signed httpOnly cookie, role-based TTL (12h privileged / 7d customer), `tokenVersion` instant revocation for privileged roles, fail-closed | `src/server/auth/session.ts` | ✅ |
| Admin auth: password + TOTP mandatory for SUPER_ADMIN/ADMIN, per-IP **and per-email** rate limits, generic failures (no enumeration), origin check, audited login | `api/auth/admin/route.ts` | ✅ |
| CSRF: origin rejection on state-changing routes (`rejectCrossOrigin`) + SameSite=Lax | `src/lib/origin.ts` | ✅ |
| Signed QR tickets with expiry; tamper-proof | `src/lib/qr-token.ts` (+ tests) | ✅ |
| Double-scan and offline-replay safety (`clientScanId` idempotency, conditional update) | `server/checkin/service.ts:34-63` | ✅ |
| Stall double-book impossible: CAS update + partial-unique index | `server/bookings/service.ts`, migration `20260530121000_booking_partial_unique` | ✅ |
| Coupon race safety: `CouponRedemption` unique + conditional `usedCount` bump | `server/tickets/service.ts:186-191` | ✅ |
| KYC field encryption (AES-256-GCM, `KYC_ENC_KEY`) + backfill script | `src/lib/crypto-field.ts`, `scripts/encrypt-kyc-backfill.mjs` | ✅ |
| Cron auth: rate-limit **before** secret check (no brute-force oracle) | `api/cron/tick/route.ts:15-18` | ✅ |
| Exports: rate-limited + paginated | `api/admin/export/orders/route.ts:13-17` | ✅ fixed |
| Rate limiting: DB-backed fixed window, per-IP and per-key, pruned daily | `src/lib/ratelimit.ts`, `server/cron/tasks.ts:118` | ✅ |
| Unsubscribe suppression list + signed unsubscribe tokens | `lib/unsubscribe-token.ts`, `Suppression` model | ✅ |
| No SQL injection surface (Prisma), no hardcoded prices, no secrets in source | verified by grep | ✅ |

**Locked business-rule controls preserved in the rebuild:** webhook-driven fulfilment only (the
client callback is never trusted), integer-paise math, no-refund (no refund endpoint exists),
append-only `AuditLog` via `withAudit`, SUPER_ADMIN TOTP, vendor call-back approval.

---

## 2. Target threat model (rebuild)

| Actor | Goal | Primary controls |
| --- | --- | --- |
| Ticket fraudster | Enter without paying; replay/forge QR | Signed QR + single-use CHECKED_IN transition + offline-sync idempotency + gate kiosk shows holder/type |
| Payment abuser | Pay less than price; double-fulfil; fake webhook | HMAC + amount-match + idempotency by `gatewayRef` + reconcile cron + **oversell guard (gap §3.1)** |
| Account attacker | Hijack admin/staff | TOTP + per-email rate limit + tokenVersion revocation + 12h TTL + audit |
| Malicious vendor | Book stalls without paying; scrape leads of others | payBy window + holds cron; leads scoped `vendorProfileId` from session (verify every query) |
| Scraper/DoS | Exhaust DB/OTP budget | Rate limits; Cloudflare WAF in front (launch-readiness); OTP per-phone caps |
| Insider (staff) | Exceed permission; exfiltrate PII | Permission atoms + `canAccessSection` + per-page guards + audited mutations + paginated exports |
| Supply chain | Malicious dep | Dependabot + `npm audit` advisory in CI (`.github/workflows/ci.yml`) — make HIGH blocking (§3.6) |

---

## 3. Gaps — the hardening roadmap

### 3.1 HIGH — Ticket oversell window (the one real money bug)

Capacity is checked at **order creation** (`server/tickets/service.ts:71`) but **not re-checked
inside the fulfilment transaction** — `soldQty` increments unconditionally
(`tickets/service.ts:177-181`). Two PENDING orders racing for the last tickets within the 15-min
TTL can BOTH pay and BOTH fulfil → oversold gate, no-refund policy makes this a reputational
incident. `Docs/PLAN-live-launch.md` Phase 2 called for this fix; it was never done.

**Fix (small):** inside the fulfilment txn, per item run a conditional
`UPDATE "TicketType" SET "soldQty" = "soldQty" + qty WHERE id = ? AND "soldQty" + qty <= "totalQty"`
and abort (refund-path = manual comp per no-refund rules; in practice the reconcile/ops alert
fires) if any row count is 0. Alternative: decrement at order creation + release on expiry —
bigger change; the conditional bump is enough at this scale.

### 3.2 MEDIUM — Guard naming + ADMIN-role surface

- `requireSuperAdmin()` passes ADMIN too (`server/auth/guard.ts:71-80`); the strict one is
  `requireSuperAdminOnly()`. Rename before someone gates a destructive page with the wrong one
  (consistency.md §7.8 #25).
- `canAccessSection`: ADMIN gets everything except `audit` (`lib/console-access.ts:34`). Decide
  deliberately what ADMIN may NOT do (events delete? roles? settings?) and encode it in one
  RBAC matrix table in this doc + tests, instead of scattered `requireX` choices per page.

### 3.3 MEDIUM — Observability is the missing control

`lib/logger.ts` writes to console only; nothing pages a human. A failed webhook signature, an
amount-mismatch rejection (`tickets/service.ts:135-143`), or an outbox backlog are *recorded*
but invisible. Owner-confirmed add-on: **Sentry (free tier) + alert rules** on:
`webhook.razorpay` BAD_SIGNATURE, `AMOUNT_MISMATCH` audit rows, outbox FAILED count > N,
reconcile fulfilling > 0 (means webhooks are being missed), cron tick absent > 2× interval.

### 3.4 MEDIUM — Uploads

Vendor assets/KYC docs go through Cloudinary (`lib/cloudinary.ts`, `AssetUploader.tsx`,
`KycDocUploader.tsx`). Rebuild requirements: signed upload params server-side only (verify the
unsigned preset is not accepted), restrict `resource_type`/format allow-list (jpg/png/webp/pdf),
size cap ≤ 5MB, and `KYC_DOC` URLs must never render on public surfaces (grep gate: `docUrls`
only in vendor/admin contexts). Make `KYC_ENC_KEY` **required in prod** once KYC collection is
on (today optional, `env.ts:28`).

**Map underlay (extension, Gate 5):** same signed-upload path; allow-list jpg/png/webp only
(no pdf — pages are exported to image first), cap ≤ 8 MB original, delivery transformed
`w_2400` (map-system §2). Underlay URLs render on admin surfaces always, on vendor surfaces
only behind the per-map "show ground photo" boolean, never on public/customer surfaces (a
drone photo can reveal neighbouring property/ops details). Map PDF/PNG exports are generated
client-side in the authenticated admin session — no new endpoint, no new authz surface; the
export dialog's "include underlay" checkbox defaults OFF for the vendor variant.

### 3.5 LOW — Assorted

| Item | Where | Fix |
| --- | --- | --- |
| `listUserTickets` returns full ticket incl. raw `qrToken` to the dashboard | `server/tickets/service.ts:221-230` | Fine for the owner's own tickets; ensure no other caller reuses it for cross-user lists |
| `/api/auth/logout` rate limit | `api/auth/logout/route.ts` | Add the standard limiter (cheap) |
| Coming-soon `force-dynamic` DB count is an unauthenticated DB hit per request | `app/coming-soon/page.tsx:4-7` | ISR/static (performance.md §3.1) — also removes a tiny DoS lever |
| `x-forwarded-for` trusted for rate-limit identity | `lib/client-ip.ts` | Behind Cloudflare, prefer `CF-Connecting-IP` + verify CF provenance (launch-readiness.md §2) |
| Campaign delivery webhook | `api/webhooks/campaigns/route.ts`, `CAMPAIGN_WEBHOOK_SECRET` | Keep HMAC required; 401 when unset is correct — ensure prod env check includes it if campaigns are live (owner kept full module) |
| Per-event/per-phone OTP cost abuse | Firebase phone OTP | Rate-limit the login UI trigger; enable Firebase abuse protections + App Check in console (ops task) |
| Concierge inbound webhook (extension) | new `/api/webhooks/whatsapp` | Meta signature verification mandatory (campaign-webhook pattern); inbound rate-limit 5/min/phone; suppression list honored; keyword router never echoes user input into templates |
| Offer / Gallery / Guide / Strip / Add-on mutations (extension) | new admin surfaces | All through the `action()` pipeline + `withAudit`; offer redemption "staff tap" is a soft control by design — hard redemption deferred to V2 (documented, not a gap) |
| Share-art generation (extension) | `Order.shareCardUrl` | Server-only; NEVER includes the QR token (delight.md §2); Cloudinary upload uses the signed path |

### 3.6 PROCESS — Tests and CI are part of security

All `*.test.ts`, vitest config, playwright config and `/e2e/` are **gitignored**
(`.gitignore` "# test files" block) — the regression suite for *payments, holds, QR, rate
limits* exists only on one machine, and CI (`.github/workflows/ci.yml`) runs lint/typecheck/build
but **zero tests**. For a multi-agent rebuild this is untenable: an agent cannot see or run the
tests that protect the money paths.

**Fix:** un-ignore tests + configs, commit them, add `npm run test:run` (and a tagged e2e smoke)
to CI as blocking steps. Make `npm audit --audit-level=high` blocking instead of advisory.

---

## 4. RBAC matrix (target, to be enforced by tests)

| Capability | CUSTOMER | VENDOR | STAFF (atom) | ADMIN | SUPER_ADMIN |
| --- | --- | --- | --- | --- | --- |
| Buy tickets / own dashboard | ✅ | — | — | — | — |
| Vendor onboarding/booking/leads (own) | — | ✅ | — | — | — |
| Check-in scan | — | — | CHECKIN | ✅ | ✅ |
| POS offline sale | — | — | — | ✅ (audited) | ✅ |
| Orders/attendees view | — | — | PAYMENT_VIEW | ✅ | ✅ |
| Vendor review/approve | — | — | VENDOR_MANAGE | ✅ | ✅ |
| Events/map/stall-types CRUD | — | — | — | ✅ | ✅ |
| Coupons / comps | — | — | — | ✅ | ✅ |
| Finance (payments/expenses/P&L) | — | — | FINANCE_MANAGE (view) | ✅ | ✅ |
| Campaigns | — | — | — | ✅ | ✅ |
| Staff & roles management | — | — | — | — | ✅ |
| Audit log viewer | — | — | — | — | ✅ |
| System settings | — | — | — | — | ✅ |

Every row gets an integration test (signed-in-as-role → expect 200/403). This table supersedes
ad-hoc per-page choices; `canAccessSection` + page guards must both derive from it.

---

## 5. Phased hardening plan

| Phase | Items | Gate |
| --- | --- | --- |
| S1 (with rebuild core) | §3.1 oversell guard · §3.2 guard rename + RBAC matrix tests · §3.6 tests into git/CI | CI green incl. money-path tests; concurrent-purchase test cannot oversell |
| S2 (before go-live) | §3.3 Sentry + 5 alert rules · §3.4 upload constraints + `KYC_ENC_KEY` required · logout limiter · CF-Connecting-IP | Test alert fires end-to-end; upload of wrong type/size rejected |
| S3 (post-launch) | Redis rate limiting at scale · campaign secret prod-required if module live · periodic dependency review · pen-test pass on auth + payments | external review notes closed |

## 6. Verification

- `scripts/verify-*.mjs` suite (25 scripts) stays the manual harness; the committed vitest suite
  becomes the CI gate.
- New tests to write with S1: concurrent fulfilment oversell attempt, RBAC matrix sweep,
  webhook amount-mismatch rejection (exists as logic — add the test), session revocation on role
  change.
