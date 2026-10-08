# PROJECT RULES & CONSTRAINTS: PBL6 BADMINTON PLATFORM

## 1. Ranh Giới Phạm Vi Xử Lý AI (Core Constraint)
- **DỰ ÁN NÀY TUYỆT ĐỐI KHÔNG HUẤN LUYỆN HOẶC VIẾT MÔ HÌNH THỊ GIÁC MÁY TÍNH (COMPUTER VISION / PYTORCH MODEL).**
- Mô hình AI do bộ phận AI độc lập khác đảm nhiệm.
- **Trách nhiệm của dự án này:**
  1. **Web Backend:** Tiếp nhận video trận đấu, sinh S3 Presigned URL, điều phối tác vụ qua Message Broker, tiếp nhận dữ liệu sự kiện (`ai_events`, `rallies`, `match_statistics`) và lưu trữ vào PostgreSQL theo schema chuẩn.
  2. **Frontend:** Hiển thị giao diện, phát video stream (Video.js), trực quan hóa timeline markers, điều hướng pha cầu (rallies) và biểu đồ thống kê.
- **Chiến lược Mock Data:**
  - Ở giai đoạn hiện tại, toàn bộ tiến trình phân tích AI được mô phỏng bằng **Mock Engine (Spring Boot @Async Stub)** để sinh dữ liệu mẫu đầy đủ và chuẩn xác theo schema DB để phát triển và kiểm thử end-to-end các tính năng Web và Replay.
  - Thư mục `ai-worker/` chỉ đóng vai trò **Skeleton Consumer** (lắng nghe hàng đợi RabbitMQ và in log) làm cổng tích hợp chuẩn cho đội ngũ AI cắm vào sau này.

---

## 2. Chuẩn Mực Kiến Trúc & Kỹ Thuật (Architecture & Standards)
- **Web Backend:**
  - Ngôn ngữ: Java 17/21 + Spring Boot 3.
  - Kiến trúc phân lớp nghiêm ngặt: **Controller $\rightarrow$ Service $\rightarrow$ Repository** (NFR-MNT-01).
  - Không bao giờ block HTTP thread cho các tác vụ nặng: API bắt đầu phân tích AI luôn trả về `HTTP 202 Accepted` trong $< 200\text{ms}$ (NFR-PER-02, NFR-AI-01).
  - Định dạng lỗi thống nhất: Mọi lỗi trả về qua `@RestControllerAdvice` bắt buộc tuân thủ đúng Schema `ErrorResponse` trong `openapi.yaml`:
    `{ errorType: UPLOAD | VALIDATION | AI | SYSTEM, code, message, details, timestamp }` (NFR-ERR-01).
- **Frontend:**
  - React 18 + Vite + TypeScript + TailwindCSS.
  - Phân quyền theo vai trò (Guest, ROLE_USER, ROLE_ADMIN) thông qua `AuthGuard` và `RoleGuard`.
  - Khách vãng lai (Guest) chỉ được xem preview video tối đa 5 phút (300 giây) trên các trận đấu công khai.
- **Quản lý Dữ liệu & Lưu trữ:**
  - Cơ sở dữ liệu: PostgreSQL 15+.
  - Migration: Sử dụng Flyway (`src/main/resources/db/migration/V...sql`).
  - Lưu trữ Video & File: MinIO (S3-compatible) thông qua S3 Presigned URLs để upload file lớn trực tiếp từ Client (NFR-VID-04).

