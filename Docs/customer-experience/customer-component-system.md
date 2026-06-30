# Customer Component System

Inventory + rules for customer-facing components. Reuse these; add new ones only when no existing
component fits.

## Navigation & chrome
- [PublicHeader](../../src/components/nav/PublicHeader.tsx) — transparent overlay header, logo,
  Tickets link, menu toggle, colour-syncs to section. Editorial, not SaaS.
- [MenuOverlay](../../src/components/nav/MenuOverlay.tsx) — full-screen menu.
- [CustomerTabBar](../../src/components/nav/CustomerTabBar.tsx) — mobile bottom tabs.
- Footer — in [(public)/layout.tsx](../../src/app/(public)/layout.tsx): brand + nav columns +
  `WordmarkWall` + "Let's talk" CTA, `bdq-night.paint`.

## Buttons
- `.btn` (angled tab, clip-path morph), `.btn--lg` (wide), `.btn--accent` (lavender/navy outside
  gama sections), `.qty-btn` (checkout stepper). Primary CTAs wrap in `Magnetic`.
- Rules: one primary per view; secondary as plain `.btn`; always focus-visible + active states.
- shadcn `Button` only for functional/admin-adjacent controls, never as the hero CTA.

## Content blocks
- `BdqPageHeader` (kicker + h1 + desc), `BdqEmpty` (empty state).
- `Reveal`/`SplitReveal` wrap headings/blocks. `Marquee` for tickers.
- Cards: branded mask (`.svg--form*`) + `.media-tint`/`.media-zoom`; `.card-hover` for lift.

## Domain components (keep, restyle within structure)
- Events: `TicketCheckout`, `StickyBuyBar`, `ScheduleTimeline`, `HappeningStrip`, `OffersClient`,
  `GalleryGrid`, `NotifyMe`, `LeadForm`.
- Tickets: `TicketCard`, `TicketReveal` (celebrate peak), `TicketShare`, `ArrivalGuide`.
- Map/Vendors: `BookingFloorPlan` (Konva, data layer — leave logic), `EventGuide`, `VendorDiscover`.
- Landing: `FestivalCompanion`, `PostEventMemories`, `BrandsCarousel`, `PinnedServices`,
  `PinnedConcepts`, `Countdown`.

## States
- Loading: `BdqLoading` variants (`grid|wide|list|detail|map`) via each route's `loading.tsx`.
- Empty: `BdqEmpty` (dashed border, centred message).
- Error: route `error.tsx` where present; keep tone on-brand, never raw stack.
- Success: component-scoped (`TicketReveal`).

## Atmosphere
- `FestivalScene` (flagship landing/coming-soon hero) + `.bdq-world` (ambient glow on event-detail
  hero, wallet ArrivalGuide) — CSS/SVG devices, see motion system. No bitmap hero art.

## Rules
- TypeScript strict, small named functions, DRY.
- No BDQ tokens or `.cs-*` classes in admin.
- Every new component respects the reduced-motion + AA contrast contract.
