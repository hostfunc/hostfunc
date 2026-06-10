# Hostfunc Roadmap

## Recently shipped

- Marketplace: public listings with categories, readmes, stars, threaded comments, and forking.
- Custom domains: bring-your-own domain for hosted websites with automatic SSL (Cloudflare for SaaS).
- Email trigger addresses: generated `{fn}-{workspace}-{random}@hostfunc.io` inbound addresses with sender allowlists, regeneration, and custom-domain delivery via MX records.
- VS Code extension: device-flow sign-in, functions explorer with triggers/versions/executions/secret keys, deploy/run/logs, and push-on-save draft sync.
- CLI browser sign-in (OAuth device flow) on top of the shared typed API client.
- Security hardening: constant-time internal token checks, 1 MiB request body cap, custom-domain abuse limits, SVG upload sanitization.
- Function & workspace logos, delete-function lifecycle, integrations overhaul.

## Near-term (0-2 months)

- Production launch (see `ops/runbooks/production-release-plan.md`): prod Cloudflare provisioning, Stripe live cutover, go-live checklist.
- Staging soak and trigger reliability for cron and inbound email at scale.
- Deferred security follow-ups: per-tenant envelope keys for secrets, RLS policies, API-token rotation.
- Populate the standalone docs site (`apps/docs`) from the in-app docs content.

## Mid-term (2-6 months)

- Plan enforcement and billing lifecycle completion.
- More executor backends (Lambda/Fly/Deno) behind the shared executor contract.
- Stronger multi-tenant audit trails and policy controls.
- Production-ready observability and alert integrations.

## Long-term

- Reusable function templates on top of the marketplace.
- Team and enterprise admin controls.
- Advanced scheduling and event routing features.
