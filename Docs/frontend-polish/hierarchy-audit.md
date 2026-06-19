# Visual Hierarchy Audit

Status: audit and target rules. No hierarchy changes are applied here.

## Hierarchy Rule

Every page must make three things obvious:

1. What is this page?
2. What matters most right now?
3. What should the user do next?

## Page Hierarchy Matrix

| Surface | Primary action | Secondary action | Current issue | Target |
|---|---|---|---|---|
| Landing | Buy/see tickets. | Meet brands, contact. | Strong, but multiple CTAs can flatten. | One dominant CTA per section. |
| Event detail | Get tickets. | See brands/map/schedule. | FAQ/refund copy competes with desire. | Desire first, logistics second. |
| Checkout | Pay/verify phone. | Apply coupon, adjust quantity. | Trust copy and field sequence need sharper hierarchy. | Payment path always visually dominant. |
| Success/reveal | View/share ticket. | Continue exploring. | Strong emotional peak. | Keep. |
| Wallet | View ticket / find event. | Share, reveal, profile. | Empty and ticket states need stronger next step. | Action near ticket state. |
| Map/guide | Explore areas/vendors. | Schedule/offers. | Filters/search can compete with map. | Search first, map second, details third. |
| Schedule | Find now/next. | Add to calendar. | Good base; needs mobile now/next clarity. | Current moment always highlighted. |
| Offers | Show/redeem offer. | Browse vendors. | Cards may feel equal even when time-sensitive. | Live/urgent offers stand out. |
| Gallery | Open photo / relive event. | Share/return. | Grid can feel flat. | Strong entry narrative then visual grid. |
| Vendors | Open brand. | Search/filter. | Card visuals repeat. | Category/search path clear; cards differentiated. |
| Vendor app | Complete onboarding step. | Preview public profile/contact. | Some steps have several competing links. | One step, one primary action. |
| Admin | Complete operational task. | Export/filter/view details. | Dense but functional. | Preserve density; make destructive/export actions clearer. |
| Header/menu | Navigate. | Contact/sign in. | Header visibility and cursor layering. | Navigation always legible and clickable. |
| Footer | Contact / explore. | Legal/social. | Bottom legal/lang weakens close. | Intentional brand finish. |

## Card Competition

| Area | Current risk | Target |
|---|---|---|
| Vendor cards | Similar masks/images can make cards equal. | Distinguish featured, category, offer, and normal cards. |
| Event cards | Need stronger date/price/status priority. | Date/status first, title second, CTA third. |
| Admin dashboard cards | Good density but action cards can compete. | Group by workflow; avoid equal weight for everything. |
| Offers | Offer value, stall, and redeem action can compete. | Offer title/value -> location -> action. |

## CTA Rules

1. Primary CTA must be visually distinct from secondary links.
2. CTA copy must name the action: "Get Tickets", "Show At Stall", "Save Profile", "Export CSV".
3. Do not place legal/anxiety copy directly beside desire CTAs unless it increases trust.
4. Sticky CTAs must not cover content at small breakpoints.
5. Disabled CTAs must explain why or appear near the missing requirement.

## Hierarchy Fix Priorities

| Priority | Fix |
|---|---|
| P0 | Header/menu/cursor must never obscure or hide navigation. |
| P0 | Footer bottom must remove unrelated "All sales are final" and `EN`. |
| P1 | Event/checkout hierarchy should reduce anxiety and make purchase path clearer. |
| P1 | Vendor/customer utility screens should expose one next action per step. |
| P2 | Admin cards/actions should be grouped by workflow priority. |
