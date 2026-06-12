# changes.md — Master Rebuild Blueprint

> Part 1 of 18 — the CTO document and the contract. Written as if BDQ Social were rebuilt today
> from scratch by a world-class team, executed by multiple AI agents. The current code is
> reference + salvage inventory (the salvage map lives in [architecture.md §7](architecture.md)).
> Every feature removal/addition below was **confirmed by the owner** in the Feature Decision
> Gates (2026-06-12, three sessions incl. Gate 5 map scope) — marked ✔owner.
> Audit docs: [consistency.md](consistency.md) · [architecture.md](architecture.md) ·
> [performance.md](performance.md) · [security.md](security.md) ·
> [launch-readiness.md](launch-readiness.md) · [failure-analysis.md](failure-analysis.md).
> Ultra-detail specs (zero decisions left for development):
> [design-system.md](design-system.md) · [mobile.md](mobile.md) ·
> [customer-portal.md](customer-portal.md) · [vendor-portal.md](vendor-portal.md) ·
> [admin-portal.md](admin-portal.md) · [delight.md](delight.md) ·
> [map-system.md](map-system.md) (flagship) ·
> [design-debt.md](design-debt.md) · [implementation-roadmap.md](implementation-roadmap.md) ·
> [build-plan.md](build-plan.md) (step-by-step) · [AGENT_RULES.md](AGENT_RULES.md) (governance).

Locked business rules (owner, unchallengeable): integer-paise money · all prices dynamic/admin-
entered · no refunds · no GST · webhook-driven idempotent fulfilment · one active booking per
stall · audit every admin mutation · vendor call-back approval · SUPER_ADMIN TOTP · RPA brand on
customer surfaces / neutral OKLCH admin.

---

## 1. Product thesis & where the money is

**The product:** a premium curated night-market festival in Vadodara, sold through one platform
with four faces — visitors (tickets), vendors (stalls), sponsors (placements), and the operator
(console). It is an *events business with software leverage*, not a SaaS.

**Unit economics of one edition (structure, not prices — prices are admin-entered):**

| Stream | Mechanism in product | Leverage to build |
| --- | --- | --- |
| Tickets (volume) | Ticket types, early-bird, bulk>5, coupons, group orders | Coupon input ✔owner · abandoned-cart nudge ✔owner · group-QR friction-cut ✔owner |
| Stalls (margin) | 100 stalls, type-priced + per-stall override, payBy windows | Vendor add-ons (tables/power/chairs) upsell ✔owner · waitlist auto-offer (built) |
| Sponsors (cream) | Tiers, placements JSON, lead-access flag, amountPaise | Render placements on landing/tickets; founder-led sales (failure-analysis #22) |
| Leads/data | Vendor lead QR capture (built) | Vendor retention: leads make the stall worth rebooking next edition |
| Repeat editions | Multi-event schema (built), waitlists, suppression-safe campaigns | Full campaigns module kept ✔owner |

**The inversion to correct:** the build today is 46+ admin pages vs 4 customer pages. The
money-making surfaces (landing, event page, checkout, vendor funnel) are the thinnest. The
rebuild's effort allocation flips that: phases C1-C3 below are customer/vendor-facing before any
console polish.

---

## 2. The three lists

### Must fix before launch (quality gate — see launch-readiness.md for proofs)
1. External cron scheduler @5min (**the** infra blocker) — launch-readiness §1
2. Oversell guard inside fulfilment txn — security §3.1
3. Tests + configs committed to git; CI runs them blocking — security §3.6
4. Sentry + 5 alert rules ✔owner — security §3.3
5. Coupon input at checkout ✔owner (or ship no coupons)
6. Customer profile (email) + ticket share/download ✔owner
7. Group-order single-QR model ✔owner — architecture §4.2
8. Kiosk scanner mode ✔owner + gate math — launch-readiness §5.1
9. Public map on real event data ✔owner; Task Center mock removed ✔owner
10. Razorpay modal on-brand; ISR on public pages; Lighthouse budgets met
11. ₹1 live purchase + dry-run vendor + group-QR gate drill on prod
12. Festival Companion surfaces (schedule, map, discover, guide, offers, gallery, day-of mode)
    + delight moments built to spec ✔owner — content gates met (≥1 published offer if Offers
    nav shows, ≥8 gallery photos, non-empty guide); WhatsApp concierge templates approved
    (Meta lead time — start early, delight.md §7)

### Can wait until V2 (owner-deferred or naturally post-event-one)
Referral program (incl. referral-with-art) · scarcity counters · per-ticket holder names ·
Apple/Google Wallet passes · re-entry OUT scans · SMS fallback · PWA push · ratings & reviews ·
white-label per-event theming · budgets/settlements/recurring-expense surfaces · deep analytics
pages (Command Center ✔owner replaces them) · websocket live map · vendor↔organizer chat ·
multi-language · gamified passport/stamps · heatmaps & predictive analytics · post-event PDF
report polish · favorites/wishlist · venue flythrough teaser · lineup audio previews ·
editorial food trail · scan sound design · early-access "Insiders" club · hard offer
redemption tracking · map V1.5/V2 (Mapbox real-world mode, safety/crowd engine, power-load
planning, realistic mode, day/night, scenario compare, 3D, AI generation, template marketplace
— map-system §15) · **doc backlog ✔owner (Gate 5): revenue.md, growth.md, operations.md**.

### Remove completely
Task Center mock (`admin/(console)/ops/tasks/`) ✔owner · demo statuses on public map ✔owner ·
legacy gold/clay token aliases + `#C2603B` · admin pretty-URL rewrite layer
(`middleware.ts:57-203`) · legacy booking states `HELD`/`PENDING` · `LayoutTemplate` +
`MapElement` models (fold into VenueMap) · `lib/validation.ts` (subsumed) · `swiper` +
`framer-motion` deps · `lib/adapters.ts` if still orphaned at execution time.

---

## 3. Definitive feature spec (the contract)

Verdicts: **M**ust-have launch · **S**hould-have launch · **V2** · **CUT**. ✔owner = explicitly
confirmed in the gate; unmarked = owner-approved by approving this blueprint (flag in review if
any row reads wrong). *No feature exists outside this table — agents reject scope not listed here.*

### Customer-facing
| Feature | Verdict | Note |
| --- | --- | --- |
| Coming-soon w/ phone waitlist + stall-interest flag | M | Redesign per §6.1 |
| Landing page | M | Rebuild per §6.2 |
| Events list + event detail (schedule, prices, FAQ) | M | ISR; conversion-budgeted |
| Public brand directory + vendor detail | M | SEO surface; real assets only |
| Public venue map | M | Real event layout ✔owner |
| Phone-OTP login + session | M | Keep as built |
| Checkout (qty, group, **coupon input** ✔owner) | M | One-QR group orders ✔owner |
| Ticket wallet (QR, status, **share/download** ✔owner) | M | Pending-payment state (failure #8); flip card ✔owner |
| **Customer profile (name/email)** ✔owner | M | Unlocks receipts + reminders |
| **Live schedule page (now/next)** ✔owner | M | customer-portal.md §3.3 |
| **Customer festival map** ✔owner | M | brand view, real layout — customer-portal.md §3.4 |
| **Brand & food discovery** ✔owner | M | search + category chips — customer-portal.md §3.5 |
| **Day-of live mode home** ✔owner | M | PRE/LIVE/POST modes — customer-portal.md §3.1 |
| **Festival guide page** ✔owner | M | admin-edited — customer-portal.md §3.7 |
| **Offers & flash deals** ✔owner | M | + admin CRUD — customer-portal.md §3.6, admin-portal.md §6.1 |
| **Post-event gallery** ✔owner | M | content-gated ≥8 photos — customer-portal.md §3.8 |
| **Cinematic ticket reveal + celebration + flip card** ✔owner | M | delight.md §1, §3, §4 |
| **Shareable ticket art** ✔owner | M | delight.md §2 (no QR on image) |
| **Happening-tonight strip** ✔owner | M | event week only — delight.md §5 |
| **WhatsApp concierge thread** ✔owner | M | keyword replies + day-of sequence — delight.md §7 |
| Order history page | S | Cheap: orders already queried |
| Abandoned-cart nudge ✔owner | S | One WhatsApp/email pre-expiry |
| Referral / scarcity counters / wallet passes / push / SMS fallback / reviews / favorites | V2 | owner-deferred |

### Vendor-facing
| Feature | Verdict | Note |
| --- | --- | --- |
| Signup/login (separate zone) | M | Keep |
| 6-step onboarding (brand→KYC→stall→contract→call-back→pay) | M | Rebuild UI on RPA layer (consistency #1); same state machine, simplified states (architecture §4.1) |
| Konva stall picker on live map | M | Keep (lazy-loaded) |
| E-sign contract + PDF | M | Keep |
| Vendor dashboard (status, docs, stall) | M | Merge overlap with onboarding stepper — one source of truth |
| Lead capture QR + list + CSV export | M | Keep |
| **Add-ons ordering (tables/chairs/power)** ✔owner | S | New: `BookingAddOn` model + price lines + payment inclusion |
| Footfall analytics / chat / co-vendor / leaderboard | V2 | backlog |

### Admin console (the diet)
| Area | Verdict | Note |
| --- | --- | --- |
| Dashboard (KPIs + recent activity) | M | Keep, one page |
| Events CRUD + ticket types + schedule + pricing config | M | Keep |
| Venue: Maps + Stall Inventory | M | VenueMap consolidation (architecture §5); Elements page folds in; designer itself = map-system.md (flagship) |
| Ticketing: Orders, Attendees, Comps, Coupons | M | Keep |
| Vendors: Applications (+call-back logging), Add Vendor | M | Keep; add UNDER_REVIEW aging alert (failure #16) |
| Ops: Check-in, **Kiosk mode (+ celebratory ADMIT-N)** ✔owner, Live Monitor, **POS (in nav)** ✔owner, Staff (+ sign-out-everywhere), System health + ops strip | M | Task Center REMOVED ✔owner |
| **Content group: Offers CRUD, Gallery curation, Guide editor, Strip config** ✔owner | M | admin counterparts of companion — admin-portal.md §6 |
| **Vendors: Stall Add-ons CRUD + orders** ✔owner | M | admin-portal.md §6.5 |
| Finance: Payments, Expenses, P&L | M | Budgets/Settlements/recurring → V2 ✔owner |
| Growth: Sponsors, Waitlists, **Campaigns (full module)** ✔owner, **Concierge keyword manager** ✔owner | M | Add send-confirm + PAUSED test (failure #21) |
| **Analytics: Command Center** ✔owner (supersedes the earlier 3-page verdict) | M | ONE dashboard (6 tiles + alerts, admin-portal.md §2) + live Attendance board; deep pages V2 |
| System: Audit viewer, Roles, Notifications, Settings (in nav) | M | Keep; settings gets a nav home (consistency #20) |

### Map system (the flagship — [map-system.md](map-system.md), Gate 5)
| Feature | Verdict | Note |
| --- | --- | --- |
| **Calibrated real-map underlay** (2-point calibration, 1:1 ft) ✔owner | M | map-system §2; Mapbox tiles deliberately V1.5 |
| **Polygon venue boundary + fixed obstacles** (trees/poles/buildings) ✔owner | M | §4; save-blocking overlap checks w/ override |
| **Distance tool + live measurements + occupancy stats** ✔owner | M | §3 |
| **Layers panel** (9 fixed layers, show/hide/lock) ✔owner | M | §1 |
| **Zones** (named, fixed palette, rollups) ✔owner | M | §6 |
| **Pathways w/ width minimums + blocked/exit checks** ✔owner | M | §7 (static checks; crowd sim V1.5) |
| **Terrain patches** (grass/concrete/pavers…) ✔owner | M | §5; visual only in V1 |
| **Align/distribute + bulk actions v2** ✔owner | M | §13 |
| **Stall scoring engine + badges + why-bullets** ✔owner | M | §9.1; pure lib, weight table fixed |
| **Price suggestions — admin applies** ✔owner | M | §9.2; locked pricing rule preserved |
| **Revenue heatmap view** ✔owner | M | §9.3 |
| **Search & focus (designer + ⌘K)** ✔owner | M | §9.4 |
| **Named version snapshots + restore + compare** ✔owner | M | §10; JSON-first, cap 10 |
| **Vendor preview mode** ✔owner | M | §11 |
| **Exports: PNG + PDF variants (vendor/ops/print)** ✔owner | M | §12; scale bar from calibration |
| **Entry-flow designer + gate throughput calc** ✔owner (pull-forward) | M | §8; ties to kiosk plan |
| Mapbox "Real World mode" / full safety+crowd engine / power-load planning | V1.5 | §15 |
| Realistic mode · day/night · scenario compare · 3D · AI generation · template marketplace | V2 | §15 |

### Platform
| Feature | Verdict | Note |
| --- | --- | --- |
| Outbox delivery (WhatsApp+email, retries, suppression) | M | Keep |
| Cron maintenance suite | M | + external scheduler (launch-readiness §1) |
| PWA (manifest, sw, offline page, offline scan queue) | M | Keep; precache kiosk route |
| Audit log pipeline | M | Keep |
| Error monitoring ✔owner | M | Sentry free tier |
| White-label theming | V2 ✔owner | Column dormant |

---

## 4. Decision records (Options A/B/C; B = recommended unless noted)

**DR-1 Strategy — rebuild posture.**
A) Polish in place (lowest cost, keeps inversion + drift) · **B) In-repo progressive rebuild on
`rebuild/*` branches: salvage proven server cores, rebuild surfaces** (best value/risk; the
money-path code is genuinely good) · C) True greenfield repo (max purity; re-validates payments
for zero user-visible gain; weeks longer). **Verdict: B** — complexity M, time ~6-9 agent-weeks,
maintenance ↓, business impact high.

**DR-2 Architecture — admin routing.** A) Keep pretty-URL maps · **B) Delete; physical /admin
paths** · C) Route-group magic to flatten URLs without middleware. **B** (architecture §2):
−150 LOC middleware, zero ongoing map maintenance; cost: admin URLs show `/admin` (irrelevant,
internal).

**DR-3 Design — vendor portal brand.** A) Leave on shadcn semantic · **B) IDENTICAL RPA
component library as the customer side — same tokens, same components, same aesthetics
(✔owner, strengthened 2026-06-12 session 2)** · C) Third hybrid theme. **B**; complexity M
(9 pages, spec in vendor-portal.md), big perceived-quality jump for the audience that pays the
most per head. Admin stays neutral OKLCH as-is (✔owner).

**DR-4 UX — ticket delivery.** A) N QRs per group order (today) · **B) One QR, ADMIT-N ✔owner**
· C) Wallet passes per attendee. **B** (owner). Halves gate scans for groups, simplifies
delivery; cost: badge logistics + partial-arrival rule (architecture §4.2).

**DR-5 Performance — public pages.** A) force-dynamic + cache (today) · **B) ISR + revalidate
hooks** · C) Full SSG + client data islands. **B** (performance §3.1).

**DR-6 Security — capacity integrity.** A) Status quo (creation-time check) · **B) Conditional
soldQty guard in txn** · C) Reservation-at-creation with expiry release. **B** (security §3.1);
C is the V2 upgrade if flash-sale behavior emerges.

**DR-7 Scalability — rate limiting.** A) DB now, panic later · **B) DB now + documented Upstash
trigger (sustained RPS>50)** · C) Redis day one. **B** — don't buy infra before the traffic
exists; Cloudflare absorbs the spike meanwhile.

**DR-8 Product — console scope.** A) Keep all 46 pages · **B) The §3 diet ✔owner** · C) Cut to
12-page minimal console. **B** (owner chose every line).

**DR-9 Development — how agents work.** A) One agent, serial · **B) Phase-parallel work packages
with committed-test gates (§7)** · C) Free-for-all parallel agents. **B**; C produces merge
storms, A wastes the parallelism this plan was shaped for.

**DR-10 Map — how "real map" is implemented (Gate 5).** A) Mapbox satellite tiles in V1 (live
context, but a heavy new dependency, API cost, and a second rendering system next to konva) ·
**B) Calibrated image underlay ✔owner: upload satellite/drone/blueprint → 2-point calibration →
ftPerPx → locked true-scale background layer; zero new deps; konva stays sole canvas** · C) Both
in V1 (max power, +2 weeks). **B** — 1:1 real-world accuracy lands in days, Mapbox graduates to
V1.5 "Real World mode" (map-system §2, §15). Complexity S, business impact high (sells stalls
with real ground truth).

---

## 5. Journeys — step counts (today → target)

| Journey | Today | Target | How |
| --- | --- | --- | --- |
| Visitor → paid ticket | 7 steps, 2 dead-ends (no coupon field; login bounce mid-checkout) | 5 steps | Coupon inline; login-inline sheet on checkout instead of redirect; pending-state page |
| Buyer → ticket at gate | 4 (find dashboard, zoom QR…) ×N people | 2, ×1 per group | One QR ✔owner + share/download ✔owner |
| Vendor → BOOKED stall | 6 gated steps + silent wait | 6 steps + visible status timeline | Same machine, status timeline + call-back SLA surfaced; admin aging alert |
| Staff → 100 admits | console page per scan | kiosk loop, zero nav | Kiosk mode ✔owner |
| Admin → event live | ~5 screens | 4 (create wizard incl. tickets+map attach) | Event-create wizard work package |
| Admin → "did we make money?" | P&L page (kept) | same, 1 screen | Finance diet keeps the answer page |

---

## 6. Customer-surface design directions

### 6.1 Coming-soon (today: solid copy, no visual story, hardcoded countdown target `2026-10-01` in `ComingSoonClient.tsx:14`)
- **Direction 1 — "The Poster" (recommended):** full-bleed navy, Exat display countdown as the
  hero object, lavender accents, one masked photo tease (SVG form mask system already exists),
  phone field + stall-interest toggle as-is, waitlist count as social proof. Cheapest; pure
  existing tokens.
- Direction 2 — "The Teaser Reel": background slow pan of last-edition photography under a
  navy wash (media-tint exists), countdown secondary. Needs real photography.
- Direction 3 — "The Ticket Stub": the page IS a ticket — clip-path stub with perforation,
  countdown punched into it. Most distinctive, most build (~2 days).
- All: move countdown target to `SystemSetting`/event date — no hardcoded dates.

### 6.2 Landing (today: strong RPA bones — hero, marquee facts, pinned services, brands, sponsors, CTA wall, FAQ — but generic copy, no proof, no lineup, hero leans on a vendor logo)
Keep the section system; rebuild content order for conversion:
1. Hero: date + city + **price-from + primary CTA above the fold** (exists) + real key art
   instead of first-vendor-logo (`(public)/page.tsx:37`).
2. **Proof band (new):** last-edition photos / press / numbers — the #1 conversion gap
   (failure #1).
3. The experience (pinned services — keep, it's the brand moment).
4. Lineup/schedule strip (ScheduleItem data exists, unused on landing).
5. Brands wall (keep) → 6. Sponsors (keep) → 7. Plan-your-evening (map teaser + FAQ merged) →
8. Final CTA wall (keep).
Tone: the copy already found ("the warm, grown-up alternative to the usual mela") — extend it;
kill placeholder claims like "80+ curated brands" unless true at render time (bind to real count).

### 6.3 Portals
Customer = "wallet, not portal": dashboard is tickets-first (one card per order-group, ADMIT-N
badge, share/download), profile one sheet. Vendor = "storefront onboarding": RPA-styled stepper
with a status timeline; dashboard and onboarding merge into one progressive page (today they
duplicate each other). Admin = unchanged design language, §3 diet IA.

---

## 7. Multi-agent execution roadmap

> **Superseded:** the authoritative, fully-expanded roadmap (effort hours, files, schema
> migrations M1-M7, dependency graph, standing rules) now lives in
> [implementation-roadmap.md](implementation-roadmap.md). The phase sketch below is retained
> for historical context only — where they differ, implementation-roadmap.md wins.

Rules of engagement: every package lists scope → inputs → acceptance. Agents must read the named
blueprint sections before coding; tests ship inside the package; a package merges only when its
acceptance commands pass in CI. One package = one PR on a `rebuild/<phase>-<slug>` branch.

### Phase R0 — Foundations (serial, one agent)
| Pkg | Scope | Acceptance |
| --- | --- | --- |
| R0.1 | Commit tests/configs (un-gitignore), CI: lint+typecheck+test:run+build blocking, audit blocking | CI red if a test fails; `git ls-files '*.test.ts'` non-empty |
| R0.2 | Middleware diet: delete pretty-URL layer + next.config redirect table; sidebar hrefs → physical paths | grep gates (architecture §8); all admin pages reachable; e2e nav smoke |
| R0.3 | Mutation pipeline `action()` + `Result<T>` envelope; migrate 3 pilot actions | Pilots green; envelope test |
| R0.4 | Guard renames + RBAC matrix tests (security §4) | Matrix sweep passes |
| R0.5 | Sentry + logger wiring + 5 alert rules | Test event → alert received |

### Phase R1 — Money correctness (parallel ×2 after R0)
| Pkg | Scope | Acceptance |
| --- | --- | --- |
| R1.1 | Oversell guard in fulfilment txn + concurrent test | Race test: N+1 buyers, exactly N fulfil |
| R1.2 | Group-QR model: `admitCount`, scan ADMIT-N w/ partial arrivals, capacity `sum(admitCount)`, single delivery | e2e: buy 5 → 1 QR → admit 3 then 2 → board shows 5 |
| R1.3 | Booking state-machine collapse + migration (HELD/PENDING out) | State tests; migration dry-run on branch DB |
| R1.4 | Coupon input at checkout + pending-payment state page | e2e coupon purchase; pending page auto-resolves |

### Phase R2 — Design system & tokens (parallel ×2)
| Pkg | Scope | Acceptance |
| --- | --- | --- |
| R2.1 | Token cleanup: kill aliases/raw hex, clamp() type scale, ESLint inline-fontSize ban | consistency.md §8 grep gates |
| R2.2 | Component contracts: RpaPageHeader, empty states, toast adoption, tables → components/admin/tables, date-format/status-badge migration | greps; admin actions show toasts |
| R2.3 | Motion consolidation: drop swiper+framer-motion, reduced-motion JS gating | deps absent; landing motion intact |

### Phase R3 — Customer surfaces (parallel ×3, the conversion phase)
R3.1 Coming-soon Direction 1 · R3.2 Landing rebuild (§6.2 order, proof band, real counts, ISR) ·
R3.3 Event detail + checkout flow (inline login, budgets) · R3.4 Wallet dashboard + profile +
share/download · R3.5 Public map on real data. Acceptance: Lighthouse budgets (performance §1),
axe pass, e2e purchase on mobile viewport.

### Phase R4 — Vendor surfaces (parallel ×2)
R4.1 Vendor portal → RPA rebuild (9 pages) · R4.2 Add-ons ordering (model + onboarding step +
payment line) · R4.3 Status timeline + call-back SLA surfacing + aging alert. Acceptance: dry-run
vendor e2e incl. add-on purchase.

### Phase R5 — Console diet & ops (parallel ×2)
R5.1 Remove Task Center; nav adds POS + Settings; analytics 9→3; finance diet (routes redirect
to V2 stubs removed cleanly) · R5.2 Kiosk scanner + ops status strip + staff sign-out-everywhere ·
R5.3 VenueMap consolidation + migration. Acceptance: nav matches §3 exactly; kiosk drill script.

### Phase R6 — Performance & hardening
R6.1 ISR + QR pre-generation + font/zone loading (performance §2-3) · R6.2 Security S2 items
(uploads, logout limiter, CF-Connecting-IP) · R6.3 Load test k6 + fixes. Acceptance: budgets in
CI; k6 thresholds.

### Phase R7 — Launch
Run launch-readiness.md top to bottom (scheduler, env, ₹1 live, drills, runbooks, go/no-go).

Sequencing: R0 → R1 → (R2 ∥ R3-prep) → R3 → R4 → R5 → R6 → R7. Estimated 6-9 agent-weeks of
package work; no calendar pressure (owner).

---

## 8. Founder roadmap

- **Launch (this blueprint):** everything in §3 marked M/S. One city, one edition, four surfaces,
  zero fake data, money paths bulletproof, gate survivable.
- **V2 (after edition one, informed by real data):** the owner-deferred list (§2) — prioritize by
  what edition one proves: if WhatsApp delivery failed anywhere → SMS fallback first; if gate
  queued → re-entry + more kiosk; if conversion lagged → referral + scarcity; reviews + post-event
  report regardless. Finance/analytics V2 surfaces only if the founder actually missed them.
- **V3 (multi-edition platform):** second city/edition with VenueMap reuse, sponsor self-serve,
  cross-event loyalty, websocket map, white-label themes — the schema already supports
  multi-event; V3 is when it earns UI.

---

## 9. What Apple / Stripe / Linear would refuse to ship (and this blueprint also refuses)

Fake kanban boards in a production console · made-up availability on a public map · a coupon
system no customer can use · an off-brand payment modal · a regression suite the CI can't see ·
46 admin pages wrapping 4 customer pages · "80+ brands" as static copy · a guard named
`requireSuperAdmin` that isn't.

*End of blueprint. The other six files are the per-domain specs; this file is the contract.*
