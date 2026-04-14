# Stripe Live Cutover Runbook

Use this runbook to migrate from Stripe test mode to live mode safely.

## Preconditions

- Production web deployment is live with `BETTER_AUTH_URL` and `HOSTFUNC_RUNTIME_URL`.
- Production database is migrated and reachable.
- Billing plans exist in DB (`free`, `pro`, etc).
- You have Stripe live mode access for products/prices/meters/webhooks.

## 1) Set Live Secrets

In production web environment:

- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

Verify with:

```bash
pnpm --filter @hostfunc/web stripe:sync
```

Expected:
- Products and prices are created/updated in Stripe live mode.
- `plan.stripe_product_id`, `plan.stripe_price_id`, and meter columns are populated.

## 2) Configure Live Webhook Endpoint

- Endpoint URL: `https://app.hostfunc.com/api/webhooks/stripe`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Paste live signing secret into `STRIPE_WEBHOOK_SECRET`.

## 3) E2E Verification (Live)

1. Create a new real customer/org in production.
2. Start checkout from billing page.
3. Complete payment with a real card.
4. Confirm webhook receives `200` and DB `subscription.planId` moves off free plan.
5. Open billing portal and verify subscription is visible/manageable.

## 4) Usage Meter Reporting

Nightly usage reporting is wired via `apps/cron` schedule (`0 0 * * *`).

Manual smoke test:

```bash
pnpm --filter @hostfunc/web stripe:report-usage
```

Verify:
- `usage_event.reported_at` fills for processed rows.
- Stripe meter events appear in live mode.

## 5) Rollback Plan

If subscriptions stop syncing:

1. Pause checkout CTA in UI (feature flag or temporary guard).
2. Keep existing subscriptions in current state (no destructive backfill).
3. Fix webhook secret/signature mismatch.
4. Replay failed Stripe events from Stripe dashboard.
5. Re-enable checkout once webhook processing returns to green.

## Test-to-Live Data Notes

- Stripe test and live entities are fully separate.
- Never copy test customer IDs into production `subscription` records.
- Existing test workspaces must purchase again in live mode.
