# Happening Strip Architecture (R6.3)

The event "heartbeat" — a lightweight, glanceable, swipeable row that makes the festival feel alive:
*what's on now, what starts next, what offer is worth checking.* Built customer + admin together (no
dead controls), unlocking the `strip:<eventId>` surface deferred in R5.4 §6.4.

## Data model

One new additive table (no drops):

```
HappeningItem { id, eventId, kind: HappeningKind, emoji?, title (≤80), detail?, href?,
                priority (weight), startsAt?, endsAt?, published, archived, timestamps }
enum HappeningKind { LIVE_NOW STARTING_SOON OFFER ANNOUNCEMENT SPONSOR ACTIVITY WORKSHOP PERFORMANCE FACILITY }
```

`HappeningItem` holds only the **manual** items (announcements, sponsor, facility, activities). The
schedule and offers are **not** copied in — they're merged at read time (below), so there's no
duplicate manual entry. Migration `20260616000000_happening_item` applied **local + prod**.

## The merge — `getHappeningStrip(eventId, now)`

Three sources → one sorted list (`src/server/content/happening.ts`):

1. **Manual** `HappeningItem`s — `published && !archived`, inside `[startsAt, endsAt]` (auto-hide).
2. **Schedule** `ScheduleItem`s — running now → **LIVE_NOW**; starting within 30 min → **STARTING_SOON**
   (with a "starts in N min" detail). Items further out are omitted.
3. **Offers** — `PUBLISHED` and `offerPhase === "live"` → **OFFER**.

Shared kind metadata (emoji / rank / label / accent) lives in `src/lib/happening.ts` (pure) so the
client + server agree.

## Priority logic

Sort by **kind rank** then **manual weight** (desc):

`LIVE_NOW (0) → STARTING_SOON (1) → OFFER (2) → ANNOUNCEMENT (3) → PERFORMANCE/WORKSHOP/ACTIVITY (4) →
SPONSOR (5) → FACILITY (6)`. Within a kind, higher `priority` shows first. Capped at 14 items.

## Visibility logic

- **Window:** an item appears only between its `startsAt` and `endsAt` (either nullable). Query-time
  filter ⇒ **no stale content**, no expiry cron needed.
- **Home mode** (`getHomeMode`): the home renders the strip when mode is **PRE or LIVE**, **hidden in
  POST**. PRE naturally shows fewer items (nothing is "running"), so it self-minimises. LIVE labels it
  "Happening now" and turns on the 60s refresh.

## Scheduling rules

Admin (`/admin/content/happening`, RBAC `content`) can Create / Edit / Publish / Unpublish / Archive,
set a **weight**, and a **Show-from / Hide-after** window. Live-now / Starting-soon / Offers are
flagged "(auto-sourced)" so the team doesn't double-enter them.

## Performance strategy

- **SSR-seeded** on the home (within its 5-min ISR), so first paint has the strip with **zero client
  fetch**.
- **Refresh only when live:** the client polls `GET /api/happening/[eventId]` every **60 s** *only*
  when the event is LIVE (short CDN cache, `s-maxage=30`). PRE/POST never poll. No realtime infra, no
  websockets, no spam.
- Pure CSS horizontal scroll-snap (no JS scroller), `content` analytics fire-and-forget. Lighthouse
  unaffected (a row of cards + one conditional interval).

## Analytics

`track()` → `/api/track`: `happening_view` (mount, with item count) and `happening_click`
(card tap, with kind + id). CTR / top items derive from these in the log stream.

## Design

Apple Live-Activities / Airbnb-Discovery feel — horizontal RPA cards, kind accent colour, a pulsing
dot on LIVE_NOW (reduced-motion safe), thumb-friendly snap. **Not** a news ticker / alert banner /
stock feed. Never modal, never a push.

## Future extensions

- **Mount on `/map`, `/schedule`, `/offers`** (the component is drop-in; home is wired first).
- **Map deep-links:** zone/stall `href` so "Acoustic at Main Lawn" pans the map (R4.1 `focusOn`).
- **Live activity sources:** check-in surges, "almost sold out", weather — additive merge functions.
- A real analytics provider behind `track()`; per-item CTR surfaced in the admin.

## Known limitations

- Home uses 5-min ISR for the initial strip; the 60s client poll covers LIVE freshness, but a
  brand-new PRE item can take up to 5 min to appear on a cold cache. Acceptable for PRE.
- Reorder is via a numeric **weight** (not drag-and-drop) — deliberate, no dnd dependency.
- Manual kinds can technically be set to LIVE_NOW/OFFER; the UI flags these as auto-sourced but
  doesn't hard-block (flexibility over rigidity).
