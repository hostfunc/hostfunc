# Database Restore Runbook

## Trigger Conditions

- Production data corruption
- Failed migration requiring point-in-time recovery
- Region/provider incident

## Restore Procedure

1. Create new restore instance from latest snapshot/PITR target.
2. Run read-only validation queries for auth, billing, and execution tables.
3. Switch `DATABASE_URL` in app environment to restore target.
4. Restart/redeploy web app.
5. Run smoke checks and critical user flow checks.

## Validation Queries (examples)

- Recent users and sessions present.
- Active subscriptions present.
- Recent execution records available.

## Post-Incident

- Document restoration point and estimated data gap.
- Backfill from append-only logs/webhook providers when possible.
