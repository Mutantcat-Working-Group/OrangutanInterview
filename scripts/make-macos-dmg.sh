#!/usr/bin/env bash
# Rebuild the macOS DMG so it ships the /Applications symlink for drag-to-install.
# Tauri's stock DMG omits that shortcut, so we repackage its signed .app here.
# Usage: make-macos-dmg.sh <version> <path-to-app> <output-dir>
set -euo pipefail

VERSION="${1:?version required}"
APP_PATH="${2:?path to .app bundle required}"
OUT_DIR="${3:?output directory required}"

APP_NAME="$(basename "${APP_PATH}" .app)"
DMG_PATH="${OUT_DIR}/${APP_NAME}_${VERSION}_universal.dmg"

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT

# Copy the already ad-hoc-signed app next to the standard install symlink.
cp -R "${APP_PATH}" "${STAGE}/"
ln -s /Applications "${STAGE}/Applications"

mkdir -p "${OUT_DIR}"
hdiutil create -volname "${APP_NAME}" -srcfolder "${STAGE}" -fs HFS+ -format UDZO -ov "${DMG_PATH}"

echo "${DMG_PATH}"
