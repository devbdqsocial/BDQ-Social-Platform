# BDQ Social — API & Action Contracts

> Request/response/error contracts for every endpoint and server action, so no shape decisions
> happen mid-build. Consistent with [SCHEMA.md](SCHEMA.md), [BUSINESS-RULES.md](BUSINESS-RULES.md),
> [project.md](project.md) §12, [ARCHITECTURE.md](ARCHITECTURE.md). Money is integer **paise**.

---

## 1. Conventions

- **Transport:** mutations are Next.js **server actions** by default; **route handlers** (`/api/*`)
  are used for webhooks, cron, auth, public reads, and the scanner. Contracts below apply to both
  (the action takes the same input, returns the same shape).
- **Zone & auth:** derived from hostname (middleware) + session cookie. Each contract notes its
  required zone + role/permission.
- **Success envelope:** `{ "ok": true, "data": <T> }`
- **Error envelope:** `{ "ok": false, "error": { "code": <CODE>, "message": <string>, "details"?: <obj> } }`
- **Validation:** every input is Zod-validated server-side; failures → `VALIDATION` (422).
- **Idempotency:** money/fulfilment paths are idempotent by a stable key (noted per endpoint).

### 1.1 Error codes → HTTP
| Code | HTTP | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | no/invalid session |
| `FORBIDDEN` | 403 | wrong role/permission/zone |
| `VALIDATION` | 422 | input failed schema |
| `NOT_FOUND` | 404 | resource missing |
| `CONFLICT` | 409 | state conflict (e.g. already approved) |
| `STALL_UNAVAILABLE` | 409 | stall not AVAILABLE / hold lost |
| `COUPON_INVALID` | 422 | coupon expired/capped/out-of-scope |
| `RATE_LIMITED` | 429 | over rate limit (§ BUSINESS-RULES 8) |
| `PAYMENT_ERROR` | 402 | gateway failure |
| `IDEMPOTENT_REPLAY` | 200 | duplicate webhook/no-op (returns prior result) |
| `INTERNAL` | 500 | unexpected |

---

## 2. Public (no auth) — apex zone

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/events` | `Event[]` (PUBLISHED/LIVE only; summary fields) |
| GET | `/api/events/:slug` | `Event` + `ticketTypes` |
| GET | `/api/events/:slug/schedule` | `ScheduleItem[]` (sorted) |
| GET | `/api/events/:slug/map` | `{ layoutJson, stalls:[{id,label,type,status,priceInPaise,xFt,yFt,widthFt,heightFt}] }` (read-only) |
| GET | `/api/vendors` | approved `VendorProfile[]` (brand directory) |
| GET | `/api/vendors/:id` | approved vendor public profile |

**POST `/api/waitlist`** — join ticket/stall waitlist.
- Body: `{ eventId, type: "TICKET"|"STALL", contact?, stallTypeId? }`
- 200: `{ ok, data:{ id } }` · Errors: `VALIDATION`, `NOT_FOUND`(event)

---

## 3. Auth

**POST `/api/auth/verify`** — exchange Firebase ID token for app session.
- Zone: customer or vendor (sets role per zone on first login).
- Body: `{ idToken: string }`
- 200: `{ ok, data:{ userId, role } }` + `Set-Cookie` httpOnly session
- Errors: `UNAUTHENTICATED`(bad token), `RATE_LIMITED`
- Notes: server verifies via Firebase Admin SDK; upserts `User`.

**POST `/api/auth/logout`** → clears session. 200 `{ ok }`.

**POST `/api/admin/auth/totp/verify`** — admin 2FA step.
- Zone: admin. Body: `{ code: string }` → 200 `{ ok, data:{ verified:true } }` · Errors:
  `UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`.

---

## 4. Customer (apex `/login` zone, role CUSTOMER)

**POST `/api/coupons/validate`** — preview a coupon before checkout.
- Body: `{ eventId, code, items:[{ticketTypeId, qty}] }`
- 200: `{ ok, data:{ valid:true, discount, total, source:"COUPON" } }`
- Errors: `COUPON_INVALID`, `VALIDATION`

**POST `/api/orders`** — create order + Razorpay order.
- Body:
  ```json
  { "eventId": "...", "items": [{ "ticketTypeId": "...", "qty": 2 }],
    "couponCode": "DIWALI10", "utm": {"source":"ig"},
    "clientOrderKey": "00000000-0000-4000-8000-000000000000" }
  ```
- Server: validates inventory, runs **pricing engine** (BUSINESS-RULES §9: best single discount),
  creates `Order(PENDING, expiresAt=now+15m)`, creates Razorpay order.
- 200: `{ ok, data:{ orderId, amountPaise, razorpayOrderId, keyId } }`
- Errors: `VALIDATION`, `COUPON_INVALID`, `CONFLICT`(sold out), `PAYMENT_ERROR`
- Idempotency: optional `clientOrderKey` body field reuses the same live pending Razorpay order.

**POST `/api/payments/razorpay/webhook`** — fulfilment (PUBLIC, signature-verified).
- Headers: `X-Razorpay-Signature`, `x-razorpay-event-id`. Body: Razorpay event payload.
- Server: verify signature → if `payment.captured`: txn { `Order→PAID`, issue `Ticket`s (+ signed
  `qrToken`), incr `soldQty`, enqueue `Outbox` (WhatsApp+email) }. **Idempotent** by
  `WebhookEvent(provider,eventId)` and `Payment.gatewayRef`.
- 200 always on accepted/duplicate (`IDEMPOTENT_REPLAY` for dup). 400 on bad signature.

**GET `/api/orders/:id`** → `{ order, tickets }` (owner only; else `FORBIDDEN`).

**GET `/api/me/tickets`** → `Ticket[]` with QR payload (owner; offline-cacheable).

---

## 5. Vendor (`vendors.` zone, role VENDOR)

**POST `/api/vendor/register`** — create/complete profile.
- Body: `{ brandName, category, description?, website?, socials? }`
- 200: `{ ok, data:{ vendorProfileId, approvalStatus:"SUBMITTED" } }`

**PUT `/api/vendor/profile`** → update own profile. 200 `{ ok, data:{ profile } }`.

**POST `/api/vendor/assets/sign`** — get a Cloudinary signed-upload payload.
- Body: `{ kind:"LOGO"|"BANNER"|"PRODUCT"|"KYC_DOC" }`
- 200: `{ ok, data:{ signature, timestamp, apiKey, cloudName, folder } }`
- Then client uploads to Cloudinary; **POST `/api/vendor/assets`** `{ kind, url, publicId }` to
  persist. (Server validates type/size/ownership.)

**POST `/api/vendor/kyc`** — submit KYC (verify-only).
- Body: `{ pan?, fssai?, gstin?, docUrls?:[] }` → 200 `{ ok, data:{ kycId } }`

**~~POST `/api/stalls/:id/hold` / `/release`~~** — REMOVED (booking collapse, rebuild R1.3).
The public 10-minute select-to-hold flow is gone; stalls are reserved only through the vendor
onboarding flow (`reserveStallAction` server action → `Booking(RESERVED)`).

**Stall booking flow (current)** — approve-before-pay (architecture.md §4.1):
- Vendor reserves on the layout → `Booking(RESERVED)`, stall held (no TTL, no payment).
- Admin approves (team call-back, audited) → `Booking(PENDING_PAYMENT)` + `payBy` window.
- Vendor pays (`createStallPaymentOrder` server action → Razorpay) → webhook (§4) fulfils
  `PENDING_PAYMENT → BOOKED` idempotently by `gatewayRef`; stall → BOOKED.
- `payBy` lapse or rejection → `CANCELLED`/`REJECTED`, stall freed (cron).

**GET `/api/vendor/bookings`** → `Booking[]` with stall + status + payment.

**POST `/api/vendor/contract/sign`** → `{ ok, data:{ status:"SIGNED", signedAt } }`.

---

## 6. Admin (`admin.` zone, role SUPER_ADMIN unless noted)

All admin mutations pass through `withAudit`/`withAuditTx`; the mutation and `AuditLog` write are one transaction.

### 6.1 Events / catalog (SUPER_ADMIN)
| Method | Path | Body / Notes |
| --- | --- | --- |
| POST | `/api/admin/events` | `{ name, description, location, startsAt, endsAt, capacity?, bulkTiers?, earlyBird?, theme? }` |
| PUT | `/api/admin/events/:id` | partial update |
| POST | `/api/admin/events/:id/publish` | `status DRAFT→PUBLISHED` |
| DELETE | `/api/admin/events/:id` | only if no paid orders (else `CONFLICT`) |
| POST/PUT/DELETE | `/api/admin/events/:id/ticket-types` | `{ name, priceInPaise, earlyPricePaise?, totalQty, attendeesPer }` |
| POST/PUT/DELETE | `/api/admin/events/:id/schedule` | `{ startsAt, endsAt?, title, stageOrZone?, performer?, sortOrder }` |
| POST/PUT/DELETE | `/api/admin/events/:id/stall-types` | `{ name, widthFt, heightFt, priceInPaise, color, sellable }` |

### 6.2 Map (SUPER_ADMIN)
| Method | Path | Notes |
| --- | --- | --- |
| PUT | `/api/admin/events/:id/map` | `{ layoutJson, opsLayerJson? }` → upserts `MapLayout` + normalizes `Stall` rows |
| POST | `/api/admin/events/:id/map/clone-template` | `{ template:"aarush-lawn" }` → seeds 101 stalls |
| POST/PUT/DELETE | `/api/admin/stalls` | single-stall CRUD `{ eventId, label, stallTypeId, xFt,yFt,widthFt,heightFt,rotation, priceInPaise?, status }` |

### 6.3 Registrations / vendors
| Method | Path | Returns / Body |
| --- | --- | --- |
| GET | `/api/admin/registrations` | customers + vendors, filterable (STAFF: view) |
| GET | `/api/admin/customers` | `User[role=CUSTOMER]` (STAFF: `CUSTOMER_VIEW`) |
| GET | `/api/admin/vendors` / `/:id` | vendor list/detail incl. KYC + assets + selected stall (STAFF: `VENDOR_VIEW`) |
| POST | `/api/admin/vendors/:id/approve-for-payment` | moves reserved stall to `Booking(PENDING_PAYMENT)` after callback + signed contract (STAFF: `VENDOR_MANAGE`) |
| POST | `/api/admin/vendors/:id/assign-stall` | assigns an available stall to an approved vendor as `Booking(PENDING_PAYMENT)`; never marks `BOOKED` without payment capture |
| POST | `/api/admin/vendors/:id/reject` | `{ reason? }` → release hold, notify |

**Approve contract detail**
- Pre: vendor has a signed contract and either a reserved stall or an admin-selected available stall.
- 200: `{ ok, data:{ vendorId, stallId, status:"PENDING_PAYMENT", payBy } }`
- Errors: `CONFLICT`(already booked/approved), `STALL_UNAVAILABLE`

### 6.4 Bookings & payments (SUPER_ADMIN)
| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/admin/bookings` | disabled for launch unless it records payment reference, amount in paise, note, and audit atomically |
| Server action | vendor offline payment / POS issue | `{ bookingId or POS order, amountPaise, gatewayRef, note }` → records `Payment(OFFLINE,CAPTURED)`, advances state atomically |
| GET | `/api/admin/payments` | transactions (online+offline), filterable (STAFF: `PAYMENT_VIEW`) |

### 6.5 Coupons / comp tickets / sponsors (SUPER_ADMIN)
| Method | Path | Body |
| --- | --- | --- |
| POST/PUT | `/api/admin/coupons` | `{ code, type, value, maxUses?, perUserLimit, minOrder?, scope?, startsAt?, endsAt?, active }` |
| POST | `/api/admin/comp-tickets` | `{ eventId, ticketTypeId, qty, recipients?:[{name,phone,email}] }` → issues comp tickets + QR |
| POST/PUT/DELETE | `/api/admin/sponsors` | `{ eventId, name, tier, logoUrl?, placements?, leadAccess }` |

### 6.6 Check-in (STAFF `CHECKIN` or SUPER_ADMIN)
**POST `/api/admin/checkin`** — validate a scanned QR.
- Body: `{ qrToken, gate?, direction?:"IN"|"OUT", clientScanId? }`
- Server: validate token signature → ticket exists, this event, not used → txn `Ticket→CHECKED_IN`
  + `CheckIn` row.
- 200: `{ ok, data:{ result:"VALID"|"ALREADY_USED"|"INVALID", holder?, ticketType? } }`
- Offline: client queues with `clientScanId`; on sync, server dedupes by it.
- Errors: `VALIDATION`, `FORBIDDEN`

### 6.7 Analytics / audit / reports
| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/admin/analytics` | `{ registrations, revenue, sales[], occupancy, footfall, coupons }` (date-range params) (STAFF: view) |
| GET | `/api/admin/audit` | `AuditLog[]` filter by `actorId/entity/action/date` (SUPER_ADMIN) |
| POST | `/api/admin/reports/post-event` | `{ eventId, format:"pdf"|"csv" }` → `{ url }` |

---

## 7. Cron (protected by shared secret header `X-Cron-Key`)

| Method | Path | Action |
| --- | --- | --- |
| POST | `/api/cron/release-holds` | free expired `HELD` stalls; expire unpaid `Order`s (release `soldQty`) |
| POST | `/api/cron/reconcile-payments` | query Razorpay for recent payments; fulfil any missed webhooks (idempotent) |
| POST | `/api/cron/notify-retry` | process `Outbox` QUEUED/retry rows |
| POST | `/api/cron/reminders` | enqueue event reminders (24h / 2h before) |

All cron endpoints: 200 `{ ok, data:{ processed:n } }`; `FORBIDDEN` without the key; idempotent.

---

## 8. Cross-cutting contract rules

- **Authz:** every `/api/admin/*` re-checks role+permission server-side (middleware is not enough).
- **Ownership:** customer/vendor endpoints only touch the caller's own rows.
- **Idempotency keys:** webhook delivery = `WebhookEvent(provider,eventId)`; fulfilment =
  `Payment.gatewayRef`; notifications = `Outbox.dedupeKey` (`ticketId:channel`); checkout retry =
  `Order.clientOrderKey`.
- **Rate limits:** applied per [BUSINESS-RULES.md](BUSINESS-RULES.md) §8 (OTP, login, coupon,
  checkout).
- **Audit:** all admin/staff mutations wrapped by `withAudit`/`withAuditTx`; mutation + audit write commit or roll back together.
- **Validation:** Zod schemas live next to each handler; reject early with `VALIDATION` + field
  details.
- **No refund endpoints exist** (policy: all sales final).
- **Pricing is dynamic:** all prices come from admin inputs on `POST /api/admin/events/:id/ticket-types`
  and `/stall-types` (and `Event.bulkTiers`/`earlyBird`). No endpoint returns or assumes a hardcoded
  price; `clone-template` seeds geometry/sizes only.
