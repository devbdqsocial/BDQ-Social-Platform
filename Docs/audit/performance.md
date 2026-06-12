# performance.md — Performance Budgets & Speed Roadmap

> Rebuild blueprint, part 3 of 15. Target budgets first, then the concrete weight-reduction and
> speed plan with file-level evidence. Several findings from the 2026-06-04 AUDIT-REPORT.md were
> re-verified against current code; the ones already fixed are listed in §6 so nobody re-does them.

---

## 1. Performance budgets per surface

Budgets are gates, not aspirations — CI fails a work package that breaks its budget
(Lighthouse CI against a preview deploy; see changes.md roadmap).

| Surface | LCP (4G mid-tier) | JS shipped (gz) | Notes |
| --- | --- | --- | --- |
| Coming-soon | ≤ 1.8s | ≤ 90KB | It's one section; should be near-static |
| Landing `/` | ≤ 2.5s | ≤ 180KB | GSAP+Lenis allowed here only |
| Event detail `/events/[slug]` | ≤ 2.5s | ≤ 160KB | The conversion page — most-protected budget |
| Checkout (Razorpay open) | ≤ 1s to modal | — | After button press; modal script preloaded on intent |
| Customer dashboard | ≤ 2.5s | ≤ 120KB | QR data-URLs render server-side |
| Vendor booking map | ≤ 3.5s | ≤ 350KB | Konva is heavy; loaded lazily and only here |
| Gate scanner (kiosk) | ≤ 2s cold, instant warm | ≤ 200KB | Must survive flaky venue Wi-Fi: PWA-precached |
| Admin console | ≤ 3s | ≤ 300KB | Internal tool; still no eager Konva/recharts |
| Schedule / Discover / Guide / Offers / Gallery | ≤ 2.5s | ≤ 140KB | Companion pages (extension): ISR or 60s cache; no konva |
| Customer map | ≤ 3s | ≤ 320KB | Konva lazy, same loader as vendor picker |
| Map designer (admin, R2.5) | ≤ 3.5s | ≤ 380KB | Konva lazy; 60fps pan/zoom with 500 elements + underlay on mid Android; guides/validation recompute throttled 50ms; konva layers ≤ 6; underlay delivery ≤ 1.5MB (`w_2400,f_auto,q_auto`); **zero new dependencies in map V1** (map-system §13) |

Extension note: shareable ticket art is generated **server-side at fulfilment and cached**
(`Order.shareCardUrl`) — generation budget < 800ms, PNG < 300KB (delight.md §2); it never adds
client JS. The happening-strip endpoint is one cached query, 60s revalidate (delight.md §5).

Core Web Vitals targets everywhere: CLS < 0.1, INP < 200ms.

---

## 2. Bundle strategy

### 2.1 Dependency verdicts (from `package.json`)

| Package | Size (≈gz) | Verdict | Why |
| --- | --- | --- | --- |
| `gsap` + `lenis` | ~30KB + 8KB | **Keep, customer zone only** | The brand motion system (consistency.md §6) |
| `swiper` | ~40KB | **Remove** | One consumer (`components/motion/BrandsCarousel.tsx`); replace with CSS scroll-snap + existing Marquee |
| `framer-motion` | ~35KB | **Remove** | One consumer (`admin/(console)/template.tsx`); replace with CSS transition |
| `konva` + `react-konva` | ~200KB | Keep, lazy | Already behind `next/dynamic` (`MapDesignerLoader.tsx`, `BookingFloorPlan.tsx`, `MapPreview.tsx`, `VendorStallReserve.tsx`) — keep it that way |
| `recharts` | ~150KB | Keep, admin-only | Confine behind `components/charts/*`; never import in customer code |
| `@react-pdf/renderer` | ~300KB | **Server-only** | Contract PDF generation; must never enter a client bundle — add an ESLint boundary |
| `html5-qrcode` | ~80KB | Keep, lazy | Already behind `ScannerLoader.tsx` |
| `firebase` (client) | ~100KB tree-shaken | Keep, login routes only | Dynamic-import inside `PhoneLogin` so anonymous visitors never pay for it |
| `radix-ui` (monolith pkg) | varies | **Audit** | The all-in-one `radix-ui` package is imported instead of per-primitive `@radix-ui/react-*`; verify tree-shaking actually drops unused primitives in the build, else switch to scoped packages |
| `date-fns` | ~7KB used | Keep | Ensure per-function imports |
| `@faker-js/faker` | dev | Keep (devDep) | Confirm it never ships (it's a devDependency — fine) |

`@dnd-kit/*`, `react-hook-form`, `@hookform/resolvers` from the old audit are already gone from
`package.json` — fixed.

### 2.2 Fonts

Three families load today: **Exat** (local woff2, 23KB), **Inter** (Google), **Geist** (Google,
admin only) — `src/app/layout.tsx:3-12`. All three load for every visitor regardless of zone.

- Keep Exat + Inter on customer surfaces (`display: swap`, preload Exat — it paints the LCP headline).
- **Load Geist only in the admin layout**, not the root layout. An attendee on a phone should
  never download the admin font.
- Subset Inter to latin; Exat is display-only — confirm `font-display: swap` and that the
  wordmark/hero doesn't FOIT.

### 2.3 Images

- `next/image` everywhere a remote/Cloudinary asset renders (already configured for
  `res.cloudinary.com`, `next.config.ts:37-39`). QR data-URLs stay `<img>` but get explicit
  width/height (consistency.md §7.7 #24).
- Cloudinary transforms (`f_auto,q_auto,w_…`) on every vendor logo/banner — `lib/cloudinary-url.ts`
  exists; make it the only way a Cloudinary URL is rendered.
- Landing hero: currently the first vendor logo in an SVG mask (`(public)/page.tsx:37`,
  `priority`); whatever the rebuilt hero uses must remain a `priority` image sized with `sizes`.

---

## 3. Rendering & data-fetching architecture

### 3.1 The landing page should not be dynamic

`(public)/page.tsx:17` and the event detail page are `force-dynamic` and read the DB per request
(mitigated by a 60s display-read cache per commit 08bb1ff). For a marketing page whose data
changes a few times a week this is the wrong default and it makes LCP hostage to a Neon cold
start.

**Target:** ISR — `export const revalidate = 60` on `/`, `/events`, `/events/[slug]`,
`/vendors`, plus `revalidatePath()` calls from the admin mutations that change them (event
publish, ticket-type edit, vendor approval, sponsor add). The coming-soon page can be fully
static with the waitlist count fetched client-side (or dropped — it's social proof, not truth).

### 3.2 Server-side waterfalls

- `(public)/page.tsx:32-36`: `listPublished` + `listApprovedVendors` are parallel (good) but
  `sponsorsForEventPublic(event.id)` awaits after — fold into one `Promise.all` once the event
  id is known, or include sponsors in the event query.
- `(customer)/dashboard/page.tsx`: `listUserTickets` then N× `toQrDataUrl` — QR generation is
  CPU work per ticket per request. Generate QR data-URLs **once at fulfilment** and store, or
  cache per ticket id (`unstable_cache` keyed on ticket id; tokens are stable until expiry).
- Admin dashboard/analytics pages: verify each runs its aggregate queries via `Promise.all`
  (the analytics services batch reasonably; keep it under test as queries grow).

### 3.3 Polling discipline

`AutoRefresh` (20s, `ops/monitor/page.tsx`) and the booking map's status polling are fine at
current scale. Rule: every poller backs off when `document.hidden`, and the gate capacity board
endpoint stays on the cheap `groupBy` aggregate (already fixed — `checkin/service.ts:84`).

---

## 4. Backend hotspots

| # | Where | Issue | Fix |
| --- | --- | --- | --- |
| 1 | `server/cron/tasks.ts:30-45` (`reconcilePendingPayments`) | Sequential Razorpay API call per pending order (up to 100) | Chunked `Promise.allSettled` (concurrency ~5); fine at launch scale, required before big sales |
| 2 | `lib/ratelimit.ts` | DB upsert per request on hot paths | Acceptable now (rows pruned daily by `pruneStaleRows`); swap to Upstash Redis when sustained RPS > ~50 (failure-analysis #14) |
| 3 | `server/notifications/email.ts` | QR PNG generated inline during outbox drain | Falls out naturally if QR is pre-generated at fulfilment (§3.2) |
| 4 | Export routes (`api/admin/export/*`, `api/vendor/leads/export`) | Now rate-limited + paginated (`parseSkip`) — re-verified | Keep the pattern; stream CSV if any export regularly exceeds ~10K rows |
| 5 | `server/tickets/service.ts:177-181` | Per-type `soldQty` updates inside fulfilment txn are `Promise.all`-ed — fine; the real issue is the **oversell window** (security/failure docs) not perf | — |

---

## 5. Database growth policy

`pruneStaleRows` (`server/cron/tasks.ts:118-132`) already prunes RateLimit (>1d), SENT Outbox
(>30d), Notifications (>14d) — the old audit's "never pruned" finding is fixed.

Remaining policy decisions for the rebuild:

- **AuditLog**: append-only and unbounded. Do NOT prune (it's the compliance trail). Add
  `@@index([createdAt])` if the viewer adds date-range filters; partition only if it ever
  exceeds ~5M rows (not a launch concern).
- **Lead / Waitlist / CheckIn**: bounded by event size; no action.
- **Outbox FAILED rows**: kept forever today — surface them in admin ops (they're the "money
  didn't reach the customer" signal), then prune >90d.
- Neon: keep pooled `DATABASE_URL` for runtime + `DATABASE_URL_DIRECT` for migrations (already
  configured, `prisma/schema.prisma:8-12`). Set Prisma `connection_limit` appropriate to Vercel
  concurrency (launch-readiness.md §2).

---

## 6. Already fixed — do not re-litigate (verified 2026-06-12)

| Old finding (AUDIT-REPORT.md) | Status now |
| --- | --- |
| `capacitySnapshot` N+1 (2 counts × type) | Fixed — single `groupBy` (`server/checkin/service.ts:84-96`) |
| `fulfillOrder` serial per-ticket INSERTs | Fixed — `createMany` (`server/tickets/service.ts:176`) |
| Zero `next/dynamic` in codebase | Fixed — 6 lazy entries incl. MapDesigner, Scanner, booking map |
| Unused deps `@dnd-kit/*`, `react-hook-form`, `@hookform/resolvers` | Removed from `package.json` |
| `RateLimit`/`Outbox` never pruned | Fixed — `pruneStaleRows` cron task |
| Date-format / status-badge duplication libs missing | Libs exist (`lib/date-formats.ts`, `lib/status-badges.ts`) — *callers not yet migrated* (consistency.md §7.5) |

---

## 7. Weight-reduction summary (expected wins)

| Action | Win |
| --- | --- |
| Drop `swiper` (CSS scroll-snap) | ~40KB gz off landing |
| Drop `framer-motion` (CSS transition) | ~35KB gz off admin |
| Geist out of root layout | 1 font family off every customer visit |
| Firebase dynamic-import in `PhoneLogin` | ~100KB off anonymous landing visits |
| ISR on public pages | LCP no longer paying Neon round-trip; resilient to DB blips |
| QR pre-generation | Dashboard TTFB and outbox drain both drop CPU work |

## 8. Verification

- `npm run build` → inspect route-level First Load JS against §1 budgets.
- Lighthouse CI (mobile, 4G throttle) on: `/coming-soon`, `/`, `/events/[slug]`, `/login`,
  `/dashboard`, vendor booking page, admin dashboard. Perf ≥ 90 public, ≥ 80 admin.
- `grep -rn "from \"swiper\"\|framer-motion" src/` → 0 after the swaps.
- Load test (k6/artillery): checkout POST + webhook + scanner endpoint at 50 RPS sustained —
  p95 < 500ms, zero 5xx (event-day gate, launch-readiness.md §5).
