#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NODE_ENV=production

NODE_BIN="${RISEN_NODE_BIN:-$(command -v node 2>/dev/null || true)}"

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "FAILED: node runtime was not found"
  exit 1
fi

LOCAL_PORT="${RISEN_LOCAL_CONNECTOR_PORT:-4310}"
STATE_DIR="${HOME}/Library/Application Support/RISEN CARE Connector/runtime"
LOG_DIR="${HOME}/Library/Logs/RISEN CARE Connector"

LOCAL_PID_FILE="${STATE_DIR}/local.pid"
SYNC_PID_FILE="${STATE_DIR}/sync.pid"

LOCAL_LOG="${LOG_DIR}/local-connector.log"
SYNC_LOG="${LOG_DIR}/sync.log"

SYNC_INTERVAL_SECONDS="${RISEN_SYNC_INTERVAL_SECONDS:-60}"

mkdir -p "$STATE_DIR" "$LOG_DIR"

read_pid() {
  local file="$1"

  if [ ! -f "$file" ]; then
    return 0
  fi

  tr -d '[:space:]' < "$file"
}

alive() {
  local pid="$1"

  [ -n "$pid" ] &&
    kill -0 "$pid" 2>/dev/null
}

pid_on_local_port() {
  lsof -nP     -iTCP:"${LOCAL_PORT}"     -sTCP:LISTEN     -t 2>/dev/null |
    head -n 1 || true
}

local_health_ready() {
  curl \
    --silent \
    --show-error \
    --fail \
    --max-time 3 \
    "http://127.0.0.1:${LOCAL_PORT}/health" \
    >/dev/null 2>&1
}

wait_local_ready() {
  for _ in {1..40}; do
    if local_health_ready; then
      return 0
    fi

    sleep 0.25
  done

  return 1
}

start_local() {
  local pid
  pid="$(read_pid "$LOCAL_PID_FILE")"

  if alive "$pid"; then
    if local_health_ready; then
      echo "Local Connector RUNNING PID=$pid"
      return 0
    fi

    echo "FAILED: stored Local Connector process is unhealthy"
    return 1
  fi

  rm -f "$LOCAL_PID_FILE"

  local existing_pid
  existing_pid="$(pid_on_local_port)"

  if [ -n "$existing_pid" ]; then
    echo "FAILED: Local Connector port ${LOCAL_PORT} is already occupied PID=$existing_pid"
    return 1
  fi

  nohup "$NODE_BIN" \
    -r dotenv/config \
    local-connector/server.js \
    >>"$LOCAL_LOG" 2>&1 &

  pid=$!
  printf '%s\n' "$pid" >"$LOCAL_PID_FILE"

  if ! alive "$pid" || ! wait_local_ready; then
    echo "FAILED: Local Connector did not become ready"
    kill "$pid" 2>/dev/null || true
    rm -f "$LOCAL_PID_FILE"
    tail -n 40 "$LOCAL_LOG" || true
    return 1
  fi

  echo "Local Connector RUNNING PID=$pid"
}

sync_loop() {
  while true; do
    if ! "$NODE_BIN" scripts/sync-once.js \
      >>"$SYNC_LOG" 2>&1
    then
      printf '%s %s\n' \
        "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
        "sync_failed" \
        >>"$SYNC_LOG"
    fi

    sleep "$SYNC_INTERVAL_SECONDS"
  done
}

start_sync() {
  local pid
  pid="$(read_pid "$SYNC_PID_FILE")"

  if alive "$pid"; then
    echo "Sync Worker RUNNING PID=$pid"
    return 0
  fi

  rm -f "$SYNC_PID_FILE"

  nohup "$0" sync-loop \
    >>"$SYNC_LOG" 2>&1 &

  pid=$!
  printf '%s\n' "$pid" >"$SYNC_PID_FILE"

  sleep 0.25

  if ! alive "$pid"; then
    echo "FAILED: Sync Worker did not start"
    rm -f "$SYNC_PID_FILE"
    tail -n 40 "$SYNC_LOG" || true
    return 1
  fi

  echo "Sync Worker RUNNING PID=$pid"
}

stop_pid() {
  local name="$1"
  local file="$2"
  local pid

  pid="$(read_pid "$file")"

  if ! alive "$pid"; then
    rm -f "$file"
    echo "$name STOPPED"
    return 0
  fi

  kill "$pid"

  for _ in {1..40}; do
    if ! alive "$pid"; then
      rm -f "$file"
      echo "$name STOPPED"
      return 0
    fi

    sleep 0.25
  done

  echo "FAILED: $name did not stop"
  return 1
}

start_all() {
  start_local
  start_sync
}

supervise() {
  trap 'stop_all; exit 0' TERM INT HUP

  while true; do
    start_local
    start_sync
    sleep 10
  done
}

stop_all() {
  stop_pid \
    "Sync Worker" \
    "$SYNC_PID_FILE"

  stop_pid \
    "Local Connector" \
    "$LOCAL_PID_FILE"
}

status_all() {
  local local_pid
  local sync_pid

  local_pid="$(read_pid "$LOCAL_PID_FILE")"
  sync_pid="$(read_pid "$SYNC_PID_FILE")"

  if alive "$local_pid" &&
     local_health_ready
  then
    echo "Local Connector RUNNING PID=$local_pid"
  else
    echo "Local Connector STOPPED"
  fi

  if alive "$sync_pid"; then
    echo "Sync Worker RUNNING PID=$sync_pid"
  else
    echo "Sync Worker STOPPED"
  fi
}

case "${1:-}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    start_all
    ;;
  status)
    status_all
    ;;
  sync-once)
    "$NODE_BIN" scripts/sync-once.js
    ;;
  sync-loop)
    sync_loop
    ;;
  supervise)
    supervise
    ;;
  logs)
    echo "Local Connector: $LOCAL_LOG"
    echo "Sync Worker:     $SYNC_LOG"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|sync-once|supervise|logs}"
    exit 64
    ;;
esac
