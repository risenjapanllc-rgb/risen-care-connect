#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOCAL_PORT="${RISEN_LOCAL_CONNECTOR_PORT:-4310}"
STB_PORT="${SERVER_TRUST_BOUNDARY_PORT:-8787}"

STATE_DIR="/tmp/risen-care-connect-runtime-${UID}"
LOCAL_PID_FILE="${STATE_DIR}/local-${LOCAL_PORT}.pid"
STB_PID_FILE="${STATE_DIR}/stb-${STB_PORT}.pid"

LOCAL_LOG="/tmp/risen-local-${LOCAL_PORT}.log"
STB_LOG="/tmp/risen-stb-${STB_PORT}.log"

mkdir -p "$STATE_DIR"

pid_on_port() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}

process_command() {
  ps -p "$1" -o command= 2>/dev/null || true
}

process_cwd() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null \
    | sed -n 's/^n//p' \
    | head -n 1 || true
}

read_pid_file() {
  local file="$1"

  if [ ! -f "$file" ]; then
    return 0
  fi

  tr -d '[:space:]' < "$file"
}

expected_command_matches() {
  local role="$1"
  local pid="$2"
  local command

  command="$(process_command "$pid")"

  case "$role" in
    local)
      [[ "$command" == *"node -r dotenv/config local-connector/server.js"* ]]
      ;;
    stb)
      [[ "$command" == *"node server-trust-boundary/server.js"* ]] ||
      [[ "$command" == *"node -r dotenv/config server-trust-boundary/server.js"* ]]
      ;;
    *)
      return 1
      ;;
  esac
}

is_managed_process() {
  local role="$1"
  local port="$2"
  local pid_file="$3"

  local stored_pid
  local listening_pid
  local cwd

  stored_pid="$(read_pid_file "$pid_file")"

  if [ -z "$stored_pid" ]; then
    return 1
  fi

  if ! kill -0 "$stored_pid" 2>/dev/null; then
    return 1
  fi

  listening_pid="$(pid_on_port "$port")"

  if [ "$stored_pid" != "$listening_pid" ]; then
    return 1
  fi

  if ! expected_command_matches "$role" "$stored_pid"; then
    return 1
  fi

  cwd="$(process_cwd "$stored_pid")"

  if [ "$cwd" != "$ROOT_DIR" ]; then
    return 1
  fi

  return 0
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

wait_for_managed_listener() {
  local role="$1"
  local port="$2"
  local pid_file="$3"

  for _ in {1..40}; do
    if is_managed_process "$role" "$port" "$pid_file"; then
      return 0
    fi
    sleep 0.25
  done

  return 1
}

stop_managed() {
  local name="$1"
  local role="$2"
  local port="$3"
  local pid_file="$4"

  local listening_pid
  local stored_pid

  listening_pid="$(pid_on_port "$port")"

  if [ -z "$listening_pid" ]; then
    rm -f "$pid_file"
    echo "$name :$port already stopped"
    return 0
  fi

  if ! is_managed_process "$role" "$port" "$pid_file"; then
    echo "REFUSED: $name :$port is not owned by this runtime manager"
    echo "PID=$listening_pid"
    return 1
  fi

  stored_pid="$(read_pid_file "$pid_file")"

  echo "Stopping $name :$port PID=$stored_pid"
  kill "$stored_pid"

  if ! wait_port_free "$port"; then
    echo "FAILED: $name :$port did not stop"
    return 1
  fi

  rm -f "$pid_file"
}

start_stb() {
  local existing

  existing="$(pid_on_port "$STB_PORT")"

  if [ -n "$existing" ]; then
    if is_managed_process "stb" "$STB_PORT" "$STB_PID_FILE"; then
      echo "Server Trust Boundary :$STB_PORT already running PID=$existing"
      return 0
    fi

    echo "REFUSED: :$STB_PORT is occupied by an unmanaged process PID=$existing"
    return 1
  fi

  rm -f "$STB_PID_FILE"

  echo "Starting Server Trust Boundary :$STB_PORT"

  nohup node server-trust-boundary/server.js \
    > "$STB_LOG" 2>&1 &

  local pid=$!
  printf '%s\n' "$pid" > "$STB_PID_FILE"

  if ! wait_for_managed_listener "stb" "$STB_PORT" "$STB_PID_FILE"; then
    echo "FAILED: Server Trust Boundary did not start as a managed process"
    rm -f "$STB_PID_FILE"
    tail -n 40 "$STB_LOG" || true
    return 1
  fi

  echo "Server Trust Boundary started PID=$pid"
}

start_local() {
  local existing

  existing="$(pid_on_port "$LOCAL_PORT")"

  if [ -n "$existing" ]; then
    if is_managed_process "local" "$LOCAL_PORT" "$LOCAL_PID_FILE"; then
      echo "Local Connector :$LOCAL_PORT already running PID=$existing"
      return 0
    fi

    echo "REFUSED: :$LOCAL_PORT is occupied by an unmanaged process PID=$existing"
    return 1
  fi

  rm -f "$LOCAL_PID_FILE"

  echo "Starting Local Connector :$LOCAL_PORT"

  nohup node -r dotenv/config local-connector/server.js \
    > "$LOCAL_LOG" 2>&1 &

  local pid=$!
  printf '%s\n' "$pid" > "$LOCAL_PID_FILE"

  if ! wait_for_managed_listener "local" "$LOCAL_PORT" "$LOCAL_PID_FILE"; then
    echo "FAILED: Local Connector did not start as a managed process"
    rm -f "$LOCAL_PID_FILE"
    tail -n 40 "$LOCAL_LOG" || true
    return 1
  fi

  echo "Local Connector started PID=$pid"
}

start_all() {
  start_stb
  start_local
}

stop_all() {
  stop_managed \
    "Local Connector" \
    "local" \
    "$LOCAL_PORT" \
    "$LOCAL_PID_FILE"

  stop_managed \
    "Server Trust Boundary" \
    "stb" \
    "$STB_PORT" \
    "$STB_PID_FILE"
}

restart_all() {
  stop_all
  start_all
}

status_one() {
  local name="$1"
  local role="$2"
  local port="$3"
  local pid_file="$4"

  local pid
  pid="$(pid_on_port "$port")"

  if [ -z "$pid" ]; then
    echo "$name :$port STOPPED"
    return 0
  fi

  if is_managed_process "$role" "$port" "$pid_file"; then
    echo "$name :$port RUNNING MANAGED PID=$pid"
  else
    echo "$name :$port RUNNING UNMANAGED PID=$pid"
  fi
}

status_all() {
  echo "==== STATUS ===="

  status_one \
    "Local Connector     " \
    "local" \
    "$LOCAL_PORT" \
    "$LOCAL_PID_FILE"

  status_one \
    "Server Trust Boundary" \
    "stb" \
    "$STB_PORT" \
    "$STB_PID_FILE"
}

smoke_test() {
  echo "==== RESTART CURRENT MANAGED RUNTIME ===="
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
  result?.status === "matched" &&
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
  start-trust)
    start_stb
    ;;
  restart-trust)
    stop_managed       "Server Trust Boundary"       "stb"       "$STB_PORT"       "$STB_PID_FILE"
    start_stb
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
    echo "  $0 start-trust"
    echo "  $0 restart-trust"
    echo "  $0 stop"
    echo "  $0 restart"
    echo "  $0 status"
    echo "  $0 smoke-test"
    exit 1
    ;;
esac
