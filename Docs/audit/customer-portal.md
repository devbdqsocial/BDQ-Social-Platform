# customer-portal.md — Festival Companion Specification

> Spec 10/15. The customer side stops being a ticket receipt and becomes the **festival
> companion** — BookMyShow-grade purchase + Coachella-app-grade event experience. Every screen
> below is fully specced: layout (mobile.md), components (design-system.md), data source, all
> states, exact copy. Owner-confirmed scope: Schedule · Map · Discover · Day-of live mode ·
> Guide · Offers · Gallery. (Favorites = V2.)

## 1. Principles

1. **The ticket is the center of gravity** — never more than one tap away.
2. **Real data or nothing** — every number, name, and status binds to the DB; no placeholders.
3. Pre-event the app sells; day-of it serves; post-event it re-engages. One home, three modes.
4. Anonymous users get everything except wallet/profile — discovery never demands login.

## 2. Information architecture

```
bdqsocial.com
├── /                  Landing (public, sells)
├── /events, /events/[slug], /vendors, /vendors/[id], /map, /schedule, /guide,
│   /offers, /gallery        ← public companion surfaces (no login wall)
├── /login                   Phone OTP
└── signed in:
    /home (alias /dashboard) · /tickets (wallet) · /profile
Tab bar (mobile): Home · Schedule · Map · Tickets
Header (desktop): Events · Schedule · Map · Discover · [Tickets] [avatar]
```

Companion pages are **public** (SEO + shareability); only wallet/profile require session.
All under the `.rpa` layer; data event-scoped to the active `PUBLISHED|LIVE` event
(`listPublished()[0]` — `src/server/events/service.ts`).

## 3. Screens

### 3.1 Home — `/home` (signed in) and the signed-out landing equivalent
Three time-based modes (server-decided, one `getHomeMode(event)`):
- **PRE** (default): `RpaPageHeader` ("Your evening, sorted" / user name when known) →
  next-event card (date countdown chip, venue, from-price, CTA "Get tickets" or "View tickets"
  when holding) → discover strip (6 brand cards, 1.2-peek carousel) → guide teaser row.
- **LIVE** (event day, `startsAt − 6h` → `endsAt + 2h`, and event status LIVE): layout flips —
  ticket QR card first (§3.2 card, expanded), now-playing strip (§3.3 query, auto-refresh 60s),
  shortcut row [Map] [Schedule] [Offers], gate info line from guide data.
- **POST** (`endsAt + 2h` → +14 days): "What a night." → gallery teaser (4 photos) → waitlist
  CTA "First to know about the next one" (`Waitlist source=PLATFORM` — reuses coming-soon
  action) → leads into V2 reviews later.
States: signed-out PRE shows login-nudge card after the event card ("Sign in to keep your
tickets handy"); no event published → coming-soon-style hold screen.

### 3.2 Wallet — `/tickets`
Data: `listUserTickets(session.userId)` (`server/tickets/service.ts:221`) + pre-generated QR
(performance.md §3.2).
- Ticket card (design-system §3.4): front = event name `f-h42`, type + date small, ADMIT-N
  `badge-rpa` ("ADMITS 5") when `admitCount > 1`, QR 96px right, status badge (Valid / Checked
  in / Expired-event). Tap = flip (delight.md §4): back = order id, holder phone, venue + gate
  line, "Share" + "Download" actions (delight.md §2 art), terms one-liner "All sales final".
- Pending state: order PAID-pending (payment captured client-side but webhook not landed):
  card renders skeleton QR + "Confirming payment — this takes under a minute." auto-refresh 5s,
  resolves when webhook/reconcile fulfils (failure-analysis #8).
- Empty: design-system §3.9 copy ("No tickets yet…"). Error: inline alert + retry.

### 3.3 Schedule — `/schedule`
Data: `ScheduleItem` by event (`@@index([eventId, startsAt])` exists) — query
`{ where: { eventId }, orderBy: { startsAt: "asc" } }`, grouped by `stageOrZone`.
- Layout: day pills (multi-day support) → vertical timeline: time rail left (`kicker`), item =
  title `f-h32`, performer + stage small; **NOW indicator**: lavender line + pulsing dot at
  current time (client-computed, 60s tick), `aria-live="polite"` "Now: <title>".
- Now/next chips at top during LIVE mode: `now = startsAt <= t < (endsAt ?? startsAt+45m)`,
  `next` = first item after `t` per stage.
- Empty: "Lineup drops soon — check back." Anonymous OK.

### 3.4 Map — `/map` (rebuilt, real data — owner-confirmed)
Data: `getEventWithStalls(activeEventId)` (`server/events/service.ts`) + `MapLayout.layoutJson`;
stall → booking → `VendorProfile.brandName/category` for BOOKED stalls.
- Konva canvas (lazy, reuses `BookingFloorPlan` rendering): infra labeled (stage, food court,
  entry, restrooms, water); BOOKED stalls show brand name at zoom ≥1.5; category color chips
  filter (Food / Shopping / Experience — from `productCategory`).
- Tap stall → bottom sheet: brand name `f-h42`, category kicker, description 2 lines, offer
  badge when an active Offer exists (§3.6), "View brand →".
- "List view" toggle = the accessible fallback (alphabetical, grouped by zone). No fake
  statuses ever; customer map shows **brands**, not availability (availability is vendor-side).
- **Layout v2 alignment (Gate 5):** this page consumes [map-system.md §11b](map-system.md) —
  zones render as named colored regions ("Luxury Lane", "Food Court"), gates/restrooms/water
  come from the layout's infra + ops sets, search covers brands + zones, and "navigate to" =
  zoom + 600 ms pulse + textual locator ("In Luxury Lane, near Gate 2 — 140 ft from the main
  entrance"; distances from the calibrated layout). GPS/you-are-here stays V2.
- Empty (layout not attached): venue-preview illustration + "Map goes live closer to the event."

### 3.5 Discover — `/vendors` (extended)
Data: `listApprovedVendors()` + assets, `productCategory`, active Offers join.
- Search field (client-filter ≤200 brands, no API) + category chips (counts bound to data) →
  brand cards (design-system §3.4) with offer badge overlay when active.
- Brand detail `/vendors/[id]`: hero logo/banner (Cloudinary transforms), description,
  category, instagram/website links (`rel="noopener"`), stall location chip ("Stall F-12 —
  see on map" deep-links `/map?stall=<id>`), active offers list, gallery imgs if assets exist.
- Empty search: "Nothing for '<q>' — try a category." Anonymous OK.

### 3.6 Offers — `/offers` (owner-confirmed; admin counterpart in admin-portal.md §6)
New model `Offer` (architecture.md update): `{ id, eventId, vendorProfileId?, sponsorId?,
title, terms, kind: DISCOUNT|FREEBIE|BUNDLE, startsAt, endsAt, status: DRAFT|PUBLISHED|ENDED,
maxRedemptions?, redeemedCount }`.
- List: offer cards — vendor logo, title `f-h42` ("10% off everything"), terms small, validity
  chip ("Tonight only" when endsAt = event day), CTA "Show at stall".
- "Show at stall" → full-screen redemption view: navy takeover, offer title `f-h60`, vendor
  name, **live clock** (staff anti-screenshot cue), "Staff: tap to mark used" long-press →
  `redeemedCount++` (no auth — soft control, terms say one per person; hard redemption = V2).
- States: none-published → page hidden from nav (server check); expired → card greys with
  "Ended".

### 3.7 Guide — `/guide` (owner-confirmed)
Content: admin-edited JSON in `SystemSetting` key `guide:<eventId>` (admin-portal.md §6.3) —
sections: Getting there (map link, parking), Timings (gates/last entry — bound to event
startsAt/endsAt), What to bring / house rules, Food & payments (UPI note), Accessibility,
Contact. Layout: anchor chip row → `f-h60` section heads → body lists. Static-cached (ISR 5m).

### 3.8 Gallery — `/gallery` (owner-confirmed)
New model `GalleryPhoto { id, eventId, url, publicId, caption?, sortOrder, published }`.
Masonry grid (mobile.md §3), full-screen swipe viewer (no lib — scroll-snap), lazy
`next/image` with Cloudinary transforms. Visible only when ≥8 published photos (avoid hollow
launch — failure-analysis empty-content risk). POST-mode home links here.

### 3.9 Profile — `/profile` (owner-confirmed)
Fields: name (required, 2-60), email (optional, validated — unlocks receipts/reminders copy
states this), phone read-only (identity). Server action through the standard pipeline;
audit not required (self-service). Delete-account = V2 (manual support note in privacy page).

### 3.10 Checkout (event detail module) — additions to the built flow
Coupon input (owner-confirmed): underline field + "Apply" → server validates via existing
`resolveCoupon` path (`/api/orders` already accepts `couponCode` —
`src/app/api/orders/route.ts:30`); success = green line "DIWALI10 applied — you save ₹200";
failure copy by code: COUPON_INVALID → "That code isn't valid for this event." Login wall:
inline OTP sheet on "Buy" when anonymous (no redirect — mobile.md §2.4); group note under
stepper when qty>1: "One QR admits your whole group." Post-payment → delight.md §1 reveal.

## 4. Cross-cutting states

| Situation | Behavior |
| --- | --- |
| No active event | Companion pages render hold states (§3.1); nav hides Schedule/Map/Offers |
| Event ends | LIVE → POST mode flip at `endsAt + 2h`; offers end; map stays 7 days |
| Session expired | Wallet/profile redirect `/login?next=…`; companion pages unaffected |
| Offline (PWA) | Wallet precached (sw.js): tickets render from cache with "Offline — QR still works" banner; companion pages show `/offline` fallback |
| Slow network | Route `loading.tsx` skeletons for wallet/schedule/map/discover (mobile-first skeletons mirror layout) |

## 5. Data & service map (no new backend concepts beyond the two models)

| Surface | Source |
| --- | --- |
| Home modes | `listPublished` + time windows (`getHomeMode` util, unit-tested) |
| Wallet | `listUserTickets` + stored QR data-URL |
| Schedule | `ScheduleItem` (exists) |
| Map | `getEventWithStalls` + `MapLayout` + booking→vendor join |
| Discover | `listApprovedVendors` (exists) |
| Offers | new `Offer` model + `server/offers/service.ts` |
| Guide | `SystemSetting` JSON |
| Gallery | new `GalleryPhoto` model |
| Profile | `User` (name/email) |

## 6. Verification

- e2e: anonymous → discover → brand → map deep-link → buy (coupon, group 5) → reveal → wallet
  flip → share. Day-of: clock-mocked LIVE mode flip + now-playing correctness. POST flip +
  waitlist CTA.
- Unit: `getHomeMode` windows; now/next resolution incl. open-ended items (`endsAt null`).
- Content gates: offers ≥1 published before nav shows; gallery ≥8; guide sections non-empty.
