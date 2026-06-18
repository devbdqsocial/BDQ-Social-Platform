# Internal Linking Plan — BDQ Social

_Phase 7. Link depth, authority flow, orphans, and the wiring done vs. recommended._

## Current graph (after this pass)

- **Global footer** ([`src/app/(public)/layout.tsx`](../../src/app/(public)/layout.tsx)) links Events,
  Brands, Map, Guide, About, Contact, legal — and now a **"Vadodara" column** to both content hubs. ✅
- **Header** (`PublicHeader`) — primary nav.
- **Home** → /events, /vendors (CTAs + brand carousel + sponsor marquee).
- **Event detail** → /vendors, /map; **Brand detail** → /vendors, /map, /events.
- **Content hubs** → /events, /vendors, /about, /guide (contextual links). ✅
- **Breadcrumbs** — JSON-LD on event + vendor detail; visible + JSON-LD on hubs. ✅

Everything important is **≤2 clicks from home**. No orphan public pages: every route is reachable via
header, footer, or contextual links, and listed in the sitemap.

## Authority flow

Home is the strongest internal node; it pushes equity to /events and /vendors well. The new hubs are
currently leaf-ish — they receive equity from the footer (site-wide) and pass it to /events + /vendors.

## Gaps & recommendations

| Priority | Action |
|---|---|
| P1 ✅ | Footer links to content hubs (site-wide equity). Done. |
| P1 ✅ | Hubs link out to /events + /vendors. Done. |
| P2 | **Reciprocal contextual links** from /events and /about into the hubs ("New to Vadodara? Things to do") so equity flows both ways, not just from footer. |
| P2 | **Related events / related brands** modules on detail pages (currently shows all brands, not "at this event"). Deepens crawl + dwell. |
| P2 | Link hubs to each other ("See also: night markets") for topical clustering. |
| P3 | When a blog/editorial section exists, build a hub-and-spoke cluster around each content hub. |

## Honest read

Internal linking is **healthy for a site this size** — shallow depth, no orphans, breadcrumbs in place.
The remaining items are optimizations (reciprocal + related-content links), not gaps. The real lever
is **external** links/citations (`competitor-gap-analysis.md`), which internal linking can't substitute.
