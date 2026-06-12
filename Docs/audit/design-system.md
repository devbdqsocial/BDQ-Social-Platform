# design-system.md — The Complete Visual Language (authoritative)

> Spec 8/15. This document is the **single source of truth for every visual decision** in the
> rebuild. If a value is not here, it does not exist — agents never invent a px, ms, hex, or
> easing. [consistency.md](consistency.md) explains *why*; this file defines *what*.
> Two brand sides, one vocabulary:
> **RPA side** = public + customer + vendor (identical component library — owner instruction).
> **Admin side** = neutral OKLCH console. Never mix sides.

---

## 1. Foundations

### 1.1 Color — RPA primitives (the only raw hexes allowed, defined once in `globals.css @theme`)

| Token | Hex | Role |
| --- | --- | --- |
| `--dark-blue` (navy-500) | `#01065B` | Primary brand, hero/section bg, primary buttons |
| `--light-blue` (lavender-400) | `#868EFF` | Accent, ring, glow; **fills only — never small text** |
| `--dark-green` | `#1A3526` | Section bg (gama-1.bg-2) |
| `--green` | `#92FF73` | Section fg pair for dark-green/dark-blue |
| `--yellow` | `#D0F95F` | Section fg (gama-2.surface-1), cursor dot |
| `--pink` | `#FF58AC` | Section fg (gama-2.surface-2) |
| `--dark-red` | `#560900` | Section bg (gama-3) |
| `--red` | `#FF514D` | Section fg pair; **error text inside RPA zone** |
| cream-50/100/200/300 | `#FBFAF6 #F4F2EC #ECEAE2 #E4E2DA` | Page bg, card bg, muted, border |
| `--ink` | `#14141A` | Body text on cream |
| navy ramp 50–900 | `#EAEAF4 #C9CAE3 #6A6DA8 #01065B #01044A #010338 #050814` | Tints/shades |
| lavender ramp 100–700 | `#E7E8FF #B4B9FF #868EFF #6C75F5 #4A53C8` | Tints/shades |

Section pairs (verbatim from `globals.css:231-238`, unchanged): `gama-1.bg-1` navy/lavender ·
`gama-1.bg-2` dark-green/green · `gama-1.bg-3` navy/green · `gama-2.surface-1` navy/yellow ·
`gama-2.surface-2` navy/pink · `gama-3.bg-1` dark-red/red · `gama-3.bg-2` dark-green/green ·
`gama-3.bg-3` dark-red/green.

**Page colour rhythm rule:** a page never stacks two sections of the same pair; cream separates
saturated pairs; max 1 `gama-3` (red) section per page; the final CTA section is always
`gama-3.bg-3` or `gama-1.bg-3`.

Semantic slots (light): background `#F4F2EC` · foreground `#14141A` · card `#FBFAF6` · primary
`#01065B` on `#FFFFFF` · secondary/accent `#868EFF` on `#0B0B14` · muted `#ECEAE2` /
muted-fg `#52525C` · destructive `#C0392B` · success `#2F8F5B` · warning `#C9871A` · info
`#2C5FB8` · border `#E4E2DA` · input `#D9D7CE` · ring `#868EFF` (all current
`globals.css:113-146` — carried as-is). Dark mode: as `globals.css:149-181`, carried as-is.

Admin OKLCH (light+dark): carried exactly as `globals.css:413-454`. **No purple anywhere in
admin** (chart-4 already remapped to amber). Charts use only `--chart-1…5`.

Stall status (both sides, one source): available `#3FA66A` · held `#E8B23A` · pending `#E07B2C`
· booked `#8C8576` · blocked `#4E4639`. **Delete `src/lib/stall-colors.ts` values — konva reads
these via one exported constant generated from the tokens.**

**Deleted:** `--color-gold-*`, `--color-clay-*` aliases; `#C2603B` anywhere; Badge variants
`pending`/`gold` (see §4.2).

### 1.2 Typography

Families: **Exat-Bold** (`src/app/fonts/exatcyrwide-bold.woff2`, display, weight 700 only,
preloaded, `font-display: swap`) · **Inter** (body, weights 400/500/700, latin subset) ·
**Geist** (admin only, loaded in admin layout only, weights 400/500/600/700).

RPA fluid root (replaces `--fsize` vw switches):

```css
.rpa { font-size: clamp(0.875rem, 0.55rem + 0.9vw, 1.25rem); }
```

Scale (em on `.rpa` root; px columns are computed reference, not separate values):

| Utility | em | lh | 320px | 768px | 1280px | 1920px | Use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.f-paragraph-small` | 0.75 | 1.3 | 10.5 | 12 | 13.5 | 15 | captions, legal, kicker base |
| `.f-paragraph` | 1 | 1.3 | 14 | 16 | 18 | 20 | body |
| `.f-h32` | 1.333 | 1.15 | 18.7 | 21.3 | 24 | 26.7 | card titles, stepper labels |
| `.f-h42` | 1.75 | 1.15 | 24.5 | 28 | 31.5 | 35 | sub-headings, ticket name |
| `.f-h60` | 2.5 | 1.05 | 35 | 40 | 45 | 50 | section sub-titles, FAQ q |
| `.f-h76` | 3.167 | 1.05 | 44 | 50.7 | 57 | 63.3 | page titles (portal) |
| `.f-h100` | 4.167 | 1.05 | 58 | 66.7 | 75 | 83.3 | manifesto, countdown digits |
| `.f-h133` | 5.542 | 1.05 | — (mobile override 2.5em) | 88.7 | 99.8 | 110.8 | landing/section heroes |
| `.f-h235` | 9.792 | 1.05 | — (override 3.33em) | 156.7 | 176 | 195.8 | login wall, single statements |

Mobile display overrides (kept from `globals.css:215-217`): ≤950px `--h235:6.25em --h133:4.1667em
--h100:2.9166em`; ≤576px `--h235:3.3333em --h133:2.5em --h76:2.3333em --h60:1.9166em`.

`.kicker` (the ONLY micro-label): `f-paragraph-small`, weight 700, uppercase,
`letter-spacing: 0.14em`. No other letter-spacing values exist on the RPA side.

Rules: headings = Exat via the `f-h*` utility (never `style={{fontSize}}` — ESLint-banned);
body = Inter; max heading width `max-w-[14ch]`(h133+) / `[18ch]`(h100) / `[24ch]`(h76);
body copy `max-w-[52ch]`; numerals in countdowns/prices use `tabular-nums`.

Admin: Geist everywhere. Ladder only — 12/14/16/18/20/24/30px (`text-xs…text-3xl`). Page title
`text-3xl font-bold tracking-tight` (via `PageHeader`); card title `text-base font-semibold`;
table cells `text-sm`; helper text `text-xs text-muted-foreground`. No arbitrary `text-[...]`.

### 1.3 Spacing

RPA (em, scale with zone root): xs 0.1667 · sm 0.3333 · md 0.6667 · lg 1 · xl 1.3333 · 2xl 2 ·
3xl 2.6667 · 4xl 4 · 5xl 6. Usage map: control gaps = sm/md · element gaps = lg/xl · block gaps
= 2xl/3xl · section padding = 4xl/5xl. Admin: Tailwind 4px ladder; page gutter `p-4 sm:p-6`;
card padding `p-6`; control gap `gap-2`; section gap `space-y-6`.

### 1.4 Radius

RPA: sharp by default (sections, tiles = 0); `--radius-lg` 16px for ticket cards;
999px pills (badges, qty steppers). Admin: `--radius: 0.625rem` (10px) base; cards `rounded-xl`
(12px); buttons `rounded-lg` (8px, from button.tsx); inputs `rounded-lg`.

### 1.5 Shadows & glow

`--shadow-sm 0 1px 2px rgba(21,18,14,.06)` · `--shadow-md 0 6px 20px rgba(21,18,14,.10)` ·
`--shadow-lg 0 18px 48px rgba(21,18,14,.16)` · `--shadow-glow 0 0 32px rgba(134,142,255,.35)`.
Usage: RPA side is **flat** — shadows only on overlays (sheet/modal) and the ticket card
(`shadow-md`, glow on the reveal moment only). Admin: cards `shadow-sm`, popovers `shadow-md`,
nothing larger.

### 1.6 Z-index scale (the only allowed values)

| Layer | z | Used by |
| --- | --- | --- |
| base | 0 | content |
| sticky elements | 10 | section tickers, sticky CTAs |
| nav/header | 40 | PublicHeader, CustomerTabBar, admin header |
| overlay/scrim | 50 | dialog/sheet scrims |
| overlay content | 51 | dialog/sheet panels |
| toast | 60 | sonner |
| page loader | 90 | PageLoader |
| custom cursor | 100 | `#mouse` (replaces the current `99999999`) |

### 1.7 Breakpoints & grid

Breakpoints (Tailwind defaults, the only ones referenced): 640 · 768 · 1024 · 1280 · 1536.
Design QA viewports: 320, 375, 390, 414, 768, 1024, 1280, 1440, 1920 (see mobile.md).
RPA grid: 12-col `wrapper` calc system as built (`globals.css:268-279`); content max-width none
(full-bleed sections) except text wells `max-w-[60rem]`/`[62rem]`. Admin: fluid with
`min-w-0` guards; tables scroll horizontally inside cards, never the page.

### 1.8 Iconography

lucide-react only. Sizes: 16px (`size-4`) inline/buttons · 20px (`size-5`) nav · 24px
(`size-6`) feature/empty-state. Stroke 2 (default). RPA side prefers **typography and arrows
(`→`, `link--split`) over icons** — icons appear only in the tab bar, form affordances, and the
guide page. Never mix icon sizes inside one control row.

---

## 2. Motion

### 2.1 Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--dur-1` | 150ms | hovers, toggles, admin everything |
| `--dur-2` | 330ms | RPA button morphs, link wipes (current `.33s`) |
| `--dur-3` | 600ms | reveals, sheet/modal enter |
| `--dur-4` | 750ms | media zoom (current) |
| `--ease-out` | `cubic-bezier(0.25, 1, 0.5, 1)` | default exits/wipes |
| `--ease-swift` | `cubic-bezier(0.22, 1, 0.36, 1)` | media zoom (current) |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | RPA buttons/cursor (current) |

### 2.2 Choreography rules

Stagger children 60ms, max 6 staggered items; one Reveal per viewport-entry, never re-trigger on
scroll-up; pinned sections (PinnedServices) max ONE per page; marquees pause on hover (built)
and on `document.hidden`; no parallax beyond ±10% (current `Parallax amount={10}` is the cap);
admin side: `--dur-1` opacity/transform only — **no GSAP, no page-transition library** (the
framer-motion template is removed).

### 2.3 Reduced motion

CSS side already global (`globals.css:571-586`). JS rule: `lib/motion.ts` exposes
`prefersReducedMotion()`; every GSAP/ScrollTrigger init early-returns to final state; Lenis not
initialized; marquees static; ticket reveal (delight.md §1) jumps to end frame.

### 2.4 Effect inventory (the complete allowed set)

`Reveal` (fade+8px rise, dur-3) · `SplitReveal` (per-char/word rise, 60ms stagger) · `Parallax`
(±10%) · `Marquee` (40s loop default, 28-36s used) · `WordmarkWall` (24s, opacity .10) ·
`PinnedServices` (pin + horizontal translate, desktop only) · `SectionColorSync` · `PageLoader`
(first visit only, ≤1.2s, skips automation UAs — built) · `Magnetic` (buttons, ±0.25em) ·
media-zoom (scale 1.45, dur-4) · link-underline wipe (dur-2) · cursor expand (dur-2 bounce).
Anything not listed = not allowed without a design-system PR.

---

## 3. RPA component contracts (public + customer + vendor)

Every component: anatomy → variants → states. States not listed inherit: focus =
`outline 2px var(--ring), offset 2px` (global, `globals.css:564-569`); disabled = opacity .45 +
`cursor: default`.

### 3.1 `.btn` — angled tab button (primary action)
- Anatomy: clip-path polygon plate (`aspect 171/75`) + `.btn__text` (70%×40%, bottom-left).
- Sizes: default `width: 8.5em` · `.btn--lg 12em`. Variants: section-pair (default,
  bg=`--color`/fg=`--bgcolor`) · `.btn--accent` (lavender/navy — use outside gama sections).
- States: hover/focus-visible = clip-path morph + text shift (dur-2 bounce, as built
  `globals.css:362-377`); active = translate-y 1px; disabled = opacity .45, no morph;
  **loading = text swaps to gerund copy ("Starting…", "Joining…") — never a spinner inside `.btn`.**
- One primary `.btn` per viewport; secondary action = `link--split` arrow link.

### 3.2 Inputs (the underline family — coming-soon is the reference)
- Text/tel/email: borderless, `border-bottom: 1px solid var(--color)`, padding-bottom
  `--space-md`, font `f-h42` for hero forms / `f-paragraph` for standard forms; placeholder
  opacity .5; focus = border-bottom 2px (no layout shift: margin-bottom compensates −1px);
  error = border-bottom `--red` + `f-paragraph-small f-bold` message in `--red` with
  `role="alert"`, 4px gap below.
- Checkbox (RPA): 1.1em square, 3px radius, border `--color`; checked = filled `--color` with
  0.5em inner square `--bgcolor` (as ComingSoonClient); label `f-paragraph-small f-bold t-upper`.
- Select: native `<select>` styled with underline treatment + `▾` glyph; no custom dropdown on
  the RPA side.
- Qty stepper: `.qty-btn` 2em round, border currentColor, hover inverts (built,
  `globals.css:380-385`); value `f-h32 tabular-nums w-[2ch]`. Touch target padded to ≥44px
  via 0.35em outer margin hit area.

### 3.3 `.badge-rpa`
Pill, `--color` bg / `--bgcolor` text, `f-paragraph-small` 700 uppercase ls .1em, padding
`2px var(--space-md)`. Muted variant: `color-mix(currentColor 14%)` bg, inherit text, .75
opacity. Exactly these two — status colors come from the section pair, not per-status hues.

### 3.4 Tiles & cards
- **Bordered tile** (FAQ rows, checkout box, guide items): `border: 1px solid var(--color)`,
  no radius, padding `--space-xl`; internal dividers `1px color-mix(currentColor 30%)`.
- **Ticket card** (wallet): `gama-1.bg-1` paint, radius `--radius-lg`, padding `--space-xl`,
  `shadow-md`; flip-card behavior per delight.md §4.
- **Brand card** (discovery): SVG mask (`svg--form2/6/10` rotation per index), media-tint,
  media-zoom on hover, brand name `f-h32` under, category `kicker` below.

### 3.5 `RpaPageHeader` (new shared component)
`kicker (opacity .7) → f-exat title (f-h76 portal / f-h133 landing-section) → optional
f-paragraph lede (opacity .7, max-w-[52ch])`; vertical gaps `--space-sm` / `--space-md`.
Every customer/vendor page opens with it. Props: `kicker, title, lede?, size?`.

### 3.6 Navigation
- `PublicHeader`: transparent over hero, `mix-blend-difference` logo; menu overlay
  (`MenuOverlay`) full-screen navy, links `f-h60`, stagger 60ms.
- `CustomerTabBar` (mobile ≤640px): fixed bottom, safe-area padded, 4 tabs (see
  customer-portal.md §2): Home · Schedule · Map · Tickets. Active = lavender dot + label 700;
  44×56px targets; hidden ≥sm (current `pb-16 sm:pb-0` main padding kept).
- Vendor portal nav: same `ZoneSidebar` skeleton restyled with RPA tokens — navy rail, cream
  text, lavender active pill; mobile = bottom sheet trigger (mobile.md §6).

### 3.7 Overlays (RPA)
Sheet (mobile map/stall details): bottom sheet, radius 16px top, drag handle 32×4px
`color-mix(currentColor 30%)`, scrim `rgba(1,6,91,.6)`, enter dur-3 ease-out (translate-y),
swipe-down to dismiss. Dialog: only for contract signing — centered, cream, max-w 28rem.

### 3.8 Feedback (RPA)
Inline alert text: `f-paragraph-small f-bold` + `role="alert"`; error `--red`, success =
section fg with `✓` prefix. **No toasts on the RPA side** — feedback is in-place
(checkout pattern). Full-screen states: success takeover for payment (delight.md §1).

### 3.9 RPA empty states
Dashed-border block (`1px dashed var(--color)`), centered: `f-h42` headline → optional
`f-paragraph-small` (opacity .7) → one `.btn`. Copy pattern: state + reassurance + action
("No tickets yet · Just paid? They land here the moment payment confirms · Find an event").

---

## 4. Admin component contracts

### 4.1 Button — `ui/button.tsx` as built (do not modify)
Variants: default (primary, hover /80) · outline · secondary · ghost · destructive (soft
/10→/20) · link. Sizes: xs h-6 · sm h-7 · default h-8 · lg h-9 · icon 6/7/8/9. Focus ring 3px
`ring/50`; active translate-y 1px; disabled opacity-50. Rules: one default-variant button per
card/page-header; destructive actions always confirm via Dialog; loading = `disabled` +
`<Loader2 className="size-4 animate-spin" />` leading icon + verb copy ("Saving…").

### 4.2 Badge — replace alias variants
Keep: neutral · primary · success · warning · danger (as `ui/badge.tsx:10-15`).
**Delete `pending` (clay) and `gold`** → map: pending → `warning`, gold → `primary`.
Status mapping lives ONLY in `src/lib/status-badges.ts`.

### 4.3 Forms
`ui/field.tsx` wrapper: Label (text-sm font-medium) → control → helper/error (text-xs;
error `text-destructive`). Inputs h-9, rounded-lg, border-input; focus ring 3px ring/50;
invalid = `aria-invalid` ring destructive/20. Selects/pickers from `ui/` only. Every mutation
form: submit button right-aligned, loading state per §4.1, success = sonner toast, error =
toast + field-level messages. Destructive = Dialog confirm with the consequence named
("Delete event? 3 ticket types and the map layout go with it.").

### 4.4 Table / DataTable
`components/data-table` + TanStack for all lists ≥2 columns. Anatomy: toolbar (search left,
filters, primary action right) → header row (text-xs uppercase muted) → rows text-sm,
h-12, hover bg-muted/50, row click navigates when a detail exists → footer pagination
(`ui/pagination.tsx`, 25/page default). Empty = `ui/empty-state.tsx` inside the table body.
Loading = 5 skeleton rows (`components/admin/skeletons.tsx`). Money right-aligned
`tabular-nums`; dates via `lib/date-formats.ts`; statuses via `status-badges.ts`.

### 4.5 Cards & KPIs
`ui/card.tsx`; KPI = `components/charts/kpi-card.tsx`: label text-sm muted → value text-3xl
font-bold tabular-nums → sub text-xs muted. KPI grids: `gap-4 sm:grid-cols-2 xl:grid-cols-4`.
Charts: recharts via `components/charts/*` wrappers only; height 280px; colors `--chart-1…5`;
tooltips use card tokens; no legends when one series.

### 4.6 Overlays & toasts
Dialog: max-w-lg, destructive confirms always Dialog (never window.confirm). Sheet: right side,
w-[400px], for create/edit forms reachable from tables. Toasts: sonner top-right `richColors`;
success 4s, error sticky until dismiss; copy pattern "<Entity> <verbed>" ("Coupon created").

### 4.7 Admin loading/empty/error
Every route group keeps `loading.tsx` (skeleton of its real layout — not a spinner). Empty =
`ui/empty-state.tsx`: icon (size-6 muted) → title text-sm font-medium → body text-xs muted →
optional action button. Error boundaries per zone render the card-styled retry block
(`src/app/error.tsx` pattern).

### 4.8 Map designer controls (map-system.md owns behavior; this section owns the visuals)
- **Toolbar:** one row, grouped per map-system §13, group separators `h-6 w-px bg-border`;
  buttons = admin icon-button spec (§4.2), active tool gets `bg-sidebar-accent` + ring.
- **Layers panel:** w-[240px] right dock; rows h-9: eye toggle (lucide `Eye`/`EyeOff` size-4) ·
  layer name text-sm · lock (`Lock`/`LockOpen` size-4); locked row text muted; drag-reorder
  NOT offered (fixed layer order, map-system §1).
- **Zone chips:** the 8-swatch fixed palette only — navy `#01065B`, lavender `#868EFF`, green
  `#3FA66A`, yellow `#C9871A`, pink `#FF58AC`, red `#C0392B`, teal `#2C8C8C`, amber `#E8B23A`;
  swatch size-5 rounded-full, selected = 2px ring offset 2.
- **Score badge (Sales view):** Badge spec (§4.4) with tier variants — PREMIUM lavender /
  STRONG success / STANDARD neutral / VALUE muted; suggestion chip = outline badge
  "₹13,500 suggested" + inline Apply link-button.
- **Measurement labels:** `font-mono text-xs` on `bg-background/90` rounded-sm px-1.5;
  dashed measure line `--color-lavender-500` 1.5px, 4-4 dash.
- **Validation panel:** drawer list; error rows `text-destructive` icon `TriangleAlert`,
  warning rows `text-warning`; row click focuses object (no toast spam).
- **Terrain fills:** map-system §5 hex set at 15% opacity; underlay default opacity 0.7.
- **Export dialog:** Dialog spec (§4.6), variant radio group + checkbox, primary button
  "Export {variant}".

---

## 5. Global state rules (both sides)

| State | Rule |
| --- | --- |
| Hover | Only on `(hover: hover)` devices; never the sole affordance |
| Focus-visible | 2px ring outline, offset 2px, ALWAYS visible — never `outline: none` without replacement |
| Active | translate-y 1px (buttons) or scale .98 (cards) |
| Disabled | opacity .45 (RPA) / .5 (admin), pointer-events preserved for tooltip "why" where relevant |
| Loading | skeletons for content, verb-copy for buttons; never blank screens; never spinners >1 element |
| Empty | per §3.9 / §4.7 — always: what this is + why empty + one action |
| Error | inline + `role="alert"` (RPA), toast + inline (admin); message says what to DO next |

## 6. Content style

Voice: warm, confident, short ("the warm, grown-up alternative to the usual mela" is the
register). Sentence case everywhere except `.kicker`. en-IN locale: dates "12 June 2026" /
"12 Jun, 7:30 pm" via `lib/date-formats.ts`; money via `formatPaise` (₹1,499 — no decimals when
.00); phone display "+91 98765 43210". Numbers in copy bind to real data or don't ship
(no static "80+ brands"). Buttons = verbs ("Get tickets", "Reserve stall", never "Submit").

## 7. Accessibility floor (gates, not goals)

Contrast ≥4.5:1 body / ≥3:1 large text — **lavender `#868EFF` fails on cream for text: fills
and ≥24px display only**; touch targets ≥44×44px; full keyboard paths for purchase + booking;
`aria-live="polite"` on countdowns/capacity numbers; map always paired with the accessible
stall list; axe CI pass on the 7 audited pages (consistency.md §8).

## 8. Do / Don't

| Do | Don't |
| --- | --- |
| `f-h*` utilities | `style={{fontSize}}` (ESLint-banned) |
| Section pairs from §1.1 | new color combinations |
| One `.btn` per viewport | button rows of equal weight |
| `status-badges.ts` | inline status→color maps |
| `date-formats.ts` | per-file `Intl.DateTimeFormat` |
| skeletons mirroring layout | spinners |
| sonner (admin) / inline (RPA) | silent success |
| lucide size-4/5/6 | mixed icon sizes in one row |
