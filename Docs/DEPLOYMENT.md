# DEPLOYMENT — production runbook

Step-by-step to take BDQ Social live on Vercel + Neon. Run `node --env-file=.env scripts/preflight.mjs`
before deploying. Resilience behaviour is documented in [FAILURE-MODES.md](FAILURE-MODES.md).

## 1. Environment variables

Set these in Vercel → Settings → Environment Variables. "Required" must be present for the app to
function; the rest activate a feature and stay dormant until set.

| Var | Required | Used by |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon pooled connection (runtime) |
| `DATABASE_URL_DIRECT` | yes | Neon direct connection (migrations) |
| `SESSION_SECRET` | yes | jose session cookie + signed QR tokens (`src/server/auth/session.ts`, `qr-token.ts`) |
| `CRON_SECRET` | yes | authenticates the 4 cron routes |
| `APP_BASE_DOMAIN` | yes | absolute URLs (sitemap, OG, emails) + zone routing |
| `DEV_ADMIN`, `DEV_VENDOR` | **must be unset/false in prod** | dev-only auth bypass |
| `NEXT_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID) | for customer/vendor login | phone OTP (`firebase-client.ts`) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | for payments | order create + webhook + checkout |
| `WHATSAPP_PROVIDER`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_CLOUD_PHONE_ID`, `WHATSAPP_TEMPLATE_TICKET` | for WhatsApp | Cloud API (`src/lib/whatsapp-cloud.ts`) |
| `RESEND_API_KEY`, `EMAIL_FROM` | for email | ticket + reminder emails |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for asset upload | vendor logos/products |

## 2. Database

1. Neon project → copy pooled (`DATABASE_URL`) + direct (`DATABASE_URL_DIRECT`).
2. `npm run db:deploy` (applies migrations via `prisma migrate deploy`).
3. `npm run db:seed` (once — creates the seed admin + demo events). Safe to skip in a clean prod and
   create real data via the admin console instead.
4. Bootstrap the first super-admin **against the PROD database** (the #1 login bug is enrolling in the
   local `.env` DB but signing into prod — a different Neon instance). Pull the prod URL with
   `vercel env pull`, then:
   - Confirm which DB you're pointed at: `DATABASE_URL="<prod>" node scripts/admin-doctor.mjs`
     (prints the host + which admins can sign in there).
   - Enrol: `DATABASE_URL="<prod>" node scripts/admin-enroll.mjs you@domain.com "<password>"` and scan
     **only the freshly printed QR** (re-running rotates the secret and invalidates old QRs).
   Do **not** use `scripts/setup-live.mjs` for prod — its password-only admin is rejected on prod (2FA
   is mandatory for SUPER_ADMIN/ADMIN). After this one bootstrap, manage everything in-app:
   - **My Profile › Account** — enable/reset 2FA and regenerate backup codes (no scripts).
   - **Staff › Invite by email** — new admins set their own password + 2FA from a secure link
     (needs `RESEND_API_KEY`/`EMAIL_FROM`); first login without 2FA is auto-routed to `/admin/setup-2fa`.
   - Locked out? Sign in with a saved **backup code** in place of the authenticator code.

## 3. Vercel + DNS

1. Import the repo; build = `next build`, install runs `prisma generate`.
2. Add domains: apex `bdqsocial.com` + wildcard `*.bdqsocial.com` (vendors./admin. subdomains route
   via `src/middleware.ts`).
3. Crons in [vercel.json](../vercel.json) (`release-holds`, `notify-retry`, `reconcile`, `reminders`)
   are picked up automatically; they auth with `CRON_SECRET`.

## 4. Webhooks + providers

- **Razorpay** → Dashboard → Webhooks → `https://bdqsocial.com/api/payments/razorpay/webhook`, secret
  = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured`. Fulfilment is idempotent + reconciled.
- **WhatsApp Cloud** → approve a `ticket_confirmation` body template (3 vars: event, count, link).
- **Resend** → verify the `EMAIL_FROM` domain (else only the account owner receives mail).

## 5. Go / no-go

- `scripts/preflight.mjs` is green (env present, DB reachable, DEV gates off).
- `GET /api/health` → 200 `{ ok:true, db:"ok" }`; `/admin/ops` shows a clean board.
- A real ₹ test purchase delivers a QR on email/WhatsApp; the scanner checks it in.
- **Rollback:** redeploy the previous Vercel build (instant); DB migrations are additive — no destructive
  down-migrations are used.
