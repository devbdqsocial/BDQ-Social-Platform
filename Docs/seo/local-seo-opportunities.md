# Local SEO Opportunities — BDQ Social

_Phase 4. Target geography: Vadodara (Baroda) → Gujarat → India._

## Where we stand

**On-page location signals are strong; off-page local presence is zero.**

- "Vadodara" appears across metadata, copy, OG images, and now the two content hubs. `en_IN` locale,
  `Asia/Kolkata` dates. ✅
- **Organization/LocalBusiness schema** now asserts `{addressLocality: Vadodara, addressRegion:
  Gujarat, addressCountry: IN}` + `areaServed: [Vadodara, Baroda, Gujarat, India]`
  ([`src/lib/seo/jsonld.ts`](../../src/lib/seo/jsonld.ts)). ✅
- **Blocker:** [`src/lib/legal.ts`](../../src/lib/legal.ts) is all `[BRACKETED]` placeholders — no real
  entity name, phone, email, or street address. Schema correctly omits them, but that means **no
  complete NAP** (Name/Address/Phone) — the foundation of local SEO. ❌

## The decisive gaps (off-page, not in this repo)

1. **Google Business Profile** — does not exist. This is the single highest-leverage local asset and
   cannot be created from code. Needs real NAP + a verifiable address/venue. Without it, BDQ will not
   appear in the Map Pack or local "near me" results.
2. **NAP consistency / citations** — once NAP is real, list consistently on the directories that
   already own Vadodara event queries: **AllEvents.in, 10times, Insider/District, Eventbrite,
   EventsGram, BookMyStall, Justdial, Baroda.com**. These double as citations *and* referral traffic.
3. **No geo coordinates** on the Event model → Place schema is city-level only. Adding `lat`/`lng`
   (and a real venue address per event) sharpens local + event rich results.

## Recommendations

| Priority | Action | Owner |
|---|---|---|
| P0 | Fill `src/lib/legal.ts` with real entity/NAP; counsel review. Unlocks LocalBusiness + GBP. | Founder |
| P0 | Create + verify Google Business Profile for the brand/venue. | Founder |
| P1 | List the event on AllEvents.in, District, Insider, Eventbrite, BookMyStall, Justdial, Baroda.com with consistent NAP + link back. | Marketing |
| P1 | Per-event venue address + map link surfaced in copy and (P2) as Place `address`/`geo`. | Admin |
| P2 | Add `lat`/`lng` + structured venue address to `Event`; emit full PostalAddress + `geo` in Event schema. | Eng |
| P2 | Localised content hubs already target "in Vadodara" queries — keep expanding with neighbourhood/venue specifics. | Content |

## Honest read

Local SEO score is **~55/100 after this pass** (was ~35) and **capped there until the founder fills
NAP and creates a Google Business Profile**. Schema and copy can only assert location; they can't
substitute for a verified local entity and citations. The on-page work is done; the rest is founder/
marketing execution outside the codebase.
