# BDQ Social — Data Schema (definitive)

> The canonical Prisma schema. Drop into `prisma/schema.prisma` at P0.4 verbatim. Consistent with
> [project.md](project.md) §11, [ARCHITECTURE.md](ARCHITECTURE.md) §8, and
> [BUSINESS-RULES.md](BUSINESS-RULES.md). All money is integer **paise**. IDs are `cuid()`.
> Timestamps stored UTC.

---

## 1. Conventions

- **Money:** `Int` paise (₹499 = `49900`).
- **Soft rules in app, hard rules in DB:** uniqueness/integrity enforced by indexes + one raw
  partial-unique migration (see §4).
- **Audit:** `AuditLog` is append-only (no updates/deletes from app code).
- **Enums** are Postgres enums via Prisma.
- **No `Session` table:** sessions are stateless signed httpOnly cookies (add a table later only if
  server-side revocation is needed).

---

## 2. schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")          // pooled (runtime)
  directUrl = env("DATABASE_URL_DIRECT")   // direct (migrations)
}

// ──────────────────────────── ENUMS ────────────────────────────
enum Role            { CUSTOMER VENDOR STAFF SUPER_ADMIN }
enum Permission      { CHECKIN VENDOR_MANAGE VENDOR_VIEW EVENT_VIEW CUSTOMER_VIEW PAYMENT_VIEW }
enum EventStatus     { DRAFT PUBLISHED LIVE ENDED ARCHIVED }
enum TicketStatus    { VALID CHECKED_IN CANCELLED }
enum OrderStatus     { PENDING PAID FAILED EXPIRED }
enum PaymentGateway  { RAZORPAY OFFLINE }
enum PaymentMode     { ONLINE OFFLINE }
enum PaymentStatus   { CREATED CAPTURED FAILED }
enum CouponType      { FLAT PERCENT }
enum DiscountSource  { NONE EARLY_BIRD BULK COUPON }
enum StallStatus     { AVAILABLE HELD PENDING BOOKED BLOCKED }
enum StallKind       { STALL INFRA }          // infra = stage/aisle/zone/etc (non-sellable)
enum VendorApproval  { SUBMITTED UNDER_REVIEW APPROVED REJECTED }
enum BookingStatus   { RESERVED HELD PENDING_PAYMENT PENDING BOOKED REJECTED CANCELLED }
enum BookingSource   { VENDOR ADMIN }
enum AssetKind       { LOGO BANNER PRODUCT KYC_DOC }
enum ContractStatus  { SENT SIGNED }
enum SponsorTier     { TITLE POWERED_BY ZONE STALL ASSOCIATE }
enum WaitlistType    { TICKET STALL }
enum CheckInDirection{ IN OUT }
enum NotifChannel    { WHATSAPP EMAIL SMS PUSH }
enum NotifStatus     { QUEUED SENT FAILED }

// ──────────────────────────── IDENTITY ─────────────────────────
model User {
  id           String       @id @default(cuid())
  role         Role         @default(CUSTOMER)
  phone        String?      @unique
  email        String?      @unique
  name         String?
  firebaseUid  String?      @unique
  permissions  Permission[] @default([])      // STAFF only
  totpSecret   String?                         // SUPER_ADMIN only
  totpEnabled  Boolean      @default(false)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  orders        Order[]
  vendorProfile VendorProfile?
  checkIns      CheckIn[]     @relation("ScannedBy")
  auditLogs     AuditLog[]
  waitlist      Waitlist[]

  @@index([role])
}

// ──────────────────────────── EVENT CORE ───────────────────────
model Event {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  description String?
  location    String?
  mapLink     String?
  startsAt    DateTime
  endsAt      DateTime
  status      EventStatus  @default(DRAFT)
  theme       Json?                              // white-label overrides
  // pricing config (see BUSINESS-RULES.md)
  bulkTiers   Json?                              // [{minQty, percent}]
  earlyBird   Json?                              // {endsAt, soldCap, percent|priceByType}
  capacity    Int?
  createdById String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  ticketTypes  TicketType[]
  schedule     ScheduleItem[]
  stallTypes   StallTypeDef[]
  stalls       Stall[]
  mapLayout    MapLayout?
  orders       Order[]
  coupons      Coupon[]
  bookings     Booking[]
  sponsors     Sponsor[]
  waitlist     Waitlist[]
  vendorAssetsLeads Lead[]

  @@index([status])
}

model TicketType {
  id              String  @id @default(cuid())
  eventId         String
  event           Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name            String
  priceInPaise    Int
  earlyPricePaise Int?
  totalQty        Int
  soldQty         Int     @default(0)
  attendeesPer    Int     @default(1)            // Couple = 2 (QRs per ticket)
  tickets         Ticket[]

  @@index([eventId])
}

model ScheduleItem {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  startsAt    DateTime
  endsAt      DateTime?
  title       String
  stageOrZone String?
  performer   String?
  sortOrder   Int      @default(0)

  @@index([eventId, startsAt])
}

// ──────────────────────────── MAP / STALLS ─────────────────────
model StallTypeDef {
  id           String   @id @default(cuid())
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name         String                            // Small, Lane, Premium, Food...
  widthFt      Float
  heightFt     Float
  priceInPaise Int
  color        String                            // hex from design.md
  sellable     Boolean  @default(true)
  stalls       Stall[]

  @@unique([eventId, name])
}

model MapLayout {
  id          String   @id @default(cuid())
  eventId     String   @unique
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  layoutJson  Json                                // canvas + elements (see project.md 7.3)
  opsLayerJson Json?                              // facilities/power/emergency annotations
  version     Int      @default(1)
  updatedAt   DateTime @updatedAt
}

model Stall {
  id            String       @id @default(cuid())
  eventId       String
  event         Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  kind          StallKind    @default(STALL)
  stallTypeId   String?
  stallType     StallTypeDef? @relation(fields: [stallTypeId], references: [id])
  label         String                            // "F-12"
  xFt           Float
  yFt           Float
  widthFt       Float
  heightFt      Float
  rotation      Float        @default(0)
  priceInPaise  Int?                              // overrides type price if set
  status        StallStatus  @default(AVAILABLE)
  holdUntil     DateTime?
  bookings      Booking[]

  @@unique([eventId, label])
  @@index([eventId, status])
}

// ──────────────────────────── ORDERS / TICKETS ─────────────────
model Order {
  id            String       @id @default(cuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id])
  eventId       String
  event         Event        @relation(fields: [eventId], references: [id])
  status        OrderStatus  @default(PENDING)
  subtotal      Int                               // paise pre-discount
  discount      Int          @default(0)
  total         Int
  discountSource DiscountSource @default(NONE)
  couponId      String?
  coupon        Coupon?      @relation(fields: [couponId], references: [id])
  gatewayOrderId String?     @unique
  clientOrderKey String?     @unique
  utm           Json?                             // {source,medium,campaign}
  expiresAt     DateTime?                         // unpaid expiry
  createdAt     DateTime     @default(now())

  tickets       Ticket[]
  payments      Payment[]

  @@index([userId, status])
  @@index([eventId, status])
}

model Ticket {
  id            String       @id @default(cuid())
  orderId       String
  order         Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ticketTypeId  String
  ticketType    TicketType   @relation(fields: [ticketTypeId], references: [id])
  holderName    String?
  holderPhone   String?
  holderEmail   String?
  qrToken       String       @unique              // signed
  status        TicketStatus @default(VALID)
  isComp        Boolean      @default(false)      // comp/VIP issued by admin
  createdAt     DateTime     @default(now())

  checkIns      CheckIn[]

  @@index([orderId])
}

model Payment {
  id            String         @id @default(cuid())
  orderId       String?
  order         Order?         @relation(fields: [orderId], references: [id])
  bookingId     String?        @unique
  booking       Booking?       @relation(fields: [bookingId], references: [id])
  gateway       PaymentGateway
  mode          PaymentMode
  gatewayRef    String?        @unique            // idempotency key (RZP payment id or offline ref)
  amount        Int
  status        PaymentStatus  @default(CREATED)
  recordedById  String?                           // admin who logged offline
  meta          Json?
  createdAt     DateTime       @default(now())

  @@index([orderId])
}

model WebhookEvent {
  id         String   @id @default(cuid())
  provider   String
  eventId    String
  eventType  String?
  receivedAt DateTime @default(now())

  @@unique([provider, eventId])
  @@index([provider, receivedAt])
}

model Coupon {
  id            String     @id @default(cuid())
  eventId       String?
  event         Event?     @relation(fields: [eventId], references: [id])
  code          String     @unique
  type          CouponType
  value         Int                                // paise (FLAT) or percent (PERCENT)
  maxUses       Int?
  usedCount     Int        @default(0)
  perUserLimit  Int        @default(1)
  minOrder      Int?
  scope         Json?                              // {ticketTypeIds?:[]}
  startsAt      DateTime?
  endsAt        DateTime?
  active        Boolean    @default(true)
  orders        Order[]
}

// ──────────────────────────── VENDORS ──────────────────────────
model VendorProfile {
  id             String         @id @default(cuid())
  userId         String         @unique
  user           User           @relation(fields: [userId], references: [id])
  brandName      String
  category       String?
  description    String?
  website        String?
  socials        Json?                              // {instagram,...}
  approvalStatus VendorApproval @default(SUBMITTED)
  verifiedCallById String?
  verifiedAt     DateTime?
  createdAt      DateTime       @default(now())

  kyc       VendorKyc?
  assets    VendorAsset[]
  contract  VendorContract?
  bookings  Booking[]
  leads     Lead[]
}

model VendorKyc {
  id              String        @id @default(cuid())
  vendorProfileId String        @unique
  vendorProfile   VendorProfile @relation(fields: [vendorProfileId], references: [id], onDelete: Cascade)
  pan             String?
  fssai           String?
  gstin           String?                           // optional, verify-only (no billing)
  docUrls         Json?                             // Cloudinary urls
}

model VendorAsset {
  id              String        @id @default(cuid())
  vendorProfileId String
  vendorProfile   VendorProfile @relation(fields: [vendorProfileId], references: [id], onDelete: Cascade)
  kind            AssetKind
  url             String
  publicId        String
  createdAt       DateTime      @default(now())

  @@index([vendorProfileId])
}

model VendorContract {
  id              String         @id @default(cuid())
  vendorProfileId String         @unique
  vendorProfile   VendorProfile  @relation(fields: [vendorProfileId], references: [id], onDelete: Cascade)
  status          ContractStatus @default(SENT)
  url             String?
  signedAt        DateTime?
}

model Booking {
  id              String        @id @default(cuid())
  eventId         String
  event           Event         @relation(fields: [eventId], references: [id])
  stallId         String
  stall           Stall         @relation(fields: [stallId], references: [id])
  vendorProfileId String?
  vendorProfile   VendorProfile? @relation(fields: [vendorProfileId], references: [id])
  source          BookingSource @default(VENDOR)
  adminDetails    Json?                             // when source=ADMIN (name/phone entered)
  status          BookingStatus @default(RESERVED)
  payment         Payment?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([stallId, status])
  @@index([eventId, status])
  // NOTE: "one active booking per stall" enforced by a partial unique index (see §4)
}

// ──────────────────────────── OPS / GROWTH ─────────────────────
model CheckIn {
  id          String          @id @default(cuid())
  ticketId    String
  ticket      Ticket          @relation(fields: [ticketId], references: [id])
  scannedById String
  scannedBy   User            @relation("ScannedBy", fields: [scannedById], references: [id])
  gate        String?
  direction   CheckInDirection @default(IN)
  scannedAt   DateTime        @default(now())

  @@index([ticketId])
}

model Sponsor {
  id         String      @id @default(cuid())
  eventId    String
  event      Event       @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name       String
  tier       SponsorTier
  logoUrl    String?
  placements Json?                                  // {site,map,ticket,led,...}
  leadAccess Boolean     @default(false)

  @@index([eventId])
}

model Waitlist {
  id         String       @id @default(cuid())
  eventId    String
  event      Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  type       WaitlistType
  userId     String?
  user       User?        @relation(fields: [userId], references: [id])
  contact    String?                                // phone/email if no account
  meta       Json?                                  // {stallTypeId?} for stall waitlist
  notifiedAt DateTime?
  createdAt  DateTime     @default(now())

  @@index([eventId, type])
}

model Lead {
  id              String         @id @default(cuid())
  eventId         String
  event           Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  vendorProfileId String
  vendorProfile   VendorProfile  @relation(fields: [vendorProfileId], references: [id], onDelete: Cascade)
  name            String?
  phone           String?
  email           String?
  consent         Boolean        @default(true)
  createdAt       DateTime       @default(now())

  @@index([vendorProfileId])
}

// ──────────────────────────── DELIVERY / AUDIT ─────────────────
model Outbox {
  id          String      @id @default(cuid())
  channel     NotifChannel
  toAddress   String                                 // phone/email
  template    String
  payload     Json
  status      NotifStatus @default(QUEUED)
  attempts    Int         @default(0)
  lastError   String?
  dedupeKey   String      @unique                    // e.g. ticketId:channel
  createdAt   DateTime    @default(now())
  sentAt      DateTime?

  @@index([status])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actor      User?    @relation(fields: [actorId], references: [id])
  role       Role?
  action     String                                  // CREATE/UPDATE/DELETE/APPROVE/SCAN/...
  entity     String
  entityId   String?
  before     Json?
  after      Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entity, entityId, createdAt])
  @@index([actorId, createdAt])
}
```

---

## 3. Key relations (quick map)

- `User 1–* Order 1–* Ticket *–1 TicketType *–1 Event`
- `User 1–* Payment` (via Order); `Payment 1–1 Booking` (vendor stall)
- `User 1–1 VendorProfile 1–1 VendorKyc / 1–* VendorAsset / 1–1 VendorContract / 1–* Booking`
- `Event 1–1 MapLayout`, `Event 1–* StallTypeDef 1–* Stall`, `Booking *–1 Stall`
- `Ticket 1–* CheckIn`; `Event 1–* Sponsor / Waitlist / Lead`
- `AuditLog *–1 User(actor)`; `Outbox` standalone

---

## 4. Integrity rules requiring raw SQL (post-`prisma migrate`)

Prisma can't express partial-unique in schema, so add this in a migration:

```sql
-- One ACTIVE booking per stall (prevents double-booking under races)
CREATE UNIQUE INDEX one_active_booking_per_stall
  ON "Booking" ("stallId")
  WHERE "status" IN ('RESERVED','PENDING_PAYMENT','BOOKED');
```

Other DB-level guarantees already in schema: unique `Ticket.qrToken`, unique `Payment.gatewayRef`
(idempotent fulfilment), unique `Order.gatewayOrderId`, unique `Order.clientOrderKey`,
unique `WebhookEvent(provider,eventId)`, unique `Coupon.code`, unique `MapLayout.eventId`,
unique `Stall(eventId,label)`, unique `StallTypeDef(eventId,name)`, unique `Outbox.dedupeKey`.

---

## 5. Indexing rationale

| Index | Why |
| --- | --- |
| `Stall(eventId,status)` | map render + availability queries |
| `Booking(stallId,status)` + partial unique | booking lookups + no double-book |
| `Order(userId,status)`, `Order(eventId,status)` | my-orders + admin sales |
| `Ticket(orderId)`, `Ticket.qrToken` | fulfilment + scan lookup |
| `Payment.gatewayRef` | webhook idempotency |
| `WebhookEvent(provider,eventId)` | webhook delivery dedupe |
| `ScheduleItem(eventId,startsAt)` | timetable render |
| `AuditLog(entity,entityId,createdAt)` / `(actorId,createdAt)` | audit viewer filters |
| `Outbox(status)` | sender polls queued rows |

---

## 6. Notes

- **Inventory holds:** `TicketType.soldQty` is incremented inside the order/fulfilment transaction;
  unpaid expiry (cron) decrements on `EXPIRED`. Stall holds use `Stall.status`+`holdUntil`.
- **Pricing is fully dynamic — no default prices anywhere.** `TicketType.priceInPaise`,
  `StallTypeDef.priceInPaise` (and optional `Stall.priceInPaise` override), `Event.bulkTiers`, and
  `Event.earlyBird` are **all entered by the admin at event creation/edit**. The seed/clone template
  provides stall **geometry + sizes only**, never prices. Resolution logic per
  [BUSINESS-RULES.md](BUSINESS-RULES.md) §9.
- **Money** never floats — all paise `Int`.
- Adjust enum members only via migration; they map to Postgres enums.
