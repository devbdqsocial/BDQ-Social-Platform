# Customer Design System

Codifies the **existing** BDQ token layer in [globals.css](../../src/app/globals.css). Do not invent
new tokens — these are the rules for using what exists. Customer-facing surfaces only.

## Colour
- Brand: navy `--dark-blue #01065B`, lavender `--light-blue #868EFF`, green `#92FF73`,
  yellow `#D0F95F`, pink `#FF58AC`, red `#FF514D` (+ dark variants).
- Sections are colour-blocked via semantic `bdq-*` section classes + `.paint`. One
  block = one `--bgcolor`/`--color` pair. Never hand-pick hexes in JSX; use a BDQ section class + `.paint`.
- Neutral base: cream `#F4F2EC` on ink `#14141A` (the `.bdq` default).
- **Coming-soon exception:** bone/gold serif invitation tokens (`.cs-invite`), owner-approved.
- **Never** apply BDQ colours to the admin console (stays neutral OKLCH, no-purple).

## Typography
- Display: Exat-Bold (`.f-exat`, weight 700). Body: Inter (`.f-inter`).
- One fluid root `--fsize: clamp(0.875rem, 0.55rem + 0.9vw, 1.25rem)` on `.bdq`; everything scales
  in `em`. Use scale classes, not ad-hoc sizes: `.f-h235 .f-h133 .f-h100 .f-h76 .f-h60 .f-h42 .f-h32
  .f-paragraph .f-paragraph-small`.
- `.kicker` for uppercase tracked micro-labels above headings.
- Headlines use `SplitReveal mode="chars"`; body uses `Reveal`.

## Spacing & grid
- `em`-based scale: `--space-xs … --space-5xl`. Sections breathe with `py-[var(--space-5xl)]`
  (hero/feature) or `--space-4xl` (bands). `--grid-gap` between columns.
- `.wrapper` for horizontal page gutter. 12-col utilities `.col-1 … .col-12`.
- Every distance comes from a token. No arbitrary px gaps in new work.

## Page gutter & content widths (alignment system)
- **Gutter:** `--wrapper-padd: clamp(1.25rem, 5vw, 6rem)` — the responsive left/right page margin used
  by `.bdq .wrapper`, the header (`px-[var(--wrapper-padd)]`), and the 12-col math. One token →
  every page's edges align and breathe. Coming-soon mirrors it with `px-[clamp(1.25rem,5vw,6rem)]`.
- **Content widths (only two — never ad-hoc rem):** `--w-content: 72rem` for utility / lists /
  cards / stacked sections; `--w-prose: 64rem` for long-form reading (legal, guide). Use as
  `max-w-[var(--w-content)]` / `max-w-[var(--w-prose)]`.
- **Alignment is per design, not blanket-centered:** full-bleed bands (hero, card grids, marquees,
  closing CTAs) span gutter-to-gutter; content columns keep their intended alignment — left-aligned
  at the gutter (left edge lines up with logo + hero) unless the design centers them (`mx-auto`, e.g.
  the legal reading column). Pick a width token + the design-appropriate alignment; don't invent a
  new max-width.

## Section rules
- Each major section is one colour block, full-bleed, with a clear single job.
- Alternate gama families for rhythm (navy → pink → cream → dark-green → dark-red).
- `SectionColorSync` keeps the header colour in step with the active section.

## Imagery
- `.svg--form*` clip-path masks for branded shapes; `.media-tint` for section-tinted images;
  `.media-zoom` for hover scale. No raw rectangles for hero art.
- No heavy bitmaps on hero/LCP paths — prefer CSS/SVG atmosphere (`FestivalScene` for flagship
  heroes, `.bdq-world` for ambient glow; see motion system).

## Luxury rules
- Generous negative space; one focal point per viewport.
- Motion is slow and editorial (see customer-motion-system.md). Never bounce on entrances.
- Buttons are `.btn`/`.btn--lg` angled tabs; primary CTAs get `Magnetic`.
- Custom cursor (`#mouse`) sitewide on pointer-fine; `data-cursor` for context states.
- Accessibility is non-negotiable: AA contrast, visible focus, reduced-motion parity.
