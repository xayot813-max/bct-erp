#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_DIR="$ROOT_DIR/ERP-BCT-main"
BACK_DIR="$ROOT_DIR/bct-server-main"
RUNTIME_DIR="$ROOT_DIR/.local-runtime"
BACK_BIN="$RUNTIME_DIR/backend-local"
FRONT_SCREEN_SESSION="bct-erp-frontend"

mkdir -p "$RUNTIME_DIR"

is_http_ready() {
  local url="$1"
  curl -fsS --max-time 2 "$url" >/dev/null 2>&1
}

wait_for_http() {
  local url="$1"
  local name="$2"

  for _ in {1..60}; do
    if is_http_ready "$url"; then
      echo "$name готов: $url"
      return
    fi
    sleep 1
  done

  echo "Не удалось дождаться $name: $url"
  return 1
}

stop_stale_pid() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$file"
    fi
  fi
}

start_detached() {
  local workdir="$1"
  local pid_file="$2"
  local log_file="$3"
  local command="$4"

  stop_stale_pid "$pid_file"

  if [[ -f "$pid_file" ]]; then
    local running_pid
    running_pid="$(cat "$pid_file")"
    if kill -0 "$running_pid" >/dev/null 2>&1; then
      return
    fi
  fi

  cd "$workdir"
  nohup bash -lc "exec $command" </dev/null >"$log_file" 2>&1 &
  echo $! >"$pid_file"
}

start_mongo() {
  if docker ps --format '{{.Names}}' | grep -qx 'mongodb'; then
    echo "MongoDB уже запущена."
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx 'mongodb'; then
    echo "Запускаю существующий контейнер MongoDB..."
    docker start mongodb >/dev/null
    return
  fi

  echo "Поднимаю MongoDB через docker compose..."
  (
    cd "$BACK_DIR"
    docker compose up -d mongodb
  )
}

start_backend() {
  if is_http_ready "http://localhost:9000/health"; then
    echo "Backend уже слушает :9000."
    return
  fi

  echo "Собираю backend бинарник..."
  (
    cd "$BACK_DIR"
    go build -o "$BACK_BIN" .
  )

  echo "Запускаю backend на :9000..."
  start_detached "$BACK_DIR" "$RUNTIME_DIR/backend.pid" "$RUNTIME_DIR/backend.log" "\"$BACK_BIN\""
}

start_frontend() {
  if is_http_ready "http://localhost:3000/dashboard"; then
    echo "Frontend уже слушает :3000."
    return
  fi

  echo "Собираю frontend..."
  (
    cd "$FRONT_DIR"
    npm run build >/dev/null
  )

  echo "Запускаю frontend на :3000..."
  if screen -ls | grep -q "[.]$FRONT_SCREEN_SESSION"; then
    screen -S "$FRONT_SCREEN_SESSION" -X quit >/dev/null 2>&1 || true
  fi
  screen -dmS "$FRONT_SCREEN_SESSION" bash -lc "cd '$FRONT_DIR' && exec ./node_modules/.bin/next start -p 3000 >'$RUNTIME_DIR/frontend.log' 2>&1"
  echo "$FRONT_SCREEN_SESSION" >"$RUNTIME_DIR/frontend.screen"
}

start_mongo
start_backend
wait_for_http "http://localhost:9000/health" "Backend"
start_frontend
wait_for_http "http://localhost:3000/dashboard" "Frontend"

echo
echo "Локальная среда готова:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:9000"
echo "  Health:   http://localhost:9000/health"
