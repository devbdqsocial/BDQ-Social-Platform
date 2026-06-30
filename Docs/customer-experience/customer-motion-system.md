# Customer Motion System

Built on the existing motion primitives in [src/components/motion/](../../src/components/motion/) and
keyframes in [globals.css](../../src/app/globals.css). One vocabulary, applied consistently.

## Principles
Slow, editorial, confident. Motion clarifies hierarchy and adds atmosphere — never decorates for its
own sake. **Every effect is gated behind `prefers-reduced-motion: no-preference`** and must read
correctly static.

## Easing & timing
- Primary easing: `cubic-bezier(0.22, 1, 0.36, 1)` (the existing `cs-rise`/`cs-draw` curve).
- Entrances: 0.6–1.1s, staggered. Atmosphere loops: 7–9s. Parallax: amount 8–12, scrub.
- Elastic/bounce **only** on magnetic spring-back (`Magnetic` leave). Never on entrances.

## Primitives (reuse, don't reinvent)
| Primitive | Use |
|---|---|
| `Reveal` | Body/blocks fade-up on enter; `stagger`/`delay` for rhythm. |
| `SplitReveal` (`mode="chars"`) | Headlines. |
| `Parallax` (amount) | Scroll-scrubbed depth; desktop + reduced-motion-safe; not on `/map`. |
| `Magnetic` | Primary CTAs and hero interactive moments. |
| `Marquee` | Fact tickers, sponsor/brand loops. |
| `Cursor` (`#mouse`) | Sitewide custom cursor; `data-cursor="view"` etc. for context states. |
| `SectionColorSync` | Header colour follows section. |
| `SmoothScroll` (Lenis) | Page scroll feel; excluded on `/map`. |

## Atmosphere devices (CSS/SVG, no bitmaps)
Two related devices ship; both are `aria-hidden` and fully static under reduced motion:
- **`FestivalScene`** (`src/components/motion/FestivalScene.tsx`) — the bold, high-contrast
  night-market hero panel (moon, string lights, lanterns, venue silhouette, fog) with pointer
  parallax via `--px/--py`. This is the flagship **landing + coming-soon** hero right side
  (`tone="night"` / `tone="gold"`). Replaced the old dead `svg--form11` blob.
- **`.bdq-world`** (`BdqWorld`) — the lighter "living world" glow + drifting `coming-float`/
  `coming-glow` motes, low opacity behind text (AA protected). Used as ambient atmosphere on the
  **event-detail hero** and the **wallet ArrivalGuide**, not the flagship heroes.

## Micro-interactions
- Buttons: clip-path morph (`.btn`) + magnetic pull + focus-visible ring + active press.
- Links: `.link-underline` wipe-in.
- Cards: `.card-hover` lift (reduced-motion disables transform).
- Loading: `.skeleton` shimmer via `BdqLoading`.
- Success/error: scoped to component (`TicketReveal` for the celebrate peak).

## Reduced-motion contract
Global `@media (prefers-reduced-motion: reduce)` in globals.css neutralises animation/transition
durations and marquees. New animations must live under a `no-preference` guard so this holds.
