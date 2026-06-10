#!/usr/bin/env bash

set -euo pipefail

check_url() {
  local url="$1"
  local label="$2"
  if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
    echo "$label: готов ($url)"
  else
    echo "$label: не отвечает ($url)"
  fi
}

check_url "http://localhost:3000/dashboard" "Frontend"
check_url "http://localhost:9000/health" "Backend"

echo
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
