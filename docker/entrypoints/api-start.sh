#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS_ON_BOOT:-false}" = "true" ]; then
  echo "Running Prisma deploy migrations..."
  npx prisma migrate deploy
fi

exec node dist/apps/api/main.js
