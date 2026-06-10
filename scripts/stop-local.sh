#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.local-runtime"
FRONT_SCREEN_SESSION="bct-erp-frontend"

stop_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      echo "Остановил процесс $pid"
    fi
    rm -f "$file"
  fi
}

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill $pids >/dev/null 2>&1 || true
    echo "Остановил процессы на порту $port: $pids"
  fi
}

if screen -ls | grep -q "[.]$FRONT_SCREEN_SESSION"; then
  screen -S "$FRONT_SCREEN_SESSION" -X quit >/dev/null 2>&1 || true
  echo "Остановил frontend screen-сессию $FRONT_SCREEN_SESSION"
fi

stop_pid_file "$RUNTIME_DIR/frontend.pid"
stop_port 3000
stop_pid_file "$RUNTIME_DIR/backend.pid"
rm -f "$RUNTIME_DIR/backend-local" "$RUNTIME_DIR/frontend.screen"

echo "Локальные процессы остановлены."
