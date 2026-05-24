#!/usr/bin/env bash
# Cài MinerU Python env (chạy 1 lần, có thể 10–30 phút tải model)
set -euo pipefail

# OpenCV / pipeline cần libGL trên VPS không có desktop (lỗi libGL.so.1 khi parse)
if command -v apt-get >/dev/null 2>&1; then
  echo "==> Thư viện hệ thống (libGL, fonts)..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    fonts-noto-core fonts-noto-cjk 2>/dev/null \
    || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    libgl1-mesa-glx libglib2.0-0
fi

MINERU_DIR="${MINERU_DIR:-/opt/knowledge/MinerU}"

if [[ ! -d "$MINERU_DIR" ]]; then
  echo "Không thấy MinerU tại: $MINERU_DIR" >&2
  echo "Clone repo MinerU vào thư mục đó hoặc set MINERU_DIR=..." >&2
  exit 1
fi

cd "$MINERU_DIR"
chmod +x run-mineru.sh 2>/dev/null || true

if [[ ! -d .venv ]]; then
  echo "==> Tạo virtualenv..."
  python3 -m venv .venv
fi

# shellcheck source=/dev/null
source .venv/bin/activate
pip install -U pip wheel

echo "==> Cài MinerU (theo README repo)..."
if [[ -f pyproject.toml ]] || [[ -f setup.py ]]; then
  pip install -e ".[pipeline]" 2>/dev/null || pip install -e . || pip install mineru
else
  pip install mineru
fi

echo "==> Kiểm tra mineru-api..."
if ! command -v mineru-api >/dev/null 2>&1 && [[ ! -x .venv/bin/mineru-api ]]; then
  echo "Không tìm thấy mineru-api. Xem https://github.com/opendatalab/MinerU" >&2
  exit 1
fi

echo "OK: MinerU sẵn sàng. Chạy thử: ./run-mineru.sh api"
