# Stripe Webhook Recovery Runbook

## Symptoms

- Checkout completes in Stripe but app still shows free tier.
- `/api/webhooks/stripe` returns 4xx/5xx.
- `webhook_event` rows from source `stripe` contain errors.

## Recovery Steps

1. Verify `STRIPE_WEBHOOK_SECRET` matches the live endpoint secret.
2. Confirm Stripe endpoint URL is production app domain.
3. Check server logs for signature or DB errors.
4. Replay failed events from Stripe dashboard.
5. Validate subscription row updates (`plan_id`, `status`, period dates).

## Post-Recovery Validation

- New checkout upgrades plan in-app within seconds.
- Billing portal opens for upgraded customer.
- `webhookFailures` in observability summary returns to baseline.
