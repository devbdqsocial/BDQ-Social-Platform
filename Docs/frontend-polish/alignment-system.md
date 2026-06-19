# Alignment System Audit

Status: audit and target rules. No layout changes are applied here.

## Principle

Alignment is not decoration. It should follow the user task:

| Purpose | Alignment |
|---|---|
| Emotional reveal / campaign moment | Center or dramatic editorial-left. |
| Scanning lists / comparing cards | Left aligned. |
| Forms / checkout / profile / admin tasks | Left aligned. |
| Data tables / operational dashboards | Left aligned, numeric values aligned consistently. |
| Short brand statements | Center allowed if the section is about mood, not task completion. |
| Mixed visual storytelling | Text left, visual/media right or staggered, with consistent grid anchors. |

## Current Page Decisions

| Surface | Current read | Target alignment |
|---|---|---|
| Landing hero | Editorial-left with right visual scene. | Keep left if the right scene carries visual weight; center only for compact mobile mood sections. |
| Coming-soon gate | Center on mobile, left at large screens. | Good concept; tighten so the switch feels intentional, not accidental. |
| Event detail | Mostly left editorial. | Keep left for ticket decision sections; center only for emotional interludes. |
| Checkout | Task UI with mixed center bits. | Left-align form groups, quantities, phone/OTP, errors, and payment summary. |
| Ticket reveal | Centered celebration. | Keep center; this is a peak emotional moment. |
| Wallet | Utility plus desire. | Left for ticket management; center only empty/success states. |
| Map/guide | Tool/exploration. | Left for filters/search; map stays visual center. |
| Schedule | Timeline scanning. | Left aligned timeline, clear now/next anchors. |
| Offers | Discovery cards. | Left aligned filters/cards; centered modal redemption only. |
| Gallery | Visual browsing. | Centered intro allowed; grid/cards use consistent left captions. |
| Vendors | Browse/discovery. | Left filters; card labels left; hero can be editorial-left. |
| Vendor app | Operational onboarding. | Left aligned throughout except celebratory completion moments. |
| Admin | Operational. | Left aligned throughout; center only empty states. |
| Footer | Brand close. | CTA can be large/left; nav columns left; bottom legal aligned cleanly. |

## Section Audit Rules

1. A section must declare its alignment reason: emotional, editorial, utility, comparison, form, or navigation.
2. Centered text must have short line length and a clear focal point.
3. Forms must not center labels or inputs.
4. Empty states can be centered when they need warmth; action buttons remain easy to find.
5. Mixed layouts must align to a shared grid, not independent visual guesses.
6. Mobile alignment can differ from desktop only when scanning improves.

## Current Risks

| Risk | Evidence | Fix direction |
|---|---|---|
| Centering used for convenience. | Some empty/dialog states use `text-center` globally. | Decide per state: celebration vs task. |
| Header/menu alignment is strong but footer bottom is weak. | Footer nav is left, giant CTA left, bottom legal/lang split. | Remove lang item and rebuild bottom line. |
| Admin utility screens are consistent but visually separate. | Admin uses shadcn patterns. | Keep separate, document operational alignment. |
| Mobile hero alignment can collapse into text-only pages. | Earlier hero audit notes right visual hidden under `lg`. | Keep mobile atmosphere where storytelling matters. |

## Target Alignment Checklist

For every page section:

| Check | Pass criteria |
|---|---|
| Purpose identified | Emotional/editorial/utility/form/data/nav. |
| Alignment matches purpose | Center only for emotion; left for tasks. |
| Text block width controlled | No wide centered paragraphs. |
| CTA alignment supports next action | CTA near the related content. |
| Mobile checked | No awkward centered forms or orphaned CTA rows. |
