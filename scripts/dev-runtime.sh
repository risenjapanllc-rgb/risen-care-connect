#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOCAL_PORT="${RISEN_LOCAL_CONNECTOR_PORT:-4310}"
STB_PORT="${SERVER_TRUST_BOUNDARY_PORT:-8787}"

LOCAL_LOG="/tmp/risen-local-${LOCAL_PORT}.log"
STB_LOG="/tmp/risen-stb-${STB_PORT}.log"

pid_on_port() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}

wait_port_free() {
  local port="$1"

  for _ in {1..40}; do
    if [ -z "$(pid_on_port "$port")" ]; then
      return 0
    fi
    sleep 0.25
  done

  return 1
}

wait_port_listening() {
  local port="$1"

  for _ in {1..40}; do
    if [ -n "$(pid_on_port "$port")" ]; then
      return 0
    fi
    sleep 0.25
  done

  return 1
}

stop_port() {
  local name="$1"
  local port="$2"
  local pid

  pid="$(pid_on_port "$port")"

  if [ -z "$pid" ]; then
    echo "$name :$port already stopped"
    return 0
  fi

  echo "Stopping $name :$port PID=$pid"
  kill "$pid"

  if ! wait_port_free "$port"; then
    echo "FAILED: $name :$port did not stop"
    return 1
  fi
}

start_stb() {
  if [ -n "$(pid_on_port "$STB_PORT")" ]; then
    echo "Server Trust Boundary :$STB_PORT already running"
    return 0
  fi

  echo "Starting Server Trust Boundary :$STB_PORT"

  nohup node server-trust-boundary/server.js \
    > "$STB_LOG" 2>&1 &

  local pid=$!

  if ! wait_port_listening "$STB_PORT"; then
    echo "FAILED: Server Trust Boundary did not start"
    tail -n 40 "$STB_LOG" || true
    return 1
  fi

  local actual
  actual="$(pid_on_port "$STB_PORT")"

  if [ "$actual" != "$pid" ]; then
    echo "FAILED: unexpected process owns :$STB_PORT"
    echo "expected PID=$pid actual PID=$actual"
    return 1
  fi

  echo "Server Trust Boundary started PID=$actual"
}

start_local() {
  if [ -n "$(pid_on_port "$LOCAL_PORT")" ]; then
    echo "Local Connector :$LOCAL_PORT already running"
    return 0
  fi

  echo "Starting Local Connector :$LOCAL_PORT"

  nohup node -r dotenv/config local-connector/server.js \
    > "$LOCAL_LOG" 2>&1 &

  local pid=$!

  if ! wait_port_listening "$LOCAL_PORT"; then
    echo "FAILED: Local Connector did not start"
    tail -n 40 "$LOCAL_LOG" || true
    return 1
  fi

  local actual
  actual="$(pid_on_port "$LOCAL_PORT")"

  if [ "$actual" != "$pid" ]; then
    echo "FAILED: unexpected process owns :$LOCAL_PORT"
    echo "expected PID=$pid actual PID=$actual"
    return 1
  fi

  echo "Local Connector started PID=$actual"
}

start_all() {
  start_stb
  start_local
}

stop_all() {
  stop_port "Local Connector" "$LOCAL_PORT"
  stop_port "Server Trust Boundary" "$STB_PORT"
}

restart_all() {
  stop_all
  start_all
}

status_all() {
  local local_pid
  local stb_pid

  local_pid="$(pid_on_port "$LOCAL_PORT")"
  stb_pid="$(pid_on_port "$STB_PORT")"

  echo "==== STATUS ===="

  if [ -n "$local_pid" ]; then
    echo "Local Connector      :$LOCAL_PORT RUNNING PID=$local_pid"
  else
    echo "Local Connector      :$LOCAL_PORT STOPPED"
  fi

  if [ -n "$stb_pid" ]; then
    echo "Server Trust Boundary :$STB_PORT RUNNING PID=$stb_pid"
  else
    echo "Server Trust Boundary :$STB_PORT STOPPED"
  fi
}

smoke_test() {
  echo "==== RESTART CURRENT RUNTIME ===="
  restart_all

  echo "==== SMOKE TEST ===="

  response="$(
    curl -sS \
      -X POST \
      -H 'Content-Type: application/json' \
      -d '{}' \
      "http://127.0.0.1:${LOCAL_PORT}/files/SYNTHETIC-E2E-TEST.xlsx/ingest"
  )"

  echo "$response"

  node - "$response" <<'NODE'
const raw = process.argv[2];

let result;

try {
  result = JSON.parse(raw);
} catch {
  console.error("FAILED: smoke test returned invalid JSON");
  process.exit(1);
}

if (
  result?.success === true &&
  result?.status === "unmatched" &&
  typeof result?.requestId === "string" &&
  result.requestId.trim() !== ""
) {
  console.log("SMOKE TEST PASS");
  process.exit(0);
}

console.error("SMOKE TEST FAILED");
process.exit(1);
NODE
}

case "${1:-}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    restart_all
    ;;
  status)
    status_all
    ;;
  smoke-test)
    smoke_test
    ;;
  *)
    echo "Usage:"
    echo "  $0 start"
    echo "  $0 stop"
    echo "  $0 restart"
    echo "  $0 status"
    echo "  $0 smoke-test"
    exit 1
    ;;
esac
