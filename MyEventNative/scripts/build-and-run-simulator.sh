#!/usr/bin/env bash
# Build et lance l’app sur le simulateur iPhone 16 (ou un autre si précisé).
# Usage : ./MyEventNative/scripts/build-and-run-simulator.sh
#         ./MyEventNative/scripts/build-and-run-simulator.sh "iPhone 15"

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_NATIVE="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_NATIVE"
SIMULATOR_NAME="${1:-iPhone 16}"

echo "→ Build et lancement sur simulateur : $SIMULATOR_NAME"
xcodebuild -project MyEventNative.xcodeproj \
  -scheme MyEventNative \
  -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
  -derivedDataPath build \
  build 2>&1 | tail -20

echo "→ Lancement de l’app…"
xcrun simctl boot "$SIMULATOR_NAME" 2>/dev/null || true
xcodebuild -project MyEventNative.xcodeproj \
  -scheme MyEventNative \
  -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
  -derivedDataPath build \
  run 2>&1 | tail -30
