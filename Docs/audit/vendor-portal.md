# vendor-portal.md — Vendor Portal Rebuild Specification (RPA)

> Spec 11/15. The vendor portal moves onto the **identical RPA component library as the
> customer side** (owner instruction; strengthened DR-3) — same tokens, same `.btn`, same
> underline inputs, same `RpaPageHeader`, same sheets. Vendors are buyers of a premium product;
> the portal must feel like the brand they're paying to join. State machine per
> [architecture.md §4.1](architecture.md); layouts per [mobile.md §4](mobile.md).

## 1. Principles

1. **One spine:** onboarding IS the dashboard. The current split (dashboard cards duplicating
   onboarding status — `vendor/(app)/dashboard/page.tsx` vs `onboarding/page.tsx`) collapses
   into one progressive home with a status timeline.
2. **Always show where you are and what happens next** — the call-back wait is the highest-
   anxiety moment; it gets explicit copy and an SLA promise.
3. Same locked flow: brand → documents → stall → agreement → call-back approval → payment.
4. Zone chrome: navy rail (`ZoneSidebar` restyled), cream content, `.rpa` root on the layout.

## 2. IA

```
vendors.bdqsocial.com
├── /signup, /login            (phone OTP — PhoneLogin reused verbatim)
└── (app)
    ├── /home                  Status spine + stepper (merges dashboard+onboarding)
    ├── /events                Markets list → /events/[id] stall picker
    ├── /profile               Brand profile (public-facing fields)
    ├── /documents             KYC + uploaded docs
    ├── /add-ons               Stall extras ordering (owner-confirmed, after BOOKED)
    ├── /leads                 QR + captured list + CSV
    └── /contract              Signed agreement view/download
Nav: Home · Book a stall · Leads · Add-ons · Profile · Documents · Contract (contextual: Add-ons
hidden until BOOKED; Book a stall renamed "My stall" once RESERVED+)
```

## 3. The Home spine — `/home`

Header: brand logo (56px tile) + brandName `f-h76` + approval `badge-rpa`.

**Status timeline** (vertical, design-system tokens): six nodes — Account ✓ → Brand → Documents
→ Stall → Agreement → Payment. Node states: done (filled `--color` dot + ✓), current (pulsing
lavender dot, 1.2s ease-in-out scale 1→1.15), locked (30% opacity + lock glyph). Each node row:
label `f-h32`, sub-line small (what's needed / what happened, with timestamp), action
`link--split` when actionable.

Copy per state (exact):
- Brand pending: "Tell us who you are — name, what you sell, your story."
- Docs pending: "PAN for every vendor; FSSAI if you serve food. Photos or PDFs."
- Stall pending: "Pick your spot on the live layout. Good ones go first."
- Agreement pending: "Read once, sign once. Takes two minutes."
- **Call-back wait (the anxiety state):** "You're in review. Our team calls within 48 hours —
  keep your phone close. Nothing else is needed from you." + submitted-at timestamp.
- PENDING_PAYMENT: "You're approved! Complete payment by <payBy, en-IN> to lock Stall <label>."
  + countdown chip + Pay `.btn`.
- BOOKED: "Stall <label> is yours. See you at the market." + add-ons teaser card.
- REJECTED: "This application wasn't approved. Call us on <support> — we'll help." (danger badge)

Below timeline: contextual card for the CURRENT step (the step forms render inline here —
`?step=` deep links kept for the stepper pills). Data: exactly today's queries
(`getProfile`, `getContract`, latest active booking — `vendor/(app)/onboarding/page.tsx:28-37`).

## 4. Step forms (exact fields & validation — Zod in `server/schemas.ts`)

### 4.1 Brand
| Field | Rules | Copy |
| --- | --- | --- |
| Brand name | 2–60 chars, required | "Your public name at the market" |
| Registered name | optional, 2–80 | "Legal name (if different)" |
| Product category | required select: Food & Beverage / Fashion & Apparel / Beauty & Wellness / Home & Decor / Art & Craft / Jewellery / Experiences / Other | drives FSSAI requirement |
| What you sell | required, 10–300 chars textarea | "The things people will find at your stall" |
| Description | optional ≤500 | shown on your public brand page |
| Instagram / Website | optional, URL/handle normalized (`@x` → url) | "Where people can find you" |
| City · Contact person · WhatsApp | city required; WhatsApp E.164 required | verification call goes here |
Underline inputs (design-system §3.2); save = `.btn` "Save & continue"; success advances node.

### 4.2 Documents (KYC — verify-only, locked rule)
PAN upload (required, all) · FSSAI (required iff category = Food & Beverage) · GSTIN text
(optional). Upload tiles: 2-col grid, dashed tile → preview state with re-upload; constraints
jpg/png/webp/pdf ≤5MB (security.md §3.4), signed Cloudinary upload (existing `AssetUploader`
pattern). Encrypted at rest (`crypto-field.ts`). Copy: "Used only to verify you — never for
tax. No GST is charged anywhere."

### 4.3 Stall picker — `/events/[id]`
Konva picker per mobile.md §4: real layout, type legend chips (name + size + price from
`StallTypeDef`), available = green, taken = grey with brand name at zoom. Tap available →
**zoom-to-stall (450 ms ease-out to 2×, map-system §11)**, then bottom sheet: "Stall <label> ·
<type> · <W>×<H> ft (<area> sq ft) · ₹<price>" + zone chip + **why-this-stall bullets (≤3 from
the scoring engine's `describeStall`, e.g. "Corner stall · 40 ft from Main Gate · on Center
aisle", map-system §9.1)** + distance-from-entrance chip + "Reserve this stall" `.btn` →
`RESERVED` via existing CAS hold (`server/bookings/service.ts`). One active reservation per
vendor enforced server-side; switching = release + re-reserve with confirm ("Swap to F-12?
Your hold on F-08 is released."). Hold-expiry banner when `holdUntil` near (<10m): "Your
reservation expires in <mm:ss> — finish the agreement to keep it."

### 4.4 Agreement
Scrollable contract (existing `contracts/agreement.ts` content) in bordered tile; typed-name
signature field + checkbox "I've read and agree"; sign records name/IP/timestamp + PDF to
Cloudinary (existing `ContractSign` flow). Signed state: ✓ + "Download signed PDF".

### 4.5 Payment
Visible locked until PENDING_PAYMENT. Shows: stall, base price, **add-ons subtotal if any
pre-selected (§5)**, total `f-h60`, payBy countdown, Pay `.btn` → Razorpay (existing
`VendorStallPay` flow, `fulfillStallBooking` webhook). Offline note: "Paying by bank transfer?
Call <support> — we'll record it." (admin-recorded path exists).

## 5. Add-ons ordering — `/add-ons` (owner-confirmed, new)

Model: `StallAddOn { id, eventId, name, pricePaise, maxPerBooking, stock?, active }` (admin
CRUD — admin-portal.md §6.5) + `BookingAddOn { bookingId, addOnId, qty, pricePaise }` (price
snapshotted, integer paise).
- UI: card per add-on (name `f-h42`, price, qty stepper, stock note when low), order summary,
  Pay `.btn` → separate Razorpay order fulfilled by the existing stall-payment webhook dispatch
  (new `gatewayOrderId` on a `BookingAddOnOrder` or reuse Booking-payment path with
  `meta.addOns` — roadmap package picks the simpler: **separate small order table**, webhook
  branches on prefix).
- Available only `status=BOOKED` and until `event.startsAt − 48h`; after that: "Add-on orders
  closed — bring what you need or ask the floor team."
- Examples seeded by admin per event (table, chairs, power 5A/15A, light rig, signage board) —
  prices admin-entered, never hardcoded (locked rule).

## 6. Leads — `/leads` (rebuilt visual, same logic)

QR card (RPA tile, QR 200px, print-CSS friendly: `@media print` → QR + brand name only),
capture link copyable; lead rows (name, contact, time) 56px; CSV export (existing rate-limited
route). New: count badge by day chips ("Tonight: 34"). Empty: "Print your QR and put it where
people queue — that's where leads happen."

## 7. Profile & Documents & Contract pages

Profile = §4.1 form standalone + public-page preview link ("See your brand page →" →
`/vendors/[id]`). Documents = §4.2 standalone + verification status per doc. Contract =
signed-PDF viewer + version + signed-at; pre-sign it redirects to the home spine.

## 8. States & edge cases

| Case | Behavior |
| --- | --- |
| payBy lapses | Booking CANCELLED by cron; home shows "Your payment window passed — your stall was released. Pick a new one." + stall picker CTA |
| Stall released while paying | Razorpay dismiss → re-check booking status → if lost: apologetic state + picker |
| Rejected vendor re-applies | REJECTED is terminal per profile; "Call us" path only (no self-resubmit loop — support decides) |
| Event over | Portal switches to post-mode: leads export nudge + "Book the next edition" waitlist CTA (`WaitlistType.STALL`) |
| Multi-event future | Booking is event-scoped already; nav "My stall" becomes a per-event list when >1 active event (V3) |

## 9. Verification

- e2e (the dry-run vendor of launch-readiness §3.4): signup → brand → docs → reserve on phone
  viewport → sign → admin approves → pay → BOOKED → add-on order → lead capture → CSV.
- Unit: add-on price snapshot math; payBy countdown edge (timezone IST); FSSAI conditional rule.
- a11y: stall picker list fallback; stepper keyboard navigation; print CSS for lead QR.
