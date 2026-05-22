#!/usr/bin/env bash
set -euo pipefail

echo "=== Docker ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null | grep -E '^mk-|NAMES' || docker ps

echo ""
echo "=== systemd ==="
for s in knowledge-api mineru-api; do
  if systemctl list-unit-files "$s.service" >/dev/null 2>&1; then
    systemctl is-active "$s" 2>/dev/null && systemctl --no-pager status "$s" -n 0 || true
    echo ""
  fi
done

echo "=== HTTP ==="
curl -sf http://127.0.0.1:3000/api/v1/health | head -c 500 && echo "" || echo "API: không phản hồi"
curl -sf -o /dev/null -w "MinerU /docs: %{http_code}\n" http://127.0.0.1:8000/docs 2>/dev/null || echo "MinerU: không phản hồi"
