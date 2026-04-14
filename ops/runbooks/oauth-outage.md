# OAuth Outage Runbook

## Symptoms

- Google/GitHub sign-in redirect loops
- Provider callback errors
- Sudden drop in social login success events

## Immediate Mitigation

1. Keep magic-link login available as fallback.
2. Validate OAuth provider status pages.
3. Confirm callback URLs and client secrets were not changed.
4. Rotate provider secrets if compromise is suspected.

## Verification

- Social login starts succeeding again.
- `auth_social_failed` event rate returns to normal baseline.
