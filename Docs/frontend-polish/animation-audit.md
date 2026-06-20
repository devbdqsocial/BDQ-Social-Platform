# Animation Audit

Status: reference-motion audit and implementation planning. No frontend code is changed by this document.

Reference studied: `reference/rpa/rpacomunicacion.com`

Visual captures created:

| Capture | What it shows |
|---|---|
| `artifacts/rpa-animation-audit/reference-home-initial.png` | RPA wall/preloader state: repeated wordmark rows, deep blue background, blurred depth rows. |
| `artifacts/rpa-animation-audit/reference-menu-open.png` | Post-loader hero state: fixed header, menu trigger, masked media object, section label. |
| `artifacts/rpa-animation-audit/reference-menu-hover.png` | Later hero animation state: polygon mask changes, image scale/crop changes, words shift around the media. |
| `artifacts/rpa-animation-audit/reference-scroll-state.png` | Large editorial text scroll state, header/section label persistence, overlay interruption risk. |
| `artifacts/rpa-animation-audit/reference-render-state.json` | Computed body/header/cursor state from the local Playwright render. |

Video captures created:

| Capture | What it shows |
|---|---|
| `artifacts/rpa-animation-audit/video/rpa-reference-motion-desktop-full.webm` | Desktop video pass served over local HTTP with mirrored CDN dependencies resolving. Covers preloader, hero cycle, cursor movement, menu open, menu hover, menu close, editorial scroll, and video section scroll. |
| `artifacts/rpa-animation-audit/video-frames-full/` | Key frames sampled from the video pass for review and documentation. |
| `artifacts/rpa-animation-audit/reference-motion-video-observations-full.json` | Browser-observed motion state during the video capture: GSAP availability, color classes, cursor style, menu visibility, and failed-response list. |

Render caveat: the first `file://` render blocked fonts and missed some animation dependencies. The final video pass serves the parent mirror folder at local HTTP so `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `unpkg.com`, fonts, GSAP, ScrollTrigger, SplitText, MorphSVG, Swup, Lenis, and Swiper resolve from the local mirror. The video pass still reports one mirrored-script parse warning, but dependency responses are not failing and the major animation systems are visible in motion.

Source files inspected:

| File | Purpose |
|---|---|
| `reference/rpa/rpacomunicacion.com/wp-content/themes/rpa2025/js/main53cf.js` | Cursor follow, section color sync, wall generation, page color changes, Swup page transitions. |
| `reference/rpa/rpacomunicacion.com/wp-content/themes/rpa2025/js/animations53cf.js` | Preloader, header hero morphs, pinned sections, service animations, footer entrance. |
| `reference/rpa/rpacomunicacion.com/wp-content/themes/rpa2025/js/clicks53cf.js` | Menu open/close, submenu interactions, modal motion. |
| `reference/rpa/rpacomunicacion.com/wp-content/themes/rpa2025/js/rollovers53cf.js` | Link, footer, menu, card, language, close-button hover timelines. |
| `reference/rpa/rpacomunicacion.com/wp-content/cache/wpfc-minified/ottebi7/9um5u.css` | Cursor, menu, header, shape, footer, and wall styling. |
| `src/components/motion/*` | Current BDQ motion implementation. |
| `src/components/nav/PublicHeader.tsx` and `src/components/nav/MenuOverlay.tsx` | Current BDQ public chrome and menu implementation. |
| `src/app/globals.css` | Current BDQ cursor, color, shape, wall, and motion CSS. |

## Executive Summary

The RPA reference succeeds because animation is treated as a system, not decoration. The major motion layers are coordinated:

1. The page has a living color state.
2. The header, logo, menu, footer label, and cursor react to that state.
3. Shapes are not static stickers. They morph, reveal media, and carry text.
4. The menu is a shaped object that opens, expands, and reveals content in sequence.
5. The cursor is always above the experience and changes size/state by interaction type.
6. Page transitions, loader, footer, and wall patterns use the same visual grammar.
7. Text reveals are masked and staggered, not generic fade-ins.
8. Scroll scenes have choreography: pinning, scrub, morph, color, image, and text states are connected.

BDQ already has a strong base:

- `Cursor`
- `PageLoader`
- `WordmarkWall`
- `SplitReveal`
- `Reveal`
- `Magnetic`
- `SectionColorSync`
- `PinnedServices`
- `Marquee`
- `FestivalScene`
- SVG shape masks in `MaskDefs`

The gap is orchestration. BDQ has several motion parts, but the reference uses a motion director mindset where chrome, cursor, colors, menu, text, shapes, and scroll scenes know about the same state.

## Video Pass Findings

The video pass changed the audit from "this looks animated" to "this is choreographed."

### Preloader Motion

Observed in video:

- The wordmark wall is already moving before the page content is accessible.
- Rows move in opposing horizontal directions, creating pressure and velocity.
- The central green form is the focal point, and it reads as a morphing object rather than a static badge.
- The wall is not decorative filler; it creates the brand's first visceral impression.

BDQ implication:

- `PageLoader` should keep the wordmark wall, but the enhanced version should add row intro/collapse depth and a stronger central shape moment.
- The loader should remain capped and skipped for automation/reduced motion.

### Hero Motion

Observed in video:

- The hero image is a living masked object.
- Word anchors shift around the image rather than staying in one text block.
- The shape, image, and text move as one composition.
- The color pair remains coherent while the internal hero state changes.

BDQ implication:

- The flagship BDQ hero should not be "animated text plus background." It should be a controlled composition with shape state, media state, text anchor, and color state.

### Menu Motion

Observed in video:

- The menu opens as a large shaped panel, not a flat full-screen sheet.
- The panel expands from the menu trigger into a giant irregular surface.
- The hamburger becomes a close mark inside the shaped panel.
- Primary links reveal in large type.
- Hovering a primary link changes the menu color from lavender to acid green.
- The active primary item gets a white arrow and white text treatment.
- Secondary links appear on the right.
- A preview image appears for the hovered group.
- Social and language elements stay outside/alongside the main shaped panel.

BDQ implication:

- Current `MenuOverlay` is accessible and stable, but visually far below the reference.
- The right upgrade is not just "add animation." It is a shaped menu surface plus hover preview system, after the cursor/header layer bugs are fixed.

### Color Choreography

Observed in video:

- The start state is deep blue with lavender.
- Menu hover switches to deep blue with acid green.
- Menu close returns to a red/orange palette.
- Editorial scroll moves into a red-on-maroon palette.
- Header/logo/menu/section label/cookie banner all follow the active color state.

BDQ implication:

- Section color cannot remain only a header-color probe.
- BDQ needs a motion color director that owns page color, header color, menu color, cursor color, section label, and overlay color.

### Editorial Scroll Motion

Observed in video:

- Large paragraph text becomes a scroll scene.
- Leading lines have high contrast while trailing lines fall back into lower contrast.
- The section feels editorial and cinematic without moving every word independently.

BDQ implication:

- Use this only for storytelling sections.
- Do not apply this behavior to forms, policies, checkout, wallet, admin, or vendor utility screens.

### Video Section Motion

Observed in video:

- The video section expands into a large immersive media plane.
- The header stays fixed and retinted.
- The cursor/interactive media icon remains visible.
- The cookie banner interrupts the premium composition.

BDQ implication:

- Full-bleed media can work well for event energy, but overlays must have a strict layering and interruption policy.
- Cookie/banner/toast/modal layers need to be tested together with cursor and header.

## Global Animation Scorecard

| Area | Current | Target | Gap |
|---|---:|---:|---|
| Motion identity | 7 | 10 | Strong RPA-inspired pieces exist, but not yet one authored choreography. |
| Loader / intro | 8 | 10 | BDQ has a wordmark loader; needs stronger wall collapse and shape morph continuity. |
| Page transitions | 5 | 9 | Current transition is simpler; reference has wall-based out/in transition. |
| Cursor system | 6 | 10 | Follow and hover exist; needs z-index fix, menu/media states, color switching, state icons. |
| Section color choreography | 6 | 10 | BDQ syncs header color; reference syncs body/main/header/menu/logo/labels with smoother state logic. |
| Menu animation | 5 | 10 | BDQ menu slides and staggers links; reference morphs shape, expands surface, animates lines, links, socials, language, previews. |
| Shape motion | 6 | 10 | BDQ has clip masks; needs timed morphs and section-specific shape variation. |
| Text reveal | 8 | 10 | SplitReveal is solid; needs stricter rules for when chars, lines, fades, and scroll text are used. |
| Scroll scenes | 7 | 10 | Pinned services exist; needs more choreographed color/shape/text/image changes. |
| Hover motion | 6 | 10 | Existing hover states are mixed; reference uses purposeful link arrows, card zooms, menu previews, footer morphs. |
| Footer motion | 4 | 9 | BDQ footer needs a closing motion moment, not just information architecture. |
| Overlay layering | 5 | 10 | Cursor/menu/cookie/banner layer rules need to be explicit and tested. |
| Reduced motion | 8 | 10 | Good foundation; every new motion package must keep static equivalents. |
| Performance discipline | 7 | 10 | GSAP use is mature; needs visual motion QA and continuous animation budget. |

## Reference Motion Inventory

### 1. Wordmark Wall And Preloader

Observed visually:

- Full viewport deep-blue field.
- Oversized repeated RPA word rows.
- Rows move horizontally in opposing directions.
- Lower rows blur, creating depth and speed.
- The wall does not feel like a background texture only. It is the entrance ritual.

Verified in source:

- `setWalls()` generates rows dynamically based on viewport and wall dimensions.
- `wallIntro_tl` brings rows in with vertical offset, blur, and stagger.
- `wallMov_tl` loops odd/even rows horizontally in opposite directions.
- `wallCollapse_tl` exits rows with horizontal movement, vertical collapse, blur, and stagger.
- `setAnimaPreloader()` adds a morphing SVG form and progress number.

BDQ current:

- `PageLoader` uses `WordmarkWall`, a central blob, and a counter.
- The wall rows animate with CSS marquee.
- The loader exits upward.

Gap:

- BDQ loader is good, but its wall is simpler and does not yet have row-by-row intro/collapse depth.
- The loader shape uses crossfade between masks, not true path morphing.
- The wall pattern is not yet reused as a transition or footer finale with the same authority.

Recommendation:

- Keep `WordmarkWall`, but add a GSAP-enhanced variant for loader and page transitions.
- Add row intro/collapse timeline with blur, alternating x direction, and reduced-motion static fallback.
- Keep CSS marquee for low-risk decorative use.

### 2. Hero Shape, Media, Text, And Color Cycle

Observed visually:

- The hero media sits inside a non-rectangular polygon mask.
- The mask changes between states.
- Words move to different anchor points around or inside the media.
- Image scale/crop changes with the mask.
- The page remains visually stable while the internal composition changes.

Verified in source:

- `setAnimaHeaderHome()` loops through SVG form paths.
- Each step calls `changePageColors(gama, bg)`.
- Text spans move to different top/left/bottom/right positions per step.
- Media layers crossfade.
- Character reveals happen after shape intro.

BDQ current:

- Hero uses `FestivalScene`, `SplitReveal`, and CTA motion.
- Shape masks exist.
- Current hero reads more like a designed layout with animation, not a living mask sequence.

Gap:

- BDQ does not yet have a hero sequence where shape, words, image, and colors are synchronized.
- Current hero text alignment and section spacing are audited separately, but motion should support that alignment rather than fight it.

Recommendation:

- Add a `HeroMotionSequence` concept for marketing hero sections.
- Use 3 to 5 BDQ-specific shape states.
- Define per-state text anchor rules: center for emotional punch, editorial-left for explanation, mixed only when media and text are one object.
- Tie hero states to section color tokens.

### 3. Page Color Choreography

Observed visually:

- Background and text colors shift smoothly.
- Header, menu, logo, and bottom section label stay readable on dark surfaces.
- The cursor remains color-reactive because of mix-blend mode.

Verified in source:

- `changePageColors(gama, bg)` animates CSS variables on `body` and `main` over `.75s`.
- `controlSections()` adds/removes color classes on logo, menu, and header using ScrollTrigger.
- Home section label text comes from `data-nameSection`.

BDQ current:

- `SectionColorSync` probes the section under the header and writes `--header-color`.
- Color classes exist in `globals.css`.

Gap:

- BDQ syncs mostly header color, not full page/chrome state.
- It needs explicit data attributes for complex image, gradient, footer, and menu backgrounds.
- It should animate color changes instead of only swapping values where possible.

Recommendation:

- Create a `MotionColorDirector`.
- It should manage `--page-color`, `--page-bg`, `--header-color`, `--menu-color`, `--cursor-color`, and `--section-label`.
- Add a route/section config for public pages.

### 4. Cursor Behavior

Observed visually and in computed state:

- Reference cursor sits at very high z-index: `99999999`.
- It uses `mix-blend-mode: difference`.
- It has a yellow inner color.
- It shrinks on normal links and expands for media/slider/video states.
- It can show slider/video icons.

Verified in source:

- `#mouse` has `pointer-events: none`, `will-change: transform`, and transitions for width, height, blend mode, and background color.
- GSAP `quickSetter` follows pointer with lerp speed around `.2`.
- `.expand_mouse--slider` and `.expand_mouse--video` reveal cursor icons.
- Cursor color-changing code exists as a commented idea for colored SVG hovers.

BDQ current:

- `Cursor` follows pointer with GSAP quick setters.
- It starts hidden until movement.
- It expands on hover and supports `data-cursor="view"`.
- Current CSS z-index is `100`, while header/menu are higher.

Gap:

- This directly explains the reported bug: cursor can go behind the menu.
- BDQ needs explicit menu-open, media, CTA, disabled, drag, and video states.
- Cursor should have the highest app interaction layer while keeping `pointer-events: none`.

Recommendation:

- Raise cursor to a named layer token above menu/header/overlay.
- Add `html[data-menu-open="true"] #mouse`.
- Add cursor state matrix:
  - default dot
  - link shrink or compact state
  - CTA pulse/expand
  - media view state
  - slider arrows state
  - video play state
  - menu-open high contrast state
  - disabled/static state
- Add visual tests with menu open and cursor over close/link/footer CTA.

### 5. Menu Opening Motion

Reference source behavior:

- Menu starts as a small shaped object.
- SVG path morphs from `#svg-form-menu-off` to `#svg-form-menu-on`.
- Surface expands to `81.5vw x 95svh` on desktop and `93vw x 97svh` on mobile.
- Header background width expands.
- Hamburger lines move, resize, rotate into X, and change gap.
- Primary links reveal by characters.
- Language and social links rise in.
- Submenus reveal on hover or mobile click.
- Menu preview images animate through clipped shapes.

BDQ current:

- `MenuOverlay` is full viewport and slides from top.
- Labels mask-rise on open.
- It has focus trap, Esc close, scroll lock, and inert behavior.

Gap:

- Current menu is accessible and functional, but not yet visually signature.
- It lacks the shaped-object origin, morphing surface, image preview, and cursor-aware state.
- It also needs the P0 cursor layering fix before any richness is added.

Recommendation:

- Keep current accessible overlay semantics.
- Wrap visual layer inside a morphing shape/surface.
- Add menu state to root HTML for cursor and header.
- Add optional preview column only on desktop.
- Keep mobile menu simpler, full height, safe-area aware.

### 6. Menu Hover Preview

Reference behavior:

- Hovering primary menu items opens preview images.
- Submenus reveal with masked character motion.
- Non-active previews reverse with delay.

BDQ current:

- Menu links only change color on hover.

Gap:

- The menu can become a brand storytelling surface, especially for Events, Brands, Map, About, Contact.

Recommendation:

- Add a desktop-only `MenuPreviewPanel`.
- Each primary link gets a masked preview:
  - Events: crowd/night market visual.
  - Brands: vendor/product collage.
  - Map: stylized layout.
  - About: team/mission texture.
  - Contact: abstract BDQ shape.
- Use opacity, clip-path, and transform.
- Do not load large images until menu opens.

### 7. Link And Button Hover Motion

Reference source behavior:

- `.link--split` animates arrow margin and character color in stagger.
- Close buttons animate line spans out/in rather than only rotate.
- Footer CTA morphs shape paths and swaps text anchor positions.
- Card media zooms to `1.3`.
- Team cards swap image layers.
- Language toggle morphs an SVG path.

BDQ current:

- Buttons use `btn` and hover text behavior.
- `Magnetic` exists.
- Some links use underline.
- Media zoom exists in CSS for `.media-zoom`.

Gap:

- Hover behavior is not yet standardized by role.
- Footer CTA hover is not yet a signature moment.
- Close/menu controls are not expressive yet.

Recommendation:

- Define hover roles:
  - Navigation link: underline or stagger color, no large movement.
  - Primary CTA: magnetic plus internal text/shape movement.
  - Media card: image zoom plus mask stability.
  - Menu link: preview image plus color/stagger.
  - Footer CTA: shape morph or wordmark wall activation.
  - Utility/admin control: restrained focus/hover only.

### 8. Scroll Scenes And Pinned Motion

Reference source behavior:

- ScrollTrigger pins large sections.
- Service sections move horizontally.
- Text, SVG forms, and media state shift while pinned.
- Some sections use scrubbed opacity and progress.
- Footer animation starts when entering the footer.

BDQ current:

- `PinnedServices` pins on desktop and degrades to stacked slides.
- `SplitReveal` and `Reveal` trigger on scroll.
- `SectionColorSync` changes header color.

Gap:

- BDQ has pinned content, but the motion states are not yet tied to shape/color/section label.
- Need more intentional mobile versions, since pinned desktop animation should not create cramped mobile layouts.

Recommendation:

- Add a scroll-scene spec per section before implementing:
  - Trigger
  - Pin yes/no
  - Scrub yes/no
  - Color state
  - Text reveal type
  - Shape state
  - Media state
  - Reduced-motion fallback

### 9. Footer Finale

Reference behavior:

- Footer uses wall animation.
- Footer CTA shape and text can morph on hover.
- Header/logo clipping is controlled near footer entry.
- Footer feels like a final scene, not a dumping ground.

BDQ current:

- Footer information architecture was audited.
- Wordmark wall exists.
- Footer CTA exists.

Gap:

- Footer needs a closing motion moment after copy/IA fixes.
- The footer should resolve the whole experience: brand, action, contact, legal, social.

Recommendation:

- Add a `FooterFinale` package:
  - Wordmark wall low-opacity entrance.
  - Large "Let's talk" CTA with shape hover.
  - Section color state for footer.
  - Cursor high-contrast state over CTA.
  - No continuous motion on reduced motion.

### 10. Cookie Banner And Overlay Interruption

Observed visually:

- The reference cookie banner interrupts a premium editorial scroll state.
- It overlaps major content and can dominate the composition.

BDQ implication:

- Cookie banner, checkout modals, menu overlays, toasts, command palette, and admin dialogs need one overlay contract.

Recommendation:

- Document z-index and overlay order:
  - base page
  - sticky CTA
  - header
  - menu/dialog/sheet
  - toast/banner
  - cursor
- Ensure banners do not hide primary CTAs or the menu close button.
- Cursor must remain visible over open menus and dialogs.

## Current BDQ Motion Inventory

| Component | What works | What to improve |
|---|---|---|
| `Cursor` | GSAP follow, hover state, pointer-fine only, reduced-motion off. | Raise layer, add menu/media/CTA states, add color switching, add QA. |
| `PageLoader` | Wordmark wall, counter, central blob, once-per-session, reduced-motion skip. | Add row collapse depth, stronger wall reuse, optional true morph. |
| `WordmarkWall` | Good reusable brand texture. | Add GSAP wall variant for loader/transition/footer. |
| `SectionColorSync` | Simple header color sync. | Expand to page/chrome state director with explicit section attributes. |
| `MenuOverlay` | Accessible, focus trap, Esc close, scroll lock, masked labels. | Add shaped visual surface, menu-open cursor state, preview images, safer mobile spacing. |
| `SplitReveal` | Good masked text reveal with lazy SplitText. | Add usage rules for chars vs lines vs editorial scroll text. |
| `Reveal` | General content entrance. | Keep out of utility/admin flows unless it clarifies state. |
| `PinnedServices` | Desktop pinned story with mobile fallback. | Add shape/color/text coordination and per-slide QA. |
| `Marquee` | Brand motion pattern. | Budget continuous motion and pause/disable where needed. |
| `FestivalScene` | Distinctive hero atmosphere. | Must not replace inspectable real imagery where users need to see products/people/places. |
| Public footer | CTA and wall potential. | Needs footer finale and hover motion. |
| Admin templates | Reduced motion support exists. | Keep operational motion restrained, fast, and consistent. |

## Element-By-Element Animation Recommendations

| Element | Recommended motion | Avoid |
|---|---|---|
| Header logo | Color-sync and subtle entrance only. | Constant motion or low-contrast blending. |
| Header menu button | Line width hover, morph to X on open, high contrast on all backgrounds. | Tiny hit area, hidden close state, cursor behind panel. |
| Full menu | Shape/surface expansion, link mask-rise, preview image reveal. | Large delays before links are usable. |
| Cursor | Highest non-clicking layer, stateful dot/expanded icon states. | Cursor under overlay, cursor blocking clicks, decorative cursor on touch. |
| Hero media | Masked media sequence with controlled shape changes. | Random shape repetition or crop that hides subject. |
| Hero text | Anchor changes only when it supports the composition. | Arbitrary center/left switching. |
| CTA buttons | Magnetic plus internal label/shape shift. | Excessive bounce on admin/utility actions. |
| Cards | Image zoom, mask stability, clear focus state. | Moving the card so much that grids feel unstable. |
| Editorial text | Line reveal, scroll fade only for storytelling sections. | Fading important instructions or form text. |
| Pinned sections | Color/shape/text states tied to slide progress. | Pinning on mobile when content becomes hard to read. |
| Footer | Wall entrance, CTA hover morph, color-state close. | Footer as animated clutter or hidden legal links. |
| Modals/dialogs | Quick opacity/scale, clear focus. | Long cinematic motion before task controls are usable. |
| Admin tables | Micro hover/focus and loading states. | Decorative marketing motion. |

## New Improvement Packages To Add

### A1. Reference Motion Director

- Goal: Create one source of truth for section animation state.
- Inputs: active section, route type, menu open, overlay open, reduced motion, pointer type.
- Outputs: page color, header color, cursor state, section label, active shape family.
- Files likely affected: `src/lib/motion.ts`, `src/components/motion/SectionColorSync.tsx`, `src/app/globals.css`, public layouts.
- Acceptance: Header, cursor, menu, section labels, and page colors all respond predictably.

### A2. Cursor State Matrix

- Goal: Fix the cursor bug and make cursor states intentional.
- States: default, link, CTA, media, slider, video, menu, disabled.
- Acceptance: Cursor visible over open menu and overlays, never blocks clicks, hidden on touch/reduced motion.

### A3. Morphing Menu Surface

- Goal: Move from full-screen slide panel to shaped menu surface while keeping accessibility.
- Motion: small menu object -> shaped expanded panel -> hamburger to X -> links rise -> preview panel appears.
- Acceptance: Keyboard use, focus trap, Esc close, mobile safe area, cursor visibility all pass.

### A4. Menu Preview System

- Goal: Add desktop storytelling previews for menu links.
- Motion: image clip/mask reveal, link hover color/stagger, submenu reveal if needed.
- Acceptance: Menu remains readable without images; images lazy-load after menu open.

### A5. Shape Morph Library

- Goal: Add BDQ-specific shape families beyond repeated parallelogram/polygon use.
- Families:
  - Ticket shard
  - Market canopy
  - Stage beam
  - Food stall tag
  - Festival flag
  - Editorial block
- Acceptance: Each family has purpose, aspect ratio, safe text zone, and reduced-motion static fallback.

### A6. Hero Motion Sequence

- Goal: Create one flagship hero sequence inspired by RPA, adapted to BDQ.
- Motion: shape morph/crossfade, media swap, word anchor shift, color state change.
- Acceptance: First viewport remains readable, CTA stays obvious, image subject remains visible.

### A7. Wall Transition Upgrade

- Goal: Reuse wordmark wall for route transitions and/or footer entry.
- Motion: rows intro -> horizontal loop -> collapse.
- Acceptance: Does not delay navigation or LCP; skipped for reduced motion and automation.

### A8. Footer Finale Motion

- Goal: Make footer feel intentional after IA cleanup.
- Motion: wall enters, CTA shape/label hover, social/legal remain stable.
- Acceptance: Footer is readable at 320, 390, 768, 1440, and 1920 widths.

### A9. Hover Motion Standard

- Goal: Standardize hover by component role.
- Covers: nav links, CTAs, cards, media, forms, admin controls, footer links.
- Acceptance: No broad `transition-all` unless justified; no hover state harms readability.

### A10. Motion QA Harness

- Goal: Verify what the eye sees, not just whether the code compiles.
- Captures:
  - home initial
  - hero after 2 seconds
  - menu open
  - menu hover
  - cursor over menu close
  - scroll section color change
  - footer entry
  - mobile menu
  - reduced motion
- Acceptance: Screenshots saved for human review; Playwright assertions cover visibility and interaction.

## Priority Order

1. P0 cursor/header/menu/footer stability from `frontend-execution-plan.md`.
2. A2 Cursor State Matrix.
3. A1 Reference Motion Director.
4. A3 Morphing Menu Surface.
5. A4 Menu Preview System.
6. A5 Shape Morph Library.
7. A6 Hero Motion Sequence.
8. A8 Footer Finale Motion.
9. A7 Wall Transition Upgrade.
10. A9 Hover Motion Standard.
11. A10 Motion QA Harness.

Reason: fix visibility and interaction bugs first, then add visual richness. The RPA reference is beautiful because basic chrome never feels accidental.

## Animation Rules For BDQ

### Rule 1: Motion Must Explain State

Every animation must answer one of these:

- Where am I?
- What changed?
- What can I do?
- What is important now?
- What is the brand feeling?

If it answers none of these, it is decorative and must be either removed or made very quiet.

### Rule 2: Marketing Motion And Utility Motion Are Different

Marketing/public pages can use:

- shape morphs
- large text reveals
- wall movement
- pinned story sections
- image masks
- cursor states

Customer/vendor/admin utility pages should use:

- fast transitions
- clear loading states
- focus states
- progress feedback
- restrained hover states

### Rule 3: Shape Changes Need Safe Zones

Every animated shape must define:

- image safe area
- text safe area
- minimum mobile crop
- focus/CTA overlap zone
- fallback static shape

### Rule 4: Cursor Must Be A Layer Contract

Cursor must always be:

- above menu/header/dialog surfaces
- below nothing interactive because it has `pointer-events: none`
- hidden on touch
- hidden or static under reduced motion
- readable on dark, light, image, and gradient backgrounds

### Rule 5: Header Color Is Not Optional

Every major public section needs a header visibility decision:

- light header
- dark header
- accent header
- backplate header
- hidden header only if another nav affordance is visible

### Rule 6: Reduced Motion Is A Parallel Experience

Reduced motion should not mean broken or blank. It means:

- static final states
- no continuous wall movement
- no pinned scrub dependency
- no cursor ornament
- no delayed access to navigation

## Visual QA Checklist

For each major public route, test:

- Load state: no blank frame, no unreadable loader text.
- Header state: logo, Tickets link, menu button visible.
- Cursor state: visible over header, menu, CTA, footer.
- Menu open: focus trap works, close visible, links readable, no cursor behind panel.
- Menu hover: preview does not cover link text.
- Scroll color: header and section text remain readable.
- Hero: text does not overlap masked media badly.
- Cards: image hover does not crop the main subject.
- Footer: CTA, nav, legal, and social links remain readable.
- Cookie/banner/toast: no overlay hides primary action.
- Mobile 320/375/390/430: no pinned motion dependency, no clipped menu/footer.
- Tablet 768/1024: spacing and shape scale do not feel like stretched mobile.
- Desktop 1440/1920/ultra-wide: shapes do not drift into dead space.
- Reduced motion: all content visible, navigation instant, no continuous decorative animation.

## What To Add Beyond The Existing Plan

Add these to the execution plan:

1. Dedicated animation audit gate before motion implementation.
2. Visual reference captures as QA artifacts.
3. Cursor layer fix as mandatory dependency for menu motion.
4. Motion director before scattered animation additions.
5. Menu preview system after accessibility is locked.
6. Footer finale after footer IA cleanup.
7. Shape morph library with BDQ-specific forms.
8. Wall transition only after performance and reduced-motion checks.
9. Overlay layering contract covering menu, cookie banner, dialogs, toasts, and cursor.
10. Motion screenshot harness for desktop, mobile, menu, hover, scroll, footer, and reduced motion.

## Final Recommendation

BDQ should not copy RPA's shapes one-for-one. The right move is to copy the discipline:

- one color state system
- one cursor state system
- one menu choreography
- one shape language
- one wall/transition language
- one motion QA process

Then make the visual language BDQ-specific: night market, festival, ticketing, stalls, stage lights, food, shopping, and Vadodara energy.
