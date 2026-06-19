# Customer Experience Roadmap

## Related master frontend audit

The broader frontend polish audit now lives in [../frontend-polish/README.md](../frontend-polish/README.md).
Use that folder for platform-wide typography, alignment, spacing, header, footer, cursor, shape,
responsive, UX friction, and consistency planning across public, customer, vendor, and admin surfaces.

Phased execution. Customer-facing only. Each Phase-3 page is its own commit on the feature branch.

## Phase 0 — Docs (this folder) — DONE
hero-audit, hero-redesign-plan, customer-experience-audit, customer-design-system,
customer-motion-system, customer-component-system, customer-roadmap.

## Phase 1 — Coming-soon gate (live face)
Add `.bdq-world` atmosphere inside the engraved frame, choreograph reveal, magnetic submit arrow,
retire the unused 2.3MB PNG. No backend change. KEEP aesthetic + form plumbing.

## Phase 2 — Landing `/` hero (gate-lift face)
Rebalance 50/50, replace the dead `svg--form11` right column with `.bdq-world`, magnetic primary CTA,
cursor hooks, mobile atmosphere layer.

## Phase 3 — Customer ecosystem (sequenced by journey)
| Order | Page | Disposition | Focus |
|---|---|---|---|
| 1 | Event detail `/events/[slug]` | REDESIGN | Desire-first hero, ticket hierarchy, sticky buy. |
| 2 | Checkout (`TicketCheckout`) | REDESIGN | Stripe-grade trust/clarity; no payment-logic change. |
| 3 | Success (`TicketReveal`) | KEEP/polish | Refine the celebrate peak timing. |
| 4 | Wallet `/tickets` | REDESIGN | Ticket-card desirability, countdown, arrival anticipation. |
| 5 | Map `/map` | REDESIGN | "Festival exploration" framing; keep Konva data layer. |
| 6 | Schedule `/schedule` | REDESIGN | Now/Next clarity, mobile timeline. |
| 7 | Offers `/offers` | REDESIGN | Urgency + discovery + redemption. |
| 8 | Gallery `/gallery` | REDESIGN | "Relive the event" emotion, performant grid. |
| 9 | Vendors `/vendors` + `/vendors/[id]` | REDESIGN | Brands desirable; storytelling over listing. |
| 10 | Nav / footer | REDESIGN | Editorial luxury chrome, hover/spacing. |
| 11 | Live + Post-event | KEEP/polish | Consistency pass on shipped companion/memories. |

## Phase 4 — Cross-cutting polish
Micro-interactions audit; mobile-first sweep (320/375/390/430/768/1024/1440/1920 + ultra-wide);
sitewide cursor context states; final 10/10 scorecard appended to customer-experience-audit.md.

## Status (this pass) — Phases 0-4 applied
DONE: Phase 0 docs · Phase 1 coming-soon · Phase 2 landing hero · Phase 3 (event detail, checkout,
success-reveal timing, wallet ArrivalGuide, map/schedule/offers/gallery headers, vendor discovery +
detail, nav/footer) · Phase 4 (magnetic CTAs, media-zoom, editorial reveals, scorecard).
KEEP (already premium, untouched to avoid regressions): ScheduleTimeline Now/Next, GalleryGrid
lightbox, OffersClient redemption, TicketCard flip, FestivalCompanion + PostEventMemories.
OUTSTANDING (needs dev server free / browser): production `next build`, live Lighthouse + axe,
manual breakpoint sweep.

## Guardrails (every phase)
- No changes to admin/vendor/ops surfaces or money/webhook logic.
- `npm run build` green; Lighthouse ≥95 / LCP <2.5 / CLS <0.1; axe pass; smoke test green.
- Reduced-motion + AA parity preserved.
