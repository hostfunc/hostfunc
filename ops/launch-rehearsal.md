# Staged Launch Rehearsal

Execute this in a staging-like environment with real domain routing.

## Rehearsal Script

1. Deploy latest candidate.
2. Run critical smoke checks:
   - `SMOKE_APP_URL=https://staging-app.hostfunc.com pnpm --filter @hostfunc/web smoke:critical`
3. Auth rehearsal:
   - Login with Google
   - Login with GitHub
   - Magic-link fallback
4. Billing rehearsal:
   - Trigger checkout
   - Confirm webhook update
   - Open billing portal
5. Runtime rehearsal:
   - Deploy function with CLI
   - Execute function and verify logs in dashboard
6. Observability rehearsal:
   - Query `/api/internal/observability/summary`
   - Confirm events and failure counts look sane
7. Rollback rehearsal:
   - Simulate failed deploy and execute rollback runbook

## Exit Criteria

- All checks pass without manual DB edits.
- No sustained 5xx bursts.
- Incident responders can complete rollback in under 15 minutes.
