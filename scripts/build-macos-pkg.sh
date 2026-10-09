#!/bin/bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

cd "${ROOT_DIR}"

BUNDLE="${ROOT_DIR}/dist/macos/RISEN CARE Connector"
PKG_ROOT="${ROOT_DIR}/dist/macos/pkg-root"
PKG_OUTPUT="${ROOT_DIR}/dist/macos/RISEN CARE Connector.pkg"

rm -rf \
  "${PKG_ROOT}" \
  "${PKG_OUTPUT}"

node \
  scripts/build-macos-bundle.js

mkdir -p \
  "${PKG_ROOT}/Library/Application Support/RISEN CARE Connector" \
  "${PKG_ROOT}/Library/LaunchAgents"

COPYFILE_DISABLE=1 \
ditto \
  --norsrc \
  "${BUNDLE}" \
  "${PKG_ROOT}/Library/Application Support/RISEN CARE Connector"

find \
  "${PKG_ROOT}" \
  -name '._*' \
  -type f \
  -delete

cp \
  native/macos/package/care.risen.connector.plist \
  "${PKG_ROOT}/Library/LaunchAgents/care.risen.connector.plist"

chmod 755 \
  "${PKG_ROOT}/Library/Application Support/RISEN CARE Connector/runtime/node" \
  "${PKG_ROOT}/Library/Application Support/RISEN CARE Connector/native/macos/risen-keychain-helper" \
  "${PKG_ROOT}/Library/Application Support/RISEN CARE Connector/scripts/production-local-runtime.sh"

chmod 644 \
  "${PKG_ROOT}/Library/LaunchAgents/care.risen.connector.plist"

find \
  "${PKG_ROOT}" \
  -name '._*' \
  -type f \
  -delete

xattr -cr \
  "${PKG_ROOT}"

COPYFILE_DISABLE=1 \
pkgbuild \
  --root "${PKG_ROOT}" \
  --scripts "${ROOT_DIR}/native/macos/package/scripts" \
  --identifier "care.risen.connector" \
  --version "1.0.0" \
  --install-location "/" \
  "${PKG_OUTPUT}"

echo "${PKG_OUTPUT}"
