#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

cd "$ROOT_DIR"

TEST_HOME="$(mktemp -d)"
TEST_ENV="$(mktemp)"
TEST_PORT=4311

cleanup() {
  HOME="$TEST_HOME" \
  DOTENV_CONFIG_PATH="$TEST_ENV" \
  RISEN_LOCAL_CONNECTOR_PORT="$TEST_PORT" \
    ./scripts/production-local-runtime.sh stop \
      >/dev/null 2>&1 || true

  rm -rf "$TEST_HOME"
  rm -f "$TEST_ENV"
}

trap cleanup EXIT

grep -v '^CONNECTOR_CREDENTIAL=' \
  .env > "$TEST_ENV"

export HOME="$TEST_HOME"
export DOTENV_CONFIG_PATH="$TEST_ENV"
export RISEN_LOCAL_CONNECTOR_PORT="$TEST_PORT"

unset CONNECTOR_CREDENTIAL

output="$(
  ./scripts/production-local-runtime.sh start
)"

printf '%s\n' "$output"

if ! grep -q \
  'Local Connector RUNNING' \
  <<<"$output"
then
  echo "FAIL: Local Connector did not start"
  exit 1
fi

if ! grep -q \
  'Sync Worker WAITING FOR PROVISIONING' \
  <<<"$output"
then
  echo "FAIL: Sync Worker was not held for provisioning"
  exit 1
fi

status="$(
  ./scripts/production-local-runtime.sh status
)"

printf '%s\n' "$status"

if ! grep -q \
  'Sync Worker STOPPED' \
  <<<"$status"
then
  echo "FAIL: Sync Worker unexpectedly started"
  exit 1
fi

echo "PASS: unprovisioned runtime starts Local Connector only"
