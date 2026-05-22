#!/usr/bin/env bash
# Cài Knowledge Platform trên Ubuntu VPS (Docker + API + systemd)
# Chạy trên VPS sau khi đã clone mineru-knowledge-admin (+ MinerU cạnh đó)
#
#   cd /opt/knowledge/mineru-knowledge-admin
#   chmod +x deploy/*.sh
#   sudo ./deploy/install.sh
#
# Biến môi trường (tùy chọn):
#   PLATFORM_DIR=/opt/knowledge/mineru-knowledge-admin
#   MINERU_DIR=/opt/knowledge/MinerU
#   DEPLOY_USER=ubuntu

set -euo pipefail

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MINERU_DIR="${MINERU_DIR:-$(dirname "$PLATFORM_DIR")/MinerU}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-$USER}}"
SKIP_DOCKER="${SKIP_DOCKER:-0}"
SKIP_SYSTEMD="${SKIP_SYSTEMD:-0}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Chạy với sudo: sudo ./deploy/install.sh" >&2
  exit 1
fi

echo "Platform: $PLATFORM_DIR"
echo "MinerU:   $MINERU_DIR"
echo "User:     $DEPLOY_USER"

need_cmd() {
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || { echo "Thiếu lệnh: $c" >&2; exit 1; }
  done
}

need_cmd docker node npm

NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Cần Node.js >= 20 (hiện: $(node -v))" >&2
  exit 1
fi

if [[ "$SKIP_DOCKER" != "1" ]]; then
  echo "==> Docker Compose (Postgres, Redis, MinIO)..."
  cd "$PLATFORM_DIR"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  echo "Đợi Postgres healthy..."
  for i in $(seq 1 30); do
    if docker exec mk-postgres pg_isready -U mk -d knowledge >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

if [[ ! -f "$PLATFORM_DIR/api/.env" ]]; then
  echo "==> Tạo api/.env từ mẫu production..."
  cp "$PLATFORM_DIR/deploy/env.production.example" "$PLATFORM_DIR/api/.env"
  echo "QUAN TRỌNG: sửa api/.env (JWT, mật khẩu, OPENAI_API_KEY) trước khi dùng thật!"
fi

echo "==> Build Admin UI + API..."
cd "$PLATFORM_DIR/admin-ui"
sudo -u "$DEPLOY_USER" npm ci
sudo -u "$DEPLOY_USER" npm run build

cd "$PLATFORM_DIR/api"
sudo -u "$DEPLOY_USER" npm ci
sudo -u "$DEPLOY_USER" npx prisma generate
sudo -u "$DEPLOY_USER" npx prisma migrate deploy
sudo -u "$DEPLOY_USER" npm run build

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PLATFORM_DIR/api" "$PLATFORM_DIR/admin-ui"

if [[ "$SKIP_SYSTEMD" != "1" ]]; then
  echo "==> Cài systemd knowledge-api..."
  sed -e "s|__DEPLOY_USER__|$DEPLOY_USER|g" \
      -e "s|__PLATFORM_DIR__|$PLATFORM_DIR|g" \
    "$PLATFORM_DIR/deploy/systemd/knowledge-api.service" \
    > /etc/systemd/system/knowledge-api.service

  if [[ -d "$MINERU_DIR" ]]; then
    echo "==> Cài systemd mineru-api..."
    chmod +x "$MINERU_DIR/run-mineru.sh" 2>/dev/null || true
    sed -e "s|__DEPLOY_USER__|$DEPLOY_USER|g" \
        -e "s|__MINERU_DIR__|$MINERU_DIR|g" \
      "$PLATFORM_DIR/deploy/systemd/mineru-api.service" \
      > /etc/systemd/system/mineru-api.service
  fi

  systemctl daemon-reload
  systemctl enable knowledge-api
  systemctl restart knowledge-api

  if [[ -f /etc/systemd/system/mineru-api.service ]]; then
    systemctl enable mineru-api
    systemctl restart mineru-api || echo "mineru-api chưa start — chạy deploy/setup-mineru.sh trước"
  fi
fi

echo ""
echo "=============================="
echo "Cài đặt xong."
echo "  Health:  curl -s http://127.0.0.1:3000/api/v1/health"
echo "  Admin:   http://127.0.0.1:3000/admin/ (sau Nginx: https://DOMAIN/admin/)"
echo ""
echo "Tiếp theo:"
echo "  1. Sửa $PLATFORM_DIR/api/.env"
  echo "  2. MinerU: sudo -u $DEPLOY_USER MINERU_DIR=$MINERU_DIR $PLATFORM_DIR/deploy/setup-mineru.sh"
echo "  3. Nginx: cp deploy/nginx/knowledge.conf.example -> /etc/nginx/sites-available/"
echo "  4. SSL:   sudo certbot --nginx -d your-domain.com"
echo "  5. Log:   journalctl -u knowledge-api -f"
echo "=============================="
