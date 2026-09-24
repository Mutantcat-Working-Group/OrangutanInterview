#!/usr/bin/env bash
# Repackage a Tauri-built macOS DMG so it contains the /Applications
# drag-to-install shortcut, then verify the result before shipping.
# Tauri deletes the raw .app when only the dmg format is requested, so the
# signed .app is recovered from the stock DMG itself.
# Usage: make-macos-dmg.sh <version> <dmg-path>
set -euo pipefail

VERSION="${1:?version required}"
DMG_PATH="${2:?path to the Tauri-built .dmg required}"

OUT_DIR="$(dirname "${DMG_PATH}")"
DMG_NAME="$(basename "${DMG_PATH}")"
FINAL_DMG_PATH="${OUT_DIR}/${DMG_NAME}"

STAGE="$(mktemp -d)"
SRC_MNT="$(mktemp -d)/src"
VERIFY_MNT="$(mktemp -d)/verify"
trap 'rm -rf "${STAGE}" "$(dirname "${SRC_MNT}")" "$(dirname "${VERIFY_MNT}")"' EXIT
mkdir -p "${SRC_MNT}" "${VERIFY_MNT}"

# Recover the signed .app from the stock DMG that Tauri just produced.
hdiutil attach -quiet -readonly -nobrowse -mountpoint "${SRC_MNT}" "${DMG_PATH}" >/dev/null
APP_PATH="$(find "${SRC_MNT}" -maxdepth 1 -name '*.app' | head -n 1)"
test -n "${APP_PATH}"
cp -R "${APP_PATH}" "${STAGE}/"
hdiutil detach -quiet "${SRC_MNT}" >/dev/null

APP_NAME="$(basename "${APP_PATH}" .app)"

# Put the already ad-hoc-signed app next to the standard install shortcut.
ln -s /Applications "${STAGE}/Applications"

hdiutil create -volname "${APP_NAME}" -srcfolder "${STAGE}" -fs HFS+ -format UDZO -ov "${FINAL_DMG_PATH}" >/dev/null

# Fail loudly if the shipped image lost the app or the shortcut.
hdiutil attach -quiet -readonly -nobrowse -mountpoint "${VERIFY_MNT}" "${FINAL_DMG_PATH}" >/dev/null
test -n "$(find "${VERIFY_MNT}" -maxdepth 1 -name '*.app')"
test -L "${VERIFY_MNT}/Applications"
hdiutil detach -quiet "${VERIFY_MNT}" >/dev/null

echo "${FINAL_DMG_PATH}"
