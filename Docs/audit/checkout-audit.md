# checkout-audit.md — Event Detail + Checkout (R3.3, revenue-critical)

> The highest-revenue surface on the platform. Audited from the live code, then rebuilt for trust,
> conversion, and mobile — without touching the **locked, webhook-driven, idempotent** payment
> fulfilment. Companion to [customer-portal.md](customer-portal.md), [delight.md](delight.md),
> build-plan R3.3.

---

## TL;DR

The funnel had **one catastrophic leak and several smaller ones**. The killer: an anonymous buyer
who selected tickets and pressed **Buy** was `router.push("/login")`'d — and `/login` hardcoded
`redirectTo="/dashboard"`, ignoring any `next`. So they were thrown to a dashboard with their
**cart gone**, forced to start over. That alone could explain most checkout abandonment. Fixed with
an **inline OTP sheet** (guest-first): verify phone in place, payment resumes with the cart intact.
Added scarcity, per-type sold-out, a trust strip, and rebuilt the event page to sell (above-fold
CTA + countdown + availability, featured brands, venue/arrival, policies, final CTA, sticky mobile
bar). The success-celebration moment is R3.4 (wallet/ticket reveal) — flagged, not built here.

---

## PHASE 1 — Audit (what was wrong)

### Conversion / drop-off
| # | Problem | Severity |
| --- | --- | --- |
| C1 | **Buy while anonymous → `/login` → `/dashboard`, cart lost.** No `next`, no cart persistence. | **Critical** |
| C2 | No above-the-fold CTA — the buy box sat mid-page below the hero + description; mobile users had to hunt for it. | High |
| C3 | No scarcity / availability anywhere ("X left", "selling fast") — nothing to create urgency or honesty. | High |
| C4 | Quantity steppers allowed up to 10 regardless of real remaining stock → false promises, oversell errors at pay. | High |
| C5 | Thin selling — hero + buy + schedule + a vendor stall map. No "why attend", brands, venue/arrival, or policies. | Med |
| C6 | No final CTA — the page ended on a vendor map + sponsors, not a purchase prompt. | Med |

### Trust
| # | Problem |
| --- | --- |
| T1 | No visible security/trust signals at the point of payment (only a one-line "Secure payment via Razorpay" footnote). |
| T2 | No-refund policy, entry/QR mechanics, parking, security never surfaced — buyers hesitate without them. |

### Mobile
| # | Problem |
| --- | --- |
| M1 | No sticky purchase CTA — on a long page the only buy action scrolled away. |
| M2 | OTP redirect (C1) is even worse on mobile (full context loss, SMS app-switch, return to wrong page). |

### Error states
| # | Problem |
| --- | --- |
| E1 | 401 dead-ended into a redirect, not a recoverable in-place step. |
| E2 | Generic "Could not start checkout" with no guidance; sold-out mid-flow not clearly actionable. |

### What was already good (kept)
Server-priced coupon with live re-quote + best-price-wins copy; group-QR note; `Result`-enveloped
order API; webhook-driven idempotent fulfilment (untouched); RPA brand surface.

---

## PHASE 2/3 — Fixes applied

### Checkout (`TicketCheckout` + new `usePhoneOtp`)
- **C1/E1 — inline OTP (the headline fix).** Extracted `usePhoneOtp` (Firebase send/verify +
  reCAPTCHA, one source of truth, also adopted by `PhoneLogin`). On a 401 the checkout now opens an
  **inline phone-verify sheet** instead of redirecting; on verify it **re-runs the order and opens
  Razorpay with the cart (qty + coupon) untouched.** Guest-first — phone *is* the account; no
  separate registration, no name/email gate (Step 3 collects nothing extra by design — the spec's
  "remove fields you don't need").
- **C3/C4 — scarcity + honesty.** Per-type **"Only N left"** under `LOW_STOCK` (10), per-type
  **Sold out** disables its steppers, and the **+ stepper is capped to real `remaining`** (no false
  availability; oversell is also guarded server-side).
- **T1 — trust strip** at the point of pay: 🔒 Secure payment via Razorpay · Instant QR to your
  phone · All sales final — no refunds.
- **E2 — recoverable errors.** Sold-out mid-flow → "adjust your quantities and try again"; coupon
  expiry resets to full price with a clear line; generic failure invites retry (never a dead-end).

### Event detail page (rebuilt to sell)
- **C2 — hero now converts:** availability chip (Sold out / Selling fast / On sale now) + date +
  **"Tickets from ₹X"** + live **countdown** + an **above-the-fold "Get tickets"** CTA jumping to
  `#tickets`.
- **C5 — real-data selling sections:** Featured **brands** (real approved vendors, lazy logos),
  Schedule, **Venue & arrival** (venue/when/parking/accessibility + live stall-availability map),
  **Policies** accordion (refunds/entry/security/parking/kids/photography — T2).
- **C6 — final CTA band** before the footer.
- **M1 — `StickyBuyBar`:** mobile-only fixed bar (price + "Get tickets") that fades in once the
  hero CTA scrolls out (IntersectionObserver, no layout shift, safe-area inset). Desktop unaffected.

---

## Remaining opportunities (flagged, not done here)

1. **Success celebration is R3.4.** Success still routes to `/tickets?paid=…`; the cinematic reveal
   + QR preview + add-to-calendar + share is delight.md / the wallet (R3.4). Wiring it here would
   duplicate that surface — deferred deliberately.
2. **Editorial "why attend / food / workshops"** needs structured content (food vendors, workshop
   list) that the data model doesn't carry yet — adding it now would be placeholder copy, which the
   brief forbids. Used real-data sections instead; revisit when content models land.
3. **LCP/Lighthouse are staging measurements.** The page is `force-dynamic` because the root layout
   reads `headers()` for the strict **nonce CSP** (same constraint flagged in R3.2) — full static
   ISR isn't available without a CSP-architecture change. Data is cache-friendly; brand logos are
   lazy; the hero ships no priority image.
4. **Razorpay retry UX** on a failed payment (vs dismissed) could surface a one-tap "try again";
   today a dismiss returns the buyer to the cart (recoverable) and a hard failure shows the error.

## Expected impact

Removing C1 alone should materially cut abandonment — it converted "logged-out but ready to pay"
(a high-intent segment) from a guaranteed restart into an in-place verify. Scarcity + above-fold +
sticky CTA + trust signals compound on top. No payment-mechanics risk was taken: fulfilment stays
webhook-driven, idempotent, paise-integer, no-refund, group-QR — all untouched.

## Verification

typecheck ✓ · lint 0/10 ✓ · 274 tests green ✓ · build ✓ · event page 200 with hero CTA + `#tickets`
+ trust strip + policies rendering. (Full OTP→pay path needs Firebase + a real handset → staging.)
