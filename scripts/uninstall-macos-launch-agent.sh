#!/usr/bin/env bash
set -euo pipefail

LABEL="care.risen.connector"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"

launchctl bootout \
  "gui/${UID}/${LABEL}" \
  2>/dev/null || true

rm -f "$PLIST_PATH"

echo "Uninstalled ${LABEL}"
