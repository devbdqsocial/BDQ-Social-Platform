# Hero Redesign Plan — Landing `/` + Coming-Soon Gate

Direction: pure CSS/SVG atmosphere (no bitmaps, no 3D), reusing existing motion primitives. Keeps
Lighthouse ≥95, LCP <2.5s, CLS <0.1, strict CSP nonce, and the `prefers-reduced-motion` contract.

## The "living BDQ world" device (shared)
A self-contained, `aria-hidden`, CSS/SVG atmosphere built from layers, reused on both heroes:
1. **Glow field** — layered `radial-gradient`s (warm centre + cool edge fog) using section tokens.
2. **Lantern/firefly motes** — a handful of small absolutely-positioned dots with staggered
   `coming-float`-style drift + a soft `coming-glow` breathe. Box-shadow halo, no images.
3. **Depth** — wrap in existing [Parallax](../../src/components/motion/Parallax.tsx) (desktop,
   reduced-motion-safe) so the field drifts on scroll.
Reads as atmosphere even with all text removed. Zero network cost.

## Landing `/` hero — before/after
- **Before:** 2-col, left carries everything, right = flat `svg--form11` shape (`page.tsx:106-112`).
- **After:** rebalance to ~50/50 *visual* weight. Left column hierarchy tightened with intentional
  vertical rhythm (kicker → h1 → desc → date meta → countdown → CTA cluster). Right column replaced
  with the living-world device (glow + motes + parallax), framed by the existing `svg--form11` mask
  so it still feels branded but now breathes. The device also renders as a faint full-bleed layer
  behind the hero on mobile (where the right column was `hidden lg:block`) so small screens finally
  get atmosphere — kept very low opacity to protect text contrast (AA on navy).
- **Buttons:** keep `.btn`/`.btn--lg`. Wrap the primary CTA in
  [Magnetic](../../src/components/motion/Magnetic.tsx); add refined focus-visible ring + active
  press. Mark CTAs and the hero art with `data-cursor` for context-aware
  [Cursor](../../src/components/motion/Cursor.tsx) states.
- **CLS/LCP:** reserve a fixed aspect box for the art (no layout shift); art is pure CSS so LCP
  remains the h1 text. No blocking asset.

## Coming-soon gate — before/after
- **Before:** calm centered invitation, unused glow/float keyframes, dead 2.3MB bg PNG.
- **After:** keep the bone/gold serif invitation + light/dark toggle + form plumbing unchanged. Add
  the living-world device as a low-opacity layer inside the engraved frame (a few gold fireflies +
  breathing centre glow), wired to the existing `coming-glow`/`coming-float` keyframes. Choreograph
  the reveal stagger (ease the later delays). Magnetic submit arrow. Retire the unused PNG. AA holds
  in both themes (motes are decorative, `aria-hidden`).

## Motion direction
Slow, editorial, confident. Easing `cubic-bezier(0.22,1,0.36,1)`. Drift 7–9s loops, parallax
amount 8–12. No bounce on entrances (elastic only on the magnetic spring-back, which already exists).
All gated behind `prefers-reduced-motion: no-preference`.

## Responsive
- Landing: 50/50 at `lg+`; single column with faint behind-text atmosphere below `lg`. Cap hero
  content at an `xl` max-width to avoid ultra-wide sprawl.
- Coming-soon: unchanged centered column; motes scale/clip to the frame at all widths.

## Performance notes
No new dependencies. All atmosphere is CSS gradients + a dozen DOM nodes. GSAP (Parallax/Magnetic/
Cursor) is already loaded on these surfaces. Verify with Lighthouse (plain UA) post-change.

## Implementation order
1. Add `.bdq-world` atmosphere classes + mote keyframes to globals.css (reuse coming-glow/float).
2. Coming-soon gate: inject device + magnetic arrow + reveal choreography; delete PNG reference.
3. Landing hero: replace right column, rebalance, magnetic primary CTA, cursor hooks.
4. Verify build + Lighthouse + reduced-motion + smoke.
