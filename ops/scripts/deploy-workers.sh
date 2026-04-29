#!/usr/bin/env bash
# Deploy all five Cloudflare workers to a given environment.
#
# Prereqs:
#   - `wrangler login` (or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
#   - Wrangler IDs already populated in apps/runtime/wrangler.toml and
#     apps/outbound/wrangler.toml (run provision-cloudflare.sh first).
#
# Usage:
#   ops/scripts/deploy-workers.sh staging
#   ops/scripts/deploy-workers.sh production

set -euo pipefail

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "usage: $0 <staging|production>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

WORKERS=(runtime cron tail email outbound)

for w in "${WORKERS[@]}"; do
  echo "==> Deploying apps/$w (env=$ENV_NAME)"
  (cd "$ROOT/apps/$w" && pnpm exec wrangler deploy --env "$ENV_NAME")
done

echo "==> All workers deployed to $ENV_NAME."
echo
echo "Next: confirm tail consumer is wired."
echo "  wrangler tail-consumer add hostfunc-runtime$([[ \"$ENV_NAME\" == \"staging\" ]] && echo \"-staging\") hostfunc-tail$([[ \"$ENV_NAME\" == \"staging\" ]] && echo \"-staging\")"
