#!/usr/bin/env bash
# Pull the latest main and rebuild the stack. Run on the server for the first deploy and every update.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.prod ]; then
  echo "Missing .env.prod (see docs/DEPLOY_AWS.md)." >&2
  exit 1
fi

git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker image prune -f >/dev/null

docker compose -f docker-compose.prod.yml --env-file .env.prod ps

# Smoke check through Caddy, the way a browser arrives. A wrong-password login with the site's
# own Origin must answer 401: 403 means the proxy/CORS setup rejects the browser again, which
# once left the site unable to sign anyone in while every read-only page still worked.
site=$(grep -E '^SITE_ADDRESS=' .env.prod | cut -d= -f2- | tr -d '"' || true)
if [ -z "$site" ] || [ "${site#:}" != "$site" ]; then base="http://localhost"; else base="https://$site"; fi

check() { # name, expected status, curl args...
  local name=$1 want=$2 got=""; shift 2
  for _ in $(seq 1 12); do
    got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" || true)
    [ "$got" = "$want" ] && { echo "OK    $name ($got)"; return 0; }
    sleep 5
  done
  echo "FAIL  $name: expected $want, got $got" >&2
  return 1
}

failed=0
check "home page" 200 "$base/" || failed=1
check "API health" 200 "$base/api/health" || failed=1
check "browser login reaches auth" 401 -X POST "$base/api/auth/login" \
  -H "Origin: $base" -H 'Content-Type: application/json' \
  -d '{"email":"smoke-check@invalid.local","password":"not-the-password"}' || failed=1
if [ "$failed" -ne 0 ]; then
  echo "Smoke check failed: the site is up but not working as a browser sees it." >&2
  exit 1
fi
