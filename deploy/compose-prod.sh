#!/usr/bin/env bash
# Docker Compose production (localhost-only ports via docker-compose.prod.yml !reset)
set -euo pipefail
PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PLATFORM_DIR"
exec docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
