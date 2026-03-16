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

API_PORT="${API_PORT:-3000}"
BASE_URL="http://localhost:${API_PORT}/api"
EMAIL="${SMOKE_EMAIL:-admin@torremolinos.es}"
PASSWORD="${SMOKE_PASSWORD:-password123}"
MFA_CODE="${SMOKE_MFA_CODE:-123456}"

echo "===> [1/5] Health live + ready"
curl -fsS "${BASE_URL}/health/live" >/dev/null
curl -fsS "${BASE_URL}/health/ready" >/dev/null
echo "OK: health endpoints"

echo "===> [2/5] Login"
LOGIN_JSON="$(curl -fsS -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"
echo "OK: login response"

SESSION_ID="$(printf '%s' "$LOGIN_JSON" | node -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{const x=JSON.parse(b);process.stdout.write(x.sessionId||"");});')"
ACCESS_TOKEN="$(printf '%s' "$LOGIN_JSON" | node -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{const x=JSON.parse(b);process.stdout.write(x.accessToken||"");});')"
REFRESH_TOKEN="$(printf '%s' "$LOGIN_JSON" | node -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{const x=JSON.parse(b);process.stdout.write(x.refreshToken||"");});')"

if [[ -z "$ACCESS_TOKEN" || -z "$REFRESH_TOKEN" ]]; then
  echo "===> [3/5] MFA verify (step-up)"
  MFA_JSON="$(curl -fsS -X POST "${BASE_URL}/auth/mfa/verify" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"${SESSION_ID}\",\"code\":\"${MFA_CODE}\"}")"
  ACCESS_TOKEN="$(printf '%s' "$MFA_JSON" | node -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{const x=JSON.parse(b);process.stdout.write(x.accessToken||"");});')"
  REFRESH_TOKEN="$(printf '%s' "$MFA_JSON" | node -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{const x=JSON.parse(b);process.stdout.write(x.refreshToken||"");});')"
else
  echo "===> [3/5] MFA no requerido para este usuario"
fi

if [[ -z "$ACCESS_TOKEN" || -z "$REFRESH_TOKEN" ]]; then
  echo "ERROR: No se pudo obtener access/refresh token."
  exit 1
fi

echo "===> [4/5] Auth me + provider health"
curl -fsS "${BASE_URL}/auth/me" -H "Authorization: Bearer ${ACCESS_TOKEN}" >/dev/null
curl -fsS "${BASE_URL}/avatar/provider-health" >/dev/null
echo "OK: auth/me y avatar/provider-health"

echo "===> [5/5] Refresh + logout"
NEW_TOKENS="$(curl -fsS -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")"
NEW_REFRESH="$(printf '%s' "$NEW_TOKENS" | node -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{const x=JSON.parse(b);process.stdout.write(x.refreshToken||"");});')"
curl -fsS -X POST "${BASE_URL}/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${NEW_REFRESH}\"}" >/dev/null
echo "OK: refresh/logout"

echo "===> Smoke hardening completado"
