# Launching hostfunc.io — Staging + Production

Single source of truth for first-time provisioning of the `hostfunc.io` domain
across staging and production. Each step is in execution order — staging first,
production after staging is green.

Companion docs:
- [`ops/production-env-matrix.md`](../production-env-matrix.md) — variable inventory
- [`ops/go-live-checklist.md`](../go-live-checklist.md) — launch-day sequence
- [`ops/launch-rehearsal.md`](../launch-rehearsal.md) — smoke procedure
- [`ops/runbooks/deploy-rollback.md`](deploy-rollback.md) — rollback if anything breaks

## Hostnames

| Hostname | Env | Target |
|---|---|---|
| `hostfunc.io`, `www.hostfunc.io` | prod | Vercel `hostfunc-web` |
| `app.hostfunc.io` | prod | Vercel `hostfunc-web` |
| `run.hostfunc.io` | prod | CF Worker `hostfunc-runtime` |
| `mail.hostfunc.io` | prod | CF Email Routing → `hostfunc-email` |
| `staging.hostfunc.io` | staging | Vercel `hostfunc-web-staging` |
| `staging-run.hostfunc.io` | staging | CF Worker `hostfunc-runtime-staging` |
| `staging-mail.hostfunc.io` | staging | CF Email Routing → `hostfunc-email-staging` |

## 0. One-time prerequisites

1. Create accounts (or confirm access): Cloudflare, Vercel, Supabase, Upstash, Resend, Stripe, PostHog, Sentry, Google Cloud Console, GitHub OAuth (org or personal).
2. Cloudflare account: enable **Workers Paid** plan + **Workers for Platforms** add-on.
3. Locally: `wrangler login` (or have `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` exported).

## 1. DNS — move hostfunc.io to Cloudflare

1. Cloudflare dashboard → **Add a site** → `hostfunc.io` → Free plan is fine.
2. Cloudflare gives you two nameservers; set those at the registrar.
3. Wait for activation email (usually < 30 min).
4. Once active you can manage DNS for the whole zone (both prod and staging hostnames live here).

## 2. Cloudflare resources (per env)

Run the helper for each env. Requires `wrangler login`.

```bash
ops/scripts/provision-cloudflare.sh staging
ops/scripts/provision-cloudflare.sh production
```

The script:
- Creates the dispatch namespace (`hostfunc-staging`, `hostfunc-prod`).
- Creates the three KV namespaces per env (`fn-index-*`, `egress-counters-*`, `fn-assets-*`).
- Is idempotent and safe to rerun; existing resources are reused.
- Handles Wrangler 3's `worker-<title>` KV naming quirk and still resolves the correct IDs.
- Prints the IDs you must paste into:
  - `apps/runtime/wrangler.toml` under `[env.<envname>]` (replace `REPLACE_WITH_*_KV_ID`).
  - `apps/outbound/wrangler.toml` under `[env.<envname>]` (replace `REPLACE_WITH_*_EGRESS_COUNTERS_KV_ID`).
- Tells you the Vercel env-var names for the same IDs.

Current staging values (already provisioned):

- `CF_DISPATCH_NAMESPACE=hostfunc-staging`
- `CF_FN_INDEX_KV_ID=5c711a85eb2744c6b0712693151485e5`
- `CF_EGRESS_COUNTERS_KV_ID=d31c8394b3fe477f910b3782f5d8f5f0`
- `CF_FN_ASSETS_KV_ID=a531af66bf964779a66fa628fde87db0`

These staging IDs are already patched in:
- `apps/runtime/wrangler.toml` (`[env.staging.kv_namespaces]`)
- `apps/outbound/wrangler.toml` (`[env.staging.kv_namespaces]`)

For production, placeholders in those same files are expected until you run:
`ops/scripts/provision-cloudflare.sh production` and paste the printed IDs.

After both runs, create one **scoped API token** per env at <https://dash.cloudflare.com/profile/api-tokens> with these permissions:

- Account → Workers Scripts → Edit
- Account → Workers KV Storage → Edit
- Account → Account Settings → Read
- Zone → Workers Routes → Edit (zone: `hostfunc.io`)

Cloudflare UI labels change over time. If you don't see `Account -> Workers Routes` or
`Account -> Workers for Platforms`, proceed with the scopes above. If deploy later fails
with a missing permission error, add exactly the scope named in that error.

Save token + account id as **GitHub Environment secrets**:
- Environment `staging`: `CF_API_TOKEN`, `CF_ACCOUNT_ID`
- Environment `production`: `CF_API_TOKEN`, `CF_ACCOUNT_ID`

For production, enable required reviewers on the `production` GitHub Environment.
The deploy workflow (`.github/workflows/deploy-workers.yml`) reads these as
`${{ secrets.CF_API_TOKEN }}` and `${{ secrets.CF_ACCOUNT_ID }}` from the selected environment.

Known warning: Wrangler 3 may print an "out-of-date" warning. This is non-blocking
for now unless a command actually exits with an error.

## 3. Supabase — Postgres per env

For each env:
1. Supabase dashboard → **New project** named `hostfunc-staging` / `hostfunc-prod`.
2. Region: pick the same as your Vercel region (e.g. `us-east-1`).
3. Save the **database password** in your password manager.
4. Settings → Database → copy:
   - **Connection pooling** URL (port 6543, `pgbouncer=true`) → this is `DATABASE_URL` for Vercel.
   - **Direct connection** URL (port 5432) → only for `pnpm db:migrate`.
5. Settings → Database → Network restrictions: leave open for now; tighten to Vercel + your office IPs after launch.

## 4. Upstash — Redis per env

1. Upstash console → **Create Database** → `hostfunc-staging` (Global, eviction off).
2. Repeat for `hostfunc-prod`.
3. Copy the **TLS connection string** (`rediss://default:...`) → this is `REDIS_URL` for Vercel.

## 5. OAuth providers

### 5a. Google (one Cloud project, two clients)

1. console.cloud.google.com → **APIs & Services** → **Credentials**.
2. **OAuth consent screen**: External, app name `hostfunc`, support email yours.
3. **Create OAuth client ID** twice:
   - **hostfunc (production)**
     - Authorized JS origins: `https://app.hostfunc.io`
     - Authorized redirect URIs: `https://app.hostfunc.io/api/auth/callback/google`
   - **hostfunc (staging)**
     - Authorized JS origins: `https://staging.hostfunc.io`
     - Authorized redirect URIs: `https://staging.hostfunc.io/api/auth/callback/google`
4. Save each client ID + secret for the right Vercel project.

### 5b. GitHub login OAuth (two apps)

For each env, GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**:
- Production: name `hostfunc`, homepage `https://app.hostfunc.io`, callback `https://app.hostfunc.io/api/auth/callback/github`.
- Staging: name `hostfunc (staging)`, homepage `https://staging.hostfunc.io`, callback `https://staging.hostfunc.io/api/auth/callback/github`.

### 5c. GitHub integrations OAuth (two more apps)

These power the `/api/integrations/github/*` repo-connect flow (separate from login). Same pattern, callback `/api/integrations/github/callback`:

- Production: `hostfunc-integrations` → `https://app.hostfunc.io/api/integrations/github/callback`
- Staging: `hostfunc-integrations (staging)` → `https://staging.hostfunc.io/api/integrations/github/callback`

Save IDs/secrets as `GITHUB_INTEGRATIONS_CLIENT_ID` / `GITHUB_INTEGRATIONS_CLIENT_SECRET` per Vercel env.

## 6. Resend — verify hostfunc.io

1. Resend dashboard → **Domains** → **Add domain** → `hostfunc.io`.
2. Resend gives you DKIM + SPF + Return-Path records — add them to the Cloudflare DNS zone with **Proxy: DNS only** (gray cloud).
3. Wait for verified status (usually < 5 min once DNS propagates).
4. One Resend API key works for both envs; differentiate by `EMAIL_FROM`:
   - prod → `noreply@hostfunc.io`
   - staging → `staging-noreply@hostfunc.io`

## 7. Stripe

For each env (test mode for staging, live mode for prod):
1. Stripe dashboard → **Developers → API keys** → copy `sk_*` → save as `STRIPE_SECRET_KEY` per Vercel project.
2. **Developers → Webhooks → Add endpoint**:
   - prod: `https://app.hostfunc.io/api/webhooks/stripe`
   - staging: `https://staging.hostfunc.io/api/webhooks/stripe`
   - Events: at minimum `checkout.session.*`, `invoice.*`, `customer.subscription.*`, plus any usage-meter events your billing wires up.
   - Save the `whsec_*` as `STRIPE_WEBHOOK_SECRET`.
3. After Vercel is live: `pnpm --filter @hostfunc/web stripe:sync` against each env (set `STRIPE_SECRET_KEY` first).

See [`ops/runbooks/stripe-live-cutover.md`](stripe-live-cutover.md) for the live-mode promotion steps.

## 8. Generate internal service tokens (per env)

```bash
ops/scripts/generate-tokens.sh > .env.staging.workers
ops/scripts/generate-tokens.sh > .env.production.workers
```

Both files are git-ignored. Save them in your password manager. The four `*_TOKEN` values must be set identically on both sides:
- web (Vercel env vars) — `RUNTIME_INVOKE_TOKEN`, `RUNTIME_LOOKUP_TOKEN`, `TRIGGER_CONTROL_TOKEN`, `RUNTIME_INGEST_TOKEN`.
- workers — set via `set-worker-secrets.sh` (next step).

## 9. Vercel — two projects

For each env:
1. Vercel dashboard → **Add new** → **Project** → import the `hostfunc` repo.
2. **Project name**: `hostfunc-web-staging` / `hostfunc-web`.
3. **Root directory**: `apps/web`.
4. **Framework**: Next.js (auto).
5. **Environment variables**: paste from `apps/web/.env.production.example`, filling values from prior steps. The full list is in [`ops/production-env-matrix.md`](../production-env-matrix.md).
6. **Domains**:
   - staging project → attach `staging.hostfunc.io`
   - prod project → attach `app.hostfunc.io`, plus `hostfunc.io` (apex) and `www.hostfunc.io` if marketing lives on the same project.
7. **Production branch**: `main` for both projects (staging deploys from same branch, separate project).

## 10. Worker secrets

Run from a machine that ran `wrangler login`:

```bash
ops/scripts/set-worker-secrets.sh staging    .env.staging.workers
ops/scripts/set-worker-secrets.sh production .env.production.workers
```

Prereqs:
- `.env.staging.workers` and `.env.production.workers` must exist locally.
- Each file must include all four keys:
  - `RUNTIME_INVOKE_TOKEN`
  - `RUNTIME_LOOKUP_TOKEN`
  - `TRIGGER_CONTROL_TOKEN`
  - `RUNTIME_INGEST_TOKEN`

If any key is missing, `ops/scripts/set-worker-secrets.sh` exits with an error.

This populates the four shared tokens onto `runtime`, `cron`, `email`, `tail` for that env.

## 11. Deploy workers

After Cloudflare KV IDs are filled into `apps/runtime/wrangler.toml` and `apps/outbound/wrangler.toml`, deploy:

```bash
ops/scripts/deploy-workers.sh staging
ops/scripts/deploy-workers.sh production
```

Staging gate before production:

1. Run `ops/scripts/deploy-workers.sh staging`.
2. Verify `wrangler tail hostfunc-runtime-staging` shows live requests.
3. Verify `/run/<org>/<slug>` returns 200 for a known test function.
4. Verify cron executes (`hostfunc-cron-staging`) and ingest path is healthy.
5. Only then run `ops/scripts/deploy-workers.sh production`.

Wrangler 3 does not support `tail-consumer add`. Use observability logs instead:

1. In each worker `wrangler.toml`, add (or keep) this block under both envs:

```toml
[env.staging.observability.logs]
enabled = false
invocation_logs = true

[env.production.observability.logs]
enabled = false
invocation_logs = true
```

2. Redeploy workers after the config change:

```bash
ops/scripts/deploy-workers.sh staging
ops/scripts/deploy-workers.sh production
```

3. Verify logs from each worker with:

```bash
pnpm --filter @hostfunc/runtime exec wrangler tail hostfunc-runtime-staging
pnpm --filter @hostfunc/cron exec wrangler tail hostfunc-cron-staging
pnpm --filter @hostfunc/tail exec wrangler tail hostfunc-tail-staging
```

If you later upgrade to Wrangler 4 and adopt a tail-consumer workflow, update this section in one dedicated follow-up.

## 12. Cloudflare Email Routing (per env)

1. Cloudflare → `hostfunc.io` zone → **Email** → **Email Routing** → enable.
2. Add the prescribed MX/TXT records (auto-suggested).
3. **Routes** → catch-all → **Send to a Worker** → pick `hostfunc-email-staging` (zone uses subdomain `staging-mail.hostfunc.io`) and `hostfunc-email` (`mail.hostfunc.io`).
   - If your account uses Email Routing per-subdomain, configure two Email zones: `mail.hostfunc.io` and `staging-mail.hostfunc.io`.

## 13. Database migrations

```bash
# staging — direct (non-pooled) URL
DATABASE_URL="<supabase staging direct URL>" pnpm db:migrate

# production
DATABASE_URL="<supabase prod direct URL>" pnpm db:migrate
```

## 14. DNS records (final cutover)

In the Cloudflare DNS panel for `hostfunc.io`:

| Name | Type | Value | Proxy |
|---|---|---|---|
| `app` | CNAME | `cname.vercel-dns.com` | DNS only |
| `staging` | CNAME | `cname.vercel-dns.com` | DNS only |
| `@` (apex) | A | Vercel IP `76.76.21.21` (or per Vercel instructions) | DNS only |
| `www` | CNAME | `cname.vercel-dns.com` | DNS only |
| `run` | (auto by Worker route) | Worker route attaches | n/a |
| `staging-run` | (auto by Worker route) | Worker route attaches | n/a |
| `mail` | per Email Routing | Email Routing creates these | n/a |
| `staging-mail` | per Email Routing | Email Routing creates these | n/a |
| Resend DKIM/SPF | per Resend instructions | as provided | DNS only |

When you click "Add domain" on each Vercel project, Vercel will print the exact CNAME target and ACME validation record — use those.

## 15. Smoke

```bash
SMOKE_APP_URL=https://staging.hostfunc.io pnpm --filter @hostfunc/web smoke:critical
```

Plus manual checks:
- Google login redirects through `staging.hostfunc.io` and lands on dashboard.
- GitHub login same.
- Create a function via `/dashboard/new`, deploy, hit `https://staging-run.hostfunc.io/run/<org>/<slug>` — expect a 200.
- Cron worker fires within 60 s — verify via `wrangler tail hostfunc-cron-staging`.
- Email-trigger: send to `hello@staging-mail.hostfunc.io`, see execution logged.
- Stripe test webhook hits a 200 (visible in Stripe dashboard).

When all green, repeat steps 9–15 for production. Final step: cut `hostfunc.io` apex DNS to Vercel.

## 16. Post-launch

- Lock the GitHub Actions `production` environment behind required-reviewer protection.
- Add the deploy-workers workflow ([.github/workflows/deploy-workers.yml](../../.github/workflows/deploy-workers.yml)) — triggers staging on `push main`, production on tag `v*`.
- Tighten Supabase IP allowlist to Vercel + on-call IPs.
- Schedule the [DB-restore drill](db-restore.md) for the staging copy.
- Walk through [`ops/go-live-checklist.md`](../go-live-checklist.md) launch-day sequence before announcing.

## Token alignment cheat-sheet

| Web env (Vercel) | Worker secret(s) |
|---|---|
| `RUNTIME_INVOKE_TOKEN` | `runtime.RUNTIME_INVOKE_TOKEN`, `cron.RUNTIME_INVOKE_TOKEN` |
| `RUNTIME_LOOKUP_TOKEN` | `runtime.LOOKUP_API_TOKEN` |
| `TRIGGER_CONTROL_TOKEN` | `cron.CONTROL_PLANE_TOKEN`, `email.CONTROL_PLANE_TOKEN` |
| `RUNTIME_INGEST_TOKEN` | `tail.INGEST_TOKEN` |

If `/run` returns 401, the first thing to check is alignment in this table.
