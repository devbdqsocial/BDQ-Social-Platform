# design-debt.md — Design Debt Register

> Spec 14/15. Every known visual/UX debt item as one row: where, what, severity, the exact fix,
> and the roadmap package that retires it. Sourced from [consistency.md §7](consistency.md)
> (items C1–C26 keep their numbering) plus new findings. Severity: **P0** = brand/trust damage
> on a money surface · **P1** = visible inconsistency · **P2** = internal/cleanliness.
> A row may only be closed by the named package; new debt = new row, never silent fixes.

| ID | Component / Surface | Issue | Sev | Exact fix | Package |
| --- | --- | --- | --- | --- | --- |
| D1 (C2) | Razorpay checkout modal | `theme.color: "#C2603B"` retired clay at the highest-trust moment (`src/lib/razorpay-checkout.ts:50`) | P0 | Export `BRAND_NAVY = "#01065B"` from token constants; use in checkout opts | R2.1 |
| D2 (C4) | Public `/map` | Demo layout + fake statuses (`(public)/map/page.tsx:9-10`) | P0 | Real event layout, brand-view map per customer-portal §3.4 | R3.5 |
| D3 | Admin Task Center | Hardcoded mock kanban (`ops/tasks/page.tsx`) | P0 | Delete page + nav refs ✔owner | R5.1 |
| D4 (C1) | Vendor portal (9 pages) | shadcn semantic styling instead of RPA layer | P0 | Full RPA rebuild per vendor-portal.md | R4.1 |
| D5 (C23) | Checkout vs actions | Two error envelopes (HTTP-status vs `{ok,error}`) | P1 | `Result<T>` envelope (architecture §3) | R0.3 |
| D6 (C10) | All customer pages | `style={{fontSize: var(--h…)}}` inline (7+ files) | P1 | `f-h*` utilities + ESLint ban | R2.1 |
| D7 (C11) | Same files | Five ad-hoc inline line-heights (0.9/0.95/0.98/1.0/1.05) | P1 | `--lh-*` tokens only | R2.1 |
| D8 (C12) | Coming-soon | Inline letter-spacing ×3 duplicating `.kicker` | P1 | `.kicker` class | R3.1 |
| D9 (C13) | `.rpa` root | `font-size: 1.25vw` breaks zoom/user font prefs (WCAG 1.4.4) | P0 | clamp() scale (design-system §1.2) + 16px input floor (mobile §1) | R2.1 |
| D10 (C3) | `globals.css` | Legacy `gold-*`/`clay-*` alias block | P2 | Migrate consumers, delete aliases | R2.1 |
| D11 | `ui/badge.tsx:14,16` | `pending` (clay) and `gold` variants reference dead ramps | P1 | Delete variants; map pending→warning, gold→primary in `status-badges.ts` | R2.2 |
| D12 (C15) | `lib/stall-colors.ts` | Stall hexes duplicated outside token file | P2 | Single exported constant from tokens (design-system §1.1) | R2.1 |
| D13 (C6) | 7 admin tables in page dirs | `EventsTable` `VendorsTable` `OrdersTable` `PaymentsTable` `StaffTable` `SponsorsTable` `StallsTable` embedded in `app/admin/**` | P2 | Move to `components/admin/tables/`; share badges/dates libs | R2.2 |
| D14 (C16) | 4+ files | Per-file `Intl.DateTimeFormat` despite `lib/date-formats.ts` (`(public)/page.tsx:19`, customer dashboard, vendor leads, ops monitor) | P1 | Import the lib everywhere; grep gate | R2.2 |
| D15 (C9) | Vendor dashboard | Inline approval-status badge map duplicating `status-badges.ts` | P1 | Shared lib (page is rebuilt anyway) | R4.1 |
| D16 (C7/C8) | Customer/vendor pages | Hand-rolled empty states + copy-pasted page-header stacks | P1 | `RpaPageHeader` + §3.9 empty pattern | R2.2 |
| D17 (C22) | Admin console | `Toaster` mounted, zero `toast()` calls — actions give no feedback | P1 | Toast rule (design-system §4.6) wired in the `action()` pipeline client hook | R0.3 + R2.2 |
| D18 (C21) | `(public)/events/[slug]`, vendor stall picker | No route `loading.tsx` on the two highest-stakes pages | P1 | Skeletons mirroring layout | R3.3 / R4.1 |
| D19 (C19/C20) | Admin nav | POS + Settings pages orphaned (reachable, not in nav) | P1 | Final nav tree (admin-portal §1) | R5.1 |
| D20 (C24) | QR `<img>` (dashboard, leads) | No width/height → CLS | P2 | Explicit dims | R3.4 / R4.1 |
| D21 (C25) | `server/auth/guard.ts:71` | `requireSuperAdmin` passes ADMIN (lying name) | P1 | Rename pair (security §3.2) | R0.4 |
| D22 (C5) | `.admin` font scoping | `!important` cascade fights (`globals.css:464-467, 589-592`) | P2 | Scope at zone root, remove `!important` | R2.1 |
| D23 (C14/C26) | Booking enum / misc | Legacy `HELD`/`PENDING` states surface in admin status maps | P2 | State-machine collapse | R1.3 |
| D24 | Landing hero | Hero image = first vendor logo in a mask (`(public)/page.tsx:37`) — accidental art direction | P1 | Real key art per changes.md §6.2 | R3.2 |
| D25 | Landing copy | Static claims ("80+ curated brands") not bound to data | P1 | Bind to real counts or cut (design-system §6) | R3.2 |
| D26 | Coming-soon | Countdown target hardcoded `2026-10-01` (`ComingSoonClient.tsx:14`) | P1 | Drive from event/SystemSetting | R3.1 |
| D27 | Cursor z-index | `#mouse` z `99999999` outside scale | P2 | z-100 per design-system §1.6 | R2.1 |
| D28 | Admin mobile tables | Horizontal-scroll-only tables unusable on phones | P1 | `<ResponsiveTable>` card rule (mobile §5) | R5.1 |
| D29 | Customer tab bar | 3 destinations; companion IA needs 4 (Home/Schedule/Map/Tickets) | P1 | customer-portal §2 | R3.4 |
| D30 | WordmarkWall (CTA section) | 5 marquee rows on mobile — paint cost | P2 | 3 rows <640px (mobile §2.2) | R3.2 |
| D31 | `components/motion` | swiper (1 consumer) + framer-motion (1 consumer) in deps | P2 | CSS scroll-snap + CSS transition; remove deps | R2.3 |
| D32 | Event detail tabs | 237-line page with 7 inline tab sections (`admin/(console)/events/[id]/page.tsx`) | P2 | Routed sub-tabs (admin-portal §3) | R5.1 |
| D33 | `MapDesigner.tsx` | 24KB monolith: state, keyboard, panels, tools in one file | P2 | Split per map-system §13 (`useDesignerState`, panels, tools) | R2.5.1 |
| D34 | Designer bg image | Underlay renders unscaled (`canvas.bgImage` has no calibration) — drawn objects don't match the photo's real ground | P1 | 2-point calibration + ftPerPx + locked layer (map-system §2) | R2.5.2 |
| D35 | Vendor stall sheet | Shows only label/price — no zone, no distance, no "why this stall"; sells premium stalls on faith | P1 | Scoring-driven sheet per map-system §11 | R4.1 |
| D36 | Map exports | PNG-only, single variant; no scale bar, no vendor/ops/print outputs | P2 | Export variants + scale bar (map-system §12) | R2.5.15 |

Open-count by severity at register creation: **P0 ×5 · P1 ×19 · P2 ×12.**
Definition of done: every row closed = its package's acceptance passed AND the row's own grep/
visual check green. The register is updated in the same PR that closes a row.
