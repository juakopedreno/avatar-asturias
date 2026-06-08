#!/usr/bin/env bash
# Publica la rama asturias en un repositorio GitHub nuevo (SHA queda en origin/main).
# Uso: ./scripts/publish-asturias-repo.sh https://github.com/USUARIO/avatar-asturias.git

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <url-repo-github-vacio>"
  echo "Ejemplo: $0 https://github.com/juakopedreno/avatar-asturias.git"
  exit 1
fi

ASTURIAS_REMOTE_URL="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --verify asturias >/dev/null 2>&1; then
  echo "Error: no existe la rama local 'asturias'. Créala y personaliza antes de publicar."
  exit 1
fi

git checkout asturias

if git remote get-url asturias >/dev/null 2>&1; then
  git remote set-url asturias "$ASTURIAS_REMOTE_URL"
else
  git remote add asturias "$ASTURIAS_REMOTE_URL"
fi

echo "Publicando rama asturias → main en $ASTURIAS_REMOTE_URL"
git push -u asturias asturias:main

echo "Listo. Crea proyecto Vercel/Railway apuntando a ese repositorio."
