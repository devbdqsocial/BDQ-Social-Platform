# Share Art Architecture (R6.1)

Turns every ticket buyer into organic reach: a premium, on-brand image a guest *wants* to post.
Goal — feel like a luxury event invitation, never a ticket export.

## Generation strategy

- **`next/og` `ImageResponse`** (Satori → PNG), the same engine already used for the site's
  `opengraph-image` routes. Server-rendered; no client canvas/DOM rendering.
- **Route:** `GET /api/share/ticket/[id]?format=story|post` (`runtime = "nodejs"`).
  - `story` → **1080×1920** (Instagram Story / WhatsApp Status — portrait-first, the primary).
  - `post` → **1080×1350** (Instagram Post — secondary).
- **Data:** `getTicketShareData(id)` returns **only** publicly-shareable fields — guest name, ticket
  type, event name, date, venue. **Never** the `qrToken`, phone, or email.
- **Design:** RPA palette as hex literals (ImageResponse can't read CSS vars) — navy `#01065B` field
  with a lavender `#868EFF` radial glow, yellow `#D0F95F` accent, cream type. Visual hierarchy:
  *"I'M GOING TO"* → event → date → venue → guest → ticket type. Minimal, editorial.
- **Fonts:** the **bundled default** Satori font with `fontWeight: 700` for display lines. (A local
  woff fetch via `import.meta.url` fails in turbopack dev — "not implemented"; the default font is
  reliable across every runtime and keeps generation instant. See Known Limitations.)

## Security (locked rule)

**The scannable QR never appears on the share image.** Anyone could otherwise scan a shared image to
enter. The art carries no QR, phone, or email — only what the guest is choosing to make public. The
route is public by **non-enumerable cuid** and 404s for a cancelled ticket.

## Caching strategy

- The image is deterministic per `(ticketId, format)` → `Cache-Control: public, max-age=300,
  s-maxage=86400, stale-while-revalidate=86400`. The Vercel CDN serves repeats; regeneration only on
  cache miss / event-detail change.
- Generation is ~sub-second and well under budget: **story ≈ 210 KB, post ≈ 162 KB** (both < 300 KB).

## Fallback strategy (sharing never blocks)

`TicketShare` (client) degrades gracefully:
1. **Native share with image** — `navigator.canShare({files})` + `navigator.share({files, text, url})`
   (opens the OS sheet → Instagram/WhatsApp with the PNG).
2. **Native share, link only** — `navigator.share({text, url})` if files aren't supported.
3. **Copy link** — `navigator.clipboard` with `"<text> <url>"` on desktop / no Web Share.
4. **Download** — always available (blob → anchor download).
If the image fails to fetch, text + URL still share. The art is never a hard dependency.

## Placement

- **Wallet card** (`TicketCard` back): a "Share my pass" link per ticket.
- **Post-purchase peak** (`tickets/page.tsx`): a prominent "Make it official — share your pass"
  callout shown when a fresh reveal just played — caught right after the celebratory takeover.

## Analytics

`track()` (`src/lib/track.ts`) → `POST /api/track` (rate-limited, structured log; swappable for a real
provider). Events: `share_view`, `share_generated`, `share_attempted`, `share_completed`,
`share_downloaded`, `share_failed`. Fire-and-forget — never blocks UX.

## Performance notes

Server generation + CDN caching; no heavy client rendering. The share sheet lazy-loads the image only
when opened. Within the phase's performance rule (no Lighthouse/LCP/CLS regression — the feature adds
a couple of buttons + an on-demand modal).

## Future enhancements

- **Brand font (Exat):** load `src/app/fonts/exatcyrwide-bold.woff` for headline fidelity once the
  prod font-load path is verified (works on Vercel via `import.meta.url`; needs a dev-safe path).
- Event-themed backgrounds / per-event art direction; optional square 1080×1080.
- A subtle vendor/sponsor lockup for activations; a back-link with the event slug for a tighter
  growth loop (recipient → event page → buy).
- Real analytics provider (PostHog/Plausible) behind `track()`.

## Known limitations

- Headline type is the default sans, not Exat (reliability > brand-font until the prod font path is
  proven). The look still reads premium via palette + layout.
- The image shows the guest's name + event publicly by design (the owner chooses to share it); the
  cuid URL is non-enumerable but, once shared, is public — acceptable since no QR/PII is on it.
- The existing `opengraph-image` routes still use the **old clay/gold palette** — out of scope here,
  flagged for a later brand pass.
