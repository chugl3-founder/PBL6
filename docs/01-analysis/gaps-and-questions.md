# Báo cáo Phân tích Yêu cầu: Gaps, Mâu thuẫn & Quyết định Đã Chốt (PBL6 Badminton)

* **Vai trò thực hiện:** Business Analyst (BA)
* **Tài liệu nguồn:** `docs/00-requirements/PBL6-Badminton_requirements.md`
* **Ngày cập nhật:** 2026-10-08
* **Trạng thái:** **HOÀN TẤT & ĐÃ GIẢI QUYẾT TOÀN BỘ (RESOLVED)**

---

## 1. Bảng Quyết định của Product Owner (Decisions Record)

Dưới đây là các quyết định chính thức từ Product Owner / Khách hàng đã được tích hợp đầy đủ vào tài liệu yêu cầu:

| # | Câu hỏi quyết định | Quyết định chính thức | Tác động triển khai kiến trúc & nghiệp vụ | Trạng thái |
| :-: | :--- | :--- | :--- | :---: |
| **Q1** | **Số lượng video trên mỗi trận đấu trong phạm vi MVP?** | **1 Match gắn với 1 Video duy nhất (1-1)** | Bảng `videos` có ràng buộc `match_id FK UNIQUE`. API upload video quy về `POST /api/matches/{id}/videos/upload-url` và `complete`. Bảng `match_statistics` giữ toàn vẹn ràng buộc `analysis_id UNIQUE`. | **ĐÃ CHỐT** |
| **Q2** | **Quyền hạn của Khách vãng lai (Guest) đối với Thư viện Public Match?** | **Guest được xem, nhưng GIỚI HẠN STREAM PREVIEW $\le 5\text{ phút}$ (300 giây)** | Guest được duyệt danh sách, tìm kiếm, xem chi tiết và phát video preview tối đa 5 phút đầu của trận đấu public. Sau 5 phút, UI hiển thị thông báo yêu cầu đăng nhập để xem trọn vẹn. | **ĐÃ CHỐT** |
| **Q3** | **Quyền Retry phân tích AI khi gặp lỗi?** | **User Owner ĐƯỢC PHÉP tự bấm Retry** trên trận đấu của mình | Bổ sung API `POST /api/matches/{id}/ai-analyses/{analysisId}/retry` cho User Owner, giảm tải cho Admin và tăng trải nghiệm tự chủ cho người dùng. | **ĐÃ CHỐT** |
| **Q4** | **Chiến lược Upload Video dung lượng lớn (NFR-VID-04)?** | **S3 Presigned URL (Direct-to-Storage lên MinIO)** | Web Backend cấp S3 Presigned URL có thời hạn. Frontend đẩy file MP4 trực tiếp lên MinIO bucket, sau đó gọi webhook `complete` về Backend để xác nhận metadata. Giúp bảo vệ CPU/RAM của Spring Boot không bị quá tải. | **ĐÃ CHỐT** |
| **Q5** | **Tính năng Court 2D Replay (FR-M04-08 - mức Could)?** | **TẠM HOÃN SAU MVP** | Giữ nguyên mức ưu tiên Could và không đưa vào MVP đợt 1. Tập trung tối đa vào Replay video đồng bộ timeline marker và thống kê rally. | **ĐÃ CHỐT** |
| **Q6** | **Phương thức khôi phục mật khẩu (Forgot Password)?** | **Magic Reset Link gửi qua email (Token thời hạn 15 phút)** | Bổ sung bảng `password_resets` để quản lý token an toàn, hỗ trợ endpoint `POST /api/auth/forgot-password` và `POST /api/auth/reset-password`. | **ĐÃ CHỐT** |
| **Q7** | **Chiến lược phân trang (Pagination)?** | **Chuẩn Page-based (`page`, `size`, `sort`)** | Toàn bộ API trả về danh sách được chuẩn hóa theo định dạng `{ data: [...], pagination: { page, size, totalElements, totalPages } }`. | **ĐÃ CHỐT** |

---

## 2. Kết quả Xử lý Mâu thuẫn (Contradictions Resolved)

| Mã | Hạng mục | Mâu thuẫn ban đầu | Giải pháp đã thống nhất & cập nhật vào Requirements | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **CON-01** | **Quyền Video Stream vs Public Library** | API #15 yêu cầu `Authorized`, cản trở Public Viewer xem video. | Cho phép Guest stream video public nhưng áp dụng giới hạn thời lượng 5 phút đầu (300 giây). User đăng nhập stream không giới hạn. | **RESOLVED** |
| **CON-02** | **Quyền Retry AI Analysis** | Chỉ có Admin retry trong khi User tạo match bị fail không thể retry. | Bổ sung quyền Retry cho User Owner tại API #22 (`POST /api/matches/{id}/ai-analyses/{analysisId}/retry`). Giữ API #40 cho Admin. | **RESOLVED** |
| **CON-03** | **Quan hệ Match - Video - AI Analysis** | Trả về `Video[]` gây nhầm lẫn 1-N, làm vỡ quan hệ với `match_statistics`. | Khóa quan hệ 1-1: 1 Match chỉ có 1 Video (`videos.match_id UNIQUE FK`). API tra cứu video chuyển thành `GET /api/matches/{id}/video`. | **RESOLVED** |
| **CON-04** | **Phạm vi đối tượng Public Library** | Module M07 chỉ cho phép `User/Admin`. | Mở rộng Actor của M07 sang `Guest/User/Admin` với cơ chế preview giới hạn. | **RESOLVED** |
| **CON-05** | **Cập nhật Avatar** | Thiếu API upload file ảnh đại diện. | Bổ sung API `POST /api/users/me/avatar` (multipart/form-data đẩy lên MinIO). | **RESOLVED** |
| **CON-06** | **Trường `match_date` Nullable** | Có thể làm sai lệch thứ tự sắp xếp trận đấu. | Quy định `match_date` là `NOT NULL` với giá trị mặc định là `CURRENT_DATE`. | **RESOLVED** |

---

## 3. Kết quả Xử lý Thiếu sót Kỹ thuật (Gaps Resolved)

| Mã | Hạng mục | Thiếu sót ban đầu | Giải pháp đã bổ sung | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **GAP-01** | **Thiếu API Monitor toàn bộ AI Analyses cho Admin** | Admin không có endpoint xem danh sách analysis toàn hệ thống. | Bổ sung API #39: `GET /api/admin/ai-analyses?page=0&size=10&status={status}`. | **RESOLVED** |
| **GAP-02** | **Thiếu Phân trang (Pagination) trên API danh sách** | Trả về mảng thô gây quá tải bộ nhớ và vi phạm NFR-PER-01. | Toàn bộ API danh sách (`matches`, `public-matches`, `admin/users`, `admin/matches`, `admin/ai-analyses`) đều hỗ trợ phân trang chuẩn `page`, `size`. | **RESOLVED** |
| **GAP-03** | **Thiếu bảng lưu Token Reset Password** | Không có nơi lưu trữ token xác thực đổi mật khẩu. | Bổ sung Bảng 8: `password_resets(id, user_id, token_hash, expires_at, is_used, created_at)`. | **RESOLVED** |
| **GAP-04** | **Thiếu dữ liệu Court 2D Replay** | Bảng `ai_events` không có tọa độ x,y của người chơi. | Thống nhất tạm hoãn tính năng FR-M04-08 sau MVP để giảm rủi ro mô hình AI. | **RESOLVED** |
| **GAP-05** | **Thiếu API Hủy tác vụ AI (Cancel Analysis)** | Không thể hủy tác vụ AI đang chạy dở. | Bổ sung API #23: `POST /api/matches/{id}/ai-analyses/{analysisId}/cancel` và enum `CANCELLED`. | **RESOLVED** |
| **GAP-06** | **Thiếu cơ chế Refresh Token** | Chỉ có 1 token ngắn hạn làm gián đoạn phiên làm việc. | Bổ sung API #3: `POST /api/auth/refresh-token`, cung cấp Access Token 30p và Refresh Token 7 ngày. | **RESOLVED** |

---

## 4. Chuẩn hóa Tập Giá trị Enum và Máy Trạng thái (Enums Standardized)

| Thực thể | Tên trường | Tập giá trị chuẩn hóa (Standard Values) |
| :--- | :--- | :--- |
| **`users`** | `role` | `ROLE_USER`, `ROLE_ADMIN` |
| **`users`** | `status` | `ACTIVE`, `LOCKED`, `UNVERIFIED` |
| **`users`** | `gender` | `MALE`, `FEMALE`, `OTHER` |
| **`users`** | `badminton_level` | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PRO` |
| **`matches`** | `status` | `DRAFT` $\rightarrow$ `READY` $\rightarrow$ `ANALYZING` $\rightarrow$ `ANALYZED` $\rightarrow$ `PUBLISHED` |
| **`matches`** | `source` | `USER_UPLOAD`, `ADMIN_CURATED` |
| **`matches`** | `upper_player` / `lower_player` | `PLAYER_A`, `PLAYER_B` |
| **`videos`** | `status` | `UPLOADING` $\rightarrow$ `UPLOADED` $\rightarrow$ `READY` $\rightarrow$ `FAILED` |
| **`ai_analyses`** | `status` | `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` / `FAILED` / `CANCELLED` |
| **`ai_events`** | `player_side` | `UPPER`, `LOWER` |
| **`ai_events`** | `stroke` | `SERVE`, `SMASH`, `CLEAR`, `DROP`, `LIFT`, `DRIVE`, `NET_SHOT`, `PUSH`, `UNKNOWN` |
| **`ai_events`** | `stroke_side` | `FOREHAND`, `BACKHAND`, `AROUNDHEAD`, `UNKNOWN` |
| **`rallies`** | `boundary_type` | `TIME_GAP`, `SHUTTLE_DEAD`, `SERVICE_DETECTED` |

---

## 5. Kết luận

Toàn bộ các mâu thuẫn và lỗ hổng kỹ thuật đã được làm sạch và đồng bộ nhất quán giữa 3 tài liệu:
1. [docs/00-requirements/PBL6-Badminton_requirements.md](file:///d:/DUT/HK1_Nam4_2026-2027/PBL6/PBL6_code/docs/00-requirements/PBL6-Badminton_requirements.md) (Tài liệu đặc tả yêu cầu cốt lõi).
2. [docs/01-analysis/gaps-and-questions.md](file:///d:/DUT/HK1_Nam4_2026-2027/PBL6/PBL6_code/docs/01-analysis/gaps-and-questions.md) (Báo cáo phân tích và biên bản quyết định).
3. [docs/adr/001-tech-stack.md](file:///d:/DUT/HK1_Nam4_2026-2027/PBL6/PBL6_code/docs/adr/001-tech-stack.md) (Kiến trúc Tech Stack Spring Boot 3 + React + Mock AI Adapter).
