# Production Environment Matrix

This matrix defines where each value lives in production and who owns rotation/access.

## Service Inventory

| Service | Deploy Target | Secret Store | Primary Owner |
|---|---|---|---|
| `apps/web` | Vercel project `hostfunc-web` | Vercel Environment Variables | App/Platform |
| `apps/runtime` | Cloudflare Worker `hostfunc-runtime` | `wrangler secret` + Worker vars | Runtime/Platform |
| `apps/cron` | Cloudflare Worker `hostfunc-cron` | `wrangler secret` + Worker vars | Runtime/Platform |
| `apps/tail` | Cloudflare Worker `hostfunc-tail` | `wrangler secret` + Worker vars | Runtime/Platform |
| Postgres | Managed Postgres | Provider secret manager | Data/Platform |
| Redis | Managed Redis | Provider secret manager | Data/Platform |
| Stripe | Stripe Dashboard (Live mode) | Stripe Dashboard + Vercel vars | Billing |
| OAuth | Google Cloud + GitHub OAuth Apps | Provider consoles + Vercel vars | App/Auth |

## Required Variables by Environment

### Web (`apps/web`) - Vercel

| Variable | Purpose | Owner |
|---|---|---|
| `NODE_ENV` | Runtime mode | Platform |
| `DATABASE_URL` | Postgres connection | Platform |
| `REDIS_URL` | Redis connection | Platform |
| `BETTER_AUTH_SECRET` | Session/signing secret | Auth |
| `BETTER_AUTH_URL` | Public app URL | Platform |
| `GITHUB_CLIENT_ID` | GitHub OAuth provider | Auth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth provider secret | Auth |
| `GOOGLE_CLIENT_ID` | Google OAuth provider | Auth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth provider secret | Auth |
| `EMAIL_FROM` | Transactional sender address | Product |
| `RESEND_API_KEY` | Email provider key | Product |
| `SECRETS_MASTER_KEY` | Envelope encryption master key | Security |
| `EXEC_TOKEN_SECRET` | Runtime callback signing secret | Runtime |
| `HOSTFUNC_RUNTIME_URL` | Public runtime base URL | Runtime |
| `RUNTIME_LOOKUP_TOKEN` | Runtime lookup auth token | Runtime |
| `RUNTIME_INGEST_TOKEN` | Runtime ingest auth token | Runtime |
| `TRIGGER_CONTROL_TOKEN` | Cron/internal trigger auth token | Runtime |
| `STRIPE_SECRET_KEY` | Stripe live API secret | Billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | Billing |
| `MCP_ALLOWED_ORIGINS` | MCP CORS allowlist | Security |
| `ALLOWED_ORIGINS` | API/browser CORS allowlist | Security |
| `POSTHOG_API_KEY` | Product analytics ingestion key | Product |
| `POSTHOG_HOST` | Product analytics host | Product |
| `POSTHOG_PROJECT_ID` | Product analytics project id | Product |
| `SENTRY_DSN` | Error tracking DSN | Platform |
| `ALERT_WEBHOOK_URL` | Alert destination (Slack/Discord) | On-call |

### Runtime (`apps/runtime`) - Cloudflare

| Variable | Purpose | Owner |
|---|---|---|
| `LOOKUP_API_URL` | Control plane API URL | Runtime |
| `LOOKUP_API_TOKEN` | Control plane lookup token | Runtime |
| `WORKERS_SUBDOMAIN` | Cloudflare workers subdomain | Runtime |

### Cron (`apps/cron`) - Cloudflare

| Variable | Purpose | Owner |
|---|---|---|
| `CONTROL_PLANE_URL` | Control plane API URL | Runtime |
| `CONTROL_PLANE_TOKEN` | Trigger control token | Runtime |
| `HOSTFUNC_RUNTIME_URL` | Runtime base URL | Runtime |

### Tail (`apps/tail`) - Cloudflare

| Variable | Purpose | Owner |
|---|---|---|
| `INGEST_API_URL` | Ingest endpoint base URL | Runtime |
| `INGEST_API_TOKEN` | Ingest auth token | Runtime |

## Rotation Cadence

- `BETTER_AUTH_SECRET`, `SECRETS_MASTER_KEY`, `EXEC_TOKEN_SECRET`: rotate quarterly.
- Stripe/OAuth secrets: rotate immediately for any suspected leak, otherwise every 6 months.
- Internal service tokens (`RUNTIME_*`, `TRIGGER_CONTROL_TOKEN`): rotate quarterly.

## Production DNS Baseline

- App: `app.hostfunc.com` -> Vercel
- Runtime: `run.hostfunc.com` -> Cloudflare Worker route
- Optional API alias: `api.hostfunc.com` -> Vercel (`apps/web`)

