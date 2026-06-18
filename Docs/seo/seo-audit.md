# SEO Audit — BDQ Social

_Phases 1–3 + 8. Grounded in code as of branch `feature/coming-soon-cinematic` (2026-06-18). Items
marked ✅ were implemented in this pass (P0/P1); ⚠️ / ❌ remain open and appear in `seo-roadmap.md`._

## 0. The one fact that overrides everything

The site is **pre-launch and gated**. [`src/middleware.ts`](../../src/middleware.ts) rewrites every
public route to `/coming-soon` when `NEXT_PUBLIC_IS_COMING_SOON=true` in production. While that flag
is on, only the legal/contact pages in `ALWAYS_PUBLIC` are crawlable — **no events, brands, or content
hubs are indexable, and nothing can rank.** Every score below is "potential once launched". Launching
(flag off) + verifying in Google Search Console + submitting the sitemap is **blocker #0**.

## 1. Route & crawl inventory

| Surface | Route | Indexable | Rendering |
|---|---|---|---|
| Home | `/` | yes | ISR 300s |
| Events list | `/events` | yes | force-dynamic |
| Event detail | `/events/[slug]` | yes (PUBLISHED/LIVE only; else 404) | force-dynamic |
| Brands list | `/vendors` | yes | force-dynamic |
| Brand detail | `/vendors/[id]` | yes | force-dynamic |
| Map / Guide / Gallery / Offers / Schedule | `/map` `/guide` `/gallery` `/offers` `/schedule` | yes | force-dynamic |
| About / Contact | `/about` `/contact` | yes | static |
| Content hubs ✅ | `/things-to-do-in-vadodara`, `/night-markets-vadodara` | yes | static |
| Legal/policy | `/privacy` `/terms` `/refunds` `/shipping` `/vendor-*` | yes | static |
| Admin / Vendor zones | `/admin/*` `/vendor/*` | **blocked** in `robots.ts` + subdomain-gated | — |

Robots ([`src/app/robots.ts`](../../src/app/robots.ts)) allows `/`, disallows `/admin`, `/vendor`,
`/api`, links the sitemap. Correct. Sitemap ([`src/app/sitemap.ts`](../../src/app/sitemap.ts)) is
dynamic (1h ISR), enumerates published events + approved vendors, falls back to static URLs on DB
error. ✅ Expanded this pass to include guide/schedule/offers/gallery + both content hubs.

## 2. Technical SEO verification

| Check | Status | Notes |
|---|---|---|
| Title tags | ✅ | Root template `%s · BDQ Social`; per-page titles, now keyword-aware on thin pages. |
| Meta descriptions | ✅ | Root + all public pages. Event detail now generates one (was title-only). |
| Canonical URLs | ✅ | `alternates.canonical` added to home, events, event detail, vendors, vendor detail, thin pages, hubs. Resolves subdomain-rewrite duplicate-content risk. |
| Open Graph | ✅ | Root + event detail + vendor detail. `og:image` auto-resolves from colocated `opengraph-image.tsx`. |
| Twitter cards | ✅ | `summary_large_image` site-wide; per-entity on detail pages. |
| **JSON-LD / Schema.org** | ✅ **(was the #1 gap — zero existed)** | See §3. |
| Breadcrumbs | ✅ | BreadcrumbList JSON-LD on event + vendor detail; visible + schema on content hubs ([`src/components/public/Breadcrumbs.tsx`](../../src/components/public/Breadcrumbs.tsx)). |
| Image SEO | ✅ | Vendor product images had `alt=""` → now descriptive. next/image used. |
| OG image generation | ✅ (pre-existing) | Site default + dynamic per-event (name/date/location) via `next/og`. |
| robots.txt / sitemap.xml | ✅ | Both bypass middleware (matcher excludes them). |
| metadataBase | ✅ (pre-existing) | Env-derived; absolute URLs resolve. |
| Mobile-first / viewport | ✅ | Responsive RPA layout, theme-color set. |
| JS rendering for bots | ✅ (pre-existing) | `htmlLimitedBots: /./` in `next.config.ts` forces full `<head>` metadata for all UAs. |
| CSP vs crawlability | ✅ | Strict nonce CSP doesn't block Googlebot. JSON-LD is a non-executable data block → no nonce needed (see [`JsonLd.tsx`](../../src/components/seo/JsonLd.tsx)). |
| hreflang | n/a | Single locale `en-IN`. Not needed. |
| 404 handling | ✅ | `notFound()` on missing/unpublished events + vendors. |
| Trailing slash / www | ⚠️ | No explicit normalization; low risk on Vercel. Recommend a host canonical redirect (P2). |

## 3. Structured data (implemented this pass)

Builders: [`src/lib/seo/jsonld.ts`](../../src/lib/seo/jsonld.ts) (pure, unit-tested in
`jsonld.test.ts`). Renderer: [`src/components/seo/JsonLd.tsx`](../../src/components/seo/JsonLd.tsx).

- **Organization + WebSite** — site-wide via the public layout. `@id`-linked. Address degrades to
  `{Vadodara, Gujarat, IN}`; `legalName`/`email`/`telephone` are **omitted** while `LEGAL` holds
  `[BRACKETED]` placeholders (never leaked into schema).
- **Event** — on `/events/[slug]`: name, ISO start/end, `EventScheduled`, `OfflineEventAttendanceMode`,
  Place (coarse address), `image` (per-event OG route), `organizer` (→ Organization `@id`),
  `offers[]` from TicketType (**price = paise/100, INR**, InStock/SoldOut), `performer[]` from schedule.
- **BreadcrumbList** — event + vendor detail + hubs.
- **FAQPage** — home (4 FAQs, single-sourced) + both content hubs.
- **Not emitted:** Review / AggregateRating — no legitimate reviews exist; fabricating them violates
  Google's guidelines. Add only when real ratings exist.

### Event-schema readiness gaps (data model)
`prisma/schema.prisma` `Event` has **no geo coordinates** (`location` is free text, `mapLink` an
unparsed URL) and **no image field** (we reuse the OG route). Adding `lat`/`lng` + a hero image would
strengthen the Place + Event schema (P2).

## 8. Core Web Vitals — **estimate only (unmeasured)**

The site is gated, so no Lighthouse run against a live URL was possible. This is a code-informed
estimate, **not a measurement** — re-score against field data in Search Console / PageSpeed after launch.

- **Positives:** `next/font` with `display:swap`; home is ISR; content hubs are static; `next/image`;
  lean `next/og` images.
- **Risks:** every public route except home/hubs is `force-dynamic` (TTFB exposure on cold Neon);
  heavy client motion (`Reveal`, `SplitReveal`, `Parallax`, `Marquee`, `WordmarkWall`, react-konva
  map) can hurt **INP/LCP/CLS** on mid-range Android; full-viewport hero sections.
- **Actions (P1/P2):** measure real LCP/CLS/INP; lazy-load below-fold motion; consider ISR on
  `/events` and `/vendors` (currently force-dynamic for freshness — evaluate 60s ISR instead).

## Scores (see `seo-roadmap.md` for the full table + verdict)

| Area | Before | After this pass | Ceiling without off-page work |
|---|---|---|---|
| Technical SEO | 68 | **88** | 92 |
| Event SEO | 30 | **85** | 90 |
| Core Web Vitals | ~70 (est.) | ~70 (est.) | needs measurement |

Local, Content, and AI-Search scores: see `local-seo-opportunities.md`, `geo-audit.md`,
`seo-roadmap.md`.
