#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

trap 'kill 0' EXIT

cd "$BACKEND_DIR" && npm run dev &
BACK_PID=$!

cd "$FRONTEND_DIR" && npm run dev &
FRONT_PID=$!

wait $BACK_PID $FRONT_PID
