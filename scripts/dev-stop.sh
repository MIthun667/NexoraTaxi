#!/usr/bin/env bash

set -euo pipefail

pkill -f 'nest start api --watch' 2>/dev/null || true
pkill -f 'node --enable-source-maps /home/.*/AI_CEO/dist/apps/api/main' 2>/dev/null || true
pkill -f 'node dist/apps/api/main.js' 2>/dev/null || true
pkill -f 'next dev -H 127.0.0.1 -p 3001' 2>/dev/null || true

echo "Stopped local Nexora dev processes on ports 3000/3001 if they were running."
