# BDQ Social — Business Rules & Configuration

> The concrete values and policies the code depends on, so no pricing/limit decisions happen
> mid-build. Companion to [project.md](project.md), [SCHEMA.md](SCHEMA.md), [API.md](API.md).
>
> **Pricing is fully dynamic.** There are **no hardcoded prices anywhere**. Ticket types, stall
> types, their prices, bulk-discount %, and early-bird are all **entered by the admin while
> creating/editing an event** and stored per event. Tables below show structure + examples only.
>
> **CONFIRM markers:** rows tagged **[CONFIRM]** are recommended **operational** defaults (TTLs,
> SLAs, rate limits) — not prices. Edit them to taste.

---

## 0. Global conventions

| Item | Value |
| --- | --- |
| Currency | INR (₹) |
| Money storage | integer **paise** everywhere (e.g. ₹499 = `49900`) |
| Timezone | Asia/Kolkata (IST) for all event/schedule times; store UTC, render IST |
| Phone format | E.164, default country `+91`; OTP 6 digits |
| Rounding | discounts rounded to nearest paise, never below 0 |
| Locale | en-IN |

---

## 1. Tickets

### 1.1 Ticket types & prices  (dynamic, per event)
- **Admin defines the ticket types and their prices while creating/editing the event.** No fixed
  catalog, no default prices in code.
- Each ticket type has: `name`, `priceInPaise`, optional `earlyPricePaise`, `totalQty` (inventory),
  tracked `soldQty`, and `attendeesPer` (e.g. a "Couple" type = 2 → 2 QRs / 2 check-ins, see §1.5).
- Examples only (an admin might create): General, Couple, VIP, Day Pass — names + prices are
  whatever the admin enters.

### 1.2 Bulk discount  (trigger fixed, % dynamic)
- **Rule:** a bulk discount applies when ticket **quantity > 5** in a single order (i.e. 6+).
- **The discount tiers/% are entered by the admin per event** (`Event.bulkTiers` JSON, e.g.
  `[{minQty:6,percent:..},{minQty:10,percent:..}]`). No hardcoded percentages.
- Applies to ticket subtotal only.

### 1.3 Early-bird  (dynamic, per event)
- Optional per event. **Admin sets the window and the early price/discount** (`Event.earlyBird`
  JSON: e.g. `{endsAt, soldCap, percent}` or an explicit `earlyPricePaise` per ticket type).
- No default window or default discount in code.

### 1.4 Coupons & stacking
- Coupon types: `FLAT` (paise off) or `PERCENT`.
- Constraints: active window (`startsAt`/`endsAt`), `maxUses` (total), `perUserLimit`
  (**default 1**), optional `minOrder`, scope (event / ticket-type / all).
- **Stacking policy: best single discount wins.** The system applies whichever of {early-bird,
  bulk, coupon} yields the lowest total — they do **not** combine. **[CONFIRM]** (alt: allow
  coupon to stack on top of early-bird/bulk).

### 1.5 Group ticketing
- One order can contain multiple tickets; **max 10 per order**. **[CONFIRM]**
- Buyer may assign each ticket a holder phone/email; each ticket gets its own QR + delivery.

### 1.6 Payment window (unpaid order expiry)
- An `Order` left `PENDING` expires after **15 minutes**; inventory (`soldQty` hold) is released
  by cron. **[CONFIRM]**

### 1.7 Customer payment modes
- Customers pay **online only** (Razorpay). Offline/cash is **not** offered to customers.
- Admin may record an offline ticket sale on a customer's behalf (rare; audited).

### 1.8 Refunds
- **No refunds. All sales final.** No refund flow exists. (Locked.)

---

## 2. Stalls (vendors)

### 2.1 Stall types, sizes & prices  (dynamic, per event)
- **Admin defines stall types and their prices while creating the event** (`StallTypeDef`:
  `name, widthFt, heightFt, priceInPaise, color, sellable`). No hardcoded stall prices.
- Sizes below are the **Aarush Lawn reference** used by the seed template; the admin may keep or
  change them, and **enters the price** for each.

| Type | Size (ft) | Count (seed) | Price | Sellable |
| --- | --- | --- | --- | --- |
| Small stall | 10 × 10 | 36 | admin-entered | yes |
| Lane stall | 10 × 10 | 32 | admin-entered | yes |
| Premium stall | 15 × 12 | 16 | admin-entered | yes |
| Food stall | 10 × 10 | 10 | admin-entered | yes |

> An individual stall may override its type price (e.g. a corner premium) via `Stall.priceInPaise`.
> The seed template provides **layout + sizes only**, never prices.

### 2.2 Hold (selection lock)
- Selecting a stall creates a **HELD** lock with TTL **10 minutes** (`holdUntil`). **[CONFIRM]**
- `release-holds` cron frees expired holds back to `AVAILABLE`.

### 2.3 Booking & payment
- Vendor pays **online (Razorpay) or offline** (cash/bank, admin-recorded). Both → `Booking`
  becomes `PENDING`.
- **Simple payment receipt** is issued. **No GST tax invoice. No GST charged.** (Locked.)

### 2.4 Verification workflow
- States: `SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED`.
- **Team calls the vendor to verify** before approval. Target call-back SLA: **within 48 hours**
  of submission. **[CONFIRM]**
- Approve → `Booking=BOOKED`, `Stall=BOOKED`, vendor notified. Reject → hold released, vendor
  notified.

### 2.5 KYC (verification only, no billing)
- Collected at registration: **PAN (all vendors)**, **FSSAI (food vendors)**, **GSTIN (optional)**,
  plus uploaded doc images. Used only to verify identity; never used to compute tax.

### 2.6 Admin-side booking
- Admin can create a booking, enter vendor details, assign a stall, and record payment
  (online/offline). Fully audited (`Booking.source = ADMIN`).

### 2.7 Waitlist & auto-offer
- If a sellable stall is released, the system offers it to the next vendor on that event's stall
  **waitlist** (notify + a time-boxed claim window of **24 hours**). **[CONFIRM]**

---

## 3. Map

| Item | Value |
| --- | --- |
| Coordinate unit | **feet** (all element sizes/positions in ft) |
| Default canvas (seed) | 230 × 160 ft (Aarush Lawn) |
| Grid snap | 1 ft default (toggleable) |
| Status colors | per [design.md](design.md) §3.6 / [project.md](project.md) §7.4 |
| Live status refresh | polling every **10s** (MVP); websockets later. **[CONFIRM]** |
| Sellable types | FOOD, SHOPPING/SMALL, LANE, PREMIUM, CUSTOM (sellable=true) |
| Non-sellable | STAGE, ENTRY, LOUNGE, RESTROOM, WALKWAY, WATER, BLOCKED infra |

---

## 4. Check-in / entry

| Item | Value |
| --- | --- |
| Scan result | `VALID` (first scan) / `ALREADY_USED` / `INVALID` |
| Entries per ticket | **1** (single entry; no re-entry by default). **[CONFIRM]** |
| Final state | `Ticket → CHECKED_IN` (terminal) |
| Capacity count | live = check-ins `IN` minus `OUT` (OUT only if re-entry enabled) |
| Offline scans | queued locally, synced on reconnect; server is authoritative |
| Event capacity | = sum of all `TicketType.totalQty` for the event |

---

## 5. Roles & permissions

| Role | Capability summary |
| --- | --- |
| `CUSTOMER` | buy tickets, view events/map/timetable, my-tickets |
| `VENDOR` | register, KYC, assets, stall booking, dashboard, timetable |
| `STAFF` | permission-scoped (below); **cannot** edit events/payments/map/coupons/sponsors |
| `SUPER_ADMIN` | full CRUD + analytics + audit + sponsors; **TOTP 2FA required** |

**STAFF permission presets** (`permissions[]` strings):
| Preset | Grants |
| --- | --- |
| default staff | `CHECKIN`, `VENDOR_MANAGE`, `EVENT_VIEW`, `CUSTOMER_VIEW` |
| `SCANNER_ONLY` | `CHECKIN` |
| `SUPPORT_ONLY` | `CUSTOMER_VIEW`, `VENDOR_VIEW` |
| `FINANCE_VIEW` | `PAYMENT_VIEW`, `EVENT_VIEW` |

Permission atoms: `CHECKIN, VENDOR_MANAGE, VENDOR_VIEW, EVENT_VIEW, CUSTOMER_VIEW, PAYMENT_VIEW`.

---

## 6. Auth & sessions

| Item | Value |
| --- | --- |
| Customer/vendor login | Firebase phone OTP (vendor may also use email) |
| OTP length / resend | 6 digits; resend cooldown **30s**; max **5** attempts / 30 min |
| Admin login | private subdomain, email/password (Firebase) **+ TOTP 2FA** |
| Session | httpOnly, Secure, SameSite=Lax cookie; TTL **7 days**, rotate on privilege change. **[CONFIRM]** |
| Zone isolation | customer/vendor/admin sessions not interchangeable |

---

## 7. Notifications

| Trigger | Channels | Timing |
| --- | --- | --- |
| Ticket issued | WhatsApp (QR) + email | immediately on payment |
| Vendor approved/rejected | WhatsApp + email | on admin action |
| Waitlist stall offer | WhatsApp + email | on release |
| Event reminders | WhatsApp/email/push | **24h** and **2h** before start. **[CONFIRM]** |
| Channel priority | WhatsApp → email → SMS fallback | on send failure |
| Retry policy | exponential backoff, **5** attempts, then mark FAILED | — |

---

## 8. Rate limits (abuse protection)

| Action | Limit  **[CONFIRM]** |
| --- | --- |
| OTP request | 5 / 30 min / phone; 20 / hour / IP |
| Login attempts | 10 / 15 min / IP |
| Coupon apply | 15 / 10 min / user |
| Checkout create | 10 / 10 min / user |
| Webhook | unrestricted but signature-verified + idempotent |

---

## 9. Pricing engine (resolution order)

For a ticket order, compute per line then choose the customer's best outcome:
```
base = sum(ticketType.price × qty)
candidateA = apply early-bird (if active window)
candidateB = apply bulk tier (if qty > 5)
candidateC = apply coupon (if valid)
total = min(base, candidateA, candidateB, candidateC)     # best single discount wins
discount = base - total
```
> If §1.4 is changed to "coupon stacks", coupon applies on top of the best of {early-bird, bulk}.

---

## 10. Event lifecycle & multi-event

| Item | Value |
| --- | --- |
| Event statuses | `DRAFT → PUBLISHED → LIVE → ENDED → ARCHIVED` |
| Visibility | only `PUBLISHED`/`LIVE` events appear publicly |
| Multi-event | supported; tickets/stalls/analytics scoped by `eventId` (no cross-leak) |
| White-label theme | optional per-event `theme` JSON (colors/logo) overriding defaults |

---

## 11. Operational values to confirm (summary of [CONFIRM])

> All **prices are dynamic** (admin-entered per event) — not listed here. These are **operational**
> defaults only:

1. Coupon **stacking** choice (§1.4) and group-order **max** (§1.5).
2. **Hold TTL** (§2.2), **order expiry** (§1.6), **waitlist claim window** (§2.7), call-back SLA (§2.4).
3. **Re-entry** policy (§4), reminder timings (§7), session TTL (§6), rate limits (§8), map refresh (§3).

Everything else is locked by [project.md](project.md) / [ARCHITECTURE.md](ARCHITECTURE.md).
