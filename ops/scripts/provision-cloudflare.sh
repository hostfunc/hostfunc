#!/usr/bin/env bash
# Provision Cloudflare resources for one environment.
#
# Idempotent — safe to re-run.  Reuses existing namespaces by title.
#
# Creates the dispatch namespace and three KV namespaces required by hostfunc
# workers, then prints the IDs you paste into apps/runtime/wrangler.toml and
# apps/outbound/wrangler.toml in place of REPLACE_WITH_*_KV_ID lines.
#
# Note: when run outside a worker directory wrangler 3 prefixes KV titles with
# "worker-" — that's only cosmetic, what matters is the ID.  Both the
# requested title and the `worker-<title>` variant are detected on rerun.
#
# Prereqs:
#   1. `wrangler login`  (or export CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
#   2. Workers Paid plan + Workers for Platforms add-on enabled on the account
#
# Usage:
#   ops/scripts/provision-cloudflare.sh staging
#   ops/scripts/provision-cloudflare.sh production

set -euo pipefail

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "usage: $0 <staging|production>" >&2
  exit 1
fi

# Dispatch namespace name follows the production-env-matrix convention.
case "$ENV_NAME" in
  staging)    DISPATCH="hostfunc-staging"; SUFFIX="staging" ;;
  production) DISPATCH="hostfunc-prod";    SUFFIX="prod"    ;;
esac

WRANGLER="pnpm --silent dlx wrangler@^3.99.0"

# ─────────────────────────────────────────────────────────────
# Dispatch namespace (idempotent)
# ─────────────────────────────────────────────────────────────
echo "==> Ensuring dispatch namespace: $DISPATCH" >&2

DISPATCH_LIST_JSON=$($WRANGLER dispatch-namespace list 2>/dev/null || echo "[]")
DISPATCH_EXISTS=$(echo "$DISPATCH_LIST_JSON" | python3 -c "
import json,sys
try:
    arr = json.load(sys.stdin)
    if isinstance(arr, list):
        for ns in arr:
            if ns.get('namespace_name') == '$DISPATCH' or ns.get('name') == '$DISPATCH':
                print('yes'); break
except Exception:
    pass
")

if [[ "$DISPATCH_EXISTS" != "yes" ]]; then
  $WRANGLER dispatch-namespace create "$DISPATCH" >&2 || {
    echo "    (creation failed; assuming it already exists)" >&2
  }
else
  echo "    already exists, skipping" >&2
fi

# ─────────────────────────────────────────────────────────────
# KV namespaces (idempotent)
# ─────────────────────────────────────────────────────────────
KV_LIST_JSON=$($WRANGLER kv:namespace list 2>/dev/null || echo "[]")

# Find an existing KV namespace whose title is exactly $1, or has the
# wrangler-3 worker-prefix variant `worker-$1`.  Prints the ID, or empty.
find_existing_kv() {
  local title="$1"
  echo "$KV_LIST_JSON" | python3 -c "
import json,sys
target = '$title'
prefixed = 'worker-' + target
try:
    arr = json.load(sys.stdin)
    if not isinstance(arr, list): sys.exit(0)
    for ns in arr:
        t = ns.get('title','')
        if t == target or t == prefixed:
            print(ns['id']); break
except Exception:
    pass
"
}

# Create a KV namespace with $1 as title if it doesn't already exist.
# Prints the ID on stdout.
ensure_kv() {
  local title="$1"
  local existing
  existing=$(find_existing_kv "$title")
  if [[ -n "$existing" ]]; then
    echo "==> KV $title — already exists ($existing)" >&2
    echo "$existing"
    return
  fi

  echo "==> Creating KV $title" >&2
  local out
  out=$($WRANGLER kv:namespace create "$title" 2>&1 || true)
  echo "$out" >&2

  # New wrangler prints JSON-style: "id": "..."
  local id
  id=$(echo "$out" | grep -oE '"id":[[:space:]]*"[a-f0-9]+"' | head -n1 \
        | sed -E 's/.*"id":[[:space:]]*"([^"]+)".*/\1/')

  # Older wrangler prints TOML-style: id = "..."
  if [[ -z "$id" ]]; then
    id=$(echo "$out" | grep -oE 'id = "[a-f0-9]+"' | head -n1 \
          | sed -E 's/id = "([^"]+)"/\1/')
  fi

  # Fallback: re-list and find by title.
  if [[ -z "$id" ]]; then
    KV_LIST_JSON=$($WRANGLER kv:namespace list 2>/dev/null || echo "[]")
    id=$(find_existing_kv "$title")
  fi

  if [[ -z "$id" ]]; then
    echo "ERROR: could not determine id for KV '$title'" >&2
    exit 1
  fi

  # Refresh cached list so subsequent ensure_kv calls see the new entry.
  KV_LIST_JSON=$($WRANGLER kv:namespace list 2>/dev/null || echo "[]")
  echo "$id"
}

FN_INDEX_ID=$(ensure_kv "fn-index-$SUFFIX")
EGRESS_COUNTERS_ID=$(ensure_kv "egress-counters-$SUFFIX")
FN_ASSETS_ID=$(ensure_kv "fn-assets-$SUFFIX")

cat <<SUMMARY

──────────────────────────────────────────────────────────
Provisioning complete for: $ENV_NAME
──────────────────────────────────────────────────────────

Dispatch namespace : $DISPATCH

KV namespace IDs:
  fn-index-$SUFFIX          : $FN_INDEX_ID
  egress-counters-$SUFFIX   : $EGRESS_COUNTERS_ID
  fn-assets-$SUFFIX         : $FN_ASSETS_ID

Next steps:

1. Replace the placeholders in apps/runtime/wrangler.toml under [env.$ENV_NAME]:
     FN_INDEX             id = "$FN_INDEX_ID"
     EGRESS_COUNTERS      id = "$EGRESS_COUNTERS_ID"

2. Replace the placeholder in apps/outbound/wrangler.toml under [env.$ENV_NAME]:
     EGRESS_COUNTERS      id = "$EGRESS_COUNTERS_ID"

3. Set these in your Vercel project ($([[ "$ENV_NAME" == "production" ]] && echo "hostfunc-web" || echo "hostfunc-web-staging")):
     CF_DISPATCH_NAMESPACE     = $DISPATCH
     CF_FN_INDEX_KV_ID         = $FN_INDEX_ID
     CF_EGRESS_COUNTERS_KV_ID  = $EGRESS_COUNTERS_ID
     CF_FN_ASSETS_KV_ID        = $FN_ASSETS_ID

4. Generate a scoped API token at https://dash.cloudflare.com/profile/api-tokens with:
     - Account / Workers Scripts          : Edit
     - Account / Workers KV Storage       : Edit
     - Account / Workers Routes           : Edit
     - Account / Workers for Platforms    : Edit
     - Account / Account Settings         : Read
     - Zone   / Workers Routes (hostfunc.io) : Edit

   Save it as the GitHub Environment secret CF_API_TOKEN under "$ENV_NAME".

SUMMARY
