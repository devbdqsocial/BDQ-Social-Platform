# BDQ Social — Technical Architecture

> How the portal is built and runs. Companion docs: [project.md](project.md) (product/tech spec),
> [design.md](design.md) (UI/UX system), [sponsorship-deck.md](sponsorship-deck.md).
> This document expands the architecture-level decisions already locked in `project.md`; it does
> not contradict them.

---

## 1. Overview & Architectural Drivers

One full-stack Next.js 15 app, served across four hostnames, backed by Neon Postgres and a small
set of managed SaaS services, deployed serverless on Vercel. The architecture is shaped by these
quality attributes (in priority order):

| Driver | What it forces |
| --- | --- |
| **Booking integrity** (no double-book) | DB-enforced uniqueness + transactional holds + TTL sweeps. |
| **Payment correctness** | Server-side, webhook-driven, signature-verified, idempotent fulfilment. |
| **Deliverability** (ticket must arrive) | Outbox + retries + multi-channel fallback (WhatsApp → email → SMS). |
| **Security & privacy** | Zone isolation, RBAC, least privilege, granular audit, PII minimization. |
| **Low / zero fixed cost** | Free-tier-friendly serverless + managed services; pay-per-use only. |
| **Mobile / PWA** | Installable, offline ticket + offline gate-scan queue. |
| **SEO + premium feel** | SSR/ISR landing, fast Core Web Vitals. |
| **Auditability** | Every admin/staff mutation recorded with before/after. |

---

## 2. Architecture Style & Key Decisions

**Style: Modular monolith** on Next.js (one codebase, one deploy) with clear internal domain
module boundaries — not microservices. At this scale a monolith is cheaper, simpler, and easier to
keep consistent; modules are structured so they could be peeled out later if needed.

| Decision | Choice | Rationale | Tradeoff |
| --- | --- | --- | --- |
| App shape | Modular monolith (Next.js App Router) | One codebase for UI + API; shared types; cheap | Must enforce module boundaries by convention |
| Surfaces | 4 hostnames, one app, middleware rewrite | Isolation (vendor ≠ customer ≠ admin) without 4 deploys | Middleware routing complexity |
| Hosting | Vercel serverless + cron | Native Next.js, free tier, wildcard domains | Cold starts; stateless functions |
| DB | Neon Postgres + Prisma | Relational integrity for bookings/analytics; serverless pooling | Connection management in serverless |
| Auth | Firebase Auth (phone OTP) + app session | Free OTP; offload SMS | External dependency in login path |
| Payments | Razorpay, webhook-driven | India-first; reliable async confirmation | Must handle webhook idempotency |
| Map | react-konva (canvas) | Hundreds of clickable stalls, zoom/pan, live status | Canvas not natively accessible (needs list fallback) |
| Fulfilment | Async via verified webhook | Never trust client success callback | Slight delay between pay and ticket |
| Refunds | None (all sales final) | Business rule | No refund subsystem |
| Tax | No GST billing; KYC for verify only | Business rule | Simple receipts only |
| Live map | Polling in MVP, websockets later | Free, simple first | Not instant until upgraded |

See the consolidated ADR table in §24.

---

## 3. C4 Level 1 — System Context

```
                ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐
   Customer ──► │           │   │  Vendor  │   │  Super   │   │ Staff  │
   (phone)      │           │   │          │   │  Admin   │   │ (gate) │
                └─────┬─────┘   └────┬─────┘   └────┬─────┘   └───┬────┘
                      └───────────┬──┴──────────────┴─────────────┘
                                  ▼
                    ┌─────────────────────────────┐
                    │   BDQ Social Portal (app)    │
                    └──┬───┬───┬───┬───┬───┬───┬───┘
          ┌────────────┘   │   │   │   │   │   └───────────┐
          ▼                ▼   ▼   ▼   ▼   ▼               ▼
     ┌─────────┐   ┌────────┐ ┌───────┐ ┌────────┐ ┌─────────┐ ┌────────┐
     │ Firebase │   │Razorpay│ │Interakt│ │SendGrid│ │Cloudinary│ │  Neon  │
     │  Auth    │   │  (pay) │ │ (WA)   │ │ (email)│ │ (assets) │ │   PG   │
     └─────────┘   └────────┘ └───────┘ └────────┘ └─────────┘ └────────┘
```

External systems: **Firebase Auth** (OTP/identity), **Razorpay** (payments + webhooks),
**Interakt** (WhatsApp BSP), **SendGrid** (email), **Cloudinary** (asset storage/CDN),
**Neon** (Postgres). All secrets are server-side only.

---

## 4. C4 Level 2 — Containers

```
                         Vercel Edge (wildcard *.bdqsocial.com)
   ┌────────────────────────────────────────────────────────────────────┐
   │  Next.js 15 app                                                      │
   │  ┌──────────────┐   ┌───────────────────────────────────────────┐   │
   │  │ middleware.ts │──►│  Server: Route Handlers + Server Actions  │   │
   │  │ host → zone   │   │  (Zod • RBAC • withAudit • domain svcs)   │   │
   │  └──────────────┘   └───────────────┬───────────────────────────┘   │
   │  ┌──────────────────────────────┐   │  Prisma Client (pooled)        │
   │  │ React UI (RSC + client comps)│   │                                │
   │  └──────────────────────────────┘   ▼                                │
   └───────────────────────────────────┬─┴───────────────────────────────┘
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
   Neon Postgres   Firebase Admin   Razorpay API   Interakt/SendGrid   Cloudinary
   (data)          (verify token)   + webhook in   (outbound msgs)   (assets)

   Vercel Cron ──► /api/cron/* (release holds, expire orders, reminders, reports)
```

The app is the only compute container; everything else is managed SaaS or the database. Cron is
Vercel-scheduled HTTP calls into protected `/api/cron/*` routes.

---

## 5. Subdomain Routing & Request Lifecycle

A single deploy serves four zones. `middleware.ts` inspects the `Host` header and rewrites to the
correct route group; it also runs the first RBAC gate.

```
Request ──► Edge middleware.ts
   1. Parse Host:
        bdqsocial.com / www      → zone = PUBLIC/CUSTOMER  → /(public) or /(customer)
        vendors.bdqsocial.com    → zone = VENDOR           → rewrite to /vendor/*
        admin.bdqsocial.com      → zone = ADMIN            → rewrite to /admin/*
   2. Read session cookie (httpOnly). Resolve user + role + permissions.
   3. Zone guard:
        - VENDOR zone requires role VENDOR (else redirect to vendor login)
        - ADMIN zone requires role SUPER_ADMIN | STAFF (+ 2FA passed for admin actions)
        - cross-zone access is denied (a customer session cannot enter admin)
   4. Rewrite + continue → Route Handler / Server Action
        5. Server re-checks role/permission for the specific action (defense in depth)
        6. Zod-validate input → domain service → Prisma (in a transaction if mutating)
        7. withAudit() logs admin/staff mutations
   ◄── Response (RSC stream / JSON)
```

Middleware does coarse zone+auth gating; **every mutation re-authorizes server-side** (never trust
the edge alone). Wildcard DNS + Vercel domains map all subdomains to the one project.

---

## 6. C4 Level 3 — Domain Modules & Dependency Graph

Server logic lives under `src/server/<module>`; each module owns its tables and exposes service
functions. UI and route handlers call services, never Prisma directly.

```
            ┌─────────┐         ┌──────────┐
            │  auth   │◄────────│  (all)   │   every module depends on auth + audit
            └────┬────┘         └────┬─────┘
                 │                   │
   ┌─────────────┼───────────────────┼───────────────────────────┐
   ▼             ▼                   ▼                            ▼
 events ─────► schedule          vendors ──► kyc            notifications
   │                               │                            ▲
   ▼                               ▼                            │
  map ──► bookings ◄── tickets ──► payments ───────────────────┘
   ▲          │           │           │
   └──────────┘           ▼           ▼
                       checkin     sponsors        analytics (reads all)   audit (writes all)
```

| Module | Owns | Key dependencies |
| --- | --- | --- |
| auth | User, sessions, permissions | Firebase Admin |
| events | Event, TicketType, StallTypeDef | auth |
| schedule | ScheduleItem (timetable) | events |
| map | MapLayout, Stall | events, bookings |
| vendors | VendorProfile, VendorAsset, VendorContract | auth, kyc, cloudinary |
| kyc | VendorKyc | vendors |
| bookings | Booking (vendor + admin-created) | map, payments, vendors |
| tickets | Order, Ticket | payments, notifications, events |
| payments | Payment, Razorpay orders/webhook | tickets, bookings |
| notifications | outbox, templates | Interakt, SendGrid |
| checkin | CheckIn | tickets, auth |
| sponsors | Sponsor, placements | events |
| analytics | read-only aggregates | all (read) |
| audit | AuditLog (append-only) | all (write) |

Rule: dependencies point **inward/down**; cycles are avoided by routing cross-cutting concerns
(notifications, audit) through well-defined service calls.

---

## 7. Application Layering

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation: RSC (data fetch) + client components (interactivity)│
│   - shadcn/ui components, MapCanvas (react-konva), Scanner       │
├──────────────────────────────────────────────────────────────┤
│ Application: Route Handlers (/api/*) + Server Actions            │
│   - Zod validation (input)  - RBAC check  - withAudit() wrapper  │
├──────────────────────────────────────────────────────────────┤
│ Domain services: src/server/<module>/*.ts                        │
│   - business rules, state-machine transitions, transactions      │
├──────────────────────────────────────────────────────────────┤
│ Data access: Prisma client (src/server/db.ts)                    │
├──────────────────────────────────────────────────────────────┤
│ External adapters: src/lib/* (razorpay, firebase-admin, interakt,│
│   sendgrid, cloudinary, qr, totp, ratelimit)                       │
└──────────────────────────────────────────────────────────────┘
```

Cross-cutting concerns are applied as composable wrappers around application-layer handlers:
`withAuth(role|perm)` → `withValidation(zodSchema)` → `withAudit(action)` → handler. Adapters in
`src/lib` are the only code that talks to external SDKs, so providers can be swapped behind an
interface (e.g. WhatsApp BSP, SMS).

---

## 8. Data Architecture

### 8.1 ERD (core)

```
User 1───* Order 1───* Ticket *───1 TicketType *───1 Event
 │           │                          ▲             │ 1
 │           └──* Payment               │             ├──* ScheduleItem
 │ 1                                    │             ├──* StallTypeDef 1──* Stall
 ├──1 VendorProfile 1──1 VendorKyc      │             ├──1 MapLayout
 │        │ 1──* VendorAsset            │             ├──* Sponsor
 │        │ 1──1 VendorContract         │             └──* Coupon
 │        └──* Booking *──1 Stall ──────┘
 └──* CheckIn *──1 Ticket
AuditLog *──1 User (actor)        Waitlist *──1 Event
```

### 8.2 Integrity & invariants (enforced at the DB, not just app)
- **One active booking per stall:** partial unique index on `Booking(stallId)` where
  `status IN (HELD, PENDING, BOOKED)`. Guarantees no double-book even under races.
- **Unique `Ticket.qrToken`**, unique `Coupon.code`, one `MapLayout` per `Event`.
- **Order/Payment idempotency:** unique `Payment.gatewayRef`; fulfilment keyed on it.
- **Soft constraints in app:** coupon caps, bulk thresholds, hold TTL.

### 8.3 Transactions
Mutating flows run in a single Prisma transaction with row locks where contention exists:
hold/book a stall, approve vendor (stall → BOOKED), fulfil an order (mark paid + issue tickets +
enqueue notifications). Either everything commits or nothing does.

### 8.4 Indexing (representative)
`Stall(eventId, status)`, `Booking(stallId, status)`, `Order(userId, status)`,
`Ticket(orderId)`, `Ticket(qrToken unique)`, `Payment(gatewayRef unique)`,
`AuditLog(entity, entityId, createdAt)`, `CheckIn(ticketId)`, `ScheduleItem(eventId, startsAt)`.

### 8.5 Audit storage
`AuditLog` is **append-only** (no UPDATE/DELETE from app code), capturing actor, role, action,
entity, entityId, before/after JSON, IP, UA, timestamp.

### 8.6 Serverless DB access
Neon serverless driver + Prisma with connection pooling (PgBouncer/Neon pooler) to survive many
short-lived serverless invocations; use the pooled connection string for runtime, direct for
migrations.

---

## 9. Key Sequence Flows

### 9.1 Ticket purchase (webhook-driven fulfilment)
```
Customer        App(server)        Razorpay         Neon        Notifications
   │ add to cart    │                  │              │              │
   │ checkout ─────►│ validate+price   │              │              │
   │                │ create Order(PENDING) ─────────►│              │
   │                │ create RZP order ►│              │              │
   │ ◄ checkout opts│◄ orderId         │              │              │
   │ pay in RZP ───────────────────────►│ (UPI/card)  │              │
   │                │   webhook payment.captured ◄────│              │
   │                │ verify signature  │              │              │
   │                │ (idempotent by gatewayRef)       │              │
   │                │ txn: Order→PAID, issue Tickets+QR ─────────────►│
   │                │ enqueue WhatsApp + email ────────────────────► │ send (retry)
   │ ◄ success page │ (poll/refresh shows tickets)     │              │
```
Client success callback only redirects; **tickets are issued solely from the verified webhook**.

### 9.2 Stall hold → pay → verify (call) → approve
```
Vendor selects stall ► holdStall (txn: AVAILABLE→HELD, holdUntil=now+10m)
   ► pay (Razorpay) OR choose offline ► Booking PENDING
   ► team calls vendor to verify (manual) ► admin Approve
   ► txn: Booking→BOOKED, Stall→BOOKED, notify vendor
   (reject ► release Stall→AVAILABLE ; TTL expire ► cron releases HELD)
```

### 9.3 Phone OTP auth
```
Client → Firebase (request OTP) → user enters code → Firebase returns ID token
Client → POST /api/auth/verify (ID token) → server verifies via Firebase Admin
   → upsert User(role by zone) → set httpOnly session cookie → done
```

### 9.4 Gate check-in with offline queue
```
Staff scanner (PWA) decodes QR token
  online:  POST /api/admin/checkin → validate (exists, unused, this event)
           → txn CheckIn + Ticket→CHECKED_IN → return VALID/USED/INVALID
  offline: enqueue scan locally (IndexedDB) → show optimistic result
           → on reconnect, sync queue → server resolves authoritative status
```

### 9.5 Admin-side booking & offline payment
```
Admin → create Booking (enter vendor details) → assign Stall → record Payment(OFFLINE, ref)
   → txn Stall→BOOKED → withAudit logs actor + before/after
```

---

## 10. State Machines

(Authoritative copy in [project.md](project.md) §8; summarized here.)

- **Stall:** `AVAILABLE → HELD → PENDING → BOOKED`; `reject | cancel | TTL → AVAILABLE`;
  `BLOCKED` is organizer-set.
- **Order:** `PENDING → PAID | FAILED | EXPIRED` (unpaid auto-expire by cron).
- **Ticket:** `VALID → CHECKED_IN` (no refund/cancel path by policy).
- **Vendor approval:** `SUBMITTED → UNDER_REVIEW (team call) → APPROVED | REJECTED`.

Transitions are server-only, transactional, and audited.

---

## 11. Integration Architecture

Each external service is wrapped by an adapter in `src/lib/*`. Common patterns: server-side keys
only, timeouts, retry with backoff, idempotency, and a graceful fallback.

| Service | Direction | Pattern | Idempotency | Fallback |
| --- | --- | --- | --- | --- |
| Firebase Auth | inbound verify | Admin SDK verify ID token | n/a | block login, show retry |
| Razorpay | out (create order) + in (webhook) | create order; **verify webhook signature** | unique `gatewayRef`; fulfil-once | reconcile via Razorpay API if webhook missed |
| Interakt (WhatsApp) | outbound | template send w/ QR media | outbox row + send-once flag | retry, then **email + SMS** fallback |
| SendGrid (email) | outbound | transactional send | outbox row | retry; mark failed for ops |
| Cloudinary | outbound (signed) | signed direct upload from client | per-asset publicId | reject + ask re-upload |
| Neon | data | pooled Prisma | transactions | surface 503, retry idempotent reads |

**Webhook handling:** webhook routes are public but verified (signature/secret), respond 2xx fast,
and do work idempotently. Missed webhooks are caught by a reconciliation cron that queries
Razorpay for recent payments.

**Outbox pattern (notifications):** writing a ticket also writes an outbox row; a sender processes
rows with retries and per-channel status, so a transient WhatsApp/email failure never loses a
ticket.

---

## 12. Authentication & Authorization Architecture

- **Identity:** Firebase phone OTP (customers/vendors); vendors may also use email. Server verifies
  the Firebase **ID token** with the Admin SDK, then issues its **own httpOnly, short-lived session
  cookie** (the app is the session authority, not the client).
- **Zone isolation:** customer, vendor, and admin sessions are scoped by zone; a cookie minted on
  one zone is not honored as another role. Customer and vendor logins live on different hostnames.
- **RBAC:** `role ∈ {CUSTOMER, VENDOR, STAFF, SUPER_ADMIN}` + `permissions[]` for STAFF presets
  (scanner-only, support-only, etc.). Two gates: middleware (coarse, per zone) and per-action
  server check (fine). Staff cannot edit events/payments/map regardless of UI.
- **Admin hardening:** `admin.` is private/unlinked; SUPER_ADMIN requires **TOTP 2FA**; sensitive
  actions re-validate server-side and are fully audited.
- **Sessions:** rotation on privilege change, CSRF protection on mutations, secure + httpOnly +
  SameSite cookies.

---

## 13. Concurrency & Consistency

- **Stall contention:** `holdStall` runs `SELECT ... FOR UPDATE` (Prisma transaction) and flips
  `AVAILABLE→HELD` only if currently available; the partial unique index is the final backstop.
- **Hold TTL:** `holdUntil` timestamp; a cron sweep releases expired holds to `AVAILABLE`.
- **Payment races / retries:** fulfilment is idempotent on `gatewayRef`; duplicate webhooks are
  no-ops.
- **Check-in races:** `Ticket→CHECKED_IN` is a conditional update; a second scan reads "already
  used".
- **Consistency model:** strong consistency within Postgres transactions; eventual consistency for
  outbound notifications (retried).

---

## 14. Background Jobs / Scheduling

Vercel Cron calls protected `/api/cron/*` endpoints (shared secret):

| Job | Cadence | Purpose |
| --- | --- | --- |
| release-holds | every 1–2 min | free expired `HELD` stalls; expire unpaid orders |
| reconcile-payments | every 10–15 min | catch missed Razorpay webhooks |
| notify-retry | every few min | process outbox retries |
| reminders | scheduled | event-day reminders (WhatsApp/email/push) |
| post-event-report | on demand / after event | generate PDF/CSV analytics export |

Jobs are idempotent and safe to run repeatedly.

---

## 15. Caching & Performance

- **Landing/site:** SSR + ISR (revalidate) for SEO and speed; mostly static, image-led.
- **App data:** React Server Components fetch per request; cache read-heavy public data (event,
  published map layout) with short revalidation.
- **Map:** layout served as a single JSON document; stall status overlaid via lightweight polling
  in MVP (websockets later). Canvas rendering handles hundreds of shapes efficiently.
- **Images:** Cloudinary responsive transformations + CDN; lazy-load; AVIF/WebP.
- **DB:** targeted indexes (§8.4), pooled connections, avoid N+1 via Prisma `include`/select.
- **Bundle:** route-level code splitting; keep react-konva off the critical path of non-map pages.
- **PWA:** precache shell + cache tickets for offline.

---

## 16. Asset Architecture

Vendor logos/banners/products and event images use **Cloudinary signed direct uploads**: the
server issues a short-lived signature, the client uploads straight to Cloudinary (no large payload
through our functions), and stores the returned `url` + `publicId`. Server validates type/size and
never trusts client-provided URLs. Delivery is via Cloudinary's CDN with on-the-fly resizing.

---

## 17. Notification / Delivery Architecture

```
issue Ticket ─► write Outbox(rows: WhatsApp, Email) ─► Sender
   Sender: for each row → adapter.send() → mark SENT | (retry/backoff) → FAILED after N
   Channel priority: WhatsApp (Interakt) → Email (SendGrid) → SMS fallback
   Each send is idempotent (outbox id + channel), so retries never double-send
```

Templates (WhatsApp must be pre-approved by Interakt) are versioned in config. QR is delivered as
media (WhatsApp) and embedded image (email). Delivery status is observable per channel for ops.

---

## 18. Security Architecture (defense in depth)

| Layer | Controls |
| --- | --- |
| Network/edge | HTTPS only, security headers, CSP, zone routing in middleware |
| Identity | Firebase verify, httpOnly sessions, admin TOTP 2FA |
| Authorization | zone + role + permission, re-checked per action |
| Input | Zod validation on every handler + webhook |
| Payments | webhook signature verify, idempotent fulfilment, no client-trust |
| Abuse | rate limiting on OTP, login, coupon, checkout; bot protection on public forms |
| Data | least-privilege DB, PII minimization (phone/email/name + KYC for verify only), encryption in transit |
| Files | signed uploads, type/size validation |
| Secrets | server-side env only; never shipped to client |
| Audit | append-only granular log of all admin/staff actions |
| Sessions | CSRF protection, SameSite, rotation, short TTL |

**Top threats & mitigations:** double-booking (DB constraint + locks); payment forgery (webhook
signature + idempotency); privilege escalation (per-action RBAC + zone isolation); ticket forgery
(signed QR tokens, server validation); OTP/credential abuse (rate limits); data exposure (least
privilege + minimization + audit).

---

## 19. Observability

- **Logging:** structured server logs (request id, actor, action, latency) via Vercel logs.
- **Errors:** error tracking (e.g. Sentry) for client + server, with release tagging.
- **Audit:** business-level `AuditLog` (who/what/before/after) — distinct from technical logs.
- **Payments/webhooks:** dedicated monitoring + alerting on failed/missed webhooks and outbox
  failures.
- **Analytics events:** registrations, ticket sales, check-ins feed the admin dashboards.
- **Health:** `/api/health` (DB + key deps) for uptime checks.

---

## 20. Deployment & Environments

- **Hosting:** Vercel project with **wildcard domain** `*.bdqsocial.com` + apex; one deploy serves
  all zones.
- **Environments:** `local` → `preview` (per-PR) → `production`; separate Neon branches/databases,
  Firebase projects, and Razorpay (test vs live) keys per environment.
- **DB migrations:** Prisma migrate; run on deploy via direct (non-pooled) connection; never
  destructive without review.
- **Config:** all secrets in Vercel env vars per environment (see [project.md](project.md) §18).
- **CI checks:** typecheck, lint, Prisma validate, build; preview deploy for manual QA.
- **DNS:** wildcard CNAME to Vercel; verify subdomains route to the right zones post-deploy.

---

## 21. Scalability & Cost Path

| Service | Free ceiling | First bottleneck | Upgrade path |
| --- | --- | --- | --- |
| Vercel | Hobby limits | function invocations / bandwidth | Pro plan |
| Neon | 0.5 GB, autosuspend | storage / cold starts / connections | larger compute + always-on |
| Firebase OTP | Spark quota | SMS OTP volume at sale spikes | dedicated SMS provider behind auth adapter |
| Razorpay | usage-based | none fixed | n/a (per-txn fee) |
| Interakt | trial/tier | per-message at scale | paid messaging tier |
| SendGrid | 3k/mo | email volume | paid tier |
| Cloudinary | 25 GB | asset volume/bandwidth | paid tier |

Scale levers when traffic grows: move live-map to websockets (or a pub/sub), add a real queue/
worker for notifications, introduce read replicas for analytics, and cache hot reads. The
modular-monolith boundaries let heavy modules (map, notifications) be extracted if ever needed.

---

## 22. Failure Modes & Resilience

| If this fails | Behavior | Recovery |
| --- | --- | --- |
| Razorpay webhook missed | order stays PENDING | reconcile cron queries Razorpay, fulfils |
| WhatsApp (Interakt) down | ticket still issued | outbox retries; email/SMS fallback |
| Email down | ticket still issued | retries; WhatsApp already delivered |
| DB unavailable | mutations fail safely (txn rollback) | retries; no partial bookings |
| Firebase down | new logins blocked | existing sessions still valid; show retry |
| Cloudinary down | uploads blocked | user retries; core flows unaffected |
| Vercel cold start | slight latency | acceptable; warm critical paths |

Guiding rule: **money + booking integrity are transactional and never partially applied;**
delivery is best-effort with retries and fallbacks.

---

## 23. Codebase Structure (layer mapping)

Extends [project.md](project.md) §17:

```
src/
  middleware.ts            → edge: host→zone routing + coarse RBAC          (App layer)
  app/(public|customer)/   → landing, customer UI                          (Presentation)
  app/vendor/              → vendors.* UI
  app/admin/               → admin.* UI (+ /admin/checkin staff scanner)
  app/api/                 → route handlers (orders, webhook, cron, checkin)(App layer)
  server/<module>/         → domain services + state machines              (Domain)
  server/db.ts             → Prisma client                                 (Data access)
  server/audit.ts          → withAudit() wrapper                           (Cross-cutting)
  lib/                     → razorpay, firebase-admin, interakt, sendgrid,
                             cloudinary, qr, totp, ratelimit, zod          (Adapters)
  components/              → ui, MapCanvas, MapDesigner, Scanner, charts    (Presentation)
  pwa/                     → manifest + service worker
prisma/schema.prisma       → data model
```

---

## 24. Architecture Decision Records (summary)

| ADR | Decision | Why | Alternative rejected |
| --- | --- | --- | --- |
| 01 | Modular monolith on Next.js | one codebase, shared types, low cost | microservices (overkill) |
| 02 | One app, 4 subdomains via middleware | zone isolation w/o 4 deploys | 4 separate apps |
| 03 | Neon Postgres + Prisma | relational integrity + serverless pooling | MongoDB (weak for bookings/analytics) |
| 04 | Firebase OTP + own session | free SMS, app-owned auth | rolling own SMS/auth |
| 05 | Webhook-driven, idempotent fulfilment | correctness over speed | client-callback trust (unsafe) |
| 06 | react-konva custom map | full control, free, performant | seats.io (paid lock-in) |
| 07 | Outbox + fallback for delivery | tickets must arrive | fire-and-forget send |
| 08 | DB partial-unique for stalls | hard no-double-book guarantee | app-only checks (racy) |
| 09 | No refund subsystem | business rule (all sales final) | building refunds |
| 10 | Granular append-only audit | accountability requirement | sampled/coarse logging |
| 11 | Polling map now, websockets later | free + simple MVP | realtime infra upfront |

---

## 25. Open Architectural Risks & Future

- **Live map at scale:** polling is fine for MVP; high-concurrency sale moments may need
  websockets / pub-sub for instant stall status.
- **Notification volume:** outbox-in-DB is adequate now; a dedicated queue/worker may be needed at
  scale.
- **Analytics load:** heavy aggregate queries may warrant a read replica or a summary/rollup table.
- **OTP cost spikes:** ticket on-sale bursts can hit Firebase SMS quota; pre-plan the SMS-provider
  swap behind the auth adapter.
- **Serverless connection limits:** monitor Neon pooler under burst; tune pool + query budgets.
- **Multi-event / multi-city growth:** current model supports multiple events; multi-region or
  white-label tenancy would need tenant scoping review.
```
