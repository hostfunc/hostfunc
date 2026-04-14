# Go-Live Checklist

## Pre-Launch (T-24h)

- [ ] All production env vars set from `apps/web/.env.production.example`.
- [ ] Cloudflare worker secrets set for `runtime`, `cron`, and `tail`.
- [ ] Database migrations applied in production.
- [ ] Stripe live products/prices/meters synced (`stripe:sync`).
- [ ] Stripe webhook points to `/api/webhooks/stripe` with live signing secret.
- [ ] Google + GitHub OAuth callback URLs set to production domain.
- [ ] Release workflow has production approval enabled.

## Dry Run (Staging-like)

- [ ] Deploy candidate release to staging-like environment.
- [ ] Run `pnpm --filter @hostfunc/web smoke:critical`.
- [ ] Validate login with Google and GitHub.
- [ ] Validate workspace creation and function deploy path.
- [ ] Run a checkout test (test mode in staging only).
- [ ] Confirm observability summary endpoint reports expected events.

## Launch Day Sequence

1. Deploy app + workers.
2. Validate smoke checks.
3. Open signup (announce beta).
4. Monitor dashboards/alerts for 24-72h.

## Launch Monitoring Targets (first 72h)

- Stripe webhook failures: 0 sustained.
- Runtime ingestion failures: under 1% of executions.
- Auth failure spikes: no sustained growth trend.
- CLI deploy success ratio: > 90%.
