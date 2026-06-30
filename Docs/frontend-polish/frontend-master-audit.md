# Frontend Master Audit

Status: documentation pass. No code changes proposed here are implemented in this file.

## Scope

Audited surfaces:

| Area | Routes / components |
|---|---|
| Public marketing | `/`, `/about`, `/events`, `/events/[slug]`, `/vendors`, `/vendors/[id]`, `/map`, `/schedule`, `/offers`, `/gallery`, `/guide`, SEO landing pages. |
| Customer | `/login`, `/dashboard`, `/tickets`, `/profile`, checkout/reveal/ticket components. |
| Vendor | `/vendor/login`, `/vendor/signup`, `/vendor/home`, `/vendor/events`, `/vendor/events/[id]`, `/vendor/profile`, `/vendor/leads`, `/vendor/documents`, `/vendor/add-ons`, `/vendor/contract`. |
| Admin/ops | `/admin/*`, admin tables, map designer, check-in, POS, analytics, content tools. |
| Global chrome | `PublicHeader`, `MenuOverlay`, public footer, `CustomerTabBar`, `VendorRail`, `ZoneSidebar`, custom cursor. |
| Reference | `reference/bdq/rpacomunicacion.com`, especially cursor, section color switching, shape masks, menu animation, footer motion, and type/grid system. |

## Reference Findings

The BDQ reference is a complete interaction system, not only a style sample.

| Reference behavior | BDQ current state | Gap |
|---|---|---|
| Section-driven header/logo/menu color changes. | `SectionColorSync` writes `--header-color` from current section text color. | Strong base, but no contrast fallback for mixed images/gradients or unknown sections. |
| Cursor above all UI with blend/color states. | `#mouse` exists but `z-index: 100`; public header is `z-[110]`, menu is `z-[120]`. | Cursor can sit behind open menu/header layers. |
| Rich morphing menu shape and staggered labels. | Full-screen menu exists with label rise animation. | Menu lacks BDQ-style shape panel, preview/media behavior, and cursor-safe layering. |
| Large shape vocabulary. | CSS exposes forms 1/2/6/10/11/12/13/14; `MaskDefs` also includes 15/15-mob. | Shape usage repeats, and available shape 15 lacks a matching CSS utility. |
| Footer is an intentional animated closing scene. | Footer has strong wordmark wall and CTA, but legal/lang bottom feels leftover. | Remove clutter, improve IA, and finish the brand close. |

## Global Scorecard

Scores are current target gap. Current is based on code/document audit, not a full screenshot sweep yet.

| Dimension | Current | Target | Gap |
|---|---:|---:|---:|
| Global Design Score | 7.4 | 9.5 | 2.1 |
| Typography | 7.6 | 9.5 | 1.9 |
| Hierarchy | 7.2 | 9.5 | 2.3 |
| Alignment | 7.0 | 9.5 | 2.5 |
| Spacing | 7.1 | 9.4 | 2.3 |
| Motion | 7.5 | 9.3 | 1.8 |
| Consistency | 6.8 | 9.5 | 2.7 |
| Accessibility | 8.0 | 9.5 | 1.5 |
| Mobile UX | 7.0 | 9.4 | 2.4 |
| Desktop UX | 7.8 | 9.5 | 1.7 |
| Conversion UX | 7.1 | 9.3 | 2.2 |
| Premium Feel | 7.7 | 9.6 | 1.9 |
| Visual Storytelling | 7.0 | 9.6 | 2.6 |

## Priority Findings

| Priority | Finding | Evidence | Impact |
|---|---|---|---|
| P0 | Cursor goes behind menu/header layers. | `#mouse` z-index 100; header 110; menu 120. | Direct interaction bug, especially when menu opens. |
| P0 | Header visibility is not fully guaranteed across section types. | Header uses current section text color only. | Logo/menu can be weak over images, gradients, or complex section art. |
| P0 | Footer contains unwanted copy and language marker. | Public footer bottom includes "All sales are final" and `EN`. | Hurts brand tone and user confidence. |
| P0 | "All sales are final" appears beyond footer. | Landing FAQ, event FAQ, refunds page, vendor terms. | Needs content/legal review before removal everywhere. |
| P1 | Typography has multiple systems. | BDQ tokens, Tailwind sizes, bracket rem sizes, admin Geist sizes. | Inconsistent polish and scaling behavior. |
| P1 | Shape language repeats. | `svg--form2` and `svg--form11` recur heavily. | Visual fatigue; less premium than reference. |
| P1 | Spacing mixes tokenized rhythm with ad-hoc values. | `var(--space-*)` plus `mt-[0.55rem]`, `gap-[5px]`, `p-3`, etc. | Sections feel uneven across surfaces. |
| P1 | Utility/admin screens and marketing screens have different polish standards. | Admin uses shadcn/Geist; public/vendor use BDQ. | Good separation, but shared quality rules are missing. |
| P2 | Motion is strong in key areas but not systematized everywhere. | Reveal/SplitReveal/Magnetic exist; many utility screens are static. | Premium feel drops between routes. |

## Decision

The platform should not receive random one-off polish. It should move under one frontend philosophy:

1. Public/customer/vendor brand surfaces use the BDQ-inspired editorial system.
2. Admin/ops surfaces stay dense and operational, but adopt the same standards for spacing, hierarchy, focus, contrast, empty states, and responsive behavior.
3. Header, footer, cursor, typography, spacing, and shapes become global systems with route-level exceptions documented.
