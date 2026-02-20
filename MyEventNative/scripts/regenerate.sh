#!/usr/bin/env bash
# Régénère le projet Xcode (supprime l’ancien .xcodeproj puis xcodegen generate).
# Usage : ./MyEventNative/scripts/regenerate.sh  ou  ./scripts/regenerate.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_NATIVE="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_NATIVE"

echo "→ Suppression de l’ancien projet…”
rm -rf MyEventNative.xcodeproj
echo "→ Régénération avec XcodeGen…"
xcodegen generate
echo "→ Projet régénéré. Pour ouvrir : open MyEventNative.xcodeproj"
