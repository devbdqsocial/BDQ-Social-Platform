# Frontend Master Plan

Status: implementation plan after audit. Do not implement until this plan is approved.

## Keep

| Area | Keep because |
|---|---|
| RPA-inspired palette and type direction | Distinctive, premium, already integrated into public surfaces. |
| Inter + Exat public typography | Strong brand contrast. |
| Geist/admin operational typography | Correct for dense tools. |
| Motion primitives | Reveal, SplitReveal, Magnetic, Cursor, Parallax, Marquee provide a reusable system. |
| `SectionColorSync` idea | Good foundation for section-aware header. |
| Menu overlay accessibility base | Focus trap, Esc close, inert, scroll lock are important. |
| Wordmark footer and giant contact CTA | Strong brand close concept. |
| Reduced-motion global contract | Must preserve. |

## Improve

| Priority | Area | Improvement |
|---|---|---|
| P0 | Cursor/menu layering | Cursor must never sit behind menu/header. |
| P0 | Header visibility | Add explicit header modes and color visibility tests. |
| P0 | Footer copy | Remove "All sales are final" and `EN` from footer. |
| P0 | Final-sale copy audit | Review every public occurrence and decide what legal copy stays where. |
| P1 | Typography | Reduce ad-hoc sizes, token-map public/vendor/admin/coming-soon. |
| P1 | Alignment | Declare section alignment by purpose. |
| P1 | Spacing | Convert random repeated bracket spacing to tokens. |
| P1 | Checkout/vendor flows | Make one next action dominant per step. |
| P1 | Shape language | Vary shapes by role; expose missing approved utilities. |
| P2 | Menu/footer motion | Add richer RPA-inspired morph/hover only after core issues pass. |

## Rebuild

| Area | Rebuild scope |
|---|---|
| Header contrast system | From computed-only color to explicit modes plus fallbacks. |
| Cursor state system | From one dot/hover state to state matrix: default, hover, view, CTA, menu, drag, input. |
| Footer bottom and IA | Replace placeholder/legal anxiety bottom with intentional brand/legal close. |
| Shape usage map | Move from repeated decorative forms to role-based shape selection. |
| Typography token map | Create implementation tokens across RPA, admin, and invitation contexts. |

## Remove

| Item | Reason |
|---|---|
| Footer "All sales are final" | Unwanted and brand-negative in global footer. |
| Footer `EN` | Implies language switch that does not exist. |
| Arbitrary text alignment | Alignment must follow section purpose. |
| Arbitrary dead spacing | Every large gap must carry rhythm, grouping, or atmosphere. |
| Repeated shape-as-filler | Causes visual fatigue. |
| `transition: all` in brand button text | Web guideline anti-pattern; list animated properties. |

## Implementation Order After Approval

1. P0 chrome bugs: cursor layer/menu state, header visibility fallback, footer copy removals.
2. Content/legal pass: all "All sales are final" occurrences with owner review.
3. Typography cleanup: token map and near-duplicate size cleanup.
4. Spacing/alignment cleanup: public/customer/vendor first, admin second.
5. Shape language pass: add missing utilities and page role map.
6. UX hierarchy pass: checkout, vendor onboarding, event detail, admin actions.
7. Motion enrichment: menu/footer/cursor variants after reduced-motion and performance checks.
8. Responsive and accessibility verification.

## Verification Required

| Check | Command / method |
|---|---|
| TypeScript | `npm run typecheck` |
| Lint | `npm run lint` |
| E2E | `npm run test:e2e` |
| Manual routes | Public, customer, vendor, admin smoke links. |
| Responsive | 320, 375, 390, 430, 768, 1024, 1440, 1920, ultra-wide. |
| Header visibility | Light, dark, image, gradient, menu open. |
| Cursor | Default, hover, menu open, inputs, reduced motion, touch hidden. |
| Accessibility | Keyboard nav, focus-visible, labels, alt text, contrast. |
| Performance | No layout shift from images/shapes; transform/opacity motion only. |

## Approval Gate

The next step is not implementation by default. The next step is review and approval of this document
set, then implementation can begin with P0 chrome fixes.
