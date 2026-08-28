#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PID=""
WEB_PID=""
EXIT_CODE=0

legacy_watch_pid() {
  pgrep -f 'nest start api --watch' | head -n 1 || true
}

port_pid() {
  lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

assert_port_free() {
  local port="$1"
  local name="$2"
  local pid

  pid="$(port_pid "$port")"
  if [[ -n "${pid}" ]]; then
    echo "${name} port ${port} is already in use by PID ${pid}."
    ps -p "${pid}" -o pid=,ppid=,cmd=
    echo "Stop the existing process or use a different port before running pnpm dev."
    exit 1
  fi
}

assert_no_legacy_watchers() {
  local pid

  pid="$(legacy_watch_pid)"
  if [[ -n "${pid}" ]]; then
    echo "A legacy Nest watch process is still running in the background (PID ${pid})."
    ps -p "${pid}" -o pid=,ppid=,cmd=
    echo "Run 'pnpm dev:stop' first, then rerun 'pnpm dev'."
    exit 1
  fi
}

cleanup() {
  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
  fi

  if [[ -n "${WEB_PID}" ]] && kill -0 "${WEB_PID}" 2>/dev/null; then
    kill "${WEB_PID}" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

assert_no_legacy_watchers
assert_port_free 3000 "API"
assert_port_free 3001 "Web"

echo "Starting Nexora API on http://127.0.0.1:3000 ..."
(cd "${ROOT_DIR}" && pnpm api:dev) &
API_PID=$!

echo "Starting Nexora Web on http://127.0.0.1:3001 ..."
(cd "${ROOT_DIR}" && pnpm web:dev) &
WEB_PID=$!

set +e
wait "${API_PID}" "${WEB_PID}"
EXIT_CODE=$?
set -e

exit "${EXIT_CODE}"
