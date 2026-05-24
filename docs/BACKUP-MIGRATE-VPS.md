# Sao lưu & chuyển VPS (giữ PDF, Parse, Markdown, Index)

Dùng khi **đổi máy chủ** hoặc **sao lưu định kỳ**.

**Cần giữ:** MinIO (file) + PostgreSQL (metadata, chunks, vector) + `api/.env`  
**Không cần:** code (git clone lại), `MinerU/.venv`, Redis

Đường dẫn mặc định trên VPS:

- Platform: `~/vector/vectorsystem`
- MinerU: `~/vector/MinerU`

---

## Phần A — Sao lưu (VPS cũ)

### Bước 1: Tạo thư mục backup

```bash
mkdir -p ~/backup-migrate
cd ~/backup-migrate
```

### Bước 2: Backup PostgreSQL

```bash
docker exec mk-postgres pg_dump -U mk -d knowledge -Fc -f /tmp/knowledge.dump
docker cp mk-postgres:/tmp/knowledge.dump ~/backup-migrate/knowledge.dump
ls -lh ~/backup-migrate/knowledge.dump
```

### Bước 3: Backup MinIO (PDF + markdown + ảnh)

Đọc mật khẩu MinIO trong `api/.env` (`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`). Mặc định: `mkminio` / `mkminio_secret`.

```bash
export MINIO_USER=mkminio
export MINIO_PASS=mkminio_secret

docker run --rm \
  -v ~/backup-migrate:/backup \
  --network host \
  minio/mc:RELEASE.2025-04-16T18-13-26Z-cpuv1 \
  sh -c "mc alias set local http://127.0.0.1:9000 ${MINIO_USER} ${MINIO_PASS} && \
         mc mirror local/knowledge /backup/minio-knowledge --overwrite"

ls -la ~/backup-migrate/minio-knowledge
```

### Bước 4: Backup cấu hình

```bash
cp ~/vector/vectorsystem/api/.env ~/backup-migrate/api.env
chmod 600 ~/backup-migrate/api.env
```

### Bước 5: Nén và tải về (hoặc copy sang VPS mới)

```bash
cd ~
tar -czvf backup-migrate-$(date +%Y%m%d).tar.gz backup-migrate/
ls -lh backup-migrate-*.tar.gz
```

**Tải về máy tính (từ PC):**

```bash
scp root@IP_VPS_CU:/root/backup-migrate-YYYYMMDD.tar.gz .
```

**Hoặc gửi thẳng sang VPS mới:**

```bash
scp /root/backup-migrate-YYYYMMDD.tar.gz root@IP_VPS_MOI:/root/
```

---

## Phần B — Khôi phục (VPS mới)

### Bước 1: Cài hệ thống như lần đầu

- Clone `vectorsystem` + `MinerU`
- Cài Docker, Node, chạy `./deploy/compose-prod.sh up -d`
- Chạy `./deploy/install.sh` (build API, migrate DB trống)
- Cài MinerU: `./deploy/setup-mineru.sh`, bật `mineru-api`
- Nginx + SSL (domain mới hoặc cũ)

*(Chi tiết: `docs/DEPLOY-VPS-UBUNTU.md`, `docs/DEPLOY-VECTORSYSTEM.md`)*

### Bước 2: Giải nén backup

```bash
cd ~
tar -xzvf backup-migrate-YYYYMMDD.tar.gz
ls ~/backup-migrate
```

### Bước 3: Khôi phục `api/.env`

```bash
cp ~/backup-migrate/api.env ~/vector/vectorsystem/api/.env
chmod 600 ~/vector/vectorsystem/api/.env
```

Kiểm tra `DATABASE_URL`, `MINIO_*`, `OPENAI_API_KEY` vẫn đúng.

### Bước 4: Khôi phục PostgreSQL

**Dừng API** (tránh ghi DB khi restore):

```bash
sudo systemctl stop knowledge-api
```

Restore (DB đã tạo sẵn bởi `install.sh`):

```bash
docker cp ~/backup-migrate/knowledge.dump mk-postgres:/tmp/knowledge.dump

docker exec mk-postgres pg_restore -U mk -d knowledge \
  --clean --if-exists --no-owner --role=mk \
  /tmp/knowledge.dump
```

Nếu báo lỗi role/owner, thử:

```bash
docker exec -it mk-postgres psql -U mk -d knowledge -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec mk-postgres pg_restore -U mk -d knowledge --no-owner /tmp/knowledge.dump
```

### Bước 5: Khôi phục MinIO

```bash
export MINIO_USER=mkminio
export MINIO_PASS=mkminio_secret

docker run --rm \
  -v ~/backup-migrate:/backup \
  --network host \
  minio/mc:RELEASE.2025-04-16T18-13-26Z-cpuv1 \
  sh -c "mc alias set local http://127.0.0.1:9000 ${MINIO_USER} ${MINIO_PASS} && \
         mc mirror /backup/minio-knowledge local/knowledge --overwrite"
```

### Bước 6: Khởi động lại dịch vụ

```bash
sudo systemctl start knowledge-api
sudo systemctl restart mineru-api
cd ~/vector/vectorsystem && ./deploy/status.sh
```

### Bước 7: Kiểm tra

```bash
curl -s http://127.0.0.1:3000/api/v1/health
```

Trình duyệt:

- Mở Admin → **Tài liệu** — file cũ còn, trạng thái **SẴN SÀNG**
- **Thử RAG** với tài liệu đã index

---

## Phần C — Checklist nhanh

**Backup (VPS cũ):**

- [ ] `knowledge.dump`
- [ ] `minio-knowledge/`
- [ ] `api.env`
- [ ] File `.tar.gz` đã copy ra nơi an toàn

**Restore (VPS mới):**

- [ ] Docker + platform + MinerU đã cài
- [ ] `api/.env` đã copy
- [ ] `pg_restore` xong
- [ ] `mc mirror` MinIO xong
- [ ] Admin + RAG OK

---

## Lưu ý

| Mục | Ghi chú |
|-----|---------|
| `api/.env` | Không commit Git; giữ riêng |
| Đổi IP / domain | Sửa DNS A record; certbot lại trên VPS mới |
| Đổi mật khẩu DB/MinIO | Phải dùng cùng secret khi restore backup cũ, hoặc restore xong rồi mới đổi (phức tạp hơn) |
| Redis | Không backup — không mất tài liệu |
| Sao lưu định kỳ | Lặp lại **Phần A** mỗi tuần/tháng |

---

## Một lệnh xem dung lượng backup

```bash
du -sh ~/backup-migrate ~/backup-migrate/minio-knowledge ~/backup-migrate/knowledge.dump
```
