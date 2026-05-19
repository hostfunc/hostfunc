---
name: cloudflare-worker-conventions
description: This skill should be used whenever Claude is editing files under apps/runtime, apps/cron, apps/email, apps/tail, or apps/outbound in the hostfunc monorepo. It covers Wrangler config, the runtime token plumbing, the no-Node-builtins rule, and the deploy flow. Trigger this whenever the user mentions a worker, the runtime, the dispatch namespace, cron triggers, the tail worker, the email handler, the outbound proxy, or wrangler.
---

# cloudflare-worker-conventions

## When to use

- Editing files under `apps/runtime/`, `apps/cron/`, `apps/email/`, `apps/tail/`, or `apps/outbound/`.
- Changing `wrangler.toml` in any of those apps.
- Discussing how user functions are dispatched, scheduled, or logged.
- Touching runtime tokens, dispatch namespaces, or Cloudflare bindings.

## Steps

1. **Identify which worker you're touching:**
   - `apps/runtime` — edge router for `/run/:owner/:slug`. Receives HTTP, validates, routes to the user's function via the Dispatch namespace.
   - `apps/cron` — scheduled triggers. Reads cron entries from the control plane and fires the right user functions.
   - `apps/email` — inbound email handler. Cloudflare Email Routing → this worker → user function.
   - `apps/tail` — log/metric ingestion. Tail other workers, batch, forward to the control plane.
   - `apps/outbound` — egress proxy / networking controls for user function outbound calls.

2. **Web-platform APIs only.** No Node built-ins (`fs`, `path`, `crypto.createHmac`, etc.). Use `fetch`, `Request`, `Response`, `Headers`, `URL`, `URLSearchParams`, `crypto.subtle`, `TextEncoder`/`TextDecoder`. If a worker dep insists on Node built-ins, that's a problem — flag it.

3. **Wrangler config per worker.** Each app has its own `wrangler.toml` with `[env.staging]` and `[env.production]`. Bindings (KV, secrets, services) are declared per-env. Local dev:
   ```
   pnpm --filter @hostfunc/<worker> dev
   ```
   `apps/cron` uses `--test-scheduled` to expose `/__scheduled` for local cron firing.

4. **Secrets are never committed.** They go in via:
   ```
   pnpm --dir apps/<worker> exec wrangler secret put <NAME> --env <staging|production>
   ```
   Don't add secrets to `wrangler.toml`'s `[vars]` — that's for non-sensitive config only.

5. **Runtime tokens must match across workers.** These three values must be identical wherever they're referenced (`apps/web`, `apps/cron`, `apps/tail`, `apps/runtime`):
   - `RUNTIME_INVOKE_TOKEN` — workers calling `/run/:owner/:slug`.
   - `RUNTIME_INGEST_TOKEN` — workers ingesting telemetry into the control plane.
   - `TRIGGER_CONTROL_TOKEN` — cron / event triggers calling the control plane.
   Comparison is plaintext. Rotate together or nothing works.

6. **Dispatch namespace** — defaults: `hostfunc-dev` (local), `hostfunc-staging`, `hostfunc-prod`. Set in `wrangler.toml` under `dispatch_namespaces` for the runtime worker. Workers for Platforms is a paid Cloudflare add-on.

7. **Tests.**
   - `apps/runtime` tests live next to source: `apps/runtime/src/dispatch.test.ts`. Run via `pnpm --filter @hostfunc/runtime test`.
   - The other workers don't currently have tests. If you add one, follow Vitest conventions with `vi.stubGlobal('fetch', ...)` for outbound HTTP.

8. **Deploys.**
   - Local typecheck: `pnpm --filter @hostfunc/<worker> typecheck`.
   - Local manual deploy (rare): `pnpm --dir apps/<worker> exec wrangler deploy --env <staging|production>`.
   - **CI handles real deploys**: push to `main` deploys all 5 workers to staging; pushing a `v*` tag deploys to production. See `.github/workflows/deploy-workers.yml`.

## Conventions

- No `console.log` in worker code that's hot-path (it shows up in tail logs and is expensive at scale). Use it sparingly; route metrics through the tail worker instead.
- Worker entry points export `default { fetch, scheduled, ... }`. Don't refactor that shape.
- Keep `wrangler.toml` env blocks symmetrical — every binding in `[env.staging]` should have a counterpart in `[env.production]`.
- Read environment from the `env` parameter passed to handlers, not `process.env` — that doesn't exist on Workers.
- For request validation, prefer Web standard `Headers` / `URL` parsing over ad-hoc string ops.

## Gotchas

- **`process.env` is undefined** in worker code. Use the `env` argument or a Wrangler binding.
- **No filesystem.** Anything that needs persistent state is a binding (KV, R2, D1, Durable Objects) or a remote DB call.
- **Cold-start budget is tiny** — don't import heavy libraries (avoid lodash, moment). Stick to small, tree-shaken modules.
- **Token plaintext compare**: if a token doesn't match across workers, requests just 401. Always check the env-var names match across all `wrangler.toml`s before changing one.
- **Local Wrangler dev uses miniflare under the hood** — behaviour can subtly differ from real Workers. If something works locally but breaks deployed, suspect: KV consistency, fetch behaviour with subrequests, header normalization.
- **`apps/cron` and `apps/tail` share secrets with the control plane** — touching their env config without coordinating with `apps/web` env breaks the cron firing path.

## Done means

- The change works on `pnpm --filter @hostfunc/<worker> dev`.
- `pnpm --filter @hostfunc/<worker> typecheck` is clean.
- `wrangler.toml` env blocks are symmetric (staging and production both updated when relevant).
- Any new env var is documented (where it gets set: `wrangler secret put` for secret, `[vars]` for non-secret) and propagated to all workers that need it.
- For `apps/runtime`, `apps/runtime/src/dispatch.test.ts` is still green.
