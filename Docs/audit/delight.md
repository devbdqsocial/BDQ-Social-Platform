# delight.md — Wow Moments Specification

> Spec 13/15. The "would users say wow in 30 seconds" layer — owner-selected moments, specced
> to the millisecond so they ship exactly once and exactly right. All motion uses
> [design-system.md §2](design-system.md) tokens; every moment has a reduced-motion and a
> failure fallback. Rule: **a wow moment may never delay or block a functional outcome** — the
> data is committed first, the celebration plays after.

## 1. Cinematic ticket reveal (after payment) ✔owner

Trigger: Razorpay `onSuccess` → client navigates to `/tickets?reveal=<orderId>`; reveal plays
only when the order is confirmed PAID server-side (poll 1s, max 60s; until then show the
pending state of customer-portal.md §3.2 — the reveal NEVER fakes confirmation).

Storyboard (total 2400ms, GSAP timeline):
| t (ms) | Beat | Spec |
| --- | --- | --- |
| 0–400 | Takeover | Navy `#01065B` wipes up from bottom (`clip-path inset`), dur 400, `--ease-out` |
| 300–900 | Headline | "You're in." `f-h133`, SplitReveal chars, 60ms stagger |
| 900–1500 | Ticket card | Card enters from 24px below + rotateX 8°→0°, `--ease-bounce`; lavender `--shadow-glow` pulses once (opacity 0→.35→.15, 600ms) |
| 1500–2000 | Details | Event name, type, ADMIT-N badge fade-in stagger 80ms |
| 2000–2400 | Actions | "Save it · Share it" row rises; takeover relaxes to wallet page beneath |
Skip: tap anywhere ≥800ms jumps to end state. Reduced motion: instant end state, glow static.
Repeat visits: reveal plays once per order (`sessionStorage reveal:<orderId>`).

## 2. Shareable ticket art ✔owner

Server-generated branded image (1080×1920 story + 1080×1080 square), generated at fulfilment
and cached on the order (Cloudinary upload, `meta.shareCard`).
- Template: navy field, lavender radial glow top-center (the `.bg-ink` recipe), "I'M GOING"
  kicker, event name Exat (auto-fit 2 lines max), date + city line, BDQ wordmark bottom,
  decorative clip-path form (svg--form11 silhouette) — **no QR on the share image ever**
  (security: QR stays private).
- Generation: `@react-pdf/renderer` is PDF-only → use `satori` + `resvg` (add dependency,
  server-only) or Cloudinary text-overlay transforms on a base asset — roadmap package decides
  by spike (acceptance: 1080px PNG < 300KB, < 800ms generation, Exat embedded). Fallback: a
  pre-designed static event share image (admin-uploaded) if generation fails — sharing never
  errors.
- Share action: Web Share API (`navigator.share` files) → fallback download + "Long-press to
  save". Copy: "Bring everyone." WhatsApp text prefilled: "I'm going to <event> — <date>.
  Tickets: <url>".

## 3. Purchase celebration micro-moment ✔owner

Inside the reveal at t=900ms: 24 confetti particles (lavender/green/yellow rects 6–10px), GSAP
physics burst from the card edge, 800ms lifetime, gravity 0.6, then gone — runs once, canvas
layer, auto-skipped under reduced motion and on `deviceMemory < 4`. Plus haptic
`navigator.vibrate(35)` where supported. Never on the admin side.

## 4. Wallet flip card ✔owner

Ticket card flips on tap/Enter (3D rotateY 180°, dur 600ms `--ease-swift`, `perspective
1200px`). Front: QR + essentials (customer-portal §3.2). Back: order id, holder, gate line from
guide data, Share/Download actions, "All sales final". Flip affordance: corner glyph `⟲` +
first-visit hint label ("Tap for details", shown once, sessionStorage). Reduced motion:
crossfade 150ms instead of rotation. A11y: `aria-pressed` state, both faces in DOM,
`aria-hidden` on the hidden face.

## 5. Happening-tonight strip ✔owner

Landing + customer home, **event week only** (auto: `startsAt − 6d` → `endsAt`; manual override
via admin Content → Happening Strip — admin-portal §6.4).
- Content priority: (1) manual messages, (2) live act ("LIVE NOW · <performer> on <stage>" from
  the schedule now-query), (3) gates info ("GATES OPEN 4 PM · <venue>"), (4) tickets state
  ("LAST FEW TICKETS" only when real: remaining < 10% — bound to inventory).
- Visual: 40px bar, section-pair `gama-2.surface-1` (navy/yellow), `kicker` type, marquee 32s
  on mobile / static centered on desktop, dismiss ✕ (sessionStorage per day). Data: one cached
  endpoint, 60s revalidate. Never renders empty or stale (if no items → not rendered).

## 6. Celebratory ADMIT-N scan screen (kiosk) ✔owner

The guest-facing flourish on top of the functional kiosk (mobile.md §6). On scan resolve
(<150ms after server response):
| Result | Screen (bottom 45% zone) | Hold |
| --- | --- | --- |
| VALID single | Lavender flash 120ms → "WELCOME IN" `f-h76` + holder name when known ("Welcome, Priya") + ✓ glyph 96px | 2.5s → auto-ready |
| VALID group | Same + "ADMIT <N>" 120px tabular + badge state line "Hand over <N> badges" + staff tap "Done" to re-arm (explicit, prevents double-walk-ins) | until tap |
| Partial group (arrivals split) | "ADMIT <k> of <N> — <N−k> already in" + Done | until tap |
| ALREADY_USED | Amber, "Already scanned <time> at <gate>" + ↺ glyph — calm copy, no red panic | 3s |
| INVALID | Red, "Not a valid ticket" + ✕ + "Try manual entry" button | 3s |
Name greeting uses `holderName ?? null` — silently omitted when absent. Offline queue results
replay WITHOUT celebration (functional list only). Reduced-motion/kiosk-setting: flash off.

## 7. WhatsApp concierge thread ✔owner

The ticket-delivery WhatsApp thread becomes the event companion. Built on the existing Cloud
API adapter (`lib/whatsapp-cloud.ts`) + outbox; inbound via Meta webhook (new
`/api/webhooks/whatsapp` — signature-verified like campaigns webhook).

Outbound sequence (templates — submit to Meta EARLY, approval lead time is the risk,
launch-readiness gate):
| When | Template | Content |
| --- | --- | --- |
| Fulfilment | `ticket_confirmation` (exists) | QR + order summary |
| T−24h | `event_tomorrow` | "Tomorrow: <event>. Gates <time>. Your QR is ready ↑" |
| T−2h | `event_today` | gates + parking line (from guide) + "Reply MAP or SCHEDULE" |
| Post-event +1d | `event_thanks` | "What a night. Photos: <gallery url>" |
Inbound keyword auto-replies (24h session messages, free-form — no template needed): keyword
sets from admin Concierge config (admin-portal §9): `schedule|lineup|now` → now/next from
schedule query · `map|where` → map URL + venue pin · `ticket|qr` → wallet link · `help|contact`
→ support phone · unmatched → "We didn't catch that — reply SCHEDULE, MAP, TICKET or HELP."
Rate-limit inbound per phone (5/min); suppression list honored; all sends through outbox
(dedupe keys `concierge:<phone>:<kw>:<hour>`).

## 7b. Stall-booking zoom-in (vendor map) ✔owner — map-system §11

The vendor's "this one is mine" moment. On tapping an available stall: viewport animates to the
stall at 2× over **450 ms `--ease-out`** (single animation, no bounce), stall fill brightens to
its type color at full opacity, 600 ms lavender pulse ring (2 px, expanding 1→1.15 scale,
fading), then the bottom sheet slides up (240 ms). On successful reservation: sheet header
swaps to "Stall F-12 is yours to finish ✓" with one lavender glow pulse on the stall (no
confetti here — the celebration belongs to payment, §3). Reduced-motion: instant zoom, no
pulse, sheet appears. Implementation: konva `to()` tweens inside `BookingFloorPlan`; no new deps.

## 8. V2 parking lot (owner-deferred — do not build)

Venue flythrough teaser · lineup audio previews · editorial food trail · scan sound design ·
referral-with-art codes · early-access "Insiders" club · favorites/wishlist · spin-the-wheel ·
photo-booth uploads · live polls.

## 9. Verification

- Reveal: e2e with mocked payment → reveal plays once, skip works, reduced-motion jumps to end;
  pending-poll path (webhook delayed 10s) never shows reveal early.
- Share art: snapshot test of generated PNG (dims/size); fallback path when generator throws.
- Strip: time-mocked tests for window + content priority; never renders with zero items.
- Kiosk states: storybook-style fixture page + gate drill (launch-readiness §6).
- Concierge: webhook signature test; keyword routing unit tests; template approval checklist
  item; suppression respected test.
