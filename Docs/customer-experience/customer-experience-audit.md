# Customer Experience Audit

Scope: customer-facing surfaces only (landing, public, customer + vendor discovery). Admin / vendor
portal / ops / map designer explicitly excluded. Scores are 1–10, current state.

## Journey mapping (target emotional arc)
Anticipate → Desire → Commit → Celebrate → Attend → Experience → Remember → Return.

| Page | Emotional state | Notes |
|---|---|---|
| Coming-soon | Anticipate | Live gate. Calm, premium; under-utilises atmosphere. |
| Landing `/` | Desire | Strong RPA system; dead hero right side (see hero-audit). |
| Event detail | Desire → Commit | Information-led; needs desire-first framing. |
| Checkout | Commit | Functional; needs Stripe-grade trust polish. |
| Success / reveal | Celebrate | `TicketReveal` already a strong peak — keep, refine timing. |
| Wallet `/tickets` | Attend | Utility-correct; ticket card lacks desirability. |
| Map / Schedule / Offers / Guide | Experience | Reads as tools; reframe as festival companion. |
| Gallery | Remember | Grid present; lacks "relive" emotion. |
| Post-event / Vendors | Return | Memories + brand desire; mostly shipped, consistency pass. |

## Per-page scorecard (abbreviated dimensions)
Dimensions: Vis=Visual, Hi=Hierarchy, Mo=Motion, Lx=Luxury, St=Storytelling, Em=Emotional,
Mob=Mobile, Cv=Conversion. (Typography/colour are uniformly strong ≈9 via RPA system.)

| Page | Vis | Hi | Mo | Lx | St | Em | Mob | Cv |
|---|---|---|---|---|---|---|---|---|
| Coming-soon | 8 | 8 | 6 | 8 | 5 | 6 | 8 | 7 |
| Landing `/` | 7 | 7 | 7 | 8 | 5 | 5 | 6 | 7 |
| Event detail | 7 | 6 | 6 | 7 | 5 | 5 | 6 | 6 |
| Checkout | 6 | 6 | 4 | 6 | 4 | 5 | 6 | 6 |
| Wallet | 7 | 7 | 5 | 7 | 5 | 6 | 7 | n/a |
| Map | 6 | 6 | 5 | 6 | 4 | 5 | 5 | n/a |
| Schedule | 6 | 6 | 4 | 6 | 5 | 5 | 6 | n/a |
| Offers | 6 | 6 | 5 | 6 | 5 | 5 | 6 | 6 |
| Gallery | 6 | 6 | 4 | 6 | 5 | 6 | 6 | n/a |
| Vendor discovery | 7 | 6 | 5 | 7 | 5 | 5 | 6 | 6 |
| Vendor detail | 6 | 6 | 4 | 6 | 5 | 5 | 6 | 6 |
| Live mode | 7 | 7 | 6 | 7 | 6 | 6 | 7 | n/a |
| Post-event | 7 | 7 | 6 | 7 | 6 | 7 | 7 | n/a |
| Nav / footer | 7 | 7 | 6 | 7 | 5 | 5 | 7 | n/a |

## Cross-cutting flags
- **Admin-UI leak:** checkout / wallet lean on functional shadcn patterns where RPA `.btn`, kicker,
  and type scale would feel more on-brand. Flag, not a defect.
- **Generic:** map/schedule/offers read as data tools rather than festival exploration.
- **Unfinished feel:** motion is uneven — some surfaces have rich `Reveal`/`Marquee` choreography,
  others none. Motion system (below) standardises this.
- **Confusing:** none blocking; hierarchy compression on a few mobile heroes.
- **Consistent strengths:** typography, colour, loading skeletons (`RpaLoading`), nav/footer frame.

## Final scorecard (post Phase 1-4)
Note: the "After" column is a self-assessed estimate from a code read, not a measured result — a
live Lighthouse/axe run and a 320→ultra-wide breakpoint sweep are still outstanding (see end).
Changes applied this pass (presentation-only; no backend/money/webhook touched):
- New CSS/SVG atmosphere (reduced-motion static, no bitmap): `FestivalScene` carries the **landing +
  coming-soon** hero right side (moon/string-lights/lanterns/silhouette); the lighter `.bdq-world`
  glow+motes device is ambient on the **event-detail hero** and the **wallet ArrivalGuide**.
  Together they resolve the "dead right side" + flat-atmosphere findings.
- Landing hero rebalanced (content `z-10`, mobile atmosphere layer), dead `svg--form11` blob replaced.
- Editorial `SplitReveal`/`Reveal` motion brought to offers, gallery, map, schedule, vendor-detail
  headers (were static) — consistency lift.
- Magnetic primary CTAs (landing, event-detail, checkout buy, vendor-detail, footer "Let's talk");
  `link-underline` on header Tickets; `.media-zoom` hover on vendor + product cards.
- Coming-soon: magnetic submit arrow, eased closing reveal, retired the unused 2.3MB bg PNG.

| Category | Before | After |
|---|---|---|
| Typography | 9 | 10 |
| Colour palette | 9 | 10 |
| Layout balance | 5 | 9 |
| Visual storytelling | 4 | 9 |
| Emotional impact | 5 | 9 |
| Premium feel | 8 | 10 |
| Right-side utilization | 3 | 9 |
| Interaction quality | 5 | 9 |
| Responsiveness | 7 | 9 |
| Performance | 9 | 9 (no regression — CSS/SVG only, no new deps) |

Remaining to reach a verified 10/10: live Lighthouse/axe run once the dev server is free for a
production build, plus a manual breakpoint sweep (320–1920 + ultra-wide). Verified this pass:
`tsc` + `eslint` clean; all customer routes compile and return 200 under Turbopack.
