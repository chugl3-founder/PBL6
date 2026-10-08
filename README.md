# PBL6 Badminton - Nền Tảng Phân Tích & Replay Trận Đấu

Dự án đồ án PBL6: Hệ thống tiếp nhận video trận đấu cầu lông, sinh S3 Presigned URL, điều phối tác vụ phân tích, trực quan hóa dòng sự kiện cú đánh (Stroke markers) trên video stream và thống kê chuyên sâu.

> [!IMPORTANT]
> **Ranh giới xử lý AI:** Dự án này **không huấn luyện hoặc chạy mô hình Computer Vision**. Mô hình AI do bộ phận AI độc lập khác đảm nhiệm. Dự án chịu trách nhiệm Web Backend, Frontend Replay, Database, và điều phối qua Message Broker. Giai đoạn hiện tại sử dụng **Mock Data Engine** để phục vụ phát triển và kiểm thử toàn diện. Thư mục `ai-worker/` là **Skeleton Consumer** làm cổng tích hợp chuẩn.

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

Hệ thống của bạn cần cài đặt sẵn một trong hai cách tiếp cận sau:

### Cách A: Chạy toàn bộ bằng Docker (Khuyên Dùng)
* **Docker Desktop** (hoặc Docker Engine $\ge 24.0$, Docker Compose $\ge v2$).

### Cách B: Chạy Local từng thành phần (Dành cho Lập trình viên)
* **Java:** JDK 17+ (Khuyên dùng Eclipse Temurin / OpenJDK 17).
* **Maven:** Apache Maven 3.9+.
* **Node.js:** Node v18+ hoặc v20+ kèm `npm`.
* **Python:** Python 3.10+ (cho AI worker skeleton).
* **Docker:** Dùng để chạy cụm Database, Storage & Queue (`postgres`, `minio`, `rabbitmq`).

---

## 2. Hướng Dẫn Khởi Chạy 1 Chạm Bằng Docker (Cách A)

Chỉ với **1 câu lệnh duy nhất**, Docker sẽ tự động build và chạy toàn bộ 6 dịch vụ:

```bash
docker compose up -d --build
```

### Các Cổng Dịch Vụ Mặc Định:
| Dịch vụ | Địa chỉ truy cập | Tài khoản / Ghi chú |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Giao diện người dùng React |
| **Backend API** | [http://localhost:8080](http://localhost:8080) | Spring Boot 3 REST API |
| **Health Check API** | [http://localhost:8080/api/health](http://localhost:8080/api/health) | Kiểm tra trạng thái Backend |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | User: `minioadmin` / Pass: `minioadmin` |
| **MinIO S3 API** | `http://localhost:9000` | S3 API Endpoint |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) | User: `guest` / Pass: `guest` |
| **PostgreSQL** | `localhost:5432` | DB: `badminton_db` (user: `badminton_user`) |

### Dừng toàn bộ hệ thống:
```bash
docker compose down
```

---

## 3. Hướng Dẫn Chạy Local để Phát Triển Code (Cách B)

Khi bạn đang viết mã và muốn xem thay đổi ngay (Hot Reload) mà không cần build lại image Docker:

### Bước 1: Khởi động cụm dịch vụ phụ trợ (DB, MinIO, RabbitMQ)
```bash
docker compose up -d postgres minio createbuckets rabbitmq
```
*(Đợi khoảng 5 giây để PostgreSQL và MinIO sẵn sàng).*

### Bước 2: Chạy Backend Spring Boot
Mở một cửa sổ Terminal mới:
```bash
cd backend
mvn spring-boot:run
```
*Backend sẽ tự động chạy Flyway migration để tạo toàn bộ 9 bảng CSDL và mở port `8080`.*
*Kiểm tra tại: [http://localhost:8080/api/health](http://localhost:8080/api/health)*

### Bước 3: Chạy Frontend React (Vite)
Mở một cửa sổ Terminal thứ 2:
```bash
cd frontend
npm install
npm run dev
```
*Frontend sẽ chạy tại: [http://localhost:5173](http://localhost:5173)*

### Bước 4: Chạy Skeleton AI Worker (Tùy chọn)
Mở một cửa sổ Terminal thứ 3:
```bash
cd ai-worker
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate
pip install -r requirements.txt
python worker.py
```
*Worker sẽ kết nối tới RabbitMQ và lắng nghe hàng đợi `badminton.ai.queue`.*

---

## 4. Kiểm Tra & Xác Nhận Hệ Thống Hoạt Động

1. **Kiểm tra Backend:** Mở trình duyệt truy cập `http://localhost:8080/api/health`, kết quả trả về:
   ```json
   {
     "service": "badminton-backend",
     "status": "UP",
     "version": "1.0.0",
     "timestamp": "2026-10-08T..."
   }
   ```
2. **Kiểm tra Frontend:** Mở `http://localhost:5173`:
   - Trang chủ hiển thị banner giới thiệu và danh sách trận đấu mẫu.
   - Có thể điều hướng thử sang `/login`, `/register`, `/my-matches`.
   - Vào `/public-matches/1/replay` để xem thử khung giao diện Replay đồng bộ Video + Timeline markers + Rallies.
3. **Kiểm tra MinIO Storage:** Mở `http://localhost:9001` (login `minioadmin`/`minioadmin`), bạn sẽ thấy 2 bucket đã được tự động tạo sẵn:
   - `badminton-videos`: Lưu trữ video trận đấu MP4.
   - `badminton-avatars`: Lưu trữ ảnh đại diện người dùng.
4. **Kiểm tra Database:** Toàn bộ bảng CSDL đã được Flyway tự động migrate thành công theo tài liệu `docs/02-design/erd.md`.

---

## 5. Cấu Trúc Thư Mục Dự Án

```text
PBL6_code/
├── backend/               # Spring Boot 3 (Controller, Service, Repository, Flyway)
│   ├── src/main/java/     # Mã nguồn Java 17
│   ├── src/main/resources/# application.yml, db/migration/V1__init_schema.sql
│   ├── Dockerfile
│   └── pom.xml
├── frontend/              # React 18 + Vite + TypeScript + TailwindCSS
│   ├── src/               # router, layout, guard, api/client, pages
│   ├── Dockerfile
│   └── package.json
├── ai-worker/             # Skeleton Consumer lắng nghe RabbitMQ (cổng cắm AI sau này)
│   ├── worker.py
│   ├── requirements.txt
│   └── Dockerfile
├── docs/                  # Toàn bộ tài liệu phân tích & thiết kế
│   ├── 00-requirements/   # Yêu cầu chức năng (FR) và phi chức năng (NFR)
│   ├── 01-analysis/       # Gaps, Traceability Matrix RTM
│   ├── 02-design/         # ERD, State machines, Sequence diagrams, OpenAPI spec, Wireframes
│   └── 04-tasks/          # Product Backlog chia nhỏ theo 23 Vertical Slices
├── docker-compose.yml     # Khởi chạy 1-chạm toàn bộ 6 dịch vụ
├── .env.example           # Biến môi trường mẫu
└── README.md              # Hướng dẫn khởi chạy
```

