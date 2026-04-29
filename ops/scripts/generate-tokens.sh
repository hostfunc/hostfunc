#!/usr/bin/env bash
# Generate the eight tokens hostfunc needs per environment, in the format the
# rest of the scripts expect.  Pipe to a file:
#
#   ops/scripts/generate-tokens.sh > .env.staging.workers
#   ops/scripts/generate-tokens.sh > .env.production.workers
#
# These files are git-ignored.  Keep them in your password manager.

set -euo pipefail

cat <<EOF
# Generated $(date -u +%FT%TZ)
# These four are mirrored across web (Vercel) and Cloudflare worker secrets.
RUNTIME_INVOKE_TOKEN=$(openssl rand -hex 32)
RUNTIME_LOOKUP_TOKEN=$(openssl rand -hex 32)
TRIGGER_CONTROL_TOKEN=$(openssl rand -hex 32)
RUNTIME_INGEST_TOKEN=$(openssl rand -hex 32)

# These two only live on the web side.
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
SECRETS_MASTER_KEY=$(openssl rand -base64 32)
EXEC_TOKEN_SECRET=$(openssl rand -base64 32)
EOF
