#!/usr/bin/env bash
# Bulk-set Cloudflare Worker secrets for one environment.
#
# Reads tokens from a `.env.<env>.workers` file (one KEY=VALUE per line) and
# pipes each value into `wrangler secret put` for the right worker.
#
# The file must exist locally and is git-ignored; do NOT commit it.
# Required keys:
#
#   RUNTIME_INVOKE_TOKEN     # web RUNTIME_INVOKE_TOKEN, used by runtime + cron
#   RUNTIME_LOOKUP_TOKEN     # web RUNTIME_LOOKUP_TOKEN, used by runtime as LOOKUP_API_TOKEN
#   TRIGGER_CONTROL_TOKEN    # web TRIGGER_CONTROL_TOKEN, used by cron + email as CONTROL_PLANE_TOKEN
#   RUNTIME_INGEST_TOKEN     # web RUNTIME_INGEST_TOKEN, used by tail as INGEST_TOKEN
#
# Usage:
#   ops/scripts/set-worker-secrets.sh staging /path/to/.env.staging.workers
#   ops/scripts/set-worker-secrets.sh production /path/to/.env.production.workers

set -euo pipefail

ENV_NAME="${1:-}"
ENV_FILE="${2:-}"
if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]] || [[ -z "$ENV_FILE" ]]; then
  echo "usage: $0 <staging|production> <env-file>" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

required=(RUNTIME_INVOKE_TOKEN RUNTIME_LOOKUP_TOKEN TRIGGER_CONTROL_TOKEN RUNTIME_INGEST_TOKEN)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "ERROR: $key is empty in $ENV_FILE" >&2
    exit 1
  fi
done

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

put() {
  # $1 = worker dir, $2 = secret name on worker, $3 = value
  local dir="$1" name="$2" value="$3"
  echo "==> $dir <- $name (env=$ENV_NAME)"
  (cd "$ROOT/apps/$dir" && echo -n "$value" | pnpm exec wrangler secret put "$name" --env "$ENV_NAME")
}

put runtime LOOKUP_API_TOKEN     "$RUNTIME_LOOKUP_TOKEN"
put runtime RUNTIME_INVOKE_TOKEN "$RUNTIME_INVOKE_TOKEN"

put cron    CONTROL_PLANE_TOKEN  "$TRIGGER_CONTROL_TOKEN"
put cron    RUNTIME_INVOKE_TOKEN "$RUNTIME_INVOKE_TOKEN"

put email   CONTROL_PLANE_TOKEN  "$TRIGGER_CONTROL_TOKEN"

put tail    INGEST_TOKEN         "$RUNTIME_INGEST_TOKEN"

echo "==> All worker secrets set for $ENV_NAME."
echo "    These four tokens MUST match the matching web env vars in Vercel:"
echo "      RUNTIME_INVOKE_TOKEN, RUNTIME_LOOKUP_TOKEN, TRIGGER_CONTROL_TOKEN, RUNTIME_INGEST_TOKEN"
