# admin-portal.md — Admin Console Specification (post-diet)

> Spec 12/15. The console after the owner-confirmed diet, plus the admin counterparts of every
> Festival Companion feature ("add all admin needed things" — owner). Design language stays
> neutral OKLCH + Geist (locked); components per [design-system.md §4](design-system.md);
> mobile behavior per [mobile.md §5](mobile.md). Every mutation goes through the
> `action()` pipeline + `withAudit` (architecture.md §3).

## 1. Final navigation tree (the complete console — nothing exists outside it)

```
Dashboard (Command Center)
Events        All Events · Create Event · Past Events
Venue         Maps · Stall Inventory
Ticketing     Orders · Attendees · Comps · Coupons
Vendors       Applications · Add Vendor · Stall Add-ons
Operations    Check-in Scanner · Kiosk Mode · Live Monitor · POS · Staff · System Health
Content       Offers · Gallery · Guide · Happening Strip          ← new group
Growth        Sponsors · Waitlists · Campaigns · Concierge
Analytics     Attendance (event-day live board)
System        Audit Logs · Roles & Permissions · Notifications · Settings
```

Removed vs today: Task Center (mock) · Map Elements page (folds into Maps via VenueMap palette)
· Events/[id]/map page (folds into the event wizard map step) · Finance group → three pages
under one "Finance" leaf set: P&L · Expenses · Payments (Budgets/Settlements gone to V2) ·
Analytics 9 pages → Command Center + Attendance. Added: POS + Settings to nav (today orphaned),
Kiosk, Content group, Add-ons, Concierge. RBAC per security.md §4; nav filtered by
`canAccessSection` exactly as built (`lib/console-access.ts`) with new sections
`content`, `addons`, `concierge` (ADMIN+; STAFF none).

## 2. Command Center — `/dashboard` (replaces dashboard + analytics overview; owner-confirmed)

Single screen answering the six founder questions, scoped to the event-switcher selection:

| Tile | Value | Source (existing) |
| --- | --- | --- |
| Revenue | gross captured ₹ + net after fees sub-line | `Payment` CAPTURED sums (analytics service) |
| Tickets | sold/total + sparkline 14d | `TicketType.soldQty/totalQty` + orders by day |
| Check-ins | live count + % of sold (event day) | `liveCheckedIn` (`server/checkin/service.ts:68`) |
| Vendors | booked/total stalls + pending-review count | `Stall` status counts + `VendorProfile` SUBMITTED/UNDER_REVIEW |
| Sponsors | signed amount ₹ + count by tier | `Sponsor` SIGNED/PAID sums |
| Waitlist | platform + event counts, 7d delta | `Waitlist` counts |

Alert tiles row (render only when non-zero, danger-tinted): Payment failures 24h ·
Outbox FAILED count · Vendors in review >48h · Last cron tick >15m ago · Webhook last-received
age (event week). Each deep-links to its surface. Below: revenue-by-day chart (one, 280px) +
recent activity feed (orders/bookings/check-ins, 10 rows). Auto-refresh 60s on event day
(`AutoRefresh` reused).

## 3. Events

- **Create wizard** (replaces form + scattered tabs): 4 steps — Basics (name/slug/dates/venue/
  description) → Tickets (types: name, price, qty, `attendeesPer`, early price; bulk tiers;
  early-bird window) → Map (attach a VenueMap → clones stalls; stall-type prices entered here)
  → Review & publish (DRAFT default; publish = revalidates public pages). Each step its own
  save (resume-safe).
- Event detail: the 7 inline tabs (today `events/[id]/page.tsx`, 237 lines) become routed
  sub-tabs: Overview · Tickets · Schedule (CRUD: title/time/stage/performer — feeds companion
  schedule) · Map · Danger (archive). Theme tab REMOVED (V2 ✔owner).
- Past events: archive list reading `archiveJson` (built).

## 4. Venue

Maps = VenueMap library (architecture.md §5): list, `MapDesigner` (desktop-only per mobile.md
§5), element palette embedded in the designer (replaces Elements page). Stall Inventory: table
of event stalls (label/type/price/status/vendor), per-stall price override, BLOCK toggle
(audited).

**The designer itself is the flagship, specced in full in [map-system.md](map-system.md)**
(Gate 5): calibrated real-map underlay, polygon boundary + obstacles, zones, pathways, terrain,
entry-flow + gate throughput, layers panel, distance/measurements, align/bulk tools, **Sales
view** (scoring badges, price *suggestions* the admin applies — audited like any price edit;
revenue heatmap), version snapshots, vendor preview mode, PNG/PDF export variants
(vendor/ops/print). Stall Inventory gains a read-only Score column and an "Apply suggested
price" row action (same audited mutation as the designer's).

## 5. Ticketing

Orders: table (id, buyer phone, items, total, status, time) → detail (payment, tickets incl.
`admitCount`, resend-delivery action, audit trail). Attendees: ticket-level list (holder,
type, ADMIT-N, status) + CSV (rate-limited route exists). Comps: existing flow + group-comp
(one QR, admitCount N). Coupons: CRUD as built + usage column; redemption ledger link.

## 6. Content (new group — companion counterparts)

### 6.1 Offers
Table (vendor/sponsor, title, kind, window, status, redeemed) + create/edit Sheet: link to
VendorProfile OR Sponsor (one required), title ≤60, terms ≤200, kind select, window pickers
(default = event day), maxRedemptions optional. Workflow: DRAFT → PUBLISHED (button, audited)
→ ENDED (auto at endsAt, cron task added to `runAllMaintenance`). Validation: window inside
event window; vendor must be APPROVED. Customer surface hides until ≥1 PUBLISHED
(customer-portal.md §3.6).

### 6.2 Gallery
Upload grid (multi-file, signed Cloudinary, jpg/png/webp ≤10MB), drag-order (`sortOrder`),
caption inline-edit, publish toggle per photo + "Publish all". Gate banner: "Customer gallery
appears at 8+ published photos."

### 6.3 Guide editor
Form mirroring guide sections (customer-portal.md §3.7): six fixed sections, each
title-locked + rich-text-lite body (markdown, preview pane). Saves to `SystemSetting
guide:<eventId>` (audited). "View live" link.

### 6.4 Happening Strip config
Toggle + window override (default: event-day auto), message slots: auto items (gates time from
event, live act from schedule now-query) + up to 3 manual messages (≤80 chars, e.g. "Parking B
full — use Gate 2"). Stored `SystemSetting strip:<eventId>`.

### 6.5 Stall Add-ons (under Vendors)
CRUD per event: name, price (admin-entered, paise), maxPerBooking, stock, active. Orders list
(vendor, items, total, paid-at) + CSV. Stock decrements on paid add-on order; oversold
prevented by conditional update (same pattern as tickets).

## 7. Operations

- **Check-in Scanner**: console page as built (`ops/checkin`).
- **Kiosk Mode** (new leaf): launcher → picks gate label → opens `/admin/kiosk` fullscreen
  (spec: mobile.md §6 + delight.md §6). Exits via long-press 3s + PIN-less (session-bound).
- **Live Monitor**: as built + group-aware counts (`sum(admitCount)`).
- **POS**: as built, now in nav; cash reconciliation note auto-appends to runbook data (count
  of OFFLINE payments by staff member — query exists via `Payment.mode`).
- **Staff**: table + presets (built) + **"Sign out everywhere"** per row (`revokeSessions` —
  `server/auth/session.ts:68`, surfaced; audited).
- **System Health**: `/admin/ops` + the **ops status strip** (launch-readiness §5.3): outbox
  depth, last webhook at, last cron tick, reconcile-fulfilled 24h — four stat chips, queries
  existing.

## 8. Finance (slimmed ✔owner)

P&L (built, `finance/pnl`) · Expenses (built; recurring-schedule UI hidden — model dormant) ·
Payments (built). Weekly finance digest stays (cron). Budgets/Settlements routes removed;
redirects dropped (clean removal, V2 brings them back if missed).

## 9. Growth

Sponsors (built) · Waitlists (unified table, built) · Campaigns (full module kept ✔owner) with
two additions: **send-confirm dialog** showing resolved audience count + channel + first 3
recipients preview ("Send to 1,204 customers via Email?") and a PAUSED-respected test
(failure-analysis #21). · **Concierge** (new): keyword→reply manager for the WhatsApp
concierge (delight.md §7): table of keyword sets (e.g. "schedule|lineup" → now/next reply
template), enable toggle, test-send to own number. Stored `SystemSetting concierge:<eventId>`.

## 10. Analytics

Attendance live board only (event-day: check-ins over time, by ticket type, gate throughput —
existing queries + `capacitySnapshot`). Everything else lives in Command Center tiles. V2
restores deep pages if the founder actually asks for one twice.

## 11. System

Audit viewer (built, SUPER_ADMIN only) · Roles (built) · Notifications feed (built) ·
Settings (in nav now): event-context default, support phone/email (used by vendor copy),
`guide`/`strip`/`concierge` quick links.

## 12. Verification

- Nav tree renders exactly §1 per role (RBAC sweep extends security.md §4 with content/addons/
  concierge rows).
- Command Center numbers reconcile against raw queries in a seeded test (one paid order, one
  booking, one check-in → all six tiles correct).
- Offers/gallery/guide content gates behave (publish flow e2e).
- Kiosk launcher → scan → ADMIT-N → Live Monitor count increments — one e2e chain.
- Removed routes 404 (tasks, budgets, settlements, analytics deep pages) and are absent from
  middleware/nav/redirect tables.
