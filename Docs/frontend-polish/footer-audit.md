# Footer System Audit

Status: audit and target rules. No footer code is changed here.

## Current Footer

Located in `src/app/(public)/layout.tsx`.

Current strengths:

| Strength | Why it works |
|---|---|
| Full-screen brand close | `min-h-[100svh]` gives the site a memorable ending. |
| RPA color section | Deep navy/lavender pair matches the public system. |
| Nav columns | Explore, Vadodara, Partners, Legal are useful groups. |
| Giant "Let's talk" CTA | Strong brand action and editorial feel. |
| Wordmark wall | Adds motion/brand atmosphere. |

Current issues:

| Priority | Issue | Evidence | Target |
|---|---|---|---|
| P0 | Remove "All sales are final" from footer. | Bottom legal line includes it. | Replace with neutral copyright/location/contact copy. |
| P0 | Remove `EN` language marker. | Bottom right includes `EN`. | Remove until real language selector exists. |
| P1 | Legal links can feel like a dump. | Five legal links in one column. | Group legal by customer/vendor if needed. |
| P1 | Footer height can become dead space on smaller content pages. | Full viewport footer with sparse bottom row. | Add intentional content or reduce at small breakpoints. |
| P1 | CTA/footer hierarchy can be more intentional. | Brand blurb, nav, wordmark, giant CTA, bottom line compete. | Clear reading order: brand -> nav -> CTA -> legal. |

## Information Architecture Target

| Group | Links |
|---|---|
| Explore | Events, Vendors, Map, Schedule, Offers, Guide. |
| For guests | Tickets, Gallery, Things to do in Vadodara, Night markets in Vadodara. |
| For partners | Sell with us, Vendor sign in, Contact. |
| Company | About, Contact, Instagram. |
| Legal | Privacy, Terms, Refunds, Shipping, Vendor terms. |

## Brand Close Target

The footer should feel like:

1. A final brand scene.
2. A useful navigation safety net.
3. A clear contact handoff.
4. A clean legal close.

It should not feel like:

1. A leftover legal disclaimer.
2. A language selector placeholder.
3. A place where every possible link is equal.

## Footer Responsive Rules

| Breakpoint | Rule |
|---|---|
| 320-430 | Stack brand, nav, CTA, legal. Remove excessive height if content overflows awkwardly. |
| 768 | Two-column nav groups allowed. CTA remains large but not oversized. |
| 1024+ | Full brand close can use wide spacing and wordmark motion. |
| Ultra-wide | Cap nav/readable text; do not stretch columns too far apart. |

## Future Implementation Direction

1. Remove "All sales are final" from footer bottom.
2. Remove `EN`.
3. Replace bottom row with copyright, location, and contact/social.
4. Rebalance nav groups.
5. Add footer color/contrast and cursor tests.
6. Only then consider RPA-inspired footer shape/morph animation.
