# TESTING — local walkthrough

How to click through everything that's built, locally, with the seed data. Assumes you've run the
[README](../README.md) quickstart (`prisma migrate deploy` → `prisma db seed` → `npm run dev`) with
`DEV_ADMIN=true` and `DEV_VENDOR=true` in `.env`.

Base URL: **http://localhost:3000**. The admin/vendor zones are selected with a `?zone=` query
param locally (in prod they're separate subdomains).

## Seed data

`npx prisma db seed` creates (idempotent):

| Account | id | Role | Use |
| --- | --- | --- | --- |
| BDQ Admin | `admin_seed` | SUPER_ADMIN | admin zone (via `DEV_ADMIN`) |
| Demo Vendor | `vendor_seed` | VENDOR (SUBMITTED) | vendor zone (via `DEV_VENDOR`) |
| Indie Threads Co. | `vendor_approved` | VENDOR (APPROVED) | shows in public brand directory |
| Demo Customer | `customer_seed` | CUSTOMER | used by `verify-checkout` |

Plus event **BDQ Social — October Edition** (`/events/bdq-social-october-edition`) with 3 ticket
types (General/Couple/VIP), a 3-day schedule, and a 12-stall demo map (one BOOKED, one HELD, one
PENDING).

## Customer zone — http://localhost:3000

1. **Landing** `/` — hero, event card, countdown.
2. **Events** `/events` → **event detail** `/events/bdq-social-october-edition` — ticket types +
   prices, schedule, map.
3. **Login** `/login` — Firebase phone OTP (needs `NEXT_PUBLIC_FIREBASE_*`; skip if unset).
4. **Buy a ticket** — from the event page. Razorpay checkout opens with the correct amount.
   **Creating an order does not charge anyone.** To prove the *full* paid → ticket-issued →
   notification path **without paying**, use the script (it self-signs the webhook Razorpay would
   send):
   ```bash
   node --env-file=.env scripts/verify-checkout.mjs
   ```
   → order becomes PAID, 1 ticket issued, webhook replay stays idempotent (no duplicate).
5. **My Tickets** `/tickets` — issued tickets with QR (offline-cached).

## Vendor zone — http://localhost:3000/?zone=vendor

`DEV_VENDOR=true` auto-logs-in the seeded vendor.

1. **Dashboard** `/vendor`
2. **Profile** `/vendor/profile` — brand, category, socials; Cloudinary asset upload (needs
   `CLOUDINARY_*`).
3. **Events** `/vendor/events` → `/vendor/events/[id]` — the live stall map; select an AVAILABLE
   stall to **hold** it, then book. One active booking per stall is DB-enforced:
   ```bash
   node --env-file=.env scripts/verify-hold.mjs   # concurrent holds → one winner
   ```

## Admin zone — http://localhost:3000/?zone=admin

`DEV_ADMIN=true` auto-logs-in the seeded SUPER_ADMIN.

1. **Dashboard** `/admin`
2. **Events** `/admin/events` → `/admin/events/[id]` — CRUD events, ticket types, schedule, stall
   types (all prices admin-entered).
3. **Map designer** `/admin/events/[id]/map` (and `/admin/map`) — ft-grid canvas: add/move/resize
   stalls, save/load.
4. **Vendors** `/admin/vendors` → `/admin/vendors/[id]` — review KYC, approve/reject. Approve flips
   the stall to BOOKED on the live map:
   ```bash
   node --env-file=.env scripts/verify-approval.mjs
   ```
5. **Check-in scanner** `/admin/checkin?zone=admin` — `html5-qrcode` scanner; scan a ticket QR →
   CHECKED_IN, re-scan → "already used". Offline scans queue and sync:
   ```bash
   node --env-file=.env scripts/verify-checkin.mjs
   node --env-file=.env scripts/verify-checkin-sync.mjs
   ```

## Notifications

Ticket delivery goes through a durable outbox (email via SendGrid, WhatsApp via Interakt — dormant
until `INTERAKT_API_KEY` is set). Prove the drain end-to-end:

```bash
node --env-file=.env scripts/verify-outbox.mjs
```
→ an EMAIL row goes QUEUED → SENT via `POST /api/cron/notify-retry` (real SendGrid send). With no
Interakt key, no WhatsApp rows are enqueued.

## Full verify-script list

See the table in the [README](../README.md#verify-scripts). Pattern:
`node --env-file=.env scripts/verify-<name>.mjs` with the dev server running.
