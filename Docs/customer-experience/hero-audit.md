# Hero Audit — Landing `/` + Coming-Soon Gate

Audit only. No redesign here. Two heroes are in scope: the landing home hero
([src/app/(public)/page.tsx:74-137](../../src/app/(public)/page.tsx)) and the live coming-soon gate
([src/app/coming-soon/ComingSoonClient.tsx](../../src/app/coming-soon/ComingSoonClient.tsx)).

## Why the landing hero feels left-heavy
The hero is a 2-col grid (`lg:grid-cols-2`). The left column carries kicker, h1, paragraph, date
meta, countdown, and CTAs — all the information, hierarchy, and attention. The right column
(`page.tsx:106-112`) is a single decorative `svg--form11 media-tint` shape with an empty `svg__bg`
inside. It carries no meaning, no motion of its own, no story. Result: ~75% of visual weight sits
left, ~25% right, and the right reads as filler. The eye lands left, scans the text, then hits dead
space. That is the core imbalance the brief names.

## Landing hero — issue inventory
- **Dead right column.** `svg--form11` is an abstract masked blob with `media-tint` over an empty
  `svg__bg`. No emotion, atmosphere, or desire. Highest-impact problem.
- **No visual storytelling.** Remove the text and nothing communicates "premium night market."
- **Static parallax only.** Right block has a `Parallax amount={10}` but nothing inside moves,
  glows, or breathes — the parallax is wasted on a flat shape.
- **CTA cluster is flat.** `.btn` tabs + a bare "from ₹X" span sit in one wrapped row; no magnetic
  pull, no clear primary/secondary weight, hover is a clip-path morph only.
- **Hierarchy compression on mobile.** Right column is `hidden lg:block`, so below `lg` the hero is
  text-only with no atmosphere at all — the most-trafficked breakpoint gets the weakest hero.
- **Bottom marquee competes.** The event-facts `Marquee` pinned to the hero bottom adds horizontal
  motion that fights the (currently static) right column for attention.

## Coming-soon gate — issue inventory
- **No right side by design.** Centered single column (`max-w-[40rem]`), so the brief's "right
  polygon" critique does not apply. But the centered composition is calm to the point of flat — the
  engraved frame + vignette is the only atmosphere, and the two defined keyframes (`coming-glow`,
  `coming-float`, globals.css:526-537) are unused.
- **Wasted asset.** `public/assets/coming-soon/coming-soon-bg.png` (2.3MB) is referenced nowhere —
  dead weight in the repo.
- **Reveal stagger is linear.** Eight `cs-reveal` delays (0s→0.7s) fade up uniformly; rhythm is
  even rather than choreographed.
- **Submit arrow is plain.** Opacity-hover only; no magnetic feel on the one interactive moment.

## Shared
- **Cursor inconsistency.** Landing runs the `#mouse` custom cursor; coming-soon uses the system
  cursor. The two public faces feel like different products.
- **Accessibility (both pass baseline).** AA contrast holds in both themes; animations already gate
  on `prefers-reduced-motion`. Keep this contract through the redesign.

## Scorecard (current → target)
| Category | Landing | Coming-soon | Target |
|---|---|---|---|
| Typography | 9 | 9 | 10 |
| Colour palette | 9 | 9 | 10 |
| Layout balance | 5 | 7 | 10 |
| Visual storytelling | 4 | 5 | 10 |
| Emotional impact | 5 | 6 | 10 |
| Premium feel | 8 | 8 | 10 |
| Right-side utilization | 3 | n/a | 10 |
| Interaction quality | 5 | 6 | 10 |
| Responsiveness | 7 | 8 | 10 |
| Performance | 9 | 9 | ≥9 (no regression) |
