@../../CLAUDE.md

# apps/runtime

Cloudflare Worker that owns the `/run/:owner/:slug` edge route — validates the request, enforces limits, dispatches to the user's deployed function via the Workers for Platforms Dispatch namespace. See the `cloudflare-worker-conventions` skill before editing.

Tests live next to source (`src/dispatch.test.ts`). Web-platform APIs only — no Node built-ins. `RUNTIME_INVOKE_TOKEN` / `RUNTIME_INGEST_TOKEN` / `TRIGGER_CONTROL_TOKEN` must stay in sync with `apps/web`, `apps/cron`, and `apps/tail`.
