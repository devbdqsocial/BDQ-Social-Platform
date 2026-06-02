# BDQ Social — UI/UX Design System & Guidelines

> The visual and interaction language for the BDQ Social portal. This document covers brand,
> color, type, tokens, components, motion, and accessibility. Technical architecture, data, and
> APIs live in [project.md](project.md). Implementation target: Tailwind CSS v4 + shadcn/ui +
> lucide icons, mobile-first PWA.

---

## 1. Design Principles & Brand Aesthetic

BDQ Social is the **anti-mela**: premium, curated, "Pinterest in real life", a fairy-lit boho
night-market the weekend before Diwali. The interface must feel like an exclusive outdoor club,
not a ticketing utility.

**Five principles**
1. **Premium by restraint.** Generous whitespace, few elements per screen, high-quality imagery.
   Luxury comes from space and typography, not clutter.
2. **Warm and inviting.** Earthy, candle-lit warmth (clay, sage, gold), never cold or corporate.
3. **Aesthetic-first, frictionless.** Every screen should be screenshot-worthy, yet the path to
   "buy ticket" or "book stall" is short and obvious.
4. **One language, four surfaces.** Landing, customer, vendor, and admin share tokens and
   components; density and theme shift per context.
5. **Trust at the money moments.** Checkout, payment, and stall booking get the clearest
   hierarchy, calmest color, and most explicit feedback.

**Feel:** golden-hour, breezy October evening, warm string lights in trees, carpeted, handcrafted.
**Avoid:** neon-clutter, harsh pure-white SaaS dashboards, stocky corporate blue, and **any
purple/violet** (off-brand and a hard rule for this project).

---

## 2. Brand Foundations

- **Logo usage:** maintain clear-space equal to the logo's cap-height on all sides. Minimum size
  24px tall in UI, 16px in dense admin chrome. Use the gold/cream lockup on dark surfaces and the
  charcoal lockup on light. Never recolor, stretch, add shadow, or place on a busy photo without a
  scrim.
- **Voice & tone:** warm, stylish, confident, lightly playful. Talks like the cool friend who
  found the good spot. Short sentences. No corporate jargon, no shouting in all-caps (except small
  overlines).
- **Photography style:** candid, warm, golden-hour; real people enjoying the space; shallow depth
  of field; fairy lights in frame. Apply a subtle warm grade. Always pair text-over-image with a
  bottom-up charcoal gradient scrim for legibility.
- **Illustration/graphic motifs:** thin boho line-art (arches, foliage, string-light dots, marigold
  accents) used sparingly as dividers, empty-state art, and section flourishes. Keep line weight
  consistent with iconography.

---

## 3. Color System

A warm, earthy, festive palette. **No purple/violet anywhere.** Primary = clay/terracotta,
secondary = sage/pine, accent = festive gold. Neutrals are warm-tinted (never blue-grey).

### 3.1 Primary — Clay / Terracotta (brand, primary actions)
| Token | Hex | Use |
| --- | --- | --- |
| clay-50 | `#FBF3EF` | tint backgrounds |
| clay-100 | `#F6E1D7` | hover tint, chips |
| clay-200 | `#EDC3AE` | borders on tint |
| clay-300 | `#E0A083` | disabled-on-color |
| clay-400 | `#D17E5A` | gradients |
| **clay-500** | `#C2603B` | **primary base** |
| clay-600 | `#A44C2D` | primary hover |
| clay-700 | `#833B24` | primary pressed |
| clay-800 | `#5F2B1B` | text on cream |
| clay-900 | `#3E1D13` | deepest |

### 3.2 Secondary — Sage / Pine (trees, calm, secondary actions)
| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| pine-50 | `#EFF5F2` | | **pine-500** | `#2F755C` (base) |
| pine-100 | `#D8E7DF` | | pine-600 | `#245C49` |
| pine-200 | `#B0CFBF` | | pine-700 | `#1C4739` |
| pine-300 | `#7FB39C` | | pine-800 | `#14332A` |
| pine-400 | `#4F9379` | | pine-900 | `#0D211B` |

### 3.3 Accent — Festive Gold / Amber (fairy lights, Diwali, premium highlight)
| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| gold-50 | `#FDF8EC` | | **gold-500** | `#D69A22` (base) |
| gold-100 | `#FAEDC8` | | gold-600 | `#B27D17` |
| gold-200 | `#F4D98C` | | gold-700 | `#8A5F13` |
| gold-300 | `#EFC65A` | | gold-800 | `#5E4110` |
| gold-400 | `#E8B23A` | | gold-900 | `#3C2A0C` |

> Gold is an **accent**, not a large fill. Use for highlights, glows, premium badges, dividers,
> and the fairy-light motif. Gold on dark = premium; gold text needs a dark background to pass
> contrast.

### 3.4 Warm Neutrals (surfaces, text)
| Token | Hex | Use |
| --- | --- | --- |
| paper | `#FBF7F0` | app background (light) |
| sand-50 | `#F6F1E7` | raised surface (light) |
| sand-100 | `#ECE4D6` | borders/dividers (light) |
| sand-200 | `#D9CDB8` | muted borders |
| sand-300 | `#BCAE94` | disabled text on light |
| sand-400 | `#978A70` | placeholder |
| sand-500 | `#6F6552` | secondary text |
| sand-600 | `#4E4639` | body text (light) |
| sand-700 | `#352F26` | strong text |
| sand-800 | `#221E18` | dark surface |
| sand-900 | `#15120E` | headings on light / near-black |
| espresso | `#120E09` | darkest night base |

### 3.5 Semantic colors
| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| success | `#2F8F5B` | `#46B377` | confirmations, "booked you in" |
| warning | `#E0A106` | `#F0B92E` | holds expiring, attention |
| error / danger | `#C0392B` | `#E25A4A` | failed payment, validation |
| info | `#2C7A8C` | `#4FA7B8` | neutral notices (teal-blue, never violet) |

### 3.6 Map stall status colors (must match [project.md](project.md) §7.4)
| Status | Fill | Border | Meaning |
| --- | --- | --- | --- |
| AVAILABLE | `#3FA66A` (green) | `#2F8F5B` | free to select |
| HELD | `#E8B23A` (amber) | `#B27D17` | held during selection/payment (TTL) |
| PENDING | `#E07B2C` (orange) | `#A44C2D` | booked, awaiting verification/offline pay |
| BOOKED | `#8C8576` (warm grey) | `#6F6552` | sold/locked (greyed, like BookMyShow) |
| BLOCKED | `#4E4639` (dark) | `#352F26` | organizer-reserved, not for sale |
| SELECTED (yours) | `#C2603B` (clay) | `#833B24` | the stall(s) you're choosing now |

> Status is **never communicated by color alone** (see §15): each state also has a label, a
> legend, and an icon/pattern.

### 3.7 Recommended contrast pairs (WCAG AA)
- Body text light: `sand-600/700` on `paper`/`sand-50`.
- Body text dark: `sand-100`/`#EDE6DA` on `espresso`/`sand-900`.
- Primary button: white `#FFFFFF` text on `clay-500/600`.
- Gold usage: `gold-300/400` text/icons on `sand-900`/`espresso` only; do not put gold text on
  light backgrounds (fails contrast) — use `gold-700+` if you must.
- Links: `clay-600` on light, `gold-300` on dark.

---

## 4. Design Tokens (Tailwind v4-ready)

Semantic tokens map to the raw palette so theming (light/dark) swaps in one place.

```css
/* globals.css — @theme tokens (illustrative) */
@theme {
  /* brand ramps */
  --color-clay-500: #C2603B;  --color-clay-600: #A44C2D;  /* ...full ramp... */
  --color-pine-500: #2F755C;  --color-gold-500: #D69A22;

  /* semantic — LIGHT (default) */
  --color-bg:            #FBF7F0;   /* paper */
  --color-surface:       #F6F1E7;   /* sand-50 */
  --color-surface-2:     #ECE4D6;
  --color-border:        #ECE4D6;
  --color-text:          #352F26;   /* sand-700 */
  --color-text-muted:    #6F6552;   /* sand-500 */
  --color-primary:       #C2603B;   --color-primary-fg: #FFFFFF;
  --color-secondary:     #2F755C;   --color-secondary-fg: #FFFFFF;
  --color-accent:        #D69A22;   --color-accent-fg: #15120E;
  --color-success:#2F8F5B; --color-warning:#E0A106; --color-danger:#C0392B; --color-info:#2C7A8C;

  /* radius / shadow / spacing scale */
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-pill: 9999px;
  --shadow-sm: 0 1px 2px rgba(21,18,14,.06);
  --shadow-md: 0 6px 20px rgba(21,18,14,.10);
  --shadow-lg: 0 18px 48px rgba(21,18,14,.16);
  --shadow-glow: 0 0 28px rgba(214,154,34,.35);   /* fairy-light gold glow */
}

/* semantic — DARK (.dark / night) */
.dark {
  --color-bg:        #120E09;   /* espresso */
  --color-surface:   #1C1710;
  --color-surface-2: #271F16;
  --color-border:    #322920;
  --color-text:      #EDE6DA;
  --color-text-muted:#B7AB97;
  --color-primary:   #D17E5A;   --color-primary-fg:#1A130D;  /* lighter clay for dark */
  --color-accent:    #EFC65A;   --color-accent-fg:#15120E;
}
```

**Token naming rule:** components consume **semantic** tokens (`bg`, `surface`, `text`, `primary`,
`border`), never raw ramp values, so dark mode and white-label theming are a single swap.

---

## 5. Typography

**Typefaces (free, web-served)**
- **Display / headings:** `Fraunces` (variable serif) — characterful, premium, editorial. Optical
  size + soft serifs fit the boho-luxury feel.
- **UI / body:** `Inter` (or `Geist`) — clean, neutral, highly legible at small sizes.
- **Accent (sparing):** a handwritten/script (`Caveat`) for occasional flourishes (e.g. "see you
  there") on the landing page only. Never in UI controls or admin.

**Type scale**
| Token | Size / line-height | Weight | Font | Use |
| --- | --- | --- | --- | --- |
| display-xl | 56 / 60 | 600 | Fraunces | hero headline |
| display-l | 44 / 50 | 600 | Fraunces | section hero |
| h1 | 36 / 44 | 600 | Fraunces | page title |
| h2 | 28 / 36 | 600 | Fraunces | section |
| h3 | 22 / 30 | 600 | Fraunces/Inter | subsection |
| h4 | 18 / 26 | 600 | Inter | card title |
| body-lg | 18 / 28 | 400 | Inter | lead paragraph |
| body | 16 / 24 | 400 | Inter | default |
| body-sm | 14 / 20 | 400 | Inter | secondary |
| caption | 12 / 16 | 500 | Inter | meta, helper |
| overline | 11 / 14 | 600 | Inter | uppercase, +8% letter-spacing, labels |

**Rules:** display/serif for emotional moments (landing, event titles, confirmations); sans for
everything functional. Max line length ~72ch for reading. Headings tracking slightly tight
(-1%); overlines tracked wide. On mobile, scale display sizes down ~25% (`display-xl` → ~40px).

---

## 6. Spacing, Grid & Layout

- **Base unit:** 4px. Scale: `0,4,8,12,16,20,24,32,40,48,64,80,96,128`.
- **Section rhythm:** mobile 48–64px vertical, desktop 96–128px between landing sections.
- **Containers:** content max `1200px`; reading max `720px`; full-bleed for hero/imagery/map.
- **Breakpoints:** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536` (Tailwind defaults).
- **Grid:** 12-col desktop (24px gutter), 8-col tablet, 4-col mobile (16px gutter).
- **Touch density:** mobile-first; controls and tap targets ≥ 44×44px.
- **Layout patterns:** landing is single-column editorial with full-bleed bands; app surfaces use
  a max-width container with comfortable padding (16px mobile, 24–32px desktop).

---

## 7. Elevation, Radius, Shadows, Texture

- **Radius:** default `12px` (md) for cards/inputs/buttons; `16–24px` for large cards, sheets, and
  the hero; pill for chips and filter toggles.
- **Elevation levels:** 0 flat (page) → 1 `shadow-sm` (cards) → 2 `shadow-md` (popovers, sticky
  bars) → 3 `shadow-lg` (modals, map drawer). Shadows are warm-tinted (charcoal, not blue-black).
- **Glow accent:** `shadow-glow` (soft gold) reserved for the primary hero CTA, "sold-out soon"
  badges, and selected map stalls — evokes fairy lights. Use rarely.
- **Texture:** optional very-subtle paper/linen grain on dark hero sections (≤4% opacity) for
  warmth; never on text-heavy surfaces.
- **Borders:** 1px `border` token; on dark, borders are low-contrast warm (`#322920`).

---

## 8. Iconography & Imagery

- **Icon set:** `lucide-react` (pairs with shadcn). Stroke 1.5px, sizes 16 / 20 / 24. Use line
  icons only; no filled/duotone mixing. Custom map markers (food, shopping, stage, entry, lounge,
  restroom, water) follow the same 1.5px line style.
- **Icon color:** inherit text color; accent gold only for premium/highlight, semantic colors for
  status.
- **Imagery treatment:** rounded `lg` corners; 4:5 for vendor/brand and product cards (Instagram
  feel), 16:9 for hero and event banners, 1:1 for avatars/logos. Always apply a bottom charcoal
  gradient scrim under overlaid text. Lazy-load; serve via Cloudinary with responsive sizes.
- **Empty/placeholder art:** boho line-art motifs (arch, marigold, string-lights) in `sand-300`.

---

## 9. Motion & Interaction

- **Easing:** standard `cubic-bezier(0.4, 0, 0.2, 1)`; entrance `cubic-bezier(0.16,1,0.3,1)` for a
  soft "settle".
- **Durations:** micro 120ms (hover/press), standard 220ms (toggles, popovers), large 360ms
  (sheets, page transitions). Nothing slower than 400ms.
- **Hover/press:** buttons lift 1–2px + slightly deepen color on hover; press scales to 0.98.
- **Cards:** hover raises elevation 1→2 and nudges image scale 1.02 (clip overflow).
- **Loading:** skeletons (warm shimmer) for content; spinner only for button-level async; payment
  step shows an explicit progress state, never a frozen button.
- **Signature touches (sparing):** gentle gold "twinkle" on the hero string-lights; a soft glow
  pulse on a selected map stall; confetti/marigold burst on successful ticket purchase.
- **Reduced motion:** honor `prefers-reduced-motion` — disable parallax, twinkle, scale, and
  confetti; keep instant fades only.

---

## 10. Component Library

Built on shadcn/ui, restyled to tokens. Every interactive component defines:
`default · hover · active/pressed · focus-visible · disabled · loading · error` where relevant.
Focus-visible = 2px ring in `accent` (gold) or `primary`, 2px offset, always visible on keyboard.

**Buttons**
| Variant | Look | Use |
| --- | --- | --- |
| Primary | clay fill, white text, `shadow-sm`, hover clay-600 | main action (Buy, Pay, Book) |
| Secondary | pine outline or pine-50 fill | secondary actions |
| Ghost | transparent, text only, tint on hover | tertiary, toolbars |
| Accent | gold fill, espresso text, `shadow-glow` | premium/limited CTAs (sparing) |
| Destructive | danger fill | reject, cancel booking |
| Sizes | sm 36 / md 44 / lg 52px height; pill or md radius | md default; lg for mobile CTAs |

**Inputs & forms:** 44px height, `surface` bg, 1px border, focus = primary border + ring; label
above, helper/error below. Error state = danger border + danger helper + inline icon. Support
prefix/suffix (₹, phone code), character counts, and clear affordance. OTP input = 6 segmented
boxes with auto-advance.

**Select / combobox / date-time:** popover with `shadow-md`, rounded `md`, checkable items;
searchable for long lists (vendor categories, events). Date/time picker for event + schedule.

**Cards:** `surface` bg, `radius-lg`, `shadow-sm`. Variants: event card (16:9 image + title +
date + price + CTA), vendor/brand card (4:5 image + logo chip + name + category), ticket card
(see §13), stat card (admin), stall info card (map popover).

**Badges / chips:** pill, `body-sm`/caption. Status badges use semantic colors with text + dot
(e.g. "Approved" green, "Under review" warning, "Sold out" grey). Filter chips toggle (selected =
clay fill).

**Tabs:** underline style on light, segmented on dark/admin. **Stepper:** numbered, for
checkout and vendor onboarding (Cart → Details → Pay → Done; Profile → KYC → Stall → Pay).

**Modals / sheets:** center modal for confirmations; bottom sheet on mobile; right drawer for the
map's stall details and admin record panels. Dim scrim `rgba(18,14,9,.5)`. Always a clear primary
+ dismiss.

**Toasts / alerts:** top-right (desktop) / top (mobile), `shadow-md`, semantic left-accent bar.
Use for payment results, hold-expiry warnings, save confirmations.

**Tables (admin):** dense rows (44–52px), sticky header, zebra via `surface-2`, sortable columns,
row hover, bulk-select, pagination. Right-align numeric/currency. Status as badges.

**Navigation**
- Public header: transparent over hero, turns to solid `surface` + `shadow-sm` on scroll; logo
  left, nav center, Login/Buy CTA right; mobile = hamburger sheet.
- Customer mobile: bottom tab bar (Home, Events, My Tickets, Account).
- Vendor/Admin: left sidebar (collapsible) + top bar (search, profile, theme toggle); admin shows
  current event context switcher.

**Feedback states:** every list/table/section defines empty (boho art + one-line prompt + action),
loading (skeleton), and error (retry) states. **Avatars:** circle, initials fallback in clay/pine
tints.

---

## 11. Map UI Design

The signature surface. Canvas (react-konva) sits on a warm `surface` backdrop with a subtle grid
in `border` color (designer only).

- **Stalls:** rounded-rect (radius 4–6 in canvas units), filled per §3.6 status, 1px darker
  border, centered label (`caption`, white/dark for contrast). Non-sellable infra (stage, zones,
  aisles, water, washrooms) rendered in muted neutral with an icon + label, visually distinct from
  sellable stalls.
- **Hover:** stall brightens + tooltip card (label, type, size in ft, price, status).
- **Selected (yours):** clay fill + `shadow-glow` pulse + checkmark.
- **Legend:** persistent legend chip-row mapping color + icon + label for every status and stall
  type. Filter by type.
- **Controls:** zoom in/out + reset + fullscreen, bottom-right; pinch-zoom and drag-pan on mobile;
  "you are here"/north indicator optional.
- **Mobile:** map fills viewport; tapping a stall opens a bottom sheet with details + "Select".
- **Designer chrome (admin):** left tool palette (add stall by type, add infra, label, select,
  duplicate, delete), top bar (canvas dimensions in ft, scale, grid snap toggle, save/clone
  template, undo/redo), right inspector (selected element: type, label, x/y/w/h in ft, price,
  status). Ops-annotation layer toggle.
- **Accessibility:** stalls reachable by keyboard (tab + arrow nav) with an accessible list view
  fallback (table of stalls + status) for screen readers, since canvas is not natively semantic.

---

## 12. Per-Surface Design Language

One system, four moods.

**Landing (`bdqsocial.com`) — editorial & cinematic.**
Default to a **dark, dusk** hero (espresso bg, fairy-light gold twinkle, Fraunces display, candid
imagery) flowing into lighter `paper` content bands. Big imagery, generous space, scroll-reveal,
countdown + "stalls left" scarcity, sticky transparent→solid header. Emotional, aspirational, the
"come hang out" pitch.

**Customer portal — warm, friendly, fast.**
Light `paper` theme by default. Big, obvious CTAs; mobile-first ticket flow with a stepper; clear
price + discount breakdown; celebratory success screen (marigold burst). Minimal fields (OTP,
name, email). Bottom tab nav on mobile.

**Vendor portal — premium but practical.**
Light theme, dashboard-style. Guided onboarding stepper (Profile → KYC → Stall → Pay), strong
form guidance and validation, prominent map for stall selection, clear status timeline (Submitted
→ Under review (call) → Approved). Asset uploads feel rich (image previews, drag-drop).

**Admin / Staff console — focused control room.**
Default **dark** theme (reduces fatigue for long event-night sessions, fits the venue). Dense data
tables, the full-bleed map designer, stat dashboards, and a high-contrast **scanner** screen
(big camera viewport, huge result state: green "Valid" / grey "Already used" / red "Invalid",
audible + haptic cue). Staff sees a reduced, permission-scoped nav.

---

## 13. Ticket, QR, Email & WhatsApp Visual Design

**Digital ticket card** (in-app + PDF + image for WhatsApp):
- Dark `espresso` card, gold hairline border + `shadow-glow`, Fraunces event name, a perforated
  divider motif, then details (ticket type, holder name, date/time, venue) and the **QR centered**
  on a white rounded chip (QR must sit on white for scanner reliability). Footer: ticket id +
  "All sales final". Optional sponsor logo strip per [sponsorship-deck](sponsorship-deck.md).
- One QR per ticket (group tickets = multiple cards).

**Email (Resend):** max 600px, brand header bar (logo on espresso), `paper` body, clay primary
button, gold dividers, the ticket card image, calendar "add to calendar" link, plain-text
fallback. Footer with event + contact.

**WhatsApp (Interakt template):** concise, warm copy + the **QR image as media**. Example:
"You're in! 🎟️ Your BDQ Social pass is attached. Show this QR at the gate. See you there." (Keep
within template rules; QR delivered as the media attachment.)

---

## 14. Dark / Night Mode

- **Default theme per surface:** landing hero = dark; customer + vendor = light; admin + staff =
  dark; event-night customer view may auto-prefer dark.
- **Mechanism:** `.dark` class swaps the semantic tokens in §4 only — components never hardcode
  colors. Respect system preference with a manual toggle (persisted).
- **Dark adjustments:** lift primary to lighter clay (`#D17E5A`) and accent to brighter gold
  (`#EFC65A`) for contrast; surfaces step `espresso → #1C1710 → #271F16`; borders low-contrast
  warm; shadows deepen, glow stays gold.

---

## 15. Accessibility Guidelines

- **Contrast:** meet WCAG **AA** (4.5:1 text, 3:1 large text/UI). Use the pairs in §3.7; never
  gold text on light.
- **Never color-alone:** map status, badges, and form validation always pair color with a label,
  icon, or pattern.
- **Focus:** visible 2px focus ring (accent/primary) with offset on every interactive element;
  logical tab order; skip-to-content link on landing.
- **Targets:** ≥ 44×44px touch targets; adequate spacing between tappable items.
- **Keyboard:** full keyboard operability incl. modals (focus trap + Esc), menus, and a map list
  fallback.
- **Semantics:** proper headings, labels tied to inputs, ARIA roles for tabs/dialogs/toasts, live
  regions for async results (payment, scan).
- **Motion:** honor `prefers-reduced-motion` (§9).
- **Forms:** clear labels (not placeholder-only), explicit errors with text, autocomplete + correct
  input modes (tel for phone/OTP, email).

---

## 16. PWA / Mobile

- **Install:** custom "Add to Home Screen" prompt with brand styling; maskable icon; themed splash
  (espresso + logo). `theme-color` = espresso.
- **Mobile nav:** customer bottom tab bar; vendor/admin collapse sidebar into a sheet.
- **Offline:** persistent offline banner; **My Tickets** QR available offline (cached); **staff
  scanner** queues check-ins offline and shows a synced/queued count, syncing on reconnect.
- **Safe areas:** respect notch/home-indicator insets; sticky CTAs sit above the home indicator.
- **Performance:** image lazy-loading, route-level code splitting, skeletons; the map view loads
  progressively.

---

## 17. Content & Microcopy

- **Voice:** warm, stylish, brief, lightly playful; second person ("Grab your pass").
- **Buttons:** verb-first and specific — "Buy tickets", "Book this stall", "Pay ₹2,499",
  "Scan next". Avoid vague "Submit"/"OK".
- **Empty states:** one friendly line + a clear action ("No tickets yet. Find an event →").
- **Errors:** plain, blameless, actionable ("That coupon's expired. Try another?"). Never raw
  codes to users.
- **Money moments:** always show the full breakdown (subtotal, discount, total) and reassurance
  ("Secure payment via Razorpay", "All sales are final").
- **Status copy:** human ("We're verifying your stall — our team will call you shortly").

---

## 18. Usage Do's & Don'ts

**Do**
- Lead with imagery and space; let the brand breathe.
- Use clay for the main action, pine for secondary, gold as a rare premium accent.
- Keep one primary action per screen, especially at checkout/booking.
- Pair every status color with a label/icon.
- Test contrast in both themes before shipping.

**Don't**
- Use any **purple/violet**, neon clutter, or cold corporate blue as brand color.
- Put gold text on light backgrounds.
- Overuse the glow/twinkle/confetti — they're seasoning, not the meal.
- Communicate state with color alone.
- Crowd screens with competing CTAs or dense copy.

---

### Quick reference

| Thing | Value |
| --- | --- |
| Primary | clay `#C2603B` |
| Secondary | pine `#2F755C` |
| Accent | gold `#D69A22` |
| Light bg / text | `#FBF7F0` / `#352F26` |
| Dark bg / text | `#120E09` / `#EDE6DA` |
| Display font / UI font | Fraunces / Inter |
| Default radius | 12px |
| Focus ring | 2px gold/clay, 2px offset |
| Standard motion | 220ms, `cubic-bezier(0.4,0,0.2,1)` |
| Hard rule | No purple/violet; never color-alone |
