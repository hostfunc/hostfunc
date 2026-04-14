#!/bin/sh
set -eu

echo "[entrypoint] running migrations"
node /app/apps/web/scripts/migrate.js

echo "[entrypoint] starting web server"
exec node /app/apps/web/server.js
