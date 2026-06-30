# Header System Audit

Status: audit and target rules. No header code is changed here.

## Current Header System

| Component | Current behavior | Finding |
|---|---|---|
| `PublicHeader` | Fixed transparent header, `z-[110]`, logo, Tickets link, menu button, persistent contact CTA. | Strong BDQ direction. |
| `SectionColorSync` | Samples `.bdq section` at y=28 and writes `--header-color` from computed section text color. | Good foundation, but not enough for complex images/gradients. |
| `MenuOverlay` | Full-screen fixed menu, `z-[120]`, scroll lock, focus trap, Esc close, GSAP label rise. | Strong accessibility base. |
| `CustomerTabBar` | Mobile bottom primary nav. | Needs responsive overlap/safe-area audit. |
| `VendorRail` / `ZoneSidebar` | App navigation for vendor/admin-like surfaces. | Good utility direction; separate from public header. |

## Header Visibility Matrix

| Background condition | Current risk | Target state |
|---|---|---|
| Dark solid section | Usually readable if section text color is light/accent. | Pass. |
| Light solid section | Usually readable if section text color is dark. | Pass after testing. |
| Image/media section | Header may inherit a color that passes on average but fails over image details. | Add fallback state: local scrim/backplate or forced contrast. |
| Gradient/multi-color section | One sampled color may not match every part behind header. | Add section-level override or header-safe zone. |
| Menu open | Menu colors are readable. | Cursor must be above menu or menu-aware. |
| Sticky over transition | Color may lag during scroll. | Smooth but immediate enough; test fast scroll. |

## Header Color Rules

1. Every page section that can sit under the header must declare a safe header mode: `light`, `dark`, `accent`, or `auto`.
2. Image/gradient sections must provide a header-safe overlay or explicit header color.
3. Header logo, Tickets link, and menu lines must pass contrast at the sampled position.
4. Hover and focus states must increase clarity, not reduce it.
5. Mobile menu open state must disable background scroll and keep cursor/focus visible.

## Specific Issues

| Priority | Issue | Evidence | Target |
|---|---|---|---|
| P0 | Header can become low-contrast on some sections. | Header color is computed from section text, not actual background complexity. | Add color visibility test and explicit section overrides. |
| P0 | Cursor can go behind menu/header. | `#mouse` z 100, header 110, menu 120. | Cursor z-index above menu or menu-specific cursor layer. |
| P1 | Menu is functional but less rich than BDQ reference. | Menu lacks morphing panel/shape preview system. | Add BDQ-inspired shape/motion after core bug fix. |
| P1 | Persistent "Let's talk" CTA can conflict with bottom content. | Fixed bottom right at z 90. | Audit overlap with footer, modals, mobile safe areas. |

## Color Visibility Test Plan

For each major route, test the header at:

| Test | Pass criteria |
|---|---|
| Top of page | Logo, Tickets, menu lines visible. |
| Mid-section dark | Header visible and intentional. |
| Mid-section light | Header visible and intentional. |
| Image section | Header not lost over image detail. |
| Gradient/shape section | Header remains readable during scroll. |
| Menu open | Cursor, close button, links, focus state visible. |
| Keyboard navigation | Visible focus on logo/menu/links. |

## Future Implementation Direction

1. Add a route/section header contrast registry.
2. Add fallback class for header-safe backplate or local blend state.
3. Raise/fix cursor layer behavior before adding new menu motion.
4. Expand menu visual language only after accessibility remains green.
