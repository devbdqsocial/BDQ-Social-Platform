# consistency.md — The Single Unified Design Language

> Rebuild blueprint, part 2 of 15. Forward-looking spec for the rebuilt platform, followed by the
> evidence catalogue of every inconsistency the rebuild eliminates (exact files). Companion docs:
> [changes.md](changes.md) (master), [architecture.md](architecture.md), [performance.md](performance.md).
>
> **Authority note (extension, 2026-06-12):** the complete component-level visual spec now lives
> in [design-system.md](design-system.md) — where this file and that one overlap, design-system.md
> wins. The §7 catalogue below is tracked to closure as the register in
> [design-debt.md](design-debt.md) (rows D1-D32 map to C-numbers). Owner-confirmed: customer AND
> vendor portals use the identical RPA component library; admin stays neutral OKLCH.

---

## 1. Verdict

The platform today runs **three and a half design systems at once**:

1. **RPA fluid-em layer** (`.rpa` in `src/app/globals.css:220`) — customer-facing zone. Fluid
   `--fsize: 1.25vw` root, em-based type/spacing tokens, gama/bg colour-blocked sections,
   Exat display + Inter body, angled clip-path buttons.
2. **Warm semantic shadcn tokens** (`:root` in `globals.css:113`) — cream/navy values with
   shadcn-compatible names. The **vendor portal** consumes these (not the `.rpa` layer),
   despite the project rule that vendor surfaces get RPA treatment.
3. **Admin neutral OKLCH scope** (`.admin` in `globals.css:413`) — shadcn default greys, Geist
   font, enforced with `!important` font overrides (`globals.css:464-467`, `589-592`).
4. *(the half)* **Legacy gold/clay aliases** (`globals.css` `@theme inline`, "Legacy ramp
   aliases" block) — retired palette names remapped to RPA hues "removed as each is migrated."

The rebuild keeps the **two-brand split** (RPA customer-facing / neutral admin — it is a locked
rule and a good one) but collapses everything else into **one token vocabulary, one component
contract per pattern, and one motion system**, with the vendor portal migrated onto the RPA side
as the rules require.

---

## 2. Token architecture (target)

One file, three layers, zero aliases:

```
globals.css
├── @theme inline        — primitive ramps (navy, lavender, cream, ink, green, yellow, pink, red,
│                          stall-status) + font vars. NOTHING ELSE references raw hex.
├── :root / .dark        — semantic slots (background, foreground, primary, …) = RPA values.
│                          Customer pages and vendor portal consume ONLY these + .rpa utilities.
└── .admin / .admin.dark — semantic slots = neutral OKLCH. Admin consumes ONLY these.
```

Rules:
- **Delete the legacy aliases** (`--color-gold-*`, `--color-clay-*`). Migrate the remaining
  consumers (grep `gold-|clay-` → `src/components/ui/badge.tsx`, landing remnants) first.
- **No raw hex outside `globals.css`.** Current violations to fix: `src/lib/razorpay-checkout.ts:50`
  (`theme: { color: "#C2603B" }` — the *retired clay* in the live payment modal; must become navy
  `#01065B` sourced from one exported constant), stall colors in `src/lib/stall-colors.ts` (move
  values into the token file or read CSS vars).
- **One badge system, one button system per brand side** (see §5).
- The `.rpa` zone class stays, but its type/spacing utilities become the only sizing mechanism on
  customer surfaces (see §3 — today pages mix utility classes and inline styles for the same thing).

---

## 3. Master typography scale

### 3.1 The problem with today's scale

The RPA zone sets `font-size: 1.25vw` on the zone root (`globals.css:199-217`). Viewport-only
units **ignore browser zoom text-scaling and OS font-size preferences** (WCAG 1.4.4), and produce
unbounded growth on ultra-wide screens. The em-token idea is right; the root unit is wrong.

### 3.2 Target: clamp()-based fluid scale, rem-anchored

Replace `--fsize: <vw>` breakpoint switches with a single fluid root:

```css
.rpa { font-size: clamp(0.875rem, 0.55rem + 0.9vw, 1.25rem); }
```

Keep the existing em-token names (they are good) so component markup barely changes:

| Token | em | ~320px | ~768px | ~1280px | ~1440px | ≥1920px (cap) |
| --- | --- | --- | --- | --- | --- | --- |
| `--paragraph-small` | 0.75 | 10.5px | 12px | 13.5px | 14.3px | 15px |
| `--paragraph` | 1 | 14px | 16px | 18px | 19px | 20px |
| `--h32` | 1.333 | 18.7px | 21.3px | 24px | 25.4px | 26.7px |
| `--h42` | 1.75 | 24.5px | 28px | 31.5px | 33.3px | 35px |
| `--h60` | 2.5 | 35px | 40px | 45px | 47.5px | 50px |
| `--h76` | 3.167 | 44px | 50.7px | 57px | 60.2px | 63.3px |
| `--h100` | 4.167 | 58px | 66.7px | 75px | 79.2px | 83.3px |
| `--h133` | 5.542 | 77.6px* | 88.7px | 99.8px | 105px | 110.8px |
| `--h235` | 9.792 | —* | 156.7px | 176px | 186px | 195.8px |

\* keep the existing mobile down-shifts for the two display sizes (`--h235`, `--h133` overrides at
≤950px/≤576px, `globals.css:215-217`) — they are correct art direction; just re-express them in the
clamp system.

Line heights stay as tokenized today (`--lh-*`, `globals.css:204-206`): 1.3 body, 1.15 small
headings, 1.05 display. **Ban inline `lineHeight` overrides** (today: `0.9`, `0.95`, `0.98`,
`1.0` ad-hoc per page — see §7.3).

### 3.3 Admin scale

Admin stays rem/16px (correct for a data console). Standardize on the shadcn ladder and stop
arbitrary values: `text-xs / sm / base / lg / xl / 2xl / 3xl`. Page title = `text-3xl font-bold
tracking-tight` exactly as `PageHeader` renders it — **every admin/vendor page must use
`PageHeader`** (`src/components/ui/page-header.tsx`), not hand-rolled `<h1>` (violations in §7.6).
One arbitrary size exists today (`text-[10px]` in the Task Center mock, which is being removed).

### 3.4 Usage rule (the one that kills the drift)

**Class utilities only, never inline styles.** `f-h133`…`f-paragraph-small` utilities already
exist (`globals.css:257-265`) yet nearly every customer page bypasses them with
`style={{ fontSize: "var(--h133)" }}` (see §7.3). In the rebuild, the inline-style form is
forbidden (enforced by an ESLint rule banning `style` props containing `fontSize`/`--h`).

---

## 4. Spacing system

The RPA em-spacing ramp (`--space-xs … --space-5xl`, `globals.css:208-210`) is the single
spacing vocabulary for customer surfaces; Tailwind's 4px ladder is the single vocabulary for
admin. Both already exist — the rebuild only enforces exclusivity:

- Customer/vendor surfaces: `p-[var(--space-…)]` / `gap-[var(--space-…)]` only.
- Admin: Tailwind numerics only (`p-4 sm:p-6` page gutter as in `admin/(console)/layout.tsx:51`).
- Section rhythm (customer): hero `py-[--space-5xl]`, standard section `py-[--space-5xl]`,
  compressed band `py-[--space-4xl]` — exactly the three used on the landing page; no new values.

---

## 5. Component contracts (one implementation per pattern)

| Pattern | Customer/Vendor (RPA) | Admin | Kill |
| --- | --- | --- | --- |
| Button | `.btn` angled tab (`globals.css:356-377`) + `.btn--lg`, `.btn--accent` | `ui/button.tsx` variants | any new variant; raw `<button>` with ad-hoc classes |
| Badge | `.badge-rpa` / `--muted` (`globals.css:388-396`) | `ui/badge.tsx` | duplicate status→variant maps (use `src/lib/status-badges.ts`, already extracted) |
| Card | `.paint` section blocks + bordered tiles | `ui/card.tsx` | hand-rolled `rounded-xl border border-border bg-card` strings (vendor leads list, `vendor/(app)/leads/page.tsx:58`) |
| Table | n/a (lists) | `components/data-table` + per-domain column files | the 7 page-embedded tables (`EventsTable.tsx`, `VendorsTable.tsx`, `OrdersTable.tsx`, `PaymentsTable.tsx`, `StaffTable.tsx`, `SponsorsTable.tsx`, `StallsTable.tsx`) move to `components/admin/tables/` |
| Modal/Drawer | none on customer side (keep it that way) | `ui/dialog.tsx` / `ui/sheet.tsx` | — |
| Form | RPA underline inputs (coming-soon pattern) | `ui/field.tsx` + `ui/input.tsx` + Zod | per-form bespoke input styling |
| Empty state | dashed-border block (customer dashboard pattern) | `ui/empty-state.tsx` | hand-rolled empties — pick ONE per side and reuse |
| Page header | `kicker + f-exat h1 + f-paragraph` stack (repeated verbatim on every customer page — extract `<RpaPageHeader>`) | `ui/page-header.tsx` | inline copies |
| Feedback | inline `role="alert"` text (checkout pattern) | `sonner` toasts | silent failures; admin actions that render no feedback |
| Charts | none | `components/charts/*` (recharts) wrappers only | raw recharts imports in pages |
| Loading | route `loading.tsx` + `ui/skeleton.tsx` | same + `components/admin/skeletons.tsx` | pages with no loading state (see §7.7) |

**Toast rule:** `Toaster` is mounted in admin (`admin/(console)/layout.tsx:55`); every admin
server action resolves to a success/error toast. (Today `toast(...)` is never called anywhere —
mounted but mute.)

---

## 6. Motion standard

Today four motion stacks coexist: **GSAP** (+ScrollTrigger, `src/lib/gsap.ts`, all
`components/motion/*`), **Lenis** smooth-scroll (`SmoothScroll.tsx`), **Swiper**
(`BrandsCarousel.tsx` — its only consumer), and **framer-motion** (admin page transition,
`admin/(console)/template.tsx:3`).

Target: **GSAP + Lenis only, customer zone only.**

- Swiper → replace `BrandsCarousel` with CSS `scroll-snap` + the existing `Marquee` pattern
  (one dependency gone; see performance.md §3).
- framer-motion → replace the admin fade/slide template with a 150ms CSS transition
  (one dependency gone; an admin console doesn't need an animation library).
- Every GSAP effect must respect `prefers-reduced-motion` — the CSS side already does
  (`globals.css:571-586`); the JS side must gate `ScrollTrigger`/pinning the same way
  (`lib/motion.ts` is the place).
- The custom cursor (`Cursor.tsx`, `#mouse`) stays customer-only, pointer-fine only (already
  correct, `globals.css:294`).
- Motion inventory (keep, they're the brand): `Reveal`, `SplitReveal`, `Parallax`, `Marquee`,
  `WordmarkWall`, `PinnedServices`, `SectionColorSync`, `PageLoader`, `Magnetic`.

---

## 7. Evidence catalogue — every inconsistency the rebuild eliminates

### 7.1 Zone-level brand drift (the big one)

| # | Where | What | Fix |
| --- | --- | --- | --- |
| 1 | `src/app/vendor/(app)/layout.tsx`, all vendor pages | Vendor portal is built on shadcn semantic tokens (`Card`, `Badge`, `text-muted-foreground`), not the `.rpa` layer — violates the locked rule "customer + vendor portals add the RPA token layer" | Rebuild vendor pages on `.rpa` (same components as customer side); keep `ZoneSidebar` chrome |
| 2 | `src/lib/razorpay-checkout.ts:50` | Payment modal themed retired-clay `#C2603B` — off-brand at the **highest-trust moment** | Navy `#01065B` from a shared constant |
| 3 | `globals.css` legacy alias block (`--color-gold-*`, `--color-clay-*`) | Transitional aliases keep dead names alive | Migrate consumers, delete aliases |
| 4 | `src/app/(public)/map/page.tsx:9-10` | Public map renders demo template + `assignDemoStatuses` fake availability | Owner-confirmed: drive from the active event's real layout/statuses |
| 5 | `.admin` font enforcement via `!important` (`globals.css:464-467`, `589-592`) | Cascade fights instead of scoped tokens | Scope font at the zone root once; remove `!important` |

### 7.2 Component duplication

| # | Where | What | Fix |
| --- | --- | --- | --- |
| 6 | 7 tables in `src/app/admin/(console)/**` (`EventsTable`, `VendorsTable`, `OrdersTable`, `PaymentsTable`, `StaffTable`, `SponsorsTable`, `StallsTable`) | Domain tables embedded in page dirs; each re-declares column/badge/format logic | Move under `components/admin/tables/`; share `status-badges.ts` + `date-formats.ts` |
| 7 | `src/app/(customer)/dashboard/page.tsx` (dashed empty state) vs `ui/empty-state.tsx` | Two empty-state implementations | One per brand side (§5) |
| 8 | Customer page headers: `(customer)/dashboard/page.tsx`, `(public)/events`, `(public)/vendors`, `coming-soon/ComingSoonClient.tsx` | `kicker + f-exat h1 + paragraph` stack copy-pasted | Extract `<RpaPageHeader>` |
| 9 | `vendor/(app)/dashboard/page.tsx` STATUS map vs `lib/status-badges.ts` | Vendor-approval badge map re-declared inline | Use the shared lib |

### 7.3 Typography drift (customer zone)

| # | Where | What |
| --- | --- | --- |
| 10 | `(public)/page.tsx:48,114,130,150,171,191,200` · `(customer)/dashboard/page.tsx` · `(customer)/login/page.tsx` · `coming-soon/ComingSoonClient.tsx:63,74,83,92,100` | `style={{ fontSize: "var(--h…)" }}` inline instead of the `f-h…` utilities that exist for exactly this |
| 11 | same files | Ad-hoc inline `lineHeight`: `0.9` (login), `0.95` (coming-soon), `0.98` (hero), `1.0`, `1.05` — five values where the `--lh-*` tokens define two |
| 12 | `coming-soon/ComingSoonClient.tsx:60,75,120` | Inline `letterSpacing: "0.2em"/"0.14em"/"0.08em"` duplicating what `.kicker` (`globals.css:328-331`) already provides |
| 13 | `.rpa` root `font-size: 1.25vw` (`globals.css:199`) | vw-only type defeats user font-size settings & zoom (WCAG 1.4.4) | clamp() rem-anchored scale (§3.2) |

### 7.4 Color violations

| # | Where | What |
| --- | --- | --- |
| 14 | `src/lib/razorpay-checkout.ts:50` | Raw retired hex in TS source (see #2) |
| 15 | `src/lib/stall-colors.ts` | Stall status hexes duplicated outside the token file (`--color-stall-*` exists in `globals.css`) — two sources of truth for the same colours |

### 7.5 Date/number formatting

| # | Where | What |
| --- | --- | --- |
| 16 | `(public)/page.tsx:19` (`fmtDate`) · `(customer)/dashboard/page.tsx` (`fmt`) · `vendor/(app)/leads/page.tsx` (`fmt`) · `ops/monitor/page.tsx` (`time`) | Per-file `Intl.DateTimeFormat` redefinitions while `src/lib/date-formats.ts` exists | All callers import the lib |

### 7.6 Layout & chrome

| # | Where | What |
| --- | --- | --- |
| 17 | `vendor/(app)/leads/page.tsx` uses `PageHeader`; `vendor/(app)/dashboard`, `onboarding`, `events/[id]` hand-roll `<h1 className="font-display text-3xl …">` | Same portal, two header mechanisms |
| 18 | `components/nav/ZoneSidebar.tsx` (vendor) vs `components/ui/sidebar.tsx` + `app-sidebar.tsx` (admin) | Two sidebar systems. Acceptable across the brand split, but vendor's must be restyled RPA when #1 is fixed |
| 19 | `ops/pos/page.tsx` exists with no nav entry (`components/admin/nav-config.ts` has no `/pos` leaf) | Orphan page — owner-confirmed: add to Operations group |
| 20 | `system/settings/page.tsx` reachable via `/settings` (middleware map) but absent from `NAV_GROUPS` | Same orphan pattern — add to System group or fold into Profile |

### 7.7 States & polish

| # | Where | What |
| --- | --- | --- |
| 21 | `loading.tsx` exists for `(customer)`, admin console root + 7 admin list pages — but NOT for `(public)/events/[slug]` (the conversion-critical page) or `vendor/(app)/events/[id]` (the booking map) | Add route-level loading skeletons to both |
| 22 | `sonner` mounted (`admin/(console)/layout.tsx:55`) with zero `toast()` calls in `src/` | Admin actions give no feedback; adopt the toast rule (§5) |
| 23 | Error feedback contract differs: API-route consumers read HTTP status (`TicketCheckout.tsx`) vs action consumers read `{ok,error}` | Unify on one error envelope (architecture.md §5) |
| 24 | QR `<img>` with data-URLs (`(customer)/dashboard/page.tsx`, `vendor/(app)/leads/page.tsx`) | Fine (data URLs can't use next/image) — but add `width/height` to stop layout shift |

### 7.8 Naming

| # | Where | What |
| --- | --- | --- |
| 25 | `src/server/auth/guard.ts:71` | `requireSuperAdmin()` **also passes ADMIN**; the strict variant is `requireSuperAdminOnly()`. A guard whose name lies is a security-review hazard. Rename: `requireAdminRole()` / `requireSuperAdmin()` |
| 26 | `BookingStatus` enum carries `HELD` + `PENDING` marked "legacy" in `prisma/schema.prisma:103-111` | Remove legacy states with the booking state-machine cleanup (architecture.md §6) |

---

## 8. Definition of done (consistency)

- `grep -rn "fontSize: \"var(--h" src/` → 0 hits.
- `grep -rn "#C2603B\|gold-\|clay-" src/` → 0 hits.
- Every admin/vendor page renders `PageHeader`; every customer page renders `RpaPageHeader`.
- One table system, one badge map, one date-format lib — verified by grep, enforced by review.
- `npx playwright test` axe pass on: coming-soon, landing, event detail, login, dashboard,
  vendor onboarding, admin dashboard — no contrast or focus violations at 320/768/1440px.
