#!/usr/bin/env bash
# Khởi động lại toàn bộ dịch vụ production
set -euo pipefail
PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

chmod +x "$PLATFORM_DIR/deploy/compose-prod.sh"
"$PLATFORM_DIR/deploy/compose-prod.sh" up -d

systemctl restart knowledge-api 2>/dev/null || echo "Chưa có knowledge-api.service"
systemctl restart mineru-api 2>/dev/null || echo "Chưa có mineru-api.service"

sleep 2
"$PLATFORM_DIR/deploy/status.sh"
