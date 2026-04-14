# Security Audit (Component 10)

## Scope

- Auth/session boundaries in web routes and middleware.
- Token-authenticated machine APIs (`/api/mcp`, `/api/cli/*`, internal control plane).
- Outbound worker SSRF controls.
- Trigger dispatch paths (cron/email) and idempotency.

## Findings

### Addressed in this pass

1. **Middleware cookie assumptions**
   - Updated middleware to accept both regular and `__Secure-` Better Auth session cookie names.
   - File: `apps/web/src/middleware.ts`.

2. **Outbound SSRF private target block**
   - Added explicit private-network host blocking before allowlist checks.
   - File: `apps/outbound/src/index.ts`.

3. **MCP route request hygiene**
   - Enforced JSON content-type and parameter payload size guardrail.
   - File: `apps/web/src/app/api/mcp/route.ts`.

### Remaining known risks

1. **Token scope granularity**
   - API tokens are org-scoped but not action-scoped.
   - Recommendation: add token scopes per route family.

2. **Schedule parser depth**
   - Cron due parser supports common patterns but not full CRON expression grammar.
   - Recommendation: introduce validated cron parser library with timezone-aware evaluation.

3. **Production secrets and key rotation runbook**
   - Strong defaults are present but rotation automation remains manual.
   - Recommendation: add rotation playbook with staged cutover.

## Verification checklist

- [x] Sensitive API routes reject invalid auth.
- [x] MCP route rejects non-JSON traffic.
- [x] Outbound worker blocks private hosts.
- [ ] Run `npm audit` and triage in release gate.
