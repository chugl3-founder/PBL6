#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server: Docker, a swap file and the code.
# Run as the default "ubuntu" user:  bash setup-server.sh
set -euo pipefail

REPO_URL="https://github.com/chugl3-founder/PBL6.git"
APP_DIR="$HOME/PBL6"

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"

echo "==> 2 GB swap (keeps the Maven and npm builds from running out of memory)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Code"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

echo
echo "Done. Next:"
echo "  1. Log out and back in (so docker works without sudo)."
echo "  2. Create $APP_DIR/.env.prod (see docs/DEPLOY_AWS.md)."
echo "  3. bash $APP_DIR/deploy/deploy.sh"
