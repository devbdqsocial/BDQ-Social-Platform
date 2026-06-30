# Frontend Consistency Report

Status: audit and standardization map. No code changes are applied here.

## Current System Families

| Family | Used by | Strength | Consistency risk |
|---|---|---|---|
| BDQ brand system | Public/customer/vendor brand surfaces. | Distinctive, expressive, tokenized. | Mixed with Tailwind ad-hoc spacing/sizing. |
| Coming-soon invitation | `/coming-soon`. | Bespoke premium invitation. | Special values are inline/bracket-heavy. |
| Admin shadcn/Geist | `/admin/*`, dense tools. | Practical operational UI. | Needs shared quality rules with rest of portal. |
| Map designer | Admin map tools/Konva. | Specialized, functional. | Needs separate responsive and control-density rules. |
| Motion primitives | Reveal, SplitReveal, Magnetic, Cursor, Parallax, Marquee. | Strong reusable toolkit. | Not evenly applied or fully documented by state. |

## Duplicate / Divergent Patterns

| Pattern | Current variation | Target |
|---|---|---|
| Buttons | BDQ `.btn`, shadcn `Button`, custom text links, qty buttons. | Document role: brand CTA, admin action, utility control, icon action. |
| Inputs | BDQ underline inputs, shadcn inputs, invitation inputs, map inputs. | Role-specific but consistent label/error/focus rules. |
| Cards | Shadcn cards, BDQ surface blocks, masked media cards. | Do not nest cards; use cards for repeated items/tools. |
| Typography | BDQ tokens, Tailwind text classes, bracket sizes. | Token map for each system. |
| Spacing | BDQ tokens, Tailwind numeric, ad-hoc bracket values. | Reduce bracket values; keep numeric spacing in admin only. |
| Motion | GSAP, CSS keyframes, Tailwind animations. | Motion state table with reduced-motion contract. |
| Header/nav | PublicHeader, CustomerTabBar, VendorRail, ZoneSidebar. | Separate by surface, shared focus/touch/visibility standards. |

## Accessibility Consistency

Strengths:

1. Skip link exists.
2. Many icon buttons have `aria-label`.
3. Menu overlay has dialog semantics, focus management, Esc close, and inert.
4. Reduced-motion checks exist in multiple motion components.
5. Inputs often have labels or aria labels.

Risks:

1. Several inputs use `outline-none`; many have global focus replacement, but each custom input should be checked.
2. `transition: all` appears in `.btn__text`; should list properties.
3. Some native `img` elements should be checked for explicit width/height to avoid layout shift.
4. `autoFocus` appears in admin/auth contexts; should be justified and avoid mobile harm.
5. Long content handling in cards/tables needs systematic `min-w-0`, truncation, or wrapping.

## Standardization Rules

| Area | Rule |
|---|---|
| Public/customer/vendor brand pages | Use BDQ tokens first. Tailwind brackets only when no token fits and documented. |
| Admin/ops | Use shadcn/Geist dense UI. Do not import giant BDQ display type into operational screens. |
| Forms | Left labels, visible focus, inline errors, proper autocomplete/name/type. |
| Buttons | Primary/secondary/destructive roles must be visually distinct. |
| Motion | Transform/opacity only where possible; no `transition: all`; reduced-motion pass required. |
| Images | Explicit dimensions or stable aspect-ratio; meaningful alt or decorative empty alt. |
| Navigation | URL reflects state where state is shareable: filters, tabs, pagination. |

## Consistency Backlog

| Priority | Work |
|---|---|
| P0 | Cursor/header/menu/footer issues. |
| P1 | Typography and spacing token cleanup. |
| P1 | Button/input role documentation and component pass. |
| P1 | Responsive screenshot matrix. |
| P2 | BDQ-inspired menu/footer/shape enrichment. |
