@../../CLAUDE.md

# apps/outbound

Cloudflare Worker that mediates egress from user functions — egress controls, networking policy, and per-org counters. See the `cloudflare-worker-conventions` skill before editing.

Touches `CF_EGRESS_COUNTERS_KV_ID`. Web-platform APIs only.
