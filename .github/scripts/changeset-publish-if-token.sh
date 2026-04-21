#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${NPM_TOKEN:-}" ]]; then
  echo "Skipping npm publish: NPM_TOKEN is not set."
  exit 0
fi

pnpm changeset publish
