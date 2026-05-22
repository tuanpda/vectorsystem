#!/usr/bin/env bash
# Khởi động lại toàn bộ dịch vụ production
set -euo pipefail
PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PLATFORM_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

systemctl restart knowledge-api 2>/dev/null || echo "Chưa có knowledge-api.service"
systemctl restart mineru-api 2>/dev/null || echo "Chưa có mineru-api.service"

sleep 2
"$PLATFORM_DIR/deploy/status.sh"
