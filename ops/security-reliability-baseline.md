# Security and Reliability Baseline

## Implemented Controls

- Rate limiting on:
  - `/api/webhooks/stripe`
  - `/api/internal/ingest`
  - `/api/analytics`
- Production env validation enforces:
  - HTTPS app/runtime URLs
  - Required Google/GitHub OAuth credentials
- Release workflow deploy gate:
  - `.github/workflows/release.yml` uses `environment: production` (manual approval capable)

## Backup and Restore Policy

### Postgres

- Enable managed provider daily snapshots and point-in-time recovery.
- Keep 14 days minimum retention.
- Test restore monthly into a staging database.

### Redis

- Enable persistence/snapshots if provider supports it.
- Treat Redis as recoverable cache when possible; do not rely on it as sole source of truth.

## Secret Rotation

- Quarterly rotation:
  - `BETTER_AUTH_SECRET`
  - `SECRETS_MASTER_KEY`
  - `EXEC_TOKEN_SECRET`
  - `RUNTIME_*` and `TRIGGER_CONTROL_TOKEN`
- Semi-annual rotation:
  - OAuth client secrets
  - Stripe API and webhook secrets

## CI/CD Guardrails

- Mainline CI must pass before merge.
- Production release requires environment approval in GitHub.
- Run production smoke checks after deployment:
  - `pnpm --filter @hostfunc/web smoke:critical`
