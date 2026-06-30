# Typography System Audit

Status: audit and target system. No code changes are applied here.

## Current Font Families

| Surface | Current family | Role | Finding |
|---|---|---|---|
| Public/customer/vendor BDQ layer | Inter body, Exat display | Brand/editorial. | Strong and distinctive. Keep. |
| Coming-soon invitation | Inter plus `cs-serif` fallback. | Invitation/editorial special case. | Accept as a campaign treatment, but needs token mapping. |
| Admin console | Geist/system sans. | Operational dashboard. | Correct direction for dense admin UI. Keep separate from festival display type. |
| UI/shadcn components | Geist/system or inherited sans. | Buttons, forms, tables. | Works for admin but should not leak randomly into public pages. |

## Font Family Questions

| Question | Answer |
|---|---|
| Do we use too many fonts? | No, but the roles are not documented enough. Exat, Inter, Geist, and invitation serif each need clear boundaries. |
| Do font weights feel random? | Sometimes. Public display is consistently bold, but admin and small labels use `font-medium`, `font-semibold`, `font-bold`, and ad-hoc uppercase weights. |
| Do headings feel consistent? | Public BDQ headings do. Admin headings are consistent enough. Coming-soon has special inline sizing that should be tokenized. |
| Do utility screens use same typography as marketing screens? | No, and that is correct. But utility screens need a common operational scale. |
| Do customer pages feel editorial? | Often yes, especially landing/event/wallet. Forms and checkout still lean utility-first. |
| Do vendor pages feel professional? | Mostly yes. Vendor app uses the BDQ layer but should reduce decorative display type in task-heavy areas. |
| Do admin pages feel operational? | Yes. Keep admin sans, dense tables, and clear labels. |

## Size Inventory From Code Scan

Tokenized BDQ sizes:

| Token/class | Source |
|---|---|
| `--paragraph-small`, `.f-paragraph-small` | BDQ small body, labels, metadata. |
| `--paragraph`, `.f-paragraph` | BDQ body. |
| `--h32`, `.f-h32` | Small heading / logo scale. |
| `--h42`, `.f-h42` | Section subheading / dialog close scale. |
| `--h60`, `.f-h60` | Medium display. |
| `--h76`, `.f-h76` | Large display / wall rows. |
| `--h100`, `.f-h100` | Menu links / major display. |
| `--h133`, `.f-h133` | Hero display. |
| `--h235`, `.f-h235` | Giant footer CTA / marquee-scale type. |

Tailwind/UI sizes found:

| Size | Usage |
|---|---|
| `text-xs` | Admin metadata, labels, chart details, mobile tab. |
| `text-sm` | Admin body, table text, inputs, buttons. |
| `text-base` | Form inputs and some titles. |
| `text-lg` | Sidebar/admin headings. |
| `text-xl` | Logo/section headings. |
| `text-2xl`, `text-3xl`, `text-4xl` | Admin/login/tokens/check-in display numbers. |

Ad-hoc bracket sizes found:

| Size | Likely location / concern |
|---|---|
| `text-[10px]` | Kbd badges, admin badges, notification counters. Needs token alias. |
| `text-[11px]` | Sidebar/inspector micro labels. Needs token alias. |
| `text-[0.58rem]`, `text-[0.6rem]`, `text-[0.62rem]` | Coming-soon micro labels. Too many near-duplicates. |
| `text-[0.7rem]`, `text-[0.72rem]` | Coming-soon labels/errors. Too close together. |
| `text-[0.8rem]`, `text-[0.9rem]` | Coming-soon body/status. Should map to `sm`/`base`. |
| Inline `fontSize: clamp(1.4rem,4vw,1.8rem)` | Coming-soon success message. Should become a named token. |
| `font-size: 0.875rem` | Skip link / utility CSS. Accept if mapped to `sm`. |

## Target Unified Scale

This scale is a documentation target. Exact CSS values should be finalized during implementation.

| Name | Role | Public/customer/vendor | Admin/ops |
|---|---|---|---|
| `xs` | Micro metadata, badges, helper text. | `--paragraph-small` floor; never below accessible contrast. | 12px target; 10/11px only for dense badges after audit. |
| `sm` | Secondary body, labels, nav helpers. | `--paragraph-small` or 14px equivalent. | 14px. |
| `base` | Body, inputs, paragraphs. | `--paragraph`; 16px+ input floor. | 14-16px depending density. |
| `lg` | Emphasis body / card title. | `--h32` or BDQ paragraph variant. | 16-18px. |
| `xl` | Small section heading. | `--h42`. | 20px. |
| `2xl` | Page title / modal title. | `--h60`. | 24px. |
| `3xl` | Large section heading. | `--h76`. | 30px dashboard hero only. |
| `4xl` | Hero heading. | `--h100`. | Rare. |
| `5xl` | Major brand/display. | `--h133`. | Not for admin. |
| `6xl` | Signature / spectacle. | `--h235`. | Not for admin. |

## Line-Height Audit

| Text type | Current | Target |
|---|---|---|
| BDQ body | `1.3` | OK for short marketing copy; long legal/prose should be 1.5-1.65. |
| BDQ display | `1.05-1.15` | Keep, but apply `text-wrap: balance` on large headings. |
| Admin table/body | Tailwind defaults. | Keep dense, but enforce readable empty states and wrapped descriptions. |
| Coming-soon micro text | Many tiny sizes with wide tracking. | Reduce to 2 micro sizes and verify contrast/readability. |
| Legal/prose pages | Component-level prose rules. | Keep width capped, increase paragraph rhythm where long copy appears. |

## Page-Level Typography Decisions

| Page type | Heading style | Body style | Alignment |
|---|---|---|---|
| Landing/event/brand storytelling | Exat display, large. | Inter, short lines. | Center or editorial-left depending section. |
| Checkout/forms/profile/vendor tasks | Smaller heading, clear labels. | Inter/Geist readable body. | Left aligned. |
| Admin/dashboard | Geist/sans, restrained. | Dense table/body text. | Left aligned. |
| Legal/SEO pages | Moderate display, long-form readable body. | 60-75ch paragraphs. | Left aligned with anchored subnav where useful. |

## Fix Plan

1. Replace ad-hoc coming-soon sizes with named invitation tokens.
2. Map `text-[10px]` and `text-[11px]` to admin micro tokens or remove where unnecessary.
3. Ensure public page headings use BDQ scale classes rather than mixed Tailwind display sizes.
4. Keep admin typography separate but document its dense scale.
5. Add line-length rules for public prose, legal pages, and descriptions.
6. Verify all body text stays 16px+ on mobile where user input or long reading occurs.
