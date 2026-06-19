# UX Friction Report

Status: audit and prioritization. No UX code changes are applied here.

## Friction Summary

| Priority | Friction | Why it matters | Direction |
|---|---|---|---|
| P0 | Cursor disappears behind menu. | User loses pointer feedback during navigation. | Fix cursor layer/state. |
| P0 | Header can become unreadable on some sections. | Users lose navigation confidence. | Add visibility matrix and section overrides. |
| P0 | "All sales are final" appears in footer and sales copy. | Creates anxiety and weakens premium tone. | Remove from footer; review legal pages/copy before global removal. |
| P1 | Too many small typography variants. | UI feels less deliberate. | Tokenize sizes and reduce near-duplicates. |
| P1 | Menu navigation is usable but not as expressive as reference. | Missed brand moment. | Add shape/motion later after bug fixes. |
| P1 | Checkout trust hierarchy needs refinement. | Purchase confidence depends on clarity. | Keep primary action and trust info close. |
| P1 | Vendor onboarding can expose many links/actions. | Users may not know next step. | One current step, one primary action. |
| P2 | Admin action density can hide priority. | Operators may scan slower. | Group actions by workflow and danger level. |

## Flow-Level Audit

| Flow | Current friction | Target |
|---|---|---|
| Public discovery -> event | Navigation is present, but header visibility can vary. | Always visible header; clear event CTA. |
| Event -> checkout | Strong CTA, but refund language can interrupt desire. | Trust-first logistics, no anxiety copy near desire. |
| Checkout -> payment | Functional flow. | More confidence cues, clearer progress, fewer competing actions. |
| Ticket success -> wallet/share | Strong emotional peak. | Keep, polish end-state actions. |
| Wallet -> attend | Utility correct. | Stronger arrival anticipation and next action. |
| Map/schedule/offers | Tool-like experience. | Festival companion experience with clear search/now/live priorities. |
| Vendor signup -> onboarding | Professional but can be action-heavy. | Single next step per screen. |
| Admin event setup | Functional, dense. | Maintain density, clarify primary/secondary/destructive actions. |

## Labels And Copy

| Issue | Direction |
|---|---|
| Generic labels like "Continue" should be specific when possible. | Use "Continue To Map", "Save Brand Profile", "Get Tickets". |
| Refund/final-sale copy appears too early in desire surfaces. | Move legal detail to policy/legal context; keep purchase surfaces trust-focused. |
| Footer bottom copy is not brand-building. | Replace with clean copyright/contact/location. |
| `EN` implies language switching that does not exist. | Remove until real i18n exists. |

## Click Friction

| Area | Possible friction | Audit action |
|---|---|---|
| Menu | Full-screen menu has several links plus auth/theme/contact. | Ensure focus order and visual grouping. |
| Checkout | Quantity, coupon, phone, OTP, pay. | Keep active step visually dominant. |
| Vendor onboarding | Brand, contract, booking, add-ons, leads. | Make incomplete step obvious. |
| Admin | Export/filter/actions across tables. | Make exports and destructive actions predictable. |

## Future UX Fix Order

1. Navigation confidence: header, menu, cursor.
2. Trust/confidence: footer and final-sale copy.
3. Task completion: checkout/vendor/admin action hierarchy.
4. Delight: menu shape motion, cursor variants, richer footer animation.
