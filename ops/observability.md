# Analytics and Observability

Low-cost-first observability is implemented using:

- Event capture into `webhook_event` (`source = analytics` and `source = error:*`).
- Optional PostHog forwarding via `POSTHOG_API_KEY` + `POSTHOG_PROJECT_ID`.
- Optional alert webhook via `ALERT_WEBHOOK_URL`.

## Funnel Events

Tracked events:

- `auth_magic_link_attempt`
- `auth_magic_link_sent`
- `auth_magic_link_failed`
- `auth_social_attempt`
- `auth_social_failed`
- `workspace_created`
- `cli_deploy_succeeded`
- `cli_deploy_failed`
- `billing_checkout_started`
- `billing_portal_opened`

## Alert Sources

Alerted error classes:

- `stripe_webhook`
- `runtime_ingest`

When `ALERT_WEBHOOK_URL` is set, these are pushed to Slack/Discord-compatible webhook endpoints.

## Monitoring Endpoint

Internal summary endpoint:

- `GET /api/internal/observability/summary`
- Header: `Authorization: Bearer $TRIGGER_CONTROL_TOKEN`

Response includes:

- analytics event counts (last 24h)
- Stripe webhook failure count (last 24h)
- Runtime failure count (last 24h)

## Suggested Thresholds

- `webhookFailures > 0` in 15m: warn
- `runtimeFailures >= 5` in 15m: warn
- `cli_deploy_failed / cli_deploy_succeeded > 0.2` over 1h: investigate
