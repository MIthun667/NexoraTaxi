#!/bin/sh
set -eu
HOST="$1"
PORT="$2"
TIMEOUT="${3:-60}"

for i in $(seq 1 "$TIMEOUT"); do
  if nc -z "$HOST" "$PORT" >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for $HOST:$PORT"
exit 1
