@../../CLAUDE.md

# apps/cron

Cloudflare Worker that fires scheduled triggers — reads cron entries from the control plane and invokes the corresponding user functions through the runtime. See the `cloudflare-worker-conventions` skill before editing.

Local dev: `pnpm --filter @hostfunc/cron dev` runs with `--test-scheduled`, exposing `/__scheduled` to fire cron handlers from a browser/curl. Token plumbing (`TRIGGER_CONTROL_TOKEN`, `RUNTIME_INVOKE_TOKEN`) must match `apps/web` and `apps/runtime`.
