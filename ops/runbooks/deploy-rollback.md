# Deploy Rollback Runbook

## Trigger Conditions

- Elevated 5xx rate after release
- Broken auth/login flow
- Billing webhook failures increase immediately after deploy

## Rollback Steps

1. Roll back Vercel deployment to previous stable deployment.
2. Roll back Cloudflare workers to previous deployment version.
3. Verify `/login`, `/dashboard`, and `/api/webhooks/stripe` behavior.
4. Run smoke checks:
   - `pnpm --filter @hostfunc/web smoke:critical`
5. Post incident status update and keep launch closed until fixed.

## Data Safety

- Never roll back DB schema destructively.
- Use forward-only migrations and hotfix code compatibility with current schema.
