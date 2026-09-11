#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="care.risen.connector"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/${LABEL}.plist"
LOG_DIR="${HOME}/Library/Logs/RISEN CARE Connector"

mkdir -p "$PLIST_DIR" "$LOG_DIR"

NODE_PATH="$(command -v node)"

if [ -z "$NODE_PATH" ]; then
  echo "FAILED: node was not found"
  exit 1
fi

if [ ! -f "${ROOT_DIR}/.env" ]; then
  echo "FAILED: ${ROOT_DIR}/.env is required"
  exit 1
fi

cat >"$PLIST_PATH" <<EOF2
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${ROOT_DIR}/scripts/production-local-runtime.sh</string>
        <string>supervise</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${ROOT_DIR}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>RISEN_NODE_BIN</key>
        <string>${NODE_PATH}</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/launch-agent.log</string>

    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/launch-agent-error.log</string>
</dict>
</plist>
EOF2

plutil -lint "$PLIST_PATH"

launchctl bootout \
  "gui/${UID}/${LABEL}" \
  2>/dev/null || true

launchctl bootstrap \
  "gui/${UID}" \
  "$PLIST_PATH"

echo "Installed ${LABEL}"
echo "Plist: ${PLIST_PATH}"
