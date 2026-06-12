# architecture.md — Target Architecture (Rebuilt Today)

> Rebuild blueprint, part 5 of 15. What a world-class team would build today, what survives from
> the current code, and what is rebuilt. Stack stays Next.js 15 / TS / Prisma / Neon / Vercel —
> re-examined and re-chosen, not inherited (§1).

---

## 1. Stack decision (re-examined from scratch)

| Layer | Choice | Why it survives a from-scratch rethink |
| --- | --- | --- |
| Framework | **Next.js 15 App Router, single app** | One deploy, RSC for data-heavy admin, ISR for marketing pages, middleware for zones. A separate SPA+API would double the surface for a 1-developer + agents team. |
| Language | TypeScript strict | Non-negotiable. |
| DB | **Neon Postgres + Prisma** | Relational integrity is the product (holds, idempotency, partial-unique). The schema's core is proven (§7). |
| Auth | Firebase phone OTP (customer/vendor) + own password+TOTP (admin) + **own jose session** | App stays the session authority; Firebase is just an OTP vendor — swappable. Keep. |
| Payments | Razorpay, webhook-driven | Locked rule; implementation is the best code in the repo. |
| Hosting | Vercel + Cloudflare in front | With ONE hard requirement: an external scheduler for cron cadence (launch-readiness.md §2) or Vercel Pro crons. |
| Modular monolith | `src/server/<domain>` services | Correct for this scale. No microservices, no tRPC, no GraphQL — nothing here needs them. |

**Explicitly rejected:** separate admin app (session/cookie complexity for zero gain), websockets
at launch (10s polling is fine for one venue map; revisit V2), any ORM/queue/cache infra beyond
Postgres until measured need (the Outbox-in-Postgres pattern is correct at this scale).

---

## 2. Zone & routing architecture

Keep subdomain → zone middleware. **Delete the admin pretty-URL rewrite layer** —
`mapAdminPath`/`getPrettyPath` is ~150 lines of hand-maintained route maps in middleware
(`src/middleware.ts:57-203`) that must be edited every time a page moves (it already carries a
parallel redirect table in `next.config.ts:24-34`). The admin console is an internal tool;
`admin.bdqsocial.com/admin/...` vanity-flattening is not worth a hand-rolled router.

Target `middleware.ts` (~80 lines): resolve zone by host (+ dev override) → mint CSP nonce →
coming-soon gate → `vendor.` and `admin.` prefix rewrites — nothing else. Admin URLs are the
physical paths; sidebar hrefs point at them directly.

```
src/
├── middleware.ts                 — zones + CSP nonce only
├── app/
│   ├── (public)/                 — landing, events, vendors, map, legal  [RPA, ISR]
│   ├── (customer)/               — login, dashboard, profile             [RPA, dynamic]
│   ├── vendor/                   — signup/login + (app)/ portal          [RPA, dynamic]
│   ├── admin/                    — login + (console)/ per nav-group      [OKLCH, dynamic]
│   ├── api/                      — webhooks, cron, exports, auth, orders (things that need raw HTTP)
│   └── coming-soon/
├── server/<domain>/              — auth, events, tickets, bookings, vendors, checkin,
│                                    pricing, notifications, campaigns, finance, analytics,
│                                    sponsors, leads, waitlist, staff, comps, coupons, map, cron
├── components/{ui,rpa,admin,charts,map,motion,nav}/
├── lib/                          — pure helpers + one adapter per external SDK
└── actions/                      — cross-zone server actions only (rare)
```

This is ~90% the current layout — the folder structure was never the problem. The deltas: tables
into `components/admin/tables/` (consistency.md §7.2), an `components/rpa/` home for the shared
customer-side primitives (`RpaPageHeader`, checkout pieces), and the middleware diet.

---

## 3. The one mutation pipeline

Today the chain is real but hand-rolled per file: 17 action files repeat
`schema.safeParse → throw` (old DUP-1), `withValidation()` exists but has **zero callers**
(`src/lib/validation.ts`), and API routes vs server actions return **two different error shapes**
(HTTP-status style in `TicketCheckout.tsx` vs `{ok,error}` style in `VendorStallPay.tsx`).

Target — one composition, used by every mutation, with one envelope:

```ts
// server/action.ts
export const action = <I, O>(opts: {
  auth: Role | Permission;
  input: ZodType<I>;
  audit?: { action: string; entity: string };
  handler: (s: Session, input: I) => Promise<O>;
}) => async (raw: unknown): Promise<Result<O>> => { /* auth → parse → handler → audit → envelope */ };

type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message?: string } };
```

- Server actions and route handlers both return `Result<T>`; route handlers map `error.code` to
  HTTP status in one place.
- `withAudit` stays append-only before/after as today (`src/server/audit.ts`).
- Zod schemas stay centralized in `src/server/schemas.ts` (already the pattern, already tested).
- Delete `lib/validation.ts` if the composed `action()` subsumes it (no half-adopted helpers).

---

## 4. State machines (simplified)

### 4.1 Booking — collapse the legacy states

Current enum carries two flows: the legacy ticket-style live-payment flow (`HELD`, `PENDING`)
and the real onboarding flow (`RESERVED → PENDING_PAYMENT → BOOKED`), per
`prisma/schema.prisma:103-111` comments and `server/bookings/*`.

Target (one flow, owner's call-back rule embedded):

```
RESERVED ──(admin approves + sets payBy)──► PENDING_PAYMENT ──(webhook)──► BOOKED
   │                                              │
   ├──(admin rejects / vendor cancels)──► REJECTED/CANCELLED (stall → AVAILABLE)
   └──(payBy or hold expiry, cron)──────► CANCELLED          (stall → AVAILABLE)
```

Stall mirror: `AVAILABLE / RESERVED / BOOKED / BLOCKED` (today's 5-state `HELD/PENDING` split
collapses with it). Migration: map `HELD→RESERVED`, `PENDING→PENDING_PAYMENT`, then drop enum
values. The CAS hold + partial-unique index transfer unchanged.

### 4.2 Ticketing — the group-QR change (owner-confirmed)

New rule: **a group order issues ONE QR admitting N people** (e.g., buy 5 → one QR, gate shows
"ADMIT 5", staff hands out 5 badges). Schema impact: entry quantity moves to the scan unit.

- `Ticket` becomes the *admission unit*: add `admitCount Int @default(1)`; a group order creates
  one Ticket with `admitCount = totalQty` (per ticket-type, or per order — decide per type via
  existing `attendeesPer`).
- `CheckIn` records `admitted Int` so partial arrival ("3 of 5 came, 2 arrive later") is
  possible: scanner shows remaining count; ticket reaches `CHECKED_IN` when
  `sum(admitted) == admitCount`. (If the owner prefers all-at-once, it's a one-line rule — the
  schema supports both.)
- Capacity math switches from `count(tickets)` to `sum(admitCount)`
  (`server/checkin/service.ts` capacity snapshot + analytics).
- Delivery: one QR per order = one WhatsApp/email instead of N — cheaper and simpler.

### 4.3 Order/payment — unchanged

`PENDING → PAID | EXPIRED | FAILED` with 15-min TTL, webhook-only fulfilment, reconcile cron.
Proven; add only the oversell guard (security.md §3.1).

---

## 5. Map model — three overlapping concepts become one

Today three reuse mechanisms coexist: `LayoutTemplate` (clonable layout JSON), `EventMap`
(named reusable map with geometry), `MapElement` (global element catalog) — plus the per-event
`MapLayout` + normalized `Stall` rows (`prisma/schema.prisma:276-345`).

Target: **`VenueMap`** (the reusable thing: name, dimensions, grid, layoutJson, element palette
embedded) + per-event **`MapLayout` snapshot + `Stall` rows** (the operational thing). Attaching
a VenueMap to an event clones it. `LayoutTemplate` and `MapElement` fold into VenueMap (elements
are part of a map's palette; the global catalog rarely earns its own table). One concept fewer
to administer; the admin "Venue" nav group shrinks to Maps + Stall Inventory.

**Layout JSON v2 (map-system §1 owns the shape, Gate 5).** One zod schema in
`src/lib/map/layout-v2.ts` + pure `upgradeLayout(v1json)` — every consumer (designer, vendor
booking, public map, ops, exports) reads v2 only. Calibrated underlay, boundary, obstacles,
terrain, zones, pathways, entry-flow, layer visibility, and version snapshots all live inside
`layoutJson` — **JSON-first: the map phase ships zero Prisma migrations** (2 MB size guard,
snapshot cap 10). The scoring engine is a pure server lib (`src/server/map/scoring.ts`, modeled
on `pricing/engine.ts`: fixed weight constants + unit tests); gate-throughput math in
`src/lib/map/throughput.ts`. `MapDesigner.tsx` (24 KB today) splits into `useDesignerState` /
`useDesignerKeyboard` + panel components (Layers, Inspector, Validation, Versions) + tools,
with a thin shell (map-system §13). Konva remains the only canvas dependency.

## 5b. New models & services (blueprint extension, owner-confirmed 2026-06-12 session 2)

| Addition | Shape | Spec |
| --- | --- | --- |
| `Offer` | eventId, vendorProfileId?/sponsorId? (one required), title, terms, kind DISCOUNT\|FREEBIE\|BUNDLE, startsAt/endsAt, status DRAFT\|PUBLISHED\|ENDED, maxRedemptions?, redeemedCount | customer-portal §3.6, admin-portal §6.1 |
| `GalleryPhoto` | eventId, url, publicId, caption?, sortOrder, published | customer-portal §3.8, admin-portal §6.2 |
| `StallAddOn` + `BookingAddOn` + `AddOnOrder` | admin-priced extras; price snapshotted in paise; own gatewayOrderId in the webhook dispatch | vendor-portal §5 |
| `Ticket.admitCount` + `CheckIn.admitted` | group-QR model (§4.2) | implementation-roadmap M1 |
| `Order.shareCardUrl` | cached share-art asset | delight §2 |
| `SystemSetting` JSON keys | `guide:<eventId>`, `strip:<eventId>`, `concierge:<eventId>` — content/config without new tables | admin-portal §6.3-6.4, §9 |
| `server/offers/service.ts` | CRUD + publish workflow + auto-END cron task in `runAllMaintenance` | admin-portal §6.1 |
| `getHomeMode(event)` + now/next schedule queries | pure, unit-tested; consumed by home modes, strip, concierge | customer-portal §3.1/3.3 |
| Share-art generator | server-only (satori+resvg vs Cloudinary overlay — R6.2 spike decides); never in client bundle | delight §2 |
| `/api/webhooks/whatsapp` | Meta inbound, signature-verified (campaign-webhook pattern) → concierge keyword router | delight §7 |

---

## 6. DX standards (multi-agent ready)

The rebuild is executed by multiple AI agents (owner's direction). Agents need the repo itself
to carry the truth:

1. **Tests live in git.** Remove the `# test files` block from `.gitignore`; commit all
   `*.test.ts`, `vitest.config.ts`, `playwright.config.ts`, `/e2e/`. CI adds
   `npm run test:run` + a tagged Playwright smoke as **blocking** steps
   (`.github/workflows/ci.yml` currently runs zero tests).
2. **Tests with the task, not after** (already the repo rule — now enforceable since CI sees them).
3. **One way to do each thing**, written down: mutation pipeline (§3), error envelope (§3),
   component contracts (consistency.md §5), token rules (consistency.md §2). Agents follow specs,
   not vibes.
4. **Work-package acceptance = verify command.** Every changes.md work package names the exact
   command(s) that prove it (test, grep-gate, Lighthouse budget).
5. **Migrations:** additive-first, two-step destructive (deploy code tolerant → migrate → clean).
   Prod DB is the Vercel Neon instance (ep-dry-sunset) — migrate prod BEFORE deploying
   schema-dependent code (existing operational note).
6. **Naming fixes:** `requireSuperAdmin` → `requireAdminRole`; `requireSuperAdminOnly` →
   `requireSuperAdmin` (security.md §3.2). `service.ts` vs `admin-service.ts` split is fine —
   document it as "public-facing reads vs console mutations".

---

## 7. Salvage map — what survives from the current code

| Survives as-is (proven, tested) | Rebuilt | Deleted |
| --- | --- | --- |
| Payment webhook + `fulfillOrder` (+ oversell guard added) | Vendor portal UI → RPA design language | Admin pretty-URL rewrite maps (`middleware.ts:57-203`) |
| Pricing engine (`server/pricing/engine.ts`) | Customer dashboard → wallet UX (changes.md) | Task Center mock (`ops/tasks/`) — owner-confirmed |
| Session/guard core (rename only) | Landing page per chosen design direction | Legacy booking states + token aliases |
| Stall hold CAS + partial-unique migration | Analytics: 9 pages → 3 | `Budget`, `ExpenseSchedule`, `Settlement` surfaces → V2 (models may stay dormant) |
| Check-in service + offline idempotency (extended for admitCount) | Ticket model → group-QR `admitCount` | White-label `setEventTheme` surface → V2 (column stays) |
| Outbox + suppression + unsubscribe | Public map → real event data | `LayoutTemplate`/`MapElement` (fold into VenueMap) |
| Cron task library (`server/cron/tasks.ts`) | Error contract → one envelope | `lib/validation.ts` (subsumed by `action()`) |
| `schemas.ts` + the ~45 tested lib helpers | Coupon UI (add input at checkout) | framer-motion, swiper deps |
| Audit pipeline (`withAudit`, audit viewer) | Admin nav per changes.md IA | |

## 8. Verification

- `npm run typecheck && npm run lint && npm run test:run && npm run build` green in CI.
- Grep gates: `mapAdminPath|getPrettyPath` → 0; `BookingStatus.HELD|"PENDING"` (booking context)
  → 0 after migration; two error-shape consumers → all on `Result<T>`.
- RBAC matrix sweep + money-path integration tests (security.md §6) pass.
- One full e2e: buy (group qty 5) → webhook (replayed twice) → one QR delivered → kiosk scan
  admits 5 → capacity board shows 5 — single Playwright spec, in CI.
