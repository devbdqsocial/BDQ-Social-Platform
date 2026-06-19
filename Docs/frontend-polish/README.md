# Frontend Polish Documentation Index

Status: audit, planning, and execution tracking. P0 chrome stability implementation started on 2026-06-19.

These documents expand the earlier customer-only audit into a full portal audit covering public,
customer, vendor, admin, header, footer, cursor, responsive behavior, shape language, and UX
consistency. The RPA reference mirror at `reference/rpa/rpacomunicacion.com` is treated as visual
and interaction inspiration, not a source to copy blindly.

## Documents

| Document | Purpose |
|---|---|
| [frontend-master-audit.md](frontend-master-audit.md) | Global scorecard, scope, current/target/gap scoring, top priorities. |
| [typography-system.md](typography-system.md) | Font family, weight, size, line-height, and page typography audit. |
| [alignment-system.md](alignment-system.md) | Section-by-section alignment rules and current fixes needed. |
| [spacing-system.md](spacing-system.md) | Spacing token audit, dead space, crowding, and rhythm rules. |
| [hierarchy-audit.md](hierarchy-audit.md) | Primary/secondary actions, CTA clarity, and card competition. |
| [header-audit.md](header-audit.md) | Desktop/mobile/sticky/menu header audit and color visibility matrix. |
| [footer-audit.md](footer-audit.md) | Footer IA, hierarchy, removals, spacing, and brand close plan. |
| [cursor-system.md](cursor-system.md) | Cursor visibility, menu layering bug, color states, and interaction matrix. |
| [shape-language.md](shape-language.md) | Current repeated geometry and future shape language rules. |
| [animation-audit.md](animation-audit.md) | Visual/source audit of the RPA reference motion system and BDQ animation upgrades. |
| [responsive-audit.md](responsive-audit.md) | Breakpoint audit matrix from 320px through ultra-wide. |
| [ux-friction-report.md](ux-friction-report.md) | Click friction, confusing flows, labels, hidden actions, and dead ends. |
| [frontend-consistency-report.md](frontend-consistency-report.md) | Duplicate patterns and system standardization map. |
| [frontend-master-plan.md](frontend-master-plan.md) | Keep, improve, rebuild, remove, implementation order, verification. |

## Implementation Gate

The master plan has moved into execution. The intended order is:

1. Keep package status in [frontend-execution-plan.md](frontend-execution-plan.md).
2. Patch frontend code package by package.
3. Verify with lint, typecheck, e2e, screenshots, breakpoints, contrast, and cursor/menu checks.
4. Promote completed packages from in-progress to verified only after browser QA.

## Current Execution Batch

Batch 1 covers P0 chrome stability:

- Cursor/menu layering and hover state cleanup.
- Menu safe-area, touch target, scroll containment, and menu-open state.
- Header layer tokens and explicit color mode infrastructure.
- Footer IA cleanup, removal of `EN`, and removal of footer final-sale copy.
- Public UI final-sale phrase removal with neutral policy wording.

## Motion Artifacts

The RPA reference animation pass includes video and sampled frames:

- `artifacts/rpa-animation-audit/video/rpa-reference-motion-desktop-full.webm`
- `artifacts/rpa-animation-audit/video-frames-full/`
- `artifacts/rpa-animation-audit/reference-motion-video-observations-full.json`
