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
