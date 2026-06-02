# FAILURE-MODES — resilience matrix

How BDQ Social degrades gracefully. Each row names the failure, the guardrail in code, and how it's
proven. Money is never lost, tickets are never dropped, and stalls are never double-booked.

| Failure | Guardrail | Where | Verify |
| --- | --- | --- | --- |
| **Razorpay webhook missed/delayed** | `reconcile` cron polls Razorpay for captured payments on stale PENDING orders and fulfils (idempotent); expires unpaid ones | `src/app/api/cron/reconcile/route.ts` + `fulfillOrder` (`src/server/tickets/service.ts`) | `scripts/verify-checkout.mjs` (fulfil), reconcile EXPIRE path |
| **Webhook replayed / duplicated** | Fulfilment is idempotent by `gatewayRef` (payment id) — a 2nd webhook is a no-op | `fulfillOrder` txn guard on `Payment.gatewayRef` (unique) | `scripts/verify-checkout.mjs` (replay → no dup) |
| **Email/WhatsApp provider down** | Durable Outbox: a failed send → `FAILED` + `attempts++` + `lastError`, retried by `notify-retry` cron up to 5×; channels are independent | `src/server/notifications/outbox.ts` | `scripts/verify-outbox-failure.mjs` |
| **WhatsApp not configured** | Dormant adapter — `whatsAppConfigured()` false → no WhatsApp rows enqueued; email still flows | `src/lib/whatsapp.ts`, `src/server/notifications/outbox.ts` | `scripts/verify-outbox.mjs` |
| **Database down** | `/api/health` returns **503** with `db:"down"`; pages render the error boundary instead of crashing | `src/app/api/health/route.ts` (`healthStatus`), `src/app/error.tsx` / `global-error.tsx` | `src/lib/health.test.ts` (unit) |
| **Firebase / phone OTP down** | Admin + staff sign in via password + TOTP (`/admin/login`) — no Firebase dependency, so the console + gate keep working | `src/app/api/auth/admin/route.ts` | `scripts/verify-admin-login.mjs` |
| **Concurrent stall holds (double-book)** | Conditional CAS update (`AVAILABLE→HELD`) + a partial-unique index = exactly one winner | `src/server/bookings/service.ts` | `scripts/verify-hold.mjs` |
| **Concurrent gate scan (double check-in)** | Conditional `updateMany` (`VALID→CHECKED_IN`); offline re-sync is idempotent by `clientScanId` | `src/server/checkin/service.ts` | `scripts/verify-checkin*.mjs` |
| **Expired holds left dangling** | `release-holds` cron sweeps `HELD` past `holdUntil` back to `AVAILABLE`; surfaced on `/admin/ops` | `src/app/api/cron/release-holds/route.ts` | `/admin/ops` "Expired holds" |
| **Multiple concurrent events** | Every query is event-scoped (`eventId` / `order.eventId`); analytics + capacity take an `eventId` | services across `src/server/*` | `scripts/verify-multi-event.mjs` |

## Crons (Vercel, see `vercel.json`)
`release-holds` (1m) · `notify-retry` (1m) · `reconcile` (5m) · `reminders` (1h). All authenticate
with `CRON_SECRET`. Health + queue depth are visible at `/admin/ops` and `GET /api/health`.
