# Spacing System Audit

Status: audit and target rules. No spacing code is changed here.

## Current Systems

| System | Source | Finding |
|---|---|---|
| RPA spacing tokens | `--space-xs` through `--space-5xl`, `--grid-gap`, `--wrapper-padd`. | Strong foundation for public/customer/vendor. |
| Tailwind numeric spacing | `gap-1` through `gap-8`, `p-3`, `mt-6`, etc. | Good for admin and shadcn, but leaks into brand areas. |
| Ad-hoc bracket spacing | `mt-[0.55rem]`, `gap-[5px]`, `px-[1.6rem]`, clamps, etc. | Main source of random rhythm. |
| Safe area spacing | `env(safe-area-inset-bottom)` in mobile tab contexts. | Keep and expand for full-screen/mobile overlays. |

## Spacing Inventory Highlights

Tokenized spacing found:

| Token | Role |
|---|---|
| `--space-xs` | Micro relationships. |
| `--space-sm` | Label/input and small card relationships. |
| `--space-md` | Standard item gap. |
| `--space-lg` | Section internal rhythm. |
| `--space-xl` | Card/header/footer gaps. |
| `--space-2xl` | Major block separation. |
| `--space-3xl` | Section group separation. |
| `--space-4xl` | Large top/bottom padding. |
| `--space-5xl` | Emotional/spectacle section spacing. |

Ad-hoc spacing requiring review:

| Pattern | Risk |
|---|---|
| `mt-[0.55rem]`, `mt-[0.6rem]`, `mt-[0.8rem]`, `mt-[0.9rem]` | Near-duplicate micro gaps. |
| `mb-[0.9rem]`, `mb-[1.1rem]` | Coming-soon special gaps should be tokens. |
| `gap-[5px]` | Header menu line gap can stay local, but should be intentional. |
| `px-[1.6rem]` | Invitation/form custom padding should map to token. |
| `p-[28%]` | Aspect/shape spacing should be checked for responsiveness. |
| Mixed `p-3`, `p-4`, `p-5`, `p-6` | Fine in admin; brand areas should use RPA tokens. |

## Spacing Rules

| Context | Rule |
|---|---|
| Emotional hero/storytelling | More breathing room, stronger vertical rhythm, no cramped CTAs. |
| Forms | Compact groups: label close to input, larger gap between field groups. |
| Checkout | Dense enough to reduce anxiety; summary and action must stay close. |
| Admin tables | Tight but readable; avoid oversized cards around dense data. |
| Cards | Inner padding consistent by card size; no nested cards unless modal/repeated list. |
| Footer | Large brand close allowed; legal/nav must not float or feel leftover. |
| Mobile | Reduce section padding but preserve grouping; avoid giant dead areas. |

## Dead Space Risks

| Area | Risk | Direction |
|---|---|---|
| Large public sections | Full-height sections can feel empty when content is short. | Add meaningful atmosphere/media or reduce min-height. |
| Footer | `min-h-[100svh]` can be strong but may create excess scroll on short screens. | Keep only if footer gains enough content/visual motion. |
| Hero right visuals | If visual is decorative only, space feels dead. | Use scene/media/shape with story value. |
| Admin cards | Cards around simple controls can waste room. | Use denser grouped controls. |

## Crowding Risks

| Area | Risk | Direction |
|---|---|---|
| Mobile checkout | Inputs, qty controls, coupon, OTP can stack tightly. | Enforce field group spacing and sticky action clarity. |
| Menu overlay small screens | Large `f-h100` labels can crowd vertical space. | Use responsive menu scale and safe-area footer. |
| Coming-soon microcopy | Many small labels with tracking can feel cramped. | Reduce micro text variants and improve vertical rhythm. |

## Target Spacing Checklist

1. Use RPA tokens in public/customer/vendor brand surfaces.
2. Use Tailwind numeric spacing intentionally in admin/ops only.
3. Convert repeated bracket values to named tokens.
4. Remove dead vertical areas unless they carry visual storytelling.
5. Add breathing room only where it improves emotion or comprehension.
6. Tighten utility surfaces where the user is trying to finish a task.
