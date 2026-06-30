# Razorpay Webhook Go-Live Runbook

## Endpoint
- URL: `https://<production-domain>/api/payments/razorpay/webhook`
- Required event: `payment.captured`
- Required secret: same value as `RAZORPAY_WEBHOOK_SECRET`

## Verification
- Razorpay signs the raw webhook body with `X-Razorpay-Signature`; never verify a parsed body.
- Razorpay sends `x-razorpay-event-id`; duplicate deliveries must return 200 without re-fulfilling.
- Confirm the admin Ops page shows a recent webhook heartbeat after a live/test delivery.

## Drill
1. Set live/test keys in the deployment environment.
2. Configure the webhook URL and secret in the matching Razorpay mode.
3. Make a small test-mode payment against a staging event.
4. Confirm one `Payment.gatewayRef`, one `WebhookEvent`, and the expected ticket/booking fulfilment.
5. Replay the same webhook body/signature/event id and confirm no duplicate fulfilment.
6. Run reconcile cron once and confirm it is idempotent.

## Failure Handling
- Bad signature: route returns 400 and logs `webhook.razorpay`.
- Duplicate event id: route returns 200 `{ ok: true, duplicate: true }`.
- Fulfilment error after a verified webhook: route logs `webhook.razorpay.fulfil`; reconcile cron is the recovery path.
