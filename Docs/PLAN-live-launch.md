# PLAN-live-launch

## Goal
Fix all P0 and critical P1 issues identified in the production audit, configure Cloudflare as a proxy (CDN/WAF/Cache) in front of Vercel, and prepare the BDQ Social platform for a secure live launch. No code is written in this phase—only planning.

## Socratic Gate & Open Questions

Before we begin implementation, we need to confirm a few operational details:

> [!IMPORTANT]
> **User Feedback Required:**
> 1. **Testing Strategy:** The audit flagged 0 automated tests as a P0 blocker. Are you okay with us writing a fast `vitest` suite for just the pure business logic (pricing, rate-limits, QR generation) before launch, or do you want to accept the risk and skip tests entirely for this release?
> 2. **Cloudflare IP Restricting:** Since Cloudflare is handling WAF/Security, do you want us to lock down Vercel so it *only* accepts traffic from Cloudflare IPs? (This prevents attackers from bypassing your CF WAF by hitting the Vercel URL directly).
> 3. **Admin 2FA:** We are removing the backdoor that lets some admins bypass 2FA. For your own local development, are you comfortable using an authenticator app (or we can inject a fixed TOTP secret into your local DB seed)?

---

## 🧠 Brainstorm: Cloudflare + Vercel Integration

### Context
Using Cloudflare purely for CDN, caching, and security (WAF/DDoS) while Vercel remains the compute origin.

### Option A: Standard Proxy (DNS Only)
Just point Cloudflare DNS (Orange Cloud) to Vercel.
✅ **Pros:** Easiest setup. Immediate CDN caching for static assets.
❌ **Cons:** Vercel origin URL (e.g., `bdq-social.vercel.app`) remains exposed. Attackers can bypass Cloudflare WAF by hitting Vercel directly. Rate limiting relies on potentially spoofable `x-forwarded-for` headers.
📊 **Effort:** Low

### Option B: Hardened Origin (Recommended)
Point Cloudflare to Vercel, but update the Next.js app to respect Cloudflare-specific headers and lock down Vercel.
✅ **Pros:**
- Rate limiting uses `CF-Connecting-IP` (unspoofable).
- We can verify Cloudflare's presence (e.g., via a shared secret header or checking CF IP ranges).
❌ **Cons:** Requires a bit of middleware tweaking.
📊 **Effort:** Low-Medium

## 💡 Recommendation
**Option B (Hardened Origin)**. It's critical for a production platform dealing with payments to ensure WAF cannot be bypassed.

---

## Proposed Changes (Task Breakdown)

### Phase 1: Security & Auth Hardening (P0 Fixes)
- [ ] **Remove Dev Gates:** Delete `DEV_ADMIN` and `DEV_VENDOR` overrides in `src/server/auth/guard.ts`.
- [ ] **Enforce 2FA:** Remove `ADMIN_NO_2FA_EMAILS` exemption in `src/app/api/auth/admin/route.ts`. All admins must use TOTP.
- [ ] **Secure Sessions:** Update `src/server/auth/session.ts` to explicitly set `domain: env.APP_BASE_DOMAIN` so cookies work securely across `admin.` and `vendors.` subdomains.
- [ ] **Cloudflare IP Trust:** Update `src/lib/ratelimit.ts` to prioritize the `cf-connecting-ip` header for accurate client IP identification.

### Phase 2: Booking & Concurrency Fixes (P0/P1)
- [ ] **Stall Hold TTL:** Update `src/server/bookings/payment.ts`. Instead of `holdUntil: null` during payment, set it to `Date.now() + 30 minutes`.
- [ ] **Ticket Oversell Race:** Move the capacity check (`soldQty + qty <= totalQty`) inside the transaction in `fulfillOrder` or atomic increment.
- [ ] **Coupon Race:** Enforce coupon `maxUses` and `perUserLimit` atomically during checkout.

### Phase 3: Infrastructure & Crons (P0 Fixes)
- [ ] **Enable Crons:** Populate `vercel.json` with the 4 missing cron jobs (reconcile, release-holds, notify-retry, reminders).
- [ ] **DB Pooling:** Update `DATABASE_URL` in `.env` instructions to include `?connection_limit=1` to prevent Vercel serverless from exhausting Neon's connection limit.
- [ ] **Error Tracking:** (Optional but highly recommended) Add basic Sentry initialization in `logger.ts`.

### Phase 4: Automated Testing (P0 Fixes)
- [ ] **Vitest Setup:** Install `vitest` and configure it.
- [ ] **Pure Function Tests:** Write unit tests for:
  - `pricing/engine.ts` (Ensure discounts don't stack incorrectly)
  - `qr-token.ts` (Ensure tampering is caught)
  - `rate-window.ts` (Ensure limit logic works)

### Phase 5: Cloudflare Deployment Configuration
- [ ] **SSL/TLS:** Ensure Cloudflare SSL is set to "Full (Strict)".
- [ ] **Caching:** Ensure Cloudflare respects Next.js cache headers.
- [ ] **WAF Setup:** Document the needed WAF rules (e.g., blocking known malicious IPs, rate-limiting highly sensitive paths if Vercel limit isn't enough).

---

## Verification Plan

### Automated Verification
- Run the new `vitest` suite to confirm pricing and token logic.
- Run `npm run typecheck` and `npm run lint`.

### Manual Verification
- Deploy to a Vercel staging environment.
- Point a Cloudflare test domain to it.
- **Test Checkout:** Attempt to buy a ticket, verify Cloudflare IP is logged, verify Razorpay webhook succeeds, and verify tickets are issued.
- **Test Admin Login:** Verify login without TOTP fails.
- **Test Crons:** Manually trigger `/api/cron/release-holds` and ensure it runs successfully.
