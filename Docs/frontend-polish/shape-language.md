# Shape Language Audit

Status: audit and target rules. No shape code is changed here.

## Current Shape System

BDQ already has the core BDQ mask system:

| Shape | Current CSS utility |
|---|---|
| Logo | `.svg--logo` |
| Form 1 | `.svg--form1` |
| Form 2 | `.svg--form2` |
| Form 6 | `.svg--form6` |
| Form 10 | `.svg--form10` |
| Form 11 | `.svg--form11` |
| Form 12 | `.svg--form12` |
| Form 13 | `.svg--form13` |
| Form 14 | `.svg--form14` |

Additional geometry exists in `MaskDefs`:

| Shape | Current issue |
|---|---|
| `svg-form15` | Defined in SVG defs but no matching `.svg--form15` class in globals. |
| `svg-form15-mob` | Defined in SVG defs but no matching mobile utility. |
| `svg-form-play`, arrows, link arrow | Defined for interaction iconography. |

## Reference Gap

The BDQ reference includes richer shape roles:

| Reference shape family | Use |
|---|---|
| Menu forms | Opening/closing menu panel identity. |
| Header forms | Header animation and transitional forms. |
| Footer forms | Footer rollover/morph identity. |
| Service/project/news forms | Page-specific content framing. |
| Language/social forms | Micro-interaction identity. |

BDQ currently uses the same small set repeatedly, so the design can feel less alive.

## Current Repetition Risks

| Area | Risk |
|---|---|
| Vendor cards | Repeated `.svg--form2` can make every brand card feel the same. |
| Hero/media blocks | `.svg--form11` can become the default large decorative shape. |
| Page loader | Form 2 and 6 are strong but should not be the only transition language. |
| Footer | Wordmark wall is strong, but footer-specific shapes are missing. |

## Target Shape Roles

| Role | Shape direction |
|---|---|
| Primary brand shape | One or two recognizable BDQ signature forms. |
| Secondary content shapes | Used for cards, vendors, gallery, offers. |
| Organic shapes | More fluid/irregular shapes for atmosphere and festival emotion. |
| Editorial shapes | Wide, angled, magazine-like forms for text/media splits. |
| Festival-inspired shapes | Lantern, stall, ticket, stage, route, and night-market cues abstracted into forms. |
| Utility shapes | Minimal rectangles/lines for admin and forms; no decorative clutter. |
| Interaction shapes | Button, cursor, arrow, menu, footer rollover. |

## Shape Rules

1. Do not use the same shape as filler on every page.
2. Every shape must have a role: media frame, CTA, atmosphere, section marker, or interaction.
3. Marketing pages can use expressive shape variation.
4. Utility/admin pages should avoid decorative shapes unless they improve scanning.
5. Mobile shapes must not create dead vertical space.
6. Shape color must pass visibility/contrast when carrying text.

## Future Implementation Direction

1. Add CSS utilities for form15/form15-mob if they are approved.
2. Create a shape usage map by page.
3. Rotate shape families by content role.
4. Add footer/menu-specific shape treatments after header/cursor bugs are fixed.
5. Test every masked media block for cropping, CLS, and mobile legibility.
