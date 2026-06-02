# LIVE-SETUP — testing the deployed site

How the live deployment (`bdq-social-platform.vercel.app`) is set up for testing: a clean real event
plus admin/vendor/customer test logins. See [DEPLOYMENT.md](DEPLOYMENT.md) for the full prod runbook.

## 1. Ship the code
Commit + push → Vercel redeploys. This release adds: password-only admin exception
(`ADMIN_NO_2FA_EMAILS`) and an explicit login `zone` so the **vendor login yields the VENDOR role on
the preview domain** (which has no `vendors.` subdomain).

## 2. Vercel env vars
- `ADMIN_NO_2FA_EMAILS` = `admin@bdqsocial.com` (the test admin — password-only).
- `NEXT_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID,
  APP_ID) — required for phone OTP login to initialise.
- Already needed: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `SESSION_SECRET`, `CRON_SECRET`, `APP_BASE_DOMAIN`.

## 3. Seed the real event + test admin (one command, hits the live DB)
```bash
node --env-file=.env scripts/setup-live.mjs admin@bdqsocial.com "<your-password>"
```
This wipes the demo data, creates **BDQ Social** (empty shell: Oct 30 / 31 / Nov 1 2026, 4–11 PM each
evening, Aarush Lawn) — add tickets/schedule/map in the admin console — and enrols the test admin.

## 4. Firebase Console (for vendor/customer test logins)
- Authentication → Sign-in method → enable **Phone**.
- Authentication → Settings → **Authorized domains** → add `bdq-social-platform.vercel.app`.
- Phone → **test phone numbers** (no SMS sent):
  - Customer: `+91 90000 00001` → code `123456`
  - Vendor:   `+91 90000 00002` → code `123456`

## 5. Test accounts

| Role | Where | Credentials |
| --- | --- | --- |
| **Admin** | `/admin/login` | `admin@bdqsocial.com` + your password (no 2FA) |
| **Customer** | `/login` | phone `+91 90000 00001`, OTP `123456` |
| **Vendor** | `/vendor/login` | phone `+91 90000 00002`, OTP `123456` (gets the VENDOR role) |

After signing in, the vendor sets up a brand profile; approve it from the admin **Vendors** screen
(the vendor must sign the contract at `/vendor/contract` first).

## Before public launch (undo the test conveniences)
- Remove `ADMIN_NO_2FA_EMAILS` (and enrol real admins with TOTP via `scripts/admin-enroll.mjs`).
- Remove the Firebase test phone numbers.
- **Re-enable crons** — `vercel.json` is currently `{}`, so `release-holds` / `notify-retry` /
  `reconcile` / `reminders` don't run (holds won't auto-release, notifications won't retry). Restore
  the crons array (see git history) or run them via an external scheduler.
