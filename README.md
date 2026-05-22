# MinerU Knowledge Platform

Quản trị tài liệu + RAG, dùng **MinerU** để parse PDF. Admin API: **NestJS**.

## Cấu trúc

```
mineru-knowledge-admin/
├── docker-compose.yml    # Postgres (pgvector), Redis, MinIO
├── .env.example
└── api/                  # NestJS API (bước 0 → RAG sau)
```

## Tiến độ kế hoạch

| Bước | Nội dung | Trạng thái |
|------|----------|------------|
| 0.1 | Docker + monorepo | ✅ |
| 0.2 | Config NestJS | ✅ |
| 0.3 | Database Prisma | ✅ |
| 1.1 | Upload API | ✅ |
| 1.2 | Worker parse MinerU | ✅ |
| 2.1–2.3 | Chunk + embed + vector + RAG query | ✅ |
| 4.x | Admin Web UI | ✅ |
| … | Xem chat kế hoạch | |

## Deploy VPS Ubuntu (12 GB RAM trở lên)

Deploy **vectorsystem.io.vn** (VPS `42.96.4.203`): **[docs/DEPLOY-VECTORSYSTEM.md](docs/DEPLOY-VECTORSYSTEM.md)**

Hướng dẫn chung: **[docs/DEPLOY-VPS-UBUNTU.md](docs/DEPLOY-VPS-UBUNTU.md)** · script **`deploy/`**:

```bash
sudo ./deploy/install.sh      # Docker + build API + systemd
./deploy/setup-mineru.sh        # MinerU (lần đầu)
./deploy/status.sh            # Kiểm tra
```

## Yêu cầu máy dev

- Docker Desktop
- Node.js 20+
- MinerU (folder `../MinerU`) — bật khi cần parse (bước 1+)

## Admin Web (Phase 4)

Cần **API** (`npm run start:dev` trong `api/`) + **MinerU API** khi parse.

**Terminal admin UI:**

```powershell
cd d:\CODE\MINERU\mineru-knowledge-admin
.\run-admin.ps1
```

Mở: **http://127.0.0.1:5173/admin/**

- Upload, Parse, Index, xem Markdown
- Tab **Test RAG** — thử câu hỏi trên tài liệu đã index

Build gộp vào API (tùy chọn):

```powershell
cd admin-ui && npm run build
# Sau đó mở http://127.0.0.1:3000/admin/ (NestJS serve static)
```

## Chạy lần đầu (Phase 0)

```powershell
# 1. Hạ tầng
cd d:\CODE\MINERU\mineru-knowledge-admin
docker compose up -d

# 2. Env
copy .env.example .env
copy .env.example api\.env

# 3. API
cd api
npm install
npx prisma migrate deploy
npm run start:dev
```

- Health: http://127.0.0.1:3000/api/v1/health
- Swagger: http://127.0.0.1:3000/docs
- MinIO console: http://127.0.0.1:9001 (mkminio / mkminio_secret)

## Test upload (bước 1.1)

Swagger: http://127.0.0.1:3000/docs → **POST /api/v1/documents**

Hoặc PowerShell:

```powershell
curl.exe -X POST "http://127.0.0.1:3000/api/v1/documents" `
  -F "file=@d:\CODE\MINERU\MinerU\samples\demo_mineru.pdf" `
  -F "title=Demo PDF" `
  -F "language=vi"
```

Kiểm tra MinIO console → bucket `knowledge` → `raw/default/{id}/...`

## Parse PDF (bước 1.2)

**Terminal 1 — MinerU API** (bắt buộc trước khi parse):

```powershell
cd d:\CODE\MINERU\MinerU
.\run-mineru.ps1 api
```

**Terminal 2 — Knowledge API** (đã chạy `npm run start:dev`):

```powershell
# Sau khi upload, lấy document id từ response
curl.exe -X POST "http://127.0.0.1:3000/api/v1/documents/{DOCUMENT_ID}/parse"

# Xem trạng thái
curl.exe "http://127.0.0.1:3000/api/v1/documents/{DOCUMENT_ID}"

# Khi status = parsed, xem markdown
curl.exe "http://127.0.0.1:3000/api/v1/documents/{DOCUMENT_ID}/markdown"
```

Health sẽ hiện `"mineru": "ok"` khi MinerU API đang chạy.

## Index + RAG (Phase 2)

Thêm `OPENAI_API_KEY` vào `api/.env`, restart API.

```powershell
# Sau khi status = parsed
curl.exe -X POST "http://127.0.0.1:3000/api/v1/documents/{DOCUMENT_ID}/index"

# Đợi status = indexed, xem chunks
curl.exe "http://127.0.0.1:3000/api/v1/documents/{DOCUMENT_ID}/chunks"

# Tìm kiếm ngữ nghĩa (cho bot app)
curl.exe -X POST "http://127.0.0.1:3000/api/v1/rag/query" ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"Linear Regression testing error\",\"documentIds\":[\"DOCUMENT_ID\"]}"
```
