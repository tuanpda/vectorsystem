# Deploy lên VPS Ubuntu (12 GB RAM / 80 GB)

Hướng dẫn triển khai **ổn định**: Docker (DB) + **systemd** (API, MinerU) + **Nginx** (HTTPS).

Bot app chạy **máy khác** — chỉ cần `https://DOMAIN/api/v1/rag/query` + API key.

---

## 1. Cấu trúc trên VPS

```
/opt/knowledge/
├── mineru-knowledge-admin/    # Platform (repo này)
└── MinerU/                    # Parse PDF (repo riêng)
```

| Dịch vụ | Cách chạy | Port (chỉ localhost) |
|---------|-----------|-------------------------|
| Postgres, Redis, MinIO | Docker Compose | 5433, 6380, 9000 |
| Knowledge API + Admin | systemd `knowledge-api` | 3000 |
| MinerU API | systemd `mineru-api` | 8000 |
| Public | Nginx | 80 → 443 |

---

## 2. Chuẩn bị VPS (một lần)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx

# Docker: https://docs.docker.com/engine/install/ubuntu/
# Node 20: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
#          sudo apt install -y nodejs

# Swap 4GB (khuyến nghị khi parse PDF)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Đưa code lên VPS

```bash
sudo mkdir -p /opt/knowledge
sudo chown $USER:$USER /opt/knowledge
cd /opt/knowledge

git clone <URL-repo-knowledge-admin> mineru-knowledge-admin
git clone <URL-repo-MinerU> MinerU
```

Hoặc `rsync` / `scp` từ máy Windows.

---

## 4. Cài platform (tự động)

```bash
cd /opt/knowledge/mineru-knowledge-admin
chmod +x deploy/*.sh MinerU/../MinerU/run-mineru.sh 2>/dev/null || true

# Sửa env TRƯỚC hoặc NGAY SAU bước này
cp deploy/env.production.example api/.env
nano api/.env

sudo ./deploy/install.sh
```

Script sẽ:

- Docker `./deploy/compose-prod.sh` (ports `127.0.0.1` trong `docker-compose.yml`)
- `npm run build` admin-ui + api
- `prisma migrate deploy`
- Cài & bật `knowledge-api.service`

---

## 5. Cài MinerU (một lần, có thể lâu)

```bash
export MINERU_DIR=/opt/knowledge/MinerU
chmod +x /opt/knowledge/MinerU/run-mineru.sh
sudo -u $USER /opt/knowledge/mineru-knowledge-admin/deploy/setup-mineru.sh

# Gắn systemd (nếu install.sh chạy trước khi có MinerU)
sudo sed -e "s|__DEPLOY_USER__|$USER|g" \
    -e "s|__MINERU_DIR__|/opt/knowledge/MinerU|g" \
  /opt/knowledge/mineru-knowledge-admin/deploy/systemd/mineru-api.service \
  | sudo tee /etc/systemd/system/mineru-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now mineru-api
```

Kiểm tra: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs` → `200`

---

## 6. Cấu hình `api/.env` (bắt buộc)

| Biến | Ghi chú |
|------|---------|
| `JWT_SECRET` | Chuỗi ngẫu nhiên dài |
| `ADMIN_PASSWORD` | Mật khẩu admin web |
| `OPENAI_API_KEY` | Index + RAG |
| `DATABASE_URL` | Đổi `mk_secret` nếu đổi password Postgres trong compose |
| `MINIO_SECRET_KEY` | Đổi khỏi mặc định |
| `CORS_ORIGINS` | `https://your-domain.com` (sau khi có SSL) |
| `API_HOST` | Giữ `127.0.0.1` |

Sau khi sửa: `sudo systemctl restart knowledge-api`

---

## 7. Nginx + HTTPS

```bash
sudo cp /opt/knowledge/mineru-knowledge-admin/deploy/nginx/knowledge.conf.example \
  /etc/nginx/sites-available/knowledge.conf
sudo nano /etc/nginx/sites-available/knowledge.conf
# Đổi knowledge.example.com → domain thật

sudo ln -sf /etc/nginx/sites-available/knowledge.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Mở:

- Admin: `https://your-domain.com/admin/`
- Health: `https://your-domain.com/api/v1/health`
- Bot RAG: `POST https://your-domain.com/api/v1/rag/query` + header `X-API-Key`

---

## 8. Lệnh vận hành hàng ngày

```bash
cd /opt/knowledge/mineru-knowledge-admin

./deploy/status.sh          # Xem trạng thái
sudo ./deploy/restart-all.sh # Khởi động lại Docker + API + MinerU

journalctl -u knowledge-api -f
journalctl -u mineru-api -f
./deploy/compose-prod.sh logs -f
```

Cập nhật code:

```bash
# Platform
cd /opt/knowledge/mineru-knowledge-admin   # hoặc ~/vector/vectorsystem
git pull
cd admin-ui && npm ci && npm run build
cd ../api && npm ci && npx prisma migrate deploy && npm run build
sudo systemctl restart knowledge-api

# MinerU (parse) — luôn pull repo MinerU riêng, không sửa tay trên VPS
cd /opt/knowledge/MinerU   # hoặc ~/vector/MinerU
git pull
chmod +x run-mineru.sh
sudo sed -e "s|__DEPLOY_USER__|$USER|g" -e "s|__MINERU_DIR__|$(pwd)|g" \
  ../mineru-knowledge-admin/deploy/systemd/mineru-api.service \
  | sudo tee /etc/systemd/system/mineru-api.service
sudo systemctl daemon-reload && sudo systemctl restart mineru-api
```

---

## 9. Bot (app khác)

```http
POST https://your-domain.com/api/v1/rag/query
Content-Type: application/json
X-API-Key: mk_live_...

{"question":"...","documentIds":["uuid"],"topK":8}
```

Tạo key trong Admin → **API Keys**.

---

## 10. Xử lý lỗi

| Triệu chứng | Gợi ý |
|-------------|--------|
| `9000 ... address already in use` | Trước đây do gộp 2 file compose trùng port — hiện ports chỉ trong `docker-compose.yml` (`127.0.0.1`). `git pull` rồi `compose-prod.sh down` và `up -d` |
| `mk-minio is unhealthy` | Image MinIO mới bỏ `curl` — healthcheck cũ fail. `git pull` (đã tắt healthcheck + minio-init retry). `docker logs mk-minio` nếu vẫn lỗi |
| `CPU does not support x86-64-v2` | VPS CPU cũ — dùng image `*-cpuv1` (đã cấu hình trong `docker-compose.yml`). Không đổi sang `:latest` |
| `docker port mk-postgres` trống | `git pull` — ports `127.0.0.1` nằm trong `docker-compose.yml`. Chạy lại `./deploy/compose-prod.sh up -d` |
| API không lên | `journalctl -u knowledge-api -n 50` |
| MinerU offline | `journalctl -u mineru-api -n 50`, thiếu RAM → thêm swap |
| Parse fail `libGL.so.1` | `sudo apt install -y libgl1 libglib2.0-0` rồi `sudo systemctl restart mineru-api` |
| Parse fail `could not create a primitive` | PyTorch/oneDNN trên CPU cũ: set `MINERU_DEVICE_MODE=cpu`, `ATEN_CPU_CAPABILITY=DEFAULT` trong `run-mineru.sh`; thử PDF nhỏ; xem `journalctl -u mineru-api`; có thể `pip install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu` trong `.venv` |
| 502 Nginx | API chưa chạy / sai port 3000 |
| Index 429 | OpenAI billing |
| Upload lớn fail | `client_max_body_size` trong Nginx (mẫu đã 100M) |

### Cập nhật code trên VPS (sau khi sửa repo)

```bash
cd ~/vector/vectorsystem   # hoặc /opt/knowledge/mineru-knowledge-admin
git pull
chmod +x deploy/*.sh

./deploy/compose-prod.sh down
./deploy/compose-prod.sh up -d
docker ps   # mk-postgres, mk-redis, mk-minio đều Up

export MINERU_DIR=~/vector/MinerU
sudo MINERU_DIR=$MINERU_DIR ./deploy/install.sh
```

---

*Tài liệu kèm script trong thư mục `deploy/`.*
