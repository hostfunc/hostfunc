# Production release plan

Orchestration runbook for the first production release. Each step references the
detailed runbook that owns it; this document is the order and the gates.
Production deploys are triggered by pushing a `v*` tag (workers) and promoting
the same SHA on Vercel (web). Do not tag until every gate below is closed.

Prerequisite: the staging release validated per
[staging-validation-master-guide](./staging-validation-master-guide.md) and has
soaked with no new 4xx/5xx patterns in worker logs.

## Gate 1 — Cloudflare resources (currently the hard blocker)

`apps/runtime/wrangler.toml` and `apps/outbound/wrangler.toml` still carry
`REPLACE_WITH_PROD_*` placeholders, so production workers cannot deploy.

1. Run `ops/scripts/provision-cloudflare.sh production` — creates the
   `hostfunc-prod` dispatch namespace and the `fn-index-prod`,
   `egress-counters-prod`, `fn-assets-prod`, and `domain-index-prod` KV
   namespaces (idempotent; reuses by title).
2. Replace the placeholders the script prints:
   - `apps/runtime/wrangler.toml` `[env.production]`: `FN_INDEX`,
     `EGRESS_COUNTERS`, `DOMAIN_INDEX`
   - `apps/outbound/wrangler.toml` `[env.production]`: `EGRESS_COUNTERS`
3. Commit via PR. CI must be green before continuing.

## Gate 2 — Internal service tokens

Fresh values for production — never reuse staging.

1. `ops/scripts/generate-tokens.sh` → `RUNTIME_INVOKE_TOKEN`,
   `RUNTIME_LOOKUP_TOKEN`, `TRIGGER_CONTROL_TOKEN`, `RUNTIME_INGEST_TOKEN`.
2. `ops/scripts/set-worker-secrets.sh production` sets them on all five
   workers.
3. Mirror the same values into the Vercel `hostfunc-web` Production
   environment. The web app refuses to boot in production while any of these
   equals its dev default — that guard is intentional.

## Gate 3 — Data plane

1. Production Postgres (Supabase) and Redis (Upstash) provisioned; IP
   allowlists set. See [launch-hostfunc-io](./launch-hostfunc-io.md) §database.
2. `DATABASE_URL=<prod direct URL> pnpm db:migrate` (direct connection, not
   pooled). All migrations through 0017 must apply cleanly.
3. Confirm backups/PITR enabled before launch ([db-restore](./db-restore.md)).

## Gate 4 — Vercel production project

1. `hostfunc-web` project: full env per
   [production-env-matrix](../production-env-matrix.md). As of 2026-06-10 the
   project's builds are failing while `hostfunc-web-staging` builds the same
   SHA — diagnose with `npx vercel inspect <dpl> --logs`; expect missing
   Production/Preview env vars (Stripe placeholders, BETTER_AUTH_SECRET, etc.).
2. Domains `hostfunc.io` / `app.hostfunc.io` attached.
3. OAuth callback URLs updated for production origins on the GitHub login
   app, the GitHub integrations app, and Google.

## Gate 5 — Custom domains (Cloudflare for SaaS)

1. On the SaaS zone: set fallback origin and the customer CNAME target.
2. Vercel prod env: `CF_SAAS_ZONE_ID`, `CF_SAAS_CNAME_TARGET`,
   `CF_SAAS_FALLBACK_ORIGIN`, and `CF_DOMAIN_INDEX_KV_ID` — the KV id MUST
   equal the runtime worker's `DOMAIN_INDEX` binding id from Gate 1, or
   activated domains will never route.
3. Scope `CF_API_TOKEN` minimally (Workers Scripts + KV + Workers for
   Platforms + Zone SSL edit on the SaaS zone only); record the rotation
   cadence in [production-env-matrix](../production-env-matrix.md).

## Gate 5b — Inbound email (email triggers)

1. **Platform domains (Cloudflare Email Routing)**:
   - hostfunc.io zone → Email → Email Routing: enable (CF auto-creates the MX +
     SPF records at the apex; they coexist with the site's A records). Set the
     catch-all rule → "Send to Worker" → `hostfunc-email`.
   - Same zone → Email Routing subdomains: add `staging-mail.hostfunc.io`,
     catch-all → `hostfunc-email-staging`.
   - Both email workers' `CONTROL_PLANE_TOKEN` secret must equal the matching
     web env's `TRIGGER_CONTROL_TOKEN`.
   - Web env: `HOSTFUNC_MAIL_DOMAIN` = `staging-mail.hostfunc.io` (staging) /
     `hostfunc.io` (production).
2. **Custom domains (Resend Inbound)**:
   - Resend dashboard → Webhooks: add an endpoint per environment pointing at
     `https://staging.hostfunc.io/api/webhooks/resend-inbound` /
     `https://app.hostfunc.io/api/webhooks/resend-inbound`, event
     `email.received`; copy each signing secret into that env's
     `RESEND_INBOUND_WEBHOOK_SECRET`.
   - Customer side: the domains page shows the MX/TXT records to add at their
     registrar once they generate an address on the domain (lazy Resend
     registration — nothing to pre-provision).

## Gate 6 — Billing

[stripe-live-cutover](./stripe-live-cutover.md): live keys, live webhook
endpoint + signing secret, plans synced (`pnpm --filter @hostfunc/web
stripe:sync`).

## Gate 7 — Repo/process hardening

1. GitHub → Settings → Environments → `production`: require reviewers, so
   tag-triggered worker deploys pause for approval.
2. Confirm `release.yml` has `NPM_TOKEN` if the SDK/CLI should publish; the
   publish step is skipped without it (intentional).

## Release

1. Re-run [launch-rehearsal](../launch-rehearsal.md) against staging the same
   day.
2. Tag the validated main SHA: `git tag v1.0.0 <sha> && git push origin
   v1.0.0` → `deploy-workers.yml` deploys all five workers to production
   (pauses for environment approval per Gate 7).
3. Promote the same SHA to production on Vercel.
4. Post-deploy binding steps (one-time): attach the tail worker as tail
   consumer of `hostfunc-runtime`, bind the email worker in Cloudflare Email
   Routing for the production mail domain.
5. Smoke per [go-live-checklist](../go-live-checklist.md): auth (magic link +
   both OAuth providers), deploy a function, invoke `/run/:org/:slug`, cron
   trigger fires, logs ingest lands, custom domain end-to-end, Stripe webhook
   delivery.

## Rollback

[deploy-rollback](./deploy-rollback.md):
- Workers: re-run `deploy-workers.yml` from the previous tag (or `wrangler
  rollback` per worker).
- Web: Vercel instant rollback to the prior deployment.
- DB: migrations are forward-only — schema rollback means a new migration,
  never editing a shipped one.

## Post-launch

- Watch Sentry / PostHog / `ALERT_WEBHOOK_URL` for 24–48h.
- Open follow-up issues for the deferred security items from the 2026-06
  review: per-tenant envelope KEKs for secrets, RLS policies on
  `custom_domain`, API-token rotation, CORS documentation.
