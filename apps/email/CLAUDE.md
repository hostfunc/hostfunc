@../../CLAUDE.md

# apps/email

Cloudflare Worker that handles inbound email via Cloudflare Email Routing and forwards to user functions. See the `cloudflare-worker-conventions` skill before editing.

Web-platform APIs only — parse the incoming message with standard `Request`/`Headers` APIs. Don't reach for Node mail libraries.
