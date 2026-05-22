# Hướng dẫn Knowledge Platform (MinerU + NestJS + Admin)

**Phiên bản:** 0.1 · **Cập nhật:** 2026-05

---

## 1. Hệ thống là gì?

**Knowledge Platform** biến tài liệu PDF/DOCX thành tri thức có thể tìm kiếm (vector) để chatbot tra cứu.

| Thành phần | Vai trò |
|------------|---------|
| **Admin UI** (React) | Upload, Parse, Index, Test RAG, tạo API Key |
| **Knowledge API** (NestJS) | API trung tâm: lưu file, queue, RAG |
| **MinerU** | Parse PDF → Markdown + JSON |
| **Docker** | Postgres (pgvector), Redis, MinIO |
| **OpenAI** | Embedding `text-embedding-3-small` khi Index / RAG |
| **App Bot** (riêng) | Gọi `POST /rag/query` bằng API Key |

Bot **không** gọi MinerU trực tiếp — chỉ gọi Knowledge API.

---

## 2. Sơ đồ luồng dữ liệu

```
[Admin UI :5173] ──JWT──► [Knowledge API :3000]
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   [MinIO :9000]      [Postgres :5433]      [Redis :6380]
         │                    │                    │
         │              chunks + vectors           │
         │                    │                    │
         └──────────► [MinerU :8000] ◄── Parse job (BullMQ)
                              │
[Bot app] ──API Key──► POST /rag/query ──► embed câu hỏi + search vector
                              │
                         contexts → Bot tự gọi LLM trả lời user
```

---

## 3. Ba bước xử lý tài liệu

| Bước | Nút admin | Cần chạy | Kết quả |
|------|-----------|----------|---------|
| **1. Upload** | Upload file | API + Docker | File gốc → MinIO |
| **2. Parse** | Parse | + MinerU API | Markdown, `content_list.json` → MinIO |
| **3. Index** | Index | + OpenAI billing | Chunks + vector → Postgres |

Trạng thái **Sẵn sàng** = đã index, RAG tìm được.

---

## 4. Các dịch vụ cần khởi động

### 4.1. Docker (bắt buộc)

**Thư mục:** `D:\CODE\MINERU\mineru-knowledge-admin`

```powershell
docker compose up -d
```

| Dịch vụ | Port | Mục đích |
|---------|------|----------|
| Postgres + pgvector | **5433** | DB, vector |
| Redis | **6380** | Hàng đợi Parse/Index |
| MinIO | **9000** / **9001** | Lưu file gốc & đã parse |

**Điều kiện:** Docker Desktop đang chạy.

---

### 4.2. MinerU API (khi Parse)

**Thư mục:** `D:\CODE\MINERU\MinerU`

```powershell
.\run-mineru.ps1 api
```

| URL | http://127.0.0.1:8000 |

Không cần nếu chỉ xem tài liệu đã parse/index từ trước.

---

### 4.3. Knowledge API (bắt buộc)

**Thư mục:** `D:\CODE\MINERU\mineru-knowledge-admin`

```powershell
.\run-api.ps1
```

| Health | http://127.0.0.1:3000/api/v1/health |
| Swagger | http://127.0.0.1:3000/docs |

**Cấu hình:** `api\.env` (copy từ `.env.example`):

- `DATABASE_URL`, `REDIS_URL`, MinIO
- `OPENAI_API_KEY` — bắt buộc cho Index/RAG
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — tài khoản admin web
- `JWT_SECRET` — đổi khi deploy thật

---

### 4.4. Admin UI (quản trị)

**Sau khi API chạy:**

```powershell
.\run-admin.ps1
```

| URL | http://127.0.0.1:5173/admin/ |
| Login mặc định dev | `admin@local.dev` / `admin123` |

---

### 4.5. App Chatbot (tùy chọn)

Không cần terminal trên máy này nếu bot là project khác.

1. Admin → **API Keys** → Tạo key → copy `mk_live_...` (chỉ hiện một lần).
2. Bot gọi:

```http
POST http://127.0.0.1:3000/api/v1/rag/query
Content-Type: application/json
X-API-Key: mk_live_<secret>

{"question":"...","documentIds":["<uuid>"],"topK":8}
```

3. Dùng `contexts` trong response → ghép prompt → gọi LLM (OpenAI/Claude/…).

API Key **chỉ** dùng RAG — không upload/parse/index.

---

## 5. Khởi động nhanh (một lệnh)

**Thư mục:** `mineru-knowledge-admin`

```powershell
.\start-all.ps1
```

Mở nhiều cửa sổ PowerShell (Docker + MinerU + API + Admin). Dừng: `.\stop-all.ps1`

---

## 6. Thứ tự khởi động thủ công (4 terminal)

| # | Lệnh | Ghi chú |
|---|------|---------|
| 1 | `docker compose up -d` | Trong `mineru-knowledge-admin` |
| 2 | `.\run-mineru.ps1 api` | Trong `MinerU` |
| 3 | `.\run-api.ps1` | Trong `mineru-knowledge-admin` |
| 4 | `.\run-admin.ps1` | Sau API |

**Tối thiểu (chỉ RAG):** bước 1 + 3 + bot/API key (hoặc bước 4 để test trên web).

---

## 7. Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| Admin báo API offline | API chưa chạy / port 3000 bận | `.\run-api.ps1`, tắt process trùng port |
| Parse → LỖI, MinerU đỏ | MinerU chưa chạy | `.\run-mineru.ps1 api` |
| Index → 429 OpenAI | Hết quota / chưa nạp credit | https://platform.openai.com/settings/organization/billing |
| `EADDRINUSE :3000` | Hai instance API | Chỉ một `run-api.ps1` |
| DB connection failed | Docker chưa lên | `docker compose up -d` |
| Bot 401 | Key sai / đã thu hồi | Tạo key mới trong Admin |

---

## 8. Đường dẫn dự án

```
D:\CODE\MINERU\
├── MinerU\                    # Parse service
│   └── run-mineru.ps1 api
└── mineru-knowledge-admin\    # Platform chính
    ├── docker-compose.yml
    ├── run-api.ps1
    ├── run-admin.ps1
    ├── start-all.ps1          # Khởi động tất cả
    ├── stop-all.ps1
    ├── api\                   # NestJS + .env
    ├── admin-ui\              # React admin
    └── docs\                  # Tài liệu này
```

---

## 9. Model & chi phí

- **Embedding:** `text-embedding-3-small`, 1536 chiều (cấu hình `EMBEDDING_MODEL` trong `api\.env`).
- **RAG:** Mỗi câu hỏi embed 1 lần + search vector local — rẻ so với chat GPT.
- **LLM trả lời:** Do app bot tự chọn, không nằm trong platform này.

---

*Tài liệu kèm script `start-all.ps1` / `stop-all.ps1` trong cùng repo.*
