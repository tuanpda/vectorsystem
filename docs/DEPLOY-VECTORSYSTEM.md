# Deploy vectorsystem.io.vn

| Mục | Giá trị |
|-----|---------|
| **Domain** | `vectorsystem.io.vn` |
| **VPS IP** | `42.96.4.203` |
| **Admin** | https://vectorsystem.io.vn/admin/ |
| **API health** | https://vectorsystem.io.vn/api/v1/health |
| **Bot RAG** | `POST https://vectorsystem.io.vn/api/v1/rag/query` |

---

## 1. DNS (làm trước)

Tại nhà đăng ký tên miền, thêm bản ghi:

| Loại | Tên | Giá trị |
|------|-----|---------|
| **A** | `@` | `42.96.4.203` |
| **A** | `www` | `42.96.4.203` (tùy chọn) |

Đợi 5–30 phút (đôi khi vài giờ), kiểm tra:

```bash
ping vectorsystem.io.vn
```

---

## 2. SSH vào VPS

```bash
ssh root@42.96.4.203
# hoặc ssh ubuntu@42.96.4.203
```

---

## 3. Cài hệ thống (tóm tắt)

Chi tiết: [DEPLOY-VPS-UBUNTU.md](./DEPLOY-VPS-UBUNTU.md)

```bash
cd /opt/knowledge/mineru-knowledge-admin

cp deploy/env.production.example api/.env
nano api/.env
# Bắt buộc đổi: JWT_SECRET, ADMIN_PASSWORD, OPENAI_API_KEY, MINIO_SECRET_KEY

sudo ./deploy/install.sh

MINERU_DIR=/opt/knowledge/MinerU ./deploy/setup-mineru.sh
sudo systemctl enable --now mineru-api
```

---

## 4. Nginx + SSL (domain của bạn)

```bash
sudo cp /opt/knowledge/mineru-knowledge-admin/deploy/nginx/vectorsystem.io.vn.conf \
  /etc/nginx/sites-available/vectorsystem.io.vn.conf

sudo ln -sf /etc/nginx/sites-available/vectorsystem.io.vn.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vectorsystem.io.vn -d www.vectorsystem.io.vn
```

Mở trình duyệt: **https://vectorsystem.io.vn/admin/**

---

## 5. Bot (app khác)

```env
KNOWLEDGE_API_URL=https://vectorsystem.io.vn
KNOWLEDGE_API_KEY=mk_live_...
```

```http
POST https://vectorsystem.io.vn/api/v1/rag/query
Content-Type: application/json
X-API-Key: mk_live_<secret>

{"question":"Câu hỏi","documentIds":["<uuid-tài-liệu-đã-index>"],"topK":8}
```

---

## 6. Sau khi `git pull` (sửa Docker port)

```bash
cd ~/vector/vectorsystem
git pull
chmod +x deploy/*.sh
./deploy/compose-prod.sh down && ./deploy/compose-prod.sh up -d
export MINERU_DIR=~/vector/MinerU
sudo MINERU_DIR=$MINERU_DIR ./deploy/install.sh
```

---

## 7. Kiểm tra nhanh

```bash
curl -s https://vectorsystem.io.vn/api/v1/health
curl -s -o /dev/null -w "%{http_code}" https://vectorsystem.io.vn/admin/
./deploy/status.sh
```

---

## 8. Firewall VPS

Chỉ mở:

- `22` (SSH)
- `80`, `443` (web)

**Không** mở `3000`, `8000`, `5433`, `9000` ra internet.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
