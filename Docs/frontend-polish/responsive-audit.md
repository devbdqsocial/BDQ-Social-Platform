# Responsive Audit

Status: audit plan and preliminary risk matrix. No responsive code is changed here.

## Required Breakpoints

| Width | Why it matters |
|---:|---|
| 320 | Smallest practical mobile. |
| 375 | Common iPhone width. |
| 390 | Modern iPhone baseline. |
| 430 | Large phone. |
| 768 | Tablet portrait. |
| 1024 | Tablet landscape / small laptop. |
| 1440 | Standard desktop. |
| 1920 | Large desktop. |
| Ultra-wide | Prevent stretched sections and unreadable line lengths. |

## Test Matrix

| Area | 320-430 | 768 | 1024 | 1440+ |
|---|---|---|---|---|
| Typography | Check tiny labels, menu links, checkout fields. | Check tablet heading scale. | Check hero balance. | Check display type not oversized. |
| Spacing | Reduce dead space; preserve grouping. | Avoid awkward half-desktop layout. | Verify grid transitions. | Cap content widths. |
| Header | Logo/menu visible; no overlap. | Sticky behavior. | Section color sync. | Large monitor color and cursor. |
| Footer | Stack nav; remove excessive height if awkward. | Two-column nav. | Full footer scene. | Prevent nav spread too wide. |
| Cursor | Hidden on touch. | Hidden on coarse pointer. | Visible on pointer-fine. | Visible and above menu. |
| Menu | Links fit; close button reachable. | Dialog focus. | Stagger motion. | Visual balance. |
| Forms | 16px input floor; labels left. | Comfortable width. | Two-column where useful. | Do not stretch inputs. |
| Cards | No clipping; text wraps. | Grid adapts. | Hover states. | Image crop quality. |
| Map | Controls reachable; no horizontal overflow. | Map/list balance. | Desktop controls. | Canvas does not feel lost. |

## Known Responsive Risks

| Priority | Risk | Target |
|---|---|---|
| P0 | Cursor hidden on mobile is correct, but cursor/menu bug must be desktop tested. | Desktop pointer-fine check with menu open. |
| P1 | Public menu large labels may crowd short mobile heights. | Responsive label scale and footer safe area. |
| P1 | Full-screen footer may create dead space on small pages. | Stack content with purposeful rhythm. |
| P1 | Bracket micro sizes in coming-soon may be too small on mobile. | Tokenized mobile-safe micro scale. |
| P1 | Admin dense tables can overflow. | Horizontal scroll/stack rules per table. |
| P2 | Ultra-wide sections can stretch visuals too far apart. | Max widths and grid caps. |

## Verification Plan

For each breakpoint:

1. Capture landing, event detail, checkout, wallet, map, vendors, vendor app, admin dashboard, footer, menu.
2. Check horizontal overflow.
3. Check header visibility at top and mid-scroll.
4. Check focus order with keyboard on desktop widths.
5. Check touch target size on mobile widths.
6. Check modal/sheet safe area.
7. Record failures in the implementation backlog before code changes.
