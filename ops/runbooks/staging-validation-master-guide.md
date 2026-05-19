# Staging Validation Master Guide

Use this guide as the required release gate before any production promotion.
It is intentionally detailed and covers Web, Runtime, Triggers, MCP, CLI, SDK,
billing, observability, and rollback readiness.

Companion docs:
- `ops/runbooks/launch-hostfunc-io.md`
- `ops/launch-rehearsal.md`
- `ops/go-live-checklist.md`
- `ops/production-env-matrix.md`
- `ops/runbooks/deploy-rollback.md`

## 1) Release Candidate Definition

Record this before testing:
- `RC_ID`: short label (example: `rc-2026-05-08-main-632b648`)
- `Commit SHA`: exact `main` SHA deployed to staging
- `PRs included`: list of merged PR URLs
- `DB migration status`: applied/not-applied + migration IDs
- `Known risk notes`: short bullet list
- `Test owner`: primary on-call person

Required preconditions:
- Staging web deployment exists and points at candidate SHA.
- Staging workers deployed (runtime/cron/tail/email/outbound).
- GitHub Actions checks for candidate are green or explicitly waived.
- Staging env vars and worker secrets are present per `ops/production-env-matrix.md`.

Evidence to capture:
- GitHub run URLs (CI, Secret Scan, Release, Deploy Workers)
- Vercel deployment URL and SHA
- Timestamped test session owner

---

## 2) Environment Health Baseline

### HLT-001 DNS and endpoints
- **Owner:** Platform
- **Steps:**
  - `curl -sS -o /dev/null -w "%{http_code}\n" https://staging.hostfunc.io`
  - `curl -sS https://staging.hostfunc.io/api/mcp`
  - `curl -sS -o /dev/null -w "%{http_code}\n" https://staging-run.hostfunc.io`
- **Expected:** web returns `200`; MCP returns JSON `{ ok: true, endpoint: "/api/mcp" }`; runtime hostname resolves.
- **Failure triage:** DNS records in Cloudflare; Vercel domain assignment; worker routes.
- **Evidence:** command output + screenshot of DNS/routes.

### HLT-002 Worker deploy health
- **Owner:** Platform
- **Steps:**
  - Verify latest `Deploy Workers` run on `main`.
  - Tail workers:
    - `pnpm --filter @hostfunc/runtime exec wrangler tail hostfunc-runtime-staging`
    - `pnpm --filter @hostfunc/cron exec wrangler tail hostfunc-cron-staging`
    - `pnpm --filter @hostfunc/tail exec wrangler tail hostfunc-tail-staging`
- **Expected:** deploy successful; workers accepting requests; no auth or route errors.
- **Failure triage:** `staging` GitHub Environment secrets, Cloudflare token scopes, wrangler env IDs.
- **Evidence:** workflow URL + tail snippets.

### HLT-003 Critical smoke script
- **Owner:** QA/Platform
- **Steps:**
  - `SMOKE_APP_URL=https://staging.hostfunc.io pnpm --filter @hostfunc/web smoke:critical`
- **Expected:** script exits `0`.
- **Failure triage:** inspect failing step output, map to relevant section below.
- **Evidence:** command output.

---

## 3) Core Product End-to-End Matrix

### WEB-001 Auth login paths
- **Owner:** QA
- **Steps:** Login via Google, GitHub, and fallback/magic-link path.
- **Expected:** redirect lands on dashboard, session persists, no error banners.
- **Failure triage:** OAuth callbacks, provider credentials, `BETTER_AUTH_URL`.
- **Evidence:** screenshots + callback URL traces.

### WEB-002 Workspace onboarding and membership
- **Owner:** QA
- **Steps:** Create workspace, invite member, verify member can access non-owner pages.
- **Expected:** role restrictions respected.
- **Failure triage:** member table, org permission checks.
- **Evidence:** screenshots + user IDs.

### WEB-003 Function lifecycle
- **Owner:** QA
- **Steps:**
  - Create function via `/dashboard/new`
  - Edit code in Monaco
  - Deploy
  - Run and inspect logs/executions
- **Expected:** deploy succeeds, run returns expected payload, execution appears in UI.
- **Failure triage:** runtime tokens, executor config, deployment worker logs.
- **Evidence:** function ID + execution ID + logs screenshot.

### WEB-004 Settings and integrations
- **Owner:** QA
- **Steps:** Verify settings pages load and save (general, tokens, integrations, members, billing).
- **Expected:** saves persist; no 500s.
- **Failure triage:** API route errors, DB write errors.
- **Evidence:** saved values and response screenshots.

### WEB-005 Marketplace and docs journeys
- **Owner:** QA
- **Steps:** Browse marketplace list/grid, open function detail, docs navigation/search.
- **Expected:** no broken routes; filter/search/view modes behave correctly.
- **Failure triage:** route params, docs index, marketplace APIs.
- **Evidence:** screen recording of browse flow.

---

## 4) Trigger and Runtime Matrix

Create or reuse one dedicated test function with deterministic output.

### TRG-HTTP-001 Public HTTP invoke
- **Owner:** Platform
- **Steps:** call `https://staging-run.hostfunc.io/run/<org>/<slug>` with valid payload.
- **Expected:** `200` + expected JSON.
- **Failure triage:** runtime route, active version, invoke token alignment.
- **Evidence:** request/response payload.

### TRG-HTTP-002 Auth-required HTTP invoke
- **Owner:** Platform
- **Steps:** enable require-auth trigger path where applicable; test without and with auth.
- **Expected:** unauthenticated rejected; authenticated accepted.
- **Failure triage:** trigger config, plan gate logic, auth checks.
- **Evidence:** both responses.

### TRG-CRON-001 Cron execution
- **Owner:** Platform
- **Steps:** configure schedule, wait one interval, verify execution created.
- **Expected:** execution appears within expected window.
- **Failure triage:** cron worker secrets, dispatch namespace, schedule config.
- **Evidence:** execution record + worker tail.

### TRG-EMAIL-001 Email-trigger path
- **Owner:** Platform
- **Steps:** send mail to `*@staging-mail.hostfunc.io`.
- **Expected:** inbound email creates execution with parsed payload.
- **Failure triage:** Email Routing, email worker auth/control token.
- **Evidence:** sample email + execution ID.

### TRG-INT-001 Internal token paths
- **Owner:** Platform
- **Steps:** validate internal routes reject wrong token and accept correct token.
- **Expected:** unauthorized requests fail with `401/403`; valid token succeeds.
- **Failure triage:** token mismatch web vs worker (see token alignment table in launch runbook).
- **Evidence:** success/failure outputs.

---

## 5) MCP Validation (In-Depth)

Reference endpoint: `https://staging.hostfunc.io/api/mcp`

### MCP-001 Health and auth boundary
- **Owner:** QA/Platform
- **Steps:**
  - `GET /api/mcp`
  - `POST /api/mcp` without bearer token
- **Expected:** GET health OK; unauth POST returns `401`.
- **Failure triage:** API token auth path in `mcp-auth`.
- **Evidence:** response bodies/status.

### MCP-002 JSON-RPC initialize and tools list
- **Owner:** QA/Platform
- **Steps:** send `initialize` then `tools/list` JSON-RPC requests with valid token.
- **Expected:** valid protocol response and tool list.
- **Failure triage:** JSON-RPC parsing, mcp-tools registration.
- **Evidence:** captured payloads.

### MCP-003 Tool execution happy path
- **Owner:** QA/Platform
- **Steps:** invoke representative tool via `tools/call` with valid args.
- **Expected:** `isError: false`, tool output content returned, audit row recorded.
- **Failure triage:** handler dispatch, org permissions, tool argument schema.
- **Evidence:** request/response + audit confirmation.

### MCP-004 Failure-mode checks
- **Owner:** QA/Security
- **Steps:**
  - unknown tool name
  - oversized params (>50k serialized)
  - invalid origin when `MCP_ALLOWED_ORIGINS` is set
  - rapid repeated requests for rate-limit behavior
- **Expected:** appropriate errors (`unknown_tool`, `request_too_large`, `403`, `429`).
- **Failure triage:** mcp-auth origin policy/rate limit logic.
- **Evidence:** each failure response.

---

## 6) CLI Validation (In-Depth)

Use a clean shell/session.

### CLI-001 Install and help
- **Owner:** DX/QA
- **Steps:**
  - `npm install -g @hostfunc/cli`
  - `hostfunc help`
- **Expected:** install succeeds; help output lists commands.
- **Failure triage:** package publish/install path; Node version compatibility.
- **Evidence:** command output.

### CLI-002 Login and init
- **Owner:** DX/QA
- **Steps:**
  - `hostfunc login --token <staging-token> --url https://staging.hostfunc.io`
  - `hostfunc init --fnId <fn_id>`
- **Expected:** config written and function context initialized.
- **Failure triage:** token scope/expiration; API reachability.
- **Evidence:** output + config file presence.

### CLI-003 List/deploy/run/logs/secrets
- **Owner:** DX/QA
- **Steps:**
  - `hostfunc list`
  - `hostfunc deploy`
  - `hostfunc run --payload ./payload.json`
  - `hostfunc logs --executionId <id>`
  - `hostfunc secrets set KEY VALUE --fnId <fn_id>`
- **Expected:** all commands complete successfully with expected responses.
- **Failure triage:** deploy pipeline, run route, secret storage, logs ingestion.
- **Evidence:** terminal transcript + execution ID.

### CLI-004 Pack smoke parity
- **Owner:** DX/Platform
- **Steps:** verify CI `CLI Pack Smoke` job green for candidate SHA.
- **Expected:** green job.
- **Failure triage:** packaging/binary entrypoint issues.
- **Evidence:** workflow URL.

---

## 7) SDK Validation (In-Depth)

### SDK-001 Core SDK path
- **Owner:** DX/QA
- **Preconditions:** test function includes `@hostfunc/sdk`.
- **Steps:** execute function using `executeFunction` + `secret.getRequired`.
- **Expected:** downstream function call succeeds and secret resolved.
- **Failure triage:** runtime sdk bindings, secret retrieval route, function-to-function invoke.
- **Evidence:** function code snippet + output.

### SDK-002 AI module path
- **Owner:** DX/QA
- **Steps:** run minimal `@hostfunc/sdk/ai` sample (`askAi` and/or embedding path) in staging-configured function.
- **Expected:** response returned without provider configuration errors.
- **Failure triage:** integration defaults, provider keys, function-level overrides.
- **Evidence:** output JSON + integration settings screenshot.

### SDK-003 Agent module path
- **Owner:** DX/QA
- **Steps:** run a minimal `@hostfunc/sdk/agent` flow (`runAgent`).
- **Expected:** agent run returns structured result and no auth/config errors.
- **Failure triage:** agent route, model provider config, tool permissions.
- **Evidence:** run output + logs.

### SDK-004 Vector module path
- **Owner:** DX/QA
- **Steps:** use `@hostfunc/sdk/vector` to upsert/query/delete in a staging namespace.
- **Expected:** operation succeeds and query returns expected top-K structure.
- **Failure triage:** vector backend config, integration creds, namespace permissions.
- **Evidence:** command output + sample records.

---

## 8) Billing and Subscription Gates

### BILL-001 Checkout + webhook + portal
- **Owner:** Billing/QA
- **Steps:** trigger checkout in staging (test mode), confirm webhook handling, open billing portal.
- **Expected:** subscription state updates and portal opens.
- **Failure triage:** `STRIPE_SECRET_KEY`, webhook signing secret, event filters.
- **Evidence:** Stripe event IDs + dashboard screenshots.

### BILL-002 Plan limits and upgrade UX
- **Owner:** Billing/QA
- **Steps:** trigger free-tier limits (deploy limit, gated settings) and verify UX.
- **Expected:** human-readable errors, CTA paths, no raw internal error blobs.
- **Failure triage:** plan resolution logic, client toast rendering, server action errors.
- **Evidence:** screenshots + error text.

### BILL-003 Feature gate checks
- **Owner:** Billing/QA
- **Steps:** verify paid-only capabilities are blocked/unblocked correctly in staging.
- **Expected:** free users blocked with clear messaging; paid users proceed.
- **Failure triage:** plan slug lookup and entitlement checks.
- **Evidence:** side-by-side free vs paid behavior.

---

## 9) Observability, Reliability, and Security

### OBS-001 Summary endpoint sanity
- **Owner:** Platform
- **Steps:** query `/api/internal/observability/summary` with proper auth.
- **Expected:** metrics payload present and non-empty for active tests.
- **Failure triage:** ingestion path, auth token mismatch, DB access.
- **Evidence:** endpoint response.

### OBS-002 Execution/log ingestion quality
- **Owner:** Platform
- **Steps:** run test executions and verify logs/metrics appear in dashboard and tail.
- **Expected:** consistent execution IDs and log continuity.
- **Failure triage:** tail worker, ingest token, pipeline backpressure.
- **Evidence:** execution/log correlation sample.

### SEC-001 CI security gates
- **Owner:** Platform/Security
- **Steps:** verify `Secret Scan`, `CI`, and `Release` workflows for candidate SHA.
- **Expected:** all required checks green.
- **Failure triage:** workflow env placeholders, install steps, type/build regressions.
- **Evidence:** workflow URLs.

### REL-001 Rollback readiness drill
- **Owner:** Platform
- **Steps:** run table-top or live rehearsal from `ops/runbooks/deploy-rollback.md`.
- **Expected:** rollback completed within target time and ownership clear.
- **Failure triage:** missing runbook steps, unclear approvals, unavailable credentials.
- **Evidence:** timeline with start/end timestamps.

---

## 10) Promotion Gate (Go / No-Go)

All items below must be true to approve production promotion:
- Mandatory tests passed: `HLT-*`, `WEB-*`, `TRG-*`, `MCP-*`, `CLI-*`, `SDK-*`, `BILL-*`, `OBS-*`, `SEC-*`, `REL-001`.
- Required automated checks are green on candidate SHA:
  - GitHub Actions: CI, Secret Scan, Release, Deploy Workers (staging)
  - Vercel staging deployment healthy
- No open Sev-1/Sev-2 issues from validation.
- Evidence package completed and shared.

Sign-off roles:
- Platform Owner
- Product/QA Owner
- Security/Compliance Owner
- Billing Owner (if billing-related changes in release)

No-Go conditions:
- Any failed mandatory test without approved risk waiver.
- Any unresolved auth/token mismatch for runtime or MCP.
- Any unresolved billing webhook or checkout integrity issue.
- Any rollback rehearsal gap that prevents safe recovery.

---

## 11) Evidence Package Template

Store in release ticket/checklist:
- RC metadata (ID, SHA, date, owners)
- GitHub workflow links and conclusions
- Vercel staging deployment URL + commit
- Test result table (ID -> pass/fail -> owner -> evidence link)
- Incident log for failures + resolution notes
- Final sign-off checklist with names and timestamps

---

## 12) Suggested Execution Order

1. HLT baseline + smoke
2. WEB core flows
3. Trigger/runtime matrix
4. MCP in-depth
5. CLI + SDK in-depth
6. Billing gates
7. Observability/security checks
8. Rollback readiness
9. Promotion gate decision

This order minimizes wasted effort by failing fast on environment and core path regressions.
