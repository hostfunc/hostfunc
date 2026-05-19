@../../CLAUDE.md

# apps/tail

Cloudflare Worker that ingests logs/metrics from the other Workers (via Wrangler tail), batches them, and forwards to the control plane (`apps/web`) for persistence in the `execution` table. See the `cloudflare-worker-conventions` skill before editing.

Hot path — avoid heavy imports and avoid `console.log` inside the worker itself (it'd loop into its own tail). `RUNTIME_INGEST_TOKEN` must match `apps/web`.
