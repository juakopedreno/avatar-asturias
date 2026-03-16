#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

echo "===> [1/4] Prisma generate"
npm run db:generate -w @avatar/api

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL no esta definida."
  echo "       Crea .env a partir de .env.example y configura Postgres."
  exit 1
fi

echo "===> [2/4] Prisma deploy migrations"
npm run db:deploy -w @avatar/api

echo "===> [3/4] Prisma seed"
npm run db:seed -w @avatar/api

API_PORT="${API_PORT:-3000}"
HEALTH_URL="http://localhost:${API_PORT}/api/health/live"

echo "===> [4/4] Health check (si API esta levantada)"
if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "OK: API live en ${HEALTH_URL}"
else
  echo "WARN: API no esta levantada o no responde en ${HEALTH_URL}"
  echo "      Arranca la API con: npm run dev:api"
  echo "      Y valida con:       npm run hardening:smoke"
fi

echo "===> Bootstrap hardening completado"
