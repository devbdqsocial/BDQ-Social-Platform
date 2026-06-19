# Cursor System Audit

Status: audit, target rules, and P0 implementation notes.

## Implementation Update

| Date | Status | Notes |
|---|---|---|
| 2026-06-19 | Implemented, awaiting browser QA | `#mouse` now uses `--z-cursor`, menu open toggles `html[data-menu-open="true"]`, menu/CTA/link cursor variants are defined, and hover tracking avoids nested-link flicker. |

## Current Cursor

| Element | Current behavior |
|---|---|
| Component | `src/components/motion/Cursor.tsx`. |
| CSS | `#mouse` in `src/app/globals.css`. |
| Layer | `z-index: var(--z-cursor)`. |
| Motion | GSAP lerp, pointer-fine only, disabled for reduced motion. |
| Shape | Yellow circular dot. |
| Hover | Adds `.is-hover`; expands to `3.4rem`, `4.8rem` for `data-cursor="view"`. |
| Blend | `mix-blend-mode: difference`. |
| Native cursor | Hidden by `.cursor-none` on html. |

## Confirmed Bug

| Bug | Root cause |
|---|---|
| Cursor goes behind open menu and becomes hard/impossible to view. | Fixed in implementation batch 1 by introducing named layer tokens and a menu-open cursor state. |

## RPA Reference Cursor Lessons

The reference cursor has:

1. Very high layer priority.
2. Blend mode behavior.
3. State changes on hover/media/slider/video.
4. Color behavior tied to target/section.
5. A visual system beyond a single dot.

BDQ should adapt the concept, not copy every state.

## Target Cursor State Matrix

| State | Trigger | Visual behavior |
|---|---|---|
| Default | Pointer fine, normal page. | Small visible dot/ring with section-aware color. |
| Link/button hover | `a`, `button`, `[role=button]`, `[data-cursor]`. | Scale/change color; preserve text readability. |
| View/media | `data-cursor="view"`. | Larger state, optional label/icon. |
| Menu open | `menu-overlay` visible. | Cursor above menu, high contrast against dark-blue/light-blue. |
| CTA hover | `.btn`, primary action. | More energetic accent state. |
| Drag/slider/map | Map or carousel interactions. | Crosshair/drag state where appropriate. |
| Text/input | Forms. | Either native cursor or small unobtrusive state; no blocking input text. |
| Reduced motion | `prefers-reduced-motion: reduce`. | Hide custom cursor or static safe fallback. |
| Touch/coarse pointer | Mobile/tablet touch. | Hide custom cursor. |

## Cursor Safety Rules

1. Cursor layer must be above public header and menu.
2. Cursor must never block pointer events.
3. Cursor must remain visible on light, dark, image, and gradient sections.
4. Cursor must not hide text selection or form input behavior.
5. Cursor must respect reduced motion and touch devices.
6. Menu open must have a tested cursor color/state.

## Future Implementation Direction

| Priority | Task |
|---|---|
| P0 | Raise cursor stacking or portal it above menu. |
| P0 | Add menu-open cursor state and test close/menu links. |
| P1 | Add section-aware color state based on RPA color pairs. |
| P1 | Add CTA/media/drag variants. |
| P2 | Add optional label/icon states only if they improve clarity. |
