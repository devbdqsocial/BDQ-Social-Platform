# BDQ Social — Event Management Portal

> Master project specification. Single source of truth for what we are building, the stack,
> the data model, and the build order.
> Companion docs: [suggested-features.md](suggested-features.md) ·
> [sponsorship-deck.md](sponsorship-deck.md).

---

## 1. Overview & Vision

**BDQ Social** is Vadodara's most premium, curated lifestyle festival and night market — the
deliberate opposite of a crowded, dusty, plastic-tented mela. Carpeted walkways, fairy-lit
trees, a boho entrance arch, 80+ handpicked indie brands, a gourmet food court, live indie
music (sundowner acoustic → high-energy night), and Instagrammable lounges. Audience:
Vadodara's Gen-Z, Millennials, young families, and NRIs with high spending power and a taste
for aesthetics.

The **portal** is the digital backbone. One full-stack web app, served across four surfaces on
separate hostnames:

| Surface | Hostname | Who | Access |
| --- | --- | --- | --- |
| Main site / landing | `bdqsocial.com` | Public | Open |
| Customer / attendee | `bdqsocial.com/login` | Attendees | Phone OTP |
| Vendor portal | `vendors.bdqsocial.com` | Brands / stall owners | Separate login + OTP/email |
| Admin & Staff console | `admin.bdqsocial.com` | Organizers, gate staff | **Private**, invite-only |

**What the portal does**
- Sells tickets (one-by-one, with a bulk discount above 5) and delivers a QR ticket over
  **WhatsApp (Interakt) + email**.
- Lets vendors register, upload brand assets, submit KYC, pick a stall on a live 2D map, and pay
  — verified by a **team call-back** before approval.
- Lets **Super Admins** design a feet-accurate 2D floor map, CRUD events + the event timetable,
  define stall types, book/assign stalls themselves, manage payments, run sponsorships, and view
  full analytics.
- Lets **Staff** scan tickets at the gate and manage vendors/customers (no event editing).
- Reflects stall status live on the map — available / held / pending / booked — exactly like
  BookMyShow seat selection, in full expo/event mode.
- Installable as a **PWA** (no separate native app), with offline ticket display and offline
  gate-scan queue.

**Goals:** replace WhatsApp-and-spreadsheet chaos with one premium portal; zero double-bookings;
self-serve vendor + ticket flows; stay on free infrastructure until real volume.

---

## 2. Success Criteria

| Area | Target |
| --- | --- |
| Ticketing | Buy 1..N tickets, bulk discount auto-applies above 5, coupon applies, pay via Razorpay, QR delivered on WhatsApp **and** email within 60s. |
| Vendor flow | Vendor registers, uploads assets + KYC, selects a stall, pays; team call-back verifies; admin approves. |
| Map integrity | A stall can never be booked twice (DB constraint + hold lock). |
| Map fidelity | Admin can recreate the Aarush Lawn layout (101 stalls, multiple sizes in feet, stage, zones, aisles, entry/exit) and save/reload it. |
| Timetable | Admin CRUDs the event schedule; customers + vendors see the full timetable. |
| Roles | Staff can check-in + manage vendors/customers but **cannot** edit events; Super Admin can do everything. |
| Check-in | Staff scan a QR → valid / already-used / invalid; works offline and syncs. |
| Audit | Every admin/staff action is logged (who, what, before/after, when). |
| Analytics | Registrations, revenue, ticket sales over time, stall occupancy %, footfall. |
| Cost | ₹0 fixed (free tiers); only usage fees (Razorpay %, Interakt per-message, SMS OTP at scale). |

---

## 3. Roles, Permissions & Auth

Four roles. A single `User` table with a `role` enum; staff capabilities are **permission-based**
so presets like scanner-only / support-only are possible.

| Capability | Customer | Vendor | Staff | Super Admin |
| --- | :---: | :---: | :---: | :---: |
| Browse site / map / timetable | ✅ | ✅ | ✅ | ✅ |
| Buy tickets / receive QR | ✅ | — | — | ✅ (on behalf) |
| Vendor registration + assets + KYC | — | ✅ | — | — |
| Select / pay for stall | — | ✅ | — | ✅ (book + assign) |
| Event CRUD | — | — | ❌ | ✅ |
| Event timetable CRUD | — | — | ❌ | ✅ |
| Map designer / stall types | — | — | ❌ | ✅ |
| View all registrations/customers | — | — | ✅ | ✅ |
| Vendor CRUD + verify/approve | — | — | ✅ | ✅ |
| Record payments / coupons / offers | — | — | ❌ | ✅ |
| Gate check-in (QR scan) | — | — | ✅ | ✅ |
| Sponsorships | — | — | ❌ | ✅ |
| Analytics dashboard | — | — | view | ✅ |
| Audit log viewer | — | — | ❌ | ✅ |

**Staff preset (default):** check-ins, vendor CRUD, view events (read-only), view customers.
Additional presets: `SCANNER_ONLY`, `SUPPORT_ONLY`, `FINANCE_VIEW`. Permissions stored as a
string set on the staff account; UI gates off it; server enforces it.

**Auth**
- **Customers & vendors:** Firebase phone OTP (vendors may also use email). Server verifies the
  Firebase ID token (Admin SDK), upserts `User`, issues an httpOnly session cookie. Vendor and
  customer logins live on **different hostnames** and are isolated.
- **Super Admin:** invite/seed only, private subdomain, email/password (Firebase) **+ TOTP 2FA**.
- **RBAC:** middleware resolves the hostname → zone and the session → role/permissions; every
  mutation re-checks server-side.

---

## 4. Tech Stack (free-first)

| Layer | Choice | Free tier | Why |
| --- | --- | --- | --- |
| Framework | **Next.js 15** (App Router) | — | One codebase for UI + API; SSR landing for SEO; middleware subdomain routing. |
| Language | **TypeScript** | — | Type safety DB → API → UI. |
| Styling | **Tailwind CSS** + shadcn/ui | — | Premium aesthetic fast; accessible primitives; dark mode. |
| PWA | **next-pwa / Serwist** | OSS | Installable, offline ticket + offline scan queue. |
| Database | **Neon Postgres** | 0.5 GB | Serverless Postgres, branchable. |
| ORM | **Prisma** | — | Type-safe schema, migrations, relational analytics. |
| Auth | **Firebase Auth** (phone OTP) | Spark | Free OTP; we add the role/permission layer. |
| Online payments | **Razorpay** | no fixed fee | India UPI/cards/netbanking/wallets + webhooks. |
| 2D map | **react-konva** (Konva.js) | OSS | Canvas renders hundreds of clickable, ft-scaled stalls with zoom/pan + live status. |
| QR | **qrcode** + scanner lib (`html5-qrcode`) | OSS | Generate signed ticket QR; scan at gate. |
| WhatsApp | **Interakt** (BSP) | trial | Managed WA templates; send ticket + QR media. |
| Email | **Resend** | 3k/mo | Transactional ticket + receipts. |
| Storage | **Cloudinary** | 25 GB | Vendor assets, event images, optimized delivery. |
| Hosting | **Vercel** (hobby) | free | Native Next.js + cron + edge + wildcard subdomains. |
| Validation | **Zod** | OSS | Validate all inputs + webhooks. |
| 2FA | **otplib** (TOTP) | OSS | Admin 2FA. |

> Firebase OTP free quota covers early volume; high SMS volume eventually costs — swap to an SMS
> provider behind the same auth abstraction if needed.

---

## 5. System Architecture

```
                 wildcard DNS → Vercel → ONE Next.js app (middleware routes by hostname)
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  bdqsocial.com            → (public) landing, events, map preview, timetable   │
   │  bdqsocial.com/login      → (customer) tickets, my-tickets                     │
   │  vendors.bdqsocial.com    → (vendor) register, KYC, assets, stall booking      │
   │  admin.bdqsocial.com      → (admin) events, timetable, map designer, vendors,  │
   │                              payments, sponsors, analytics, audit + STAFF scan │
   │                                                                                │
   │  Route Handlers / Server Actions · Zod · RBAC(hostname+role+perms) · AuditLog  │
   └───┬───────┬────────┬────────┬────────┬────────┬─────────────────────────────┘
       │       │        │        │        │        │
   ┌───▼──┐ ┌──▼────┐ ┌─▼─────┐ ┌▼──────┐ ┌▼───────┐ ┌▼─────────┐
   │ Neon │ │Firebase│ │Razorpay│ │Interakt│ │Cloudinary│ │ Resend  │
   │  PG  │ │ Auth   │ │+webhook│ │WhatsApp│ │  assets  │ │  email  │
   └──────┘ └────────┘ └────────┘ └────────┘ └─────────┘ └─────────┘
```

**Subdomain routing:** `middleware.ts` reads the `Host` header, maps `vendors.` → `/vendor/*`,
`admin.` → `/admin/*`, apex → public/customer, and rewrites internally. One deploy, wildcard
domain on Vercel.

**Domain modules (server):** `auth`, `events`, `schedule`, `map`, `vendors`, `kyc`, `bookings`,
`tickets`, `payments`, `notifications`, `checkin`, `sponsors`, `analytics`, `audit`.

---

## 6. Feature Specs by Surface

### 6.1 Main site / Landing (`bdqsocial.com`, public)
- Premium boho hero, dates, location, CTAs; the 4 attractions; gallery; featured/announced
  vendors (**brand directory**); sponsor strip; FAQ; **countdown** + live "stalls left".
- Event detail pages (SSR/SEO): description, price, location map, **full timetable** (read-only),
  Buy Tickets CTA, read-only 2D map preview.
- Login/Register entry → Customer (here) or Vendor (→ `vendors.` subdomain). **No admin link.**
- **Waitlist / notify-me** when sold out or pre-launch; **UTM capture** on all entry links.

### 6.2 Customer portal (`bdqsocial.com/login`)
- **Login:** one-time Firebase phone OTP; minimal profile (name, email for delivery).
- **Browse:** events, read-only map, **timetable** (what's on at what time), artist lineup.
- **Buy tickets:** pick type (General/Couple/VIP/Day-pass) + qty added one-by-one; **bulk
  discount auto-applies when qty > 5** (admin-set %); optional **coupon code**; **early-bird**
  tiers when active; **group ticketing** (distribute individual QRs by phone/email). Razorpay
  checkout.
- **Delivery:** unique signed QR per ticket → WhatsApp + email; visible under **My Tickets**.
- **My Tickets:** QR, status (valid/used), share/download; add to phone (PWA).
- **Social-share reward:** share link → coupon/contest entry.

### 6.3 Vendor portal (`vendors.bdqsocial.com`)
- **Separate login** (not shared with customers): OTP/email.
- **Registration + profile:** brand name, category, description, website + socials; **asset
  upload** (logo, banner, product images) via Cloudinary.
- **KYC (verification only, no GST billing):** PAN (all), FSSAI (food vendors), GSTIN optional.
- **Stall selection:** open the event map → see available stalls by type/size/price → select
  preferred stall(s) (places a **hold** with TTL).
- **Payment:** Razorpay online **or** offline (admin records). **Simple payment receipt** (no GST
  tax invoice).
- **Verification flow:** `Submitted → Under Review (team calls vendor to verify) → Approved
  (stall assigned, BOOKED) / Rejected (hold released)`.
- **Vendor dashboard:** stall(s) + status, payment receipt, profile editor, **full event
  timetable**, optional **e-sign contract**, **lead capture** QR for their stall, waitlist offers.

### 6.4 Admin console (`admin.bdqsocial.com`, private)
- **Event CRUD:** name, description, location (+map link), dates/times, ticket types + prices,
  **stall types defined here** (name, size in ft, price, color), publish/unpublish. **Multi-event**
  supported; **white-label/theming** per event.
- **Event Timetable CRUD:** add/edit/remove schedule items (time, title, stage/zone, performer);
  publishes to customers + vendors.
- **2D Map Designer** (§7): feet-accurate canvas; place/move/resize/rotate elements; assign types;
  per-stall price; non-sellable infra; ops annotation layer; save/load; clone seed template.
- **Bookings:** view holds/bookings; **admin can book a stall and assign a vendor by entering
  details** + recording payment (online/offline).
- **Vendor management:** review profile + assets + KYC + selected stall → verify (call-back) →
  approve/reject; vendor **waitlist + auto-offer** on release.
- **Live map status:** available / held / pending / booked, color-coded, updating as bookings and
  approvals change.
- **Payments:** all transactions (online + offline); record offline; **no refunds** (all sales
  final).
- **Coupons & offers:** codes (flat/percent, expiry, caps) and bulk thresholds; **comp-ticket**
  bulk generation (sponsor/VIP).
- **Sponsorships:** manage sponsors, tiers, placements (site/map/tickets/LED) — see
  [sponsorship-deck.md](sponsorship-deck.md) and §15.
- **Analytics + Audit:** dashboards (§13) and the **audit log viewer** (§12).

### 6.5 Staff panel (under `admin.`, permission-scoped)
- **Gate check-in:** PWA QR scanner → valid / already-used / invalid; multi-gate; **offline queue**
  syncs when back online; live **capacity/crowd count** (checked-in − checked-out).
- **Vendor + customer management** (per permissions); **read-only** event + timetable. Cannot edit
  events, payments, map, coupons, or sponsors.

---

## 7. 2D Map System (deep dive)

Custom on **react-konva**. One JSON layout drives an **admin designer** (edit) and a
**public/vendor booking view** (select). **Everything is sized in feet** with a real canvas area.

### 7.1 Coordinate system & designer
- Canvas has a real-world size in feet (e.g. **~230 × 160 ft** for Aarush Lawn) and a scale
  (pixels-per-foot) for rendering; zoom + pan; snap-to-foot grid + alignment guides.
- Toolbar: add **stall** (choose a per-event stall type), add **infra** element, add label/annotation,
  select/move/resize/rotate, duplicate, delete. Optional reference-image background to trace.
- Each element: `id`, `kind` (`stall|infra|annotation`), `type`, `label`, `xFt, yFt, wFt, hFt,
  rotation`, and for stalls `stallTypeId`, `price`, `status`.
- **Save** serializes the canvas to `MapLayout.layoutJson`; sellable stalls are normalized into the
  `Stall` table for booking/pricing/analytics. **Clone** the seed template (§7.5) to start fast.

### 7.2 Stall types (defined per event)
Admin defines stall types at event creation: `name`, `widthFt`, `heightFt`, `price`, `color`,
`sellable`. Example types from the reference layout:

| Type | Size (ft) | Count | Sellable |
| --- | --- | --- | --- |
| Small stall | 10 × 10 | 36 (9 blocks × 4) | ✅ |
| Lane stall | 10 × 10 | 32 (2 lanes, front/back ×8) | ✅ |
| Premium stall | 15 × 12 | 16 | ✅ |
| Food stall | 10 × 10 | 10 (F1–F10) | ✅ |

### 7.3 Infrastructure / non-sellable elements (with sizes)
Stage **40 × 24 ft** · Activity zones **25 × 25 ft** × 4 (Kids, DIY/Art, Flea Games, Open Mic/
Creator) · Water station **20 × 15 ft** · Food Partner Lounge **35 ft** · Beverage Partner ·
Washrooms · Grand Entry / **entry plaza 30 ft** · **LED wall 20 ft** · Fire Exit · Aisles (main
**16–20 ft**, secondary **10–12 ft**, lane **18 ft**).

### 7.4 Status colors (BookMyShow-style)
| Status | Color | Meaning |
| --- | --- | --- |
| `AVAILABLE` | green | free to select |
| `HELD` | amber | temporarily held during selection/payment (TTL) |
| `PENDING` | orange | booked, awaiting team-call verification / offline payment |
| `BOOKED` | red/grey | approved + paid, locked |
| `BLOCKED` | dark | organizer-reserved, not for sale |

### 7.5 Seed template — "Aarush Lawn, Vadodara"
Ship the reference master layout as a clonable template: 101 stalls (36 small + 32 lane + 16
premium + 10 food), stage, 4 activity zones, water station, lounges, entry/LED/fire-exit, and the
aisle widths above. Admins clone → tweak → publish.

### 7.6 Operations annotation layer (optional, matches the poster)
Toggleable overlay for planning: crowd-flow arrows (entry → zones → stalls → stage → F&B → exit),
facilities (washrooms, drinking water, first-aid, fire extinguishers every 30 m, waste bins every
40 m, security posts, control room, vendor parking), **power plan** (Stage 40 / Food 30 / Stalls
25 / Lighting 20 / Common 10 = **125 kVA**, DG behind food stalls, 3 distribution panels),
emergency (fire exit, 20 ft emergency-vehicle access, CCTV, hourly patrol), vendor logistics
(entry 6–10 AM, setup by 10 AM, event 4–11 PM, teardown 11:30 PM, clearance 3 AM). Informational;
not bookable.

### 7.7 Double-book prevention
Unique active booking per stall (DB constraint), transactional status transitions with row locks,
hold TTL, and a Vercel cron sweep that releases expired `HELD` stalls. Clients only request;
the server decides.

> Reference implementations: Konva "Seats Reservation" demo + community react-konva booking maps.

---

## 8. Booking & Ticket State Machines

**Stall:** `AVAILABLE → HELD → PENDING → BOOKED` with `reject/cancel/TTL-expire → AVAILABLE`.
PENDING→BOOKED requires team-call verification + confirmed payment.

**Ticket:** `ORDER created → (Razorpay webhook PAID) → TICKET issued → delivered (WhatsApp+email)
→ VALID → (gate scan) CHECKED_IN`. Unpaid orders auto-expire. **No refund path** (all sales final).

**Concurrency:** holds + bookings are transactional; tickets issue only from a
**signature-verified Razorpay webhook**, never the client callback alone.

---

## 9. Payments

**Online (Razorpay):** server creates an Order (total − coupon − bulk/early-bird discount, in
paise) → client checkout → webhook `payment.captured` → **verify signature** → mark paid →
fulfil (issue tickets / move stall to PENDING for verification). **Idempotent** by gateway ref.

**Offline (cash / bank transfer):** vendor or admin selects offline → booking `PENDING` with
`mode=OFFLINE`; admin records amount + reference; on confirmation → approve → `BOOKED`.

**Pricing rules:** **bulk discount when ticket qty > 5** (admin-set %); **early-bird** time-boxed
tiers; **coupons** (flat/percent, active window, total + per-user caps, min order, scope);
default stacking = best single discount wins (configurable).

**Receipts:** simple payment receipt for stalls + tickets. **No GST tax invoice. No refunds.**

---

## 10. Notifications

- **WhatsApp (Interakt):** pre-approved templates (ticket confirmation w/ QR media, vendor
  booking/approval, reminders, waitlist offer). Sent to the OTP phone number.
- **Email (Resend):** ticket + QR + calendar add + receipt; vendor verification/approval emails.
- **QR:** unique **signed token** per ticket (`qrcode`); gate scan decodes → server validates
  (exists, unused, this event) → `CHECKED_IN`; re-scan → "already used".
- **SMS fallback** (suggested) if WhatsApp delivery fails.

---

## 11. Data Model (Prisma sketch)

```
User           id, role(CUSTOMER|VENDOR|STAFF|SUPER_ADMIN), phone, email, name, firebaseUid,
               permissions(string[] for STAFF), totpSecret?(admin), createdAt
Event          id, name, slug, description, location, mapLink, startsAt, endsAt, status,
               theme(json white-label), createdBy
TicketType     id, eventId→Event, name, priceInPaise, totalQty, soldQty, earlyBird(json?)
ScheduleItem   id, eventId→Event, startsAt, endsAt, title, stageOrZone, performer?, order   # timetable
Order          id, userId→User, eventId→Event, status(PENDING|PAID|FAILED|EXPIRED),
               subtotal, discount, total, couponId?, utm(json), createdAt
Ticket         id, orderId→Order, ticketTypeId→TicketType, holderPhone?, holderEmail?,
               qrToken(unique, signed), status(VALID|CHECKED_IN|CANCELLED)             # group→many
Payment        id, orderId? | bookingId?, gateway(RAZORPAY|OFFLINE), gatewayRef, amount,
               status(CREATED|CAPTURED|FAILED), mode(ONLINE|OFFLINE), recordedBy?
Coupon         id, code(unique), type(FLAT|PERCENT), value, maxUses, usedCount, perUserLimit,
               minOrder, startsAt, endsAt, scope, active
StallTypeDef   id, eventId→Event, name, widthFt, heightFt, priceInPaise, color, sellable
MapLayout      id, eventId→Event (1:1), layoutJson, opsLayerJson?, version, updatedAt
Stall          id, eventId→Event, label, stallTypeId→StallTypeDef, xFt,yFt,wFt,hFt,rotation,
               priceInPaise, status(AVAILABLE|HELD|PENDING|BOOKED|BLOCKED), holdUntil?
VendorProfile  id, userId→User (1:1), brandName, category, description, website, socials(json),
               approvalStatus(SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED), verifiedCallBy?, verifiedAt?
VendorKyc      id, vendorProfileId→VendorProfile, pan, fssai?, gstin?, docUrls(json)     # verify only
VendorAsset    id, vendorProfileId→VendorProfile, kind(LOGO|BANNER|PRODUCT), url, publicId
VendorContract id, vendorProfileId→VendorProfile, status(SENT|SIGNED), signedAt?, url      # e-sign
Booking        id, vendorProfileId? | adminCreated(bool), eventId→Event, stallId→Stall,
               status(HELD|PENDING|BOOKED|REJECTED|CANCELLED), paymentId?, source(VENDOR|ADMIN)
Waitlist       id, eventId→Event, type(TICKET|STALL), userId? | contact, createdAt, notifiedAt?
Sponsor        id, eventId→Event, name, tier, logoUrl, placements(json), leadAccess(bool)
CheckIn        id, ticketId→Ticket, scannedBy→User, gate?, scannedAt, direction(IN|OUT)    # crowd count
AuditLog       id, actorId→User, role, action, entity, entityId, before(json), after(json),
               ip, userAgent, createdAt                                                    # granular
```
Key constraints: unique active `Booking` per `Stall`; unique `Ticket.qrToken`; unique
`Coupon.code`; one `MapLayout` per event.

---

## 12. Granular Audit Logging

Every **admin/staff** mutation writes an `AuditLog` row: actor + role, action (create/update/
delete/approve/reject/book/scan/login/export), target entity + id, **before/after snapshots**,
IP, user-agent, timestamp. Implemented as a thin wrapper around all admin server actions (single
choke-point) so nothing is missed. Super-Admin-only **audit viewer** with filters (actor, entity,
date, action) and export. Append-only; never editable from the UI.

---

## 13. Analytics

Registrations (customers + vendors, new vs returning); revenue (online vs offline, by event, by
ticket type); ticket sales over time (bulk vs single, early-bird, coupon-driven); **stall occupancy
%** by type + revenue per stall; coupon/offer usage; **footfall** (check-ins over time, peak hours,
no-show, live capacity); **footfall heatmaps**, **predictive** sell-out/pricing, **cohort/repeat-
attendee** analysis; **one-click post-event report export** (PDF/CSV). Prisma aggregates +
Recharts; date-range filters; CSV export.

---

## 14. Security & Privacy

Subdomain isolation + per-zone RBAC (hostname + role + permissions); **private admin subdomain +
TOTP 2FA** for Super Admin; permission-scoped staff; **granular audit log**; Razorpay webhook
signature verification + idempotent fulfilment; **Zod** on all inputs + webhooks; **rate limiting**
on OTP, coupon, login, checkout; **signed ticket QR tokens**; httpOnly short-lived sessions + CSRF
protection; Cloudinary upload type/size validation; secrets server-side only; security headers +
CSP; bot/abuse protection on public forms; least-privilege DB access; PII minimization (store only
phone/email/name + KYC needed for verification).

---

## 15. Sponsorship Module (portal side)

Admin manages sponsors and their on-portal placements: logo on landing + footer, **map ad slots /
sponsored pins**, branded zones, ticket + QR-email branding, LED-wall + stage credits,
**premium-stall placement** (or bidding) for high-footfall corners, and **upsells/combos**
(parking, fast-track, lockers, F&B) surfaced at checkout. Sponsors with `leadAccess` receive
agreed post-event data. Full external pitch (tiers, deliverables, audience data, pricing slots) →
[sponsorship-deck.md](sponsorship-deck.md).

---

## 16. PWA

Installable on phones (manifest + service worker via next-pwa/Serwist). **Offline:** customers
view their ticket QR offline; **staff scanner** queues check-ins offline and syncs on reconnect.
Push notifications for reminders. No separate native app needed.

---

## 17. Folder Structure (proposed)

```
bdqsocial/
├── prisma/schema.prisma
├── src/
│   ├── middleware.ts                 # hostname → zone routing + RBAC
│   ├── app/
│   │   ├── (public)/                 # landing, events, map preview, timetable
│   │   ├── (customer)/               # /login, tickets, my-tickets
│   │   ├── vendor/                   # vendors.* → register, kyc, assets, booking, dashboard
│   │   └── admin/                    # admin.* → events, schedule, map-designer, vendors,
│   │       │                         #   payments, coupons, sponsors, analytics, audit
│   │       ├── login/                # private + TOTP
│   │       └── checkin/              # staff PWA scanner
│   ├── components/                   # ui (shadcn), MapCanvas (react-konva), MapDesigner,
│   │   │                             #   Scanner, charts, forms
│   ├── server/                       # auth, events, schedule, map, vendors, kyc, bookings,
│   │   │                             #   tickets, payments, notifications, checkin, sponsors,
│   │   │                             #   analytics, audit (withAudit() wrapper), db.ts
│   ├── lib/                          # razorpay, firebase-admin, interakt, resend, cloudinary,
│   │                                 #   qr, totp, ratelimit, zod
│   └── pwa/                          # manifest, service worker
├── public/
├── .env.example
└── project.md
```

---

## 18. Environment Variables (`.env`)

```
DATABASE_URL=                              # Neon

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

INTERAKT_API_KEY=                          # WhatsApp BSP
INTERAKT_BASE_URL=
INTERAKT_TEMPLATE_TICKET=

RESEND_API_KEY=
EMAIL_FROM=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

APP_BASE_DOMAIN=bdqsocial.com              # for subdomain routing
SESSION_SECRET=
ADMIN_TOTP_ISSUER=BDQSocial
```

---

## 19. Phased Roadmap

**P0 — Foundation:** Next.js + Tailwind + shadcn + PWA shell; subdomain middleware; Neon + Prisma
schema + migrations; Firebase Auth + role/permission layer + admin TOTP; `withAudit()` wrapper;
deploy to Vercel (wildcard domain).

**P1 — Ticketing MVP:** landing + event detail + **timetable view**; customer OTP; ticket types +
**bulk>5** + early-bird + coupons; Razorpay + webhook; signed QR; WhatsApp + email delivery; My
Tickets; admin event + **timetable CRUD**; basic analytics.

**P2 — Vendor + Map:** **feet-based map designer** + seed template + public/vendor booking view;
stall types per event; vendor registration + assets + **KYC**; stall hold/book; vendor payment
(online/offline, simple receipt); **team-call verification** + approval + assignment; admin-side
booking; live map status.

**P3 — Staff + Ops + Growth:** staff **PWA scanner** + offline queue + capacity count; waitlist +
auto-offer; brand directory; lead capture; comp-tickets; sponsorship module; full analytics +
heatmaps + post-event export; audit viewer.

**P4 — Polish:** SEO/perf, accessibility, dark mode, rate-limiting + bot protection, e-sign,
ratings, white-label, plus selected items from [suggested-features.md](suggested-features.md).

---

## 20. Free-Tier Cost Summary

| Service | Free tier | Cost begins |
| --- | --- | --- |
| Vercel | Hobby | commercial scale / heavy traffic |
| Neon | 0.5 GB | larger / always-on DB |
| Firebase Auth | Spark | high SMS OTP volume |
| Razorpay | no fixed fee | per transaction (%) |
| react-konva / qrcode / Zod | OSS | — |
| Interakt (WhatsApp) | trial | per conversation/message |
| Resend | 3k/mo | beyond quota |
| Cloudinary | 25 GB | beyond quota |

Net: **₹0 fixed**, usage fees only (Razorpay %, Interakt per message, SMS OTP at scale).

---

## 21. Policies & Assumptions

- **Dynamic pricing** — all prices are **entered by the admin while creating/editing an event**
  and stored per event. Nothing is hardcoded: ticket types + prices, stall types + prices,
  bulk-discount % (the `qty > 5` trigger is fixed, the % is admin-set), and early-bird window +
  discount are all per-event config. See [BUSINESS-RULES.md](BUSINESS-RULES.md).
- **No refunds** — all ticket and stall sales are final.
- **No GST** on stalls/tickets; KYC (PAN/FSSAI/optional GSTIN) collected for **verification only**;
  simple payment receipts issued.
- **Vendor verification requires a team call-back** before approval.
- Best-single-discount wins when coupon + bulk/early-bird overlap (configurable).
- MVP map status via short polling; websockets later.

**Open items to confirm during build (operational, not pricing):** number of admins/staff + their
presets; Interakt template copy; hold TTL / order-expiry / reminder timings (defaults in
[BUSINESS-RULES.md](BUSINESS-RULES.md)).
```
