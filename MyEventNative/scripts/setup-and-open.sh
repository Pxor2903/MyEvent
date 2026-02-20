#!/usr/bin/env bash
# Setup MyEventNative : installe XcodeGen si besoin, génère le projet, ouvre Xcode.
# Usage : depuis la racine du repo MyEvent :
#   ./MyEventNative/scripts/setup-and-open.sh
# Ou depuis MyEventNative :
#   ./scripts/setup-and-open.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_NATIVE="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_NATIVE"

echo "→ Répertoire de travail : $ROOT_NATIVE"

if ! command -v xcodegen &>/dev/null; then
  echo "→ XcodeGen non trouvé. Installation avec Homebrew…”
  if ! command -v brew &>/dev/null; then
    echo "Erreur : Homebrew est requis. Installe-le avec :"
    echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
  fi
  brew install xcodegen
fi

echo "→ Génération du projet Xcode…"
xcodegen generate

echo "→ Ouverture du projet dans Xcode…"
open MyEventNative.xcodeproj

echo "→ Terminé. Dans Xcode : sélectionne un simulateur et lance avec Cmd+R."
