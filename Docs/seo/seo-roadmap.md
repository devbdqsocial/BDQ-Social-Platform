# SEO Roadmap, Scores & Verdict — BDQ Social

_Phase 10 + Success Criteria. Read `seo-audit.md`, `local-seo-opportunities.md`, `geo-audit.md`,
`competitor-gap-analysis.md`, `internal-linking-plan.md` for the detail behind this._

## What shipped in this pass (P0 + P1, branch `feature/coming-soon-cinematic`)

JSON-LD infrastructure + Organization/WebSite/Event/Offer/Breadcrumb/FAQ schema; enriched event &
page metadata + canonicals; completed sitemap; fixed image alt text; public breadcrumbs; two
SEO/GEO content hubs (`/things-to-do-in-vadodara`, `/night-markets-vadodara`, in `ALWAYS_PUBLIC` +
sitemap + footer); internal-link wiring. Build green, `tsc` clean, builder unit tests pass.

## Roadmap

### P0 — before launch (mostly founder, not code)
| Item | Impact | Difficulty | Owner |
|---|---|---|---|
| **Turn off `NEXT_PUBLIC_IS_COMING_SOON`**, verify in Google Search Console, submit sitemap | Critical | Low | Founder/Eng |
| **Fill `src/lib/legal.ts` NAP** (entity/address/phone/email) → unlocks LocalBusiness + GBP | Critical (local) | Low | Founder + counsel |
| **Create + verify Google Business Profile** | High (local) | Low | Founder |
| Owner-review the two content-hub drafts; finalize brand voice copy | High | Low | Owner |
| Validate live pages in Google Rich Results Test (Event/FAQ/Breadcrumb) | High | Low | Eng |
| _(Code shipped: schema, metadata, canonicals, sitemap, alt, hubs, breadcrumbs)_ | — | Done | — |

### P1 — first 30 days
| Item | Impact | Difficulty |
|---|---|---|
| List on AllEvents.in, District, Insider, Eventbrite, BookMyStall, Justdial, Baroda.com (citations + backlinks) | High | Med |
| Measure real Core Web Vitals (PSI/Search Console); fix top INP/LCP offender | High | Med |
| Expand hub copy + add FAQ depth; publish 1–2 more content pages (`geo-audit.md` table) | Med-High | Med |
| Social profiles + add `sameAs` to Organization schema | Med | Low |

### P2 — first 90 days
| Item | Impact | Difficulty |
|---|---|---|
| Add `lat`/`lng` + structured venue address to `Event`; emit full Place address + `geo` | Med | Med |
| Add event hero image field → real Event `image` (not just OG route) | Med | Med |
| Reciprocal + related-content internal links; related events/brands modules | Med | Med |
| ISR (60s) on `/events` + `/vendors` instead of force-dynamic (TTFB) | Med | Low |
| Host canonical redirect (www/non-www, trailing slash) | Low | Low |
| Earn local press / blog mentions (Vadodara lifestyle, Gujarat events) | High | High |

### P3 — long-term
Editorial/blog cluster around each hub; per-edition recap pages (year-over-year content); review/
rating collection → AggregateRating schema (only when legitimate); sustained link building.

## Final scores (honest, deflated where unproven)

| Area | Before | After this pass | Ceiling w/o off-page work | Notes |
|---|---:|---:|---:|---|
| Technical SEO | 68 | **88** | 92 | Strong base + schema/canonicals. |
| Local SEO | 35 | **55** | 55 | **Capped** until NAP + GBP (founder). |
| Event SEO | 30 | **85** | 90 | Full Event/Offer schema; needs geo + hero image. |
| Content SEO | 25 | **45** | 60 | Hubs are drafts; one event/year limits velocity. |
| AI Search / GEO | 20 | **62** | 75 | Best near-term channel; needs external corroboration. |
| Core Web Vitals | ~70 est. | ~70 est. | — | **Unmeasured** — site gated; measure post-launch. |
| **Overall SEO readiness** | **38** | **68** | ~72 | On-page strong; gated by off-page + pre-launch. |

## The brutal-honest verdict

> **Can BDQ Social realistically rank #1 for high-intent event searches in Vadodara?**

**Partly — and only after launch. Here is the unvarnished answer, by query type:**

- ✅ **Branded** ("BDQ Social", "BDQ Social Vadodara") — **yes**, quickly, once the site is launched
  and indexed. Nothing else competes for the name.
- ✅ **Curated/premium long-tail** ("curated night market Vadodara", "premium lifestyle festival
  Vadodara") — **realistic within a few months** with the schema + hubs shipped here, a GBP, and a
  handful of listings/links. Low competition, high relevance.
- ❌ **High-volume head terms** ("things to do in Vadodara", "events in Vadodara", "flea market
  Vadodara") — **not #1 in the short term, and not from code.** These are owned by high-authority
  aggregators (AllEvents.in, 10times, Eventbrite, Insider/District) and the multi-city rival The
  White Flea. A brand-new, single-event-a-year domain with **zero backlinks and no domain authority**
  cannot displace them in under 6–12 months without sustained content + link building + listings.
- 🟡 **AI engines (ChatGPT/Gemini/Claude/Perplexity/AI Overviews)** — **the strongest near-term
  opportunity.** Less authority-gated and now well-fed by our Event/FAQ/Organization schema and hubs.
  But models won't confidently cite an entity with **no external footprint** — needs launch + listings
  + press first.

### What specifically prevents #1 today (none are on-page; the code is now competitive)
1. **Pre-launch / coming-soon gated** — not indexable at all (blocker #0).
2. **Zero domain authority / zero backlinks** — brand-new domain.
3. **Placeholder NAP, no Google Business Profile** — no verified local entity.
4. **Thin content + low velocity** — one event a year; ~15 pages vs. aggregators' thousands.
5. **No external corroboration** for AI engines.

**Bottom line:** the on-page/technical SEO is now genuinely strong (top quartile for a new brand) and
no longer the bottleneck. Ranking #1 for the lucrative head terms is an **off-page, post-launch,
multi-month authority problem** — launch, fill NAP, create a GBP, get listed everywhere, and win AI
citations. Do that and #1 for branded + curated/premium terms is very achievable; head terms are a
6–12 month campaign, not a code change.
