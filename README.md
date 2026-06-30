# BDQ Social

Vadodara's premium curated lifestyle festival + night-market portal. One Next.js app serving four
zones off subdomains:

| Zone | Host (prod) | Local access | What it is |
| --- | --- | --- | --- |
| Public + Customer | `bdqsocial.com` | `localhost:3000` | Landing, events, ticket purchase, My Tickets |
| Vendor | `vendors.bdqsocial.com` | `localhost:3000/?zone=vendor` | Registration, KYC, assets, stall booking |
| Admin | `admin.bdqsocial.com` | `localhost:3000/?zone=admin` | Event/map/vendor CRUD, analytics |
| Staff | (admin host) | `localhost:3000/admin/checkin?zone=admin` | QR check-in scanner |

Subdomain → zone routing lives in [src/middleware.ts](src/middleware.ts) (`?zone=` overrides the
host locally). Per-action RBAC is enforced server-side, not by the middleware.

## Stack

Next.js 15 (App Router, server actions + route handlers) · TypeScript strict · Tailwind v4 +
shadcn/ui · Prisma + Neon Postgres · Firebase phone OTP + jose session cookie · Razorpay
(webhook-driven, idempotent) · react-konva map · WhatsApp Cloud API (or Interakt) · SendGrid email ·
Cloudinary · Vercel + cron. **Docs are the source of truth** — see [Docs/](Docs/) (`project.md`, `ARCHITECTURE.md`,
`SCHEMA.md`, `API.md`, `BUSINESS-RULES.md`, `design.md`, `plan.md`).

## Local quickstart

```bash
cp .env.example .env          # then fill it (see below)
npm install
npx prisma migrate deploy     # apply schema to your DB
npx prisma db seed            # demo event, map, accounts
npm run dev                   # http://localhost:3000
```

Minimum `.env` to run locally:

```ini
DATABASE_URL=postgresql://...      # Neon pooled
DATABASE_URL_DIRECT=postgresql://...  # Neon direct (migrations)
SESSION_SECRET=<any-long-random-string>
CRON_SECRET=<any-random-string>
DEV_ADMIN=true                     # auto-login seeded SUPER_ADMIN (dev only)
DEV_VENDOR=true                    # auto-login seeded vendor   (dev only)
```

Razorpay / Firebase / Interakt / SendGrid / Cloudinary keys are **optional** — those features no-op or
are exercised by the verify scripts when unset. `DEV_ADMIN`/`DEV_VENDOR` make the admin and vendor
zones usable without real login; they are **staging-only and must be `false` in production**
(see [src/server/auth/guard.ts](src/server/auth/guard.ts)).

A full click-by-click test tour is in [Docs/TESTING.md](Docs/TESTING.md).

## Verify scripts

Each proves one slice against the real DB without spending money (real Razorpay *order* = no charge;
self-signed webhooks; SendGrid sandbox mode). Run the dev server, then in another shell:

```bash
node --env-file=.env scripts/verify-<name>.mjs
```

| Script | Proves |
| --- | --- |
| `verify-checkout` | Webhook fulfilment: order→PAID + ticket issued, replay is idempotent |
| `verify-outbox` | Notification outbox drains QUEUED→SENT via the cron (real email send) |
| `verify-hold` | Concurrent stall holds → exactly one winner (no double-book) |
| `verify-stall-payment` | Stall booking payment path → Booking PENDING |
| `verify-approval` | Vendor approval flips stall to BOOKED; reject frees it |
| `verify-checkin` / `verify-checkin-sync` | QR check-in + idempotent offline re-sync |
| `verify-email` | SendGrid send (sandbox mode) |
| `verify-cloudinary` | Signed direct-upload signature |
| `verify-ratelimit` | DB fixed-window rate limiting trips |

## Deploy (Vercel)

1. Import the repo. Install runs `postinstall: prisma generate`; build is `next build`.
2. Set env vars (Project → Settings → Environment Variables):

   | Var | Required | Notes |
   | --- | --- | --- |
   | `DATABASE_URL`, `DATABASE_URL_DIRECT` | yes | Neon pooled + direct |
   | `SESSION_SECRET`, `CRON_SECRET` | yes | long random strings |
   | `APP_BASE_DOMAIN` | yes | e.g. `bdqsocial.com` |
   | `DEV_ADMIN`, `DEV_VENDOR` | staging only | `true` for staging, omit/`false` in prod |
   | `NEXT_PUBLIC_FIREBASE_*` | for real login | phone OTP |
   | `RAZORPAY_*`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | for payments | + webhook secret |
   | `SENDGRID_API_KEY`, `EMAIL_FROM` | for email | |
   | `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_CLOUD_PHONE_ID` (+ `WHATSAPP_TEMPLATE_TICKET`) | for WhatsApp | official Cloud API; dormant until set |
   | `INTERAKT_API_KEY`, `INTERAKT_BASE_URL`, `INTERAKT_TEMPLATE_TICKET` | alt WhatsApp | Interakt BSP (set `WHATSAPP_PROVIDER=interakt`) |
   | `CLOUDINARY_*` | for asset upload | |

3. Add the domains: wildcard `*.bdqsocial.com` + apex `bdqsocial.com`.
4. Apply schema + seed once against the prod DB: `npm run db:deploy && npm run db:seed`.
5. Crons (`/api/cron/release-holds`, `/api/cron/notify-retry`) are declared in
   [vercel.json](vercel.json) and authenticate with `CRON_SECRET`.
6. Point the Razorpay webhook at `/api/payments/razorpay/webhook` with `RAZORPAY_WEBHOOK_SECRET`.

CSP currently ships **Report-Only** ([next.config.ts](next.config.ts)) — observe before enforcing.

## Locked rules

Money = integer paise (never floats) · all prices admin-entered per event (never hardcoded) · no
refunds / no GST · fulfilment is webhook-driven + idempotent · one active booking per stall · audit
every admin/staff mutation · brand = clay/pine/gold, no purple. Full set in
[CLAUDE.md](CLAUDE.md) and [Docs/BUSINESS-RULES.md](Docs/BUSINESS-RULES.md).

## Not yet built (roadmap: [Docs/plan.md](Docs/plan.md))

Real admin/staff login (Firebase email-pass + TOTP 2FA — admin is dev-gated for now), PWA service
worker, error tracking, full analytics/sponsorship, a11y/perf pass.
