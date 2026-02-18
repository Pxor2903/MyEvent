#!/usr/bin/env sh
# Envoyer les modifications vers GitHub (puis Vercel redéploiera si le repo est connecté).
# Usage : ./scripts/push-to-github.sh "Description du commit"
# Ou    : sh scripts/push-to-github.sh "Description du commit"

MSG="${1:-Mise à jour}"
set -e
git add -A
git status
git commit -m "$MSG" || true
git push origin main
