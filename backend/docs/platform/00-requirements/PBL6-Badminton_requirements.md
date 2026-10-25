# PBL6 Badminton - System Requirements Specification

Tài liệu đặc tả yêu cầu chức năng (FR), yêu cầu phi chức năng (NFR), ma trận phân quyền, thiết kế cơ sở dữ liệu (Database Schema) và đặc tả API cho dự án **PBL6 Badminton** (Hệ thống phân tích video cầu lông tự động và hỗ trợ xem lại trận đấu).

---

# FR (Functional Requirements)

## M01 — Account Management

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M01-01** | Hệ thống cho phép người dùng đăng ký tài khoản bằng email và password. | Guest | Must | Mật khẩu được mã hóa BCrypt/Argon2. |
| **FR-M01-02** | Hệ thống xác thực thông tin đăng nhập trước khi cho phép truy cập hệ thống. | Guest | Must | Trả về cặp Access Token (JWT 30p) và Refresh Token (7 ngày). |
| **FR-M01-03** | Hệ thống cho phép người dùng đăng xuất. | User/Admin | Must | Thu hồi / đưa Refresh Token vào blacklist. |
| **FR-M01-04** | Hệ thống cho phép người dùng xem và cập nhật thông tin profile. | User/Admin | Must | Xem thông tin cá nhân và quyền hạn. |
| **FR-M01-05** | Hệ thống cho phép người dùng cập nhật avatar, tên, tuổi, giới tính và trình độ badminton. | User | Must | Upload file ảnh avatar trực tiếp lên MinIO qua API riêng. |
| **FR-M01-06** | Hệ thống hỗ trợ quy trình quên mật khẩu thông qua gửi Magic Reset Link qua email. | Guest | Must | Tạo token reset ngẫu nhiên an toàn, thời hạn 15 phút. |
| **FR-M01-07** | Hệ thống cho phép đặt lại mật khẩu mới khi cung cấp token xác thực hợp lệ. | Guest | Must | Kiểm tra token chưa hết hạn và chưa qua sử dụng. |
| **FR-M01-08** | Hệ thống hỗ trợ đăng nhập bằng tài khoản Google (OAuth2). | Guest | Could | Giai đoạn nâng cao. |


## M02 — Match Management

> **Quy tắc cốt lõi MVP:** Mỗi trận đấu (`Match`) gắn liền với **duy nhất 1 Video** chính (quan hệ 1-1).

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M02-01** | User có thể tạo một match mới. | User | Must | Khởi tạo match ở trạng thái `DRAFT`. |
| **FR-M02-02** | Admin có thể tạo một match mới để xây dựng public match. | Admin | Must | Match của Admin làm tư liệu mẫu. |
| **FR-M02-03** | Người tạo match có thể nhập thông tin match (Player A, Player B, Upper/Lower, tiêu đề, mô tả...). | User/Admin | Must | |
| **FR-M02-04** | Người tạo match có thể cập nhật thông tin match trong phạm vi cho phép. | User/Admin | Must | Cho phép sửa metadata khi chưa hoặc đã phân tích. |
| **FR-M02-05** | Người tạo match có thể upload video trận đấu thông qua S3 Presigned URL. | User/Admin | Must | Client xin upload URL từ Backend $\rightarrow$ đẩy trực tiếp lên MinIO. |
| **FR-M02-06** | Hệ thống xác nhận và lưu metadata của video sau khi upload hoàn tất (duration, resolution, fps, size). | System | Must | Backend xác nhận file từ MinIO, chuyển video sang `READY`. |
| **FR-M02-07** | User có thể xem danh sách các match do mình tạo (hỗ trợ phân trang). | User | Must | Endpoint phân trang `page`, `size`. |
| **FR-M02-08** | User có thể xem thông tin chi tiết match của mình. | User | Must | |
| **FR-M02-09** | User có thể soft delete match của mình. | User | Must | Cập nhật `deleted_at = NOW()`. |
| **FR-M02-10** | Admin có thể quản lý, tra cứu toàn bộ match trong hệ thống. | Admin | Must | |
| **FR-M02-11** | Admin có thể publish một match đã phân tích thành công lên thư viện công khai. | Admin | Must | Chuyển `status = PUBLISHED`. |
| **FR-M02-12** | Admin có thể unpublish một public match về trạng thái private. | Admin | Must | Chuyển `status = ANALYZED`. |
| **FR-M02-13** | Admin có thể restore match đã soft delete. | Admin | Must | Đặt lại `deleted_at = NULL`. |


## M03 — AI Analysis

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M03-01** | Hệ thống kiểm tra video (định dạng MP4, thời lượng, góc quay) trước khi đưa vào phân tích. | System | Must | Kiểm tra trạng thái video `READY`. |
| **FR-M03-02** | Hệ thống tạo một AI analysis session cho match với trạng thái ban đầu là `QUEUED`. | System | Must | Lưu bản ghi `ai_analyses` trong CSDL. |
| **FR-M03-03** | User/Admin có thể yêu cầu bắt đầu AI analysis. | User/Admin | Must | Phản hồi HTTP 202 Accepted tức thì, không block HTTP request. |
| **FR-M03-04** | Hệ thống đưa AI analysis vào trạng thái `PROCESSING` khi tiến trình AI bắt đầu chạy. | System | Must | Giai đoạn 1: Mock Async Engine; Giai đoạn 2: AI Server riêng. |
| **FR-M03-05** | Hệ thống cung cấp trạng thái xử lý AI thời gian thực cho User/Admin (qua Polling/SSE). | User/Admin | Must | Trạng thái: `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` / `FAILED`. |
| **FR-M03-06** | Hệ thống tiếp nhận kết quả AI sau khi processing hoàn tất. | System | Must | |
| **FR-M03-07** | Hệ thống lưu AI analysis result và cập nhật `is_current = true`. | System | Must | Đánh dấu phiên phân tích hiện tại của match. |
| **FR-M03-08** | Hệ thống lưu các stroke events (cú đánh) do AI phát hiện vào bảng `ai_events`. | System | Must | Tọa độ frame, thời gian, loại cú đánh, độ tự tin. |
| **FR-M03-09** | Hệ thống xử lý trường hợp AI analysis thất bại (lưu `error_code`, `error_message`). | System | Must | Chuyển trạng thái sang `FAILED`. |
| **FR-M03-10** | Hệ thống cảnh báo đối với video nằm ngoài phạm vi hỗ trợ (góc quay không hợp lệ). | System | Must | |
| **FR-M03-11** | Hệ thống hiển thị cảnh báo đối với event có confidence thấp ($< 0.6$). | System | Must | Gắn cờ cảnh báo trên UI. |
| **FR-M03-12** | **User Owner và Admin** có thể retry một AI analysis thất bại. | User/Admin | Must | Khởi tạo phiên AI mới hoặc thử lại phiên cũ. |
| **FR-M03-13** | User Owner và Admin có thể hủy (cancel) một phiên AI đang ở trạng thái `QUEUED` hoặc `PROCESSING`. | User/Admin | Should | Chuyển trạng thái sang `CANCELLED`. |


## M04 — Match Replay

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M04-01** | User/Admin có thể phát video match (Guest được xem preview tối đa 5 phút trên Public Match). | Guest/User/Admin | Must | HTTP Range Requests stream video MP4 từ MinIO. |
| **FR-M04-02** | Hệ thống cung cấp play/pause/seek và các video controls cơ bản. | System | Must | Tích hợp trình phát Video.js. |
| **FR-M04-03** | Hệ thống hiển thị timeline của AI events trên thanh phát video. | System | Must | Tích hợp timeline markers trực quan. |
| **FR-M04-04** | Hệ thống hiển thị stroke markers tương ứng với AI events phân loại theo màu cú đánh. | System | Must | Smash, Clear, Drop, Net Shot... có màu sắc riêng biệt. |
| **FR-M04-05** | User/Admin/Guest có thể chọn một stroke event trên timeline hoặc bảng sự kiện. | Guest/User/Admin | Must | |
| **FR-M04-06** | Khi chọn event, hệ thống tự động nhảy video (seek) tới thời điểm cú đánh xảy ra. | System | Must | Đồng bộ chính xác theo `time_seconds`. |
| **FR-M04-07** | Hệ thống hiển thị thông tin chi tiết của stroke event được chọn (loại cú đánh, tay thuận/nghịch, người đánh). | System | Must | |
| **FR-M04-08** | Hệ thống hiển thị replay vị trí player trên court 2D. | System | Could *(Tạm hoãn sau MVP)* | Đã thống nhất hoãn để tập trung video replay markers. |


## M05 — Rally & Timeline Analysis

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M05-01** | Hệ thống nhóm các stroke events liên tiếp thành từng rally (pha cầu). | System | Must | Xác định điểm bắt đầu và kết thúc pha cầu. |
| **FR-M05-02** | Hệ thống xác định boundary giữa các rally dựa trên khoảng cách thời gian hoặc sự kiện giao cầu. | System | Must | Ghi nhận `boundary_type`. |
| **FR-M05-03** | Hệ thống ghi nhận phương pháp xác định rally boundary (`TIME_GAP`, `SHUTTLE_DEAD`, `SERVICE_DETECTED`). | System | Must | |
| **FR-M05-04** | Hệ thống tạo summary cho từng rally (thời lượng, tổng số cú đánh, người giao, người kết thúc). | System | Must | |
| **FR-M05-05** | User/Admin/Guest có thể xem danh sách rally của trận đấu. | Guest/User/Admin | Must | |
| **FR-M05-06** | User/Admin/Guest có thể xem chi tiết một rally. | Guest/User/Admin | Must | |
| **FR-M05-07** | Hệ thống hiển thị sequence (chuỗi) các cú đánh diễn ra trong rally đó. | System | Must | |
| **FR-M05-08** | Người dùng có thể click chuyển trực tiếp tới thời điểm bắt đầu rally trên video. | Guest/User/Admin | Must | Nhảy video đến `start_time` của rally. |
| **FR-M05-09** | Hệ thống đồng bộ sự kiện đang phát của video với rally tương ứng trên giao diện. | System | Must | Highlight rally đang phát. |


## M06 — Match Statistics

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M06-01** | Hệ thống tính tổng số stroke events trong toàn bộ trận đấu. | System | Must | Tổng hợp từ `ai_events`. |
| **FR-M06-02** | Hệ thống tính tổng số rallies trong trận đấu. | System | Must | Tổng hợp từ `rallies`. |
| **FR-M06-03** | Hệ thống tính tỷ lệ và số lượng từng loại cú đánh (Smash, Clear, Drop, Net Shot...). | System | Must | Stroke distribution. |
| **FR-M06-04** | Hệ thống tính thống kê số cú đánh theo từng người chơi (Player A vs Player B). | System | Must | Dựa trên `player_side` và cấu hình trận đấu. |
| **FR-M06-05** | Hệ thống tính thống kê cú đánh theo tay: Forehand / Backhand / Aroundhead / Unknown. | System | Must | |
| **FR-M06-06** | Hệ thống tính độ tin cậy trung bình (`avg_confidence`) của phân tích. | System | Should | |
| **FR-M06-07** | Hệ thống tính số cú đánh trung bình trong một pha cầu (`avg_strokes_per_rally`). | System | Must | |
| **FR-M06-08** | Hệ thống tính thời lượng trung bình của một pha cầu (`avg_rally_duration`). | System | Must | Đơn vị giây. |
| **FR-M06-09** | Người dùng có thể xem dashboard tổng quan thống kê trận đấu. | Guest/User/Admin | Must | Biểu đồ cột, biểu đồ tròn trực quan. |
| **FR-M06-10** | Người dùng có thể xem phân bổ cú đánh (Stroke Distribution). | Guest/User/Admin | Must | |
| **FR-M06-11** | Người dùng có thể xem thống kê so sánh giữa 2 người chơi. | Guest/User/Admin | Must | So sánh Player A vs Player B. |
| **FR-M06-12** | Người dùng có thể xem biểu đồ thống kê các rallies (rally dài nhất, rally nhiều cú đánh nhất). | Guest/User/Admin | Must | |
| **FR-M06-13** | Người dùng có thể lọc thống kê theo Set hoặc theo khoảng thời gian. | User/Admin | Should | |


## M07 — Public Match Library

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M07-01** | Khách vãng lai (Guest) và Người dùng đã đăng nhập có thể duyệt danh sách public matches. | Guest/User/Admin | Must | API công khai, có phân trang. |
| **FR-M07-02** | Người dùng có thể tìm kiếm public matches theo tên người chơi, tiêu đề trận đấu. | Guest/User/Admin | Must | Tìm kiếm từ khóa. |
| **FR-M07-03** | Người dùng có thể lọc public matches theo trình độ, ngày thi đấu. | Guest/User/Admin | Should | |
| **FR-M07-04** | Người dùng có thể sắp xếp danh sách public matches (mới nhất, nhiều lượt xem nhất). | Guest/User/Admin | Should | Sort params. |
| **FR-M07-05** | Người dùng có thể xem thông tin tóm tắt và thumbnail preview của public match. | Guest/User/Admin | Must | |
| **FR-M07-06** | Người dùng có thể xem chi tiết thông tin trận đấu public match. | Guest/User/Admin | Must | |
| **FR-M07-07** | Người dùng có thể mở Replay của public match. **Khách (Guest) được xem preview giới hạn 5 phút đầu**, sau đó hiển thị thông báo yêu cầu đăng nhập để xem trọn vẹn. | Guest/User/Admin | Must | Giới hạn stream 300 giây cho Guest; User xem toàn bộ. |
| **FR-M07-08** | Người dùng có thể xem statistics của public match. | Guest/User/Admin | Must | |
| **FR-M07-09** | Người dùng có thể xem danh sách rally của public match. | Guest/User/Admin | Must | |


## M08 — Admin Management

| ID | Requirement | Actor | Priority | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FR-M08-01** | Admin có thể xem Dashboard tổng quan hệ thống (số user, số match, trạng thái worker). | Admin | Must | |
| **FR-M08-02** | Admin có thể xem danh sách toàn bộ người dùng trong hệ thống (kèm phân trang). | Admin | Must | |
| **FR-M08-03** | Admin có thể xem chi tiết thông tin và hoạt động của người dùng. | Admin | Must | |
| **FR-M08-04** | Admin có thể khóa (Lock) hoặc mở khóa (Unlock) tài khoản người dùng. | Admin | Must | Cập nhật `status = LOCKED / ACTIVE`. |
| **FR-M08-05** | Admin có thể quản lý, xem chi tiết toàn bộ trận đấu trong hệ thống. | Admin | Must | |
| **FR-M08-06** | Admin có thể giám sát (monitor) toàn bộ các phiên phân tích AI (kèm bộ lọc trạng thái). | Admin | Must | Endpoint `GET /api/admin/ai-analyses`. |
| **FR-M08-07** | Admin có thể xem chi tiết các phiên phân tích AI thất bại và nguyên nhân lỗi (`error_code`, `error_message`). | Admin | Must | |
| **FR-M08-08** | Admin có thể duyệt công khai (Publish) hoặc hủy công khai (Unpublish) một trận đấu. | Admin | Must | Đổi trạng thái giữa `PUBLISHED` và `ANALYZED`. |
| **FR-M08-09** | Admin có thể xóa mềm (Soft Delete) bất kỳ trận đấu nào vi phạm quy định. | Admin | Must | Đặt `deleted_at = NOW()`. |
| **FR-M08-10** | Admin có thể khôi phục (Restore) trận đấu đã bị xóa mềm. | Admin | Must | Đặt `deleted_at = NULL`. |
| **FR-M08-11** | Admin có thể kích hoạt chạy lại (Retry) bất kỳ phiên phân tích AI nào bị lỗi. | Admin | Must | Endpoint retry quản trị. |

---

# NFR (Non-Functional Requirements)

| ID | Nhóm | Yêu cầu kỹ thuật | Mức độ | Hiện thực hóa trong kiến trúc |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-PER-01** | Performance | Request API thông thường phản hồi $\le 2s$. | Must | Spring Boot tối ưu query, đánh chỉ mục DB hợp lý. |
| **NFR-PER-02** | Performance | **AI processing tuyệt đối không block HTTP request.** | Must | Request start AI trả ngay `202 Accepted` $< 200ms$, xử lý ngầm qua tiến trình bất đồng bộ. |
| **NFR-AI-01** | AI | AI processing chạy bất đồng bộ (Asynchronous). | Must | Spring `@Async` (giai đoạn 1) và RabbitMQ Worker (giai đoạn 2). |
| **NFR-AI-02** | AI | Quản lý trạng thái xử lý AI rõ ràng theo máy trạng thái. | Must | `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` / `FAILED` / `CANCELLED`. |
| **NFR-AI-03** | AI | Hỗ trợ cơ chế Retry cho cả User Owner và Admin. | Must | API retry riêng biệt, bảo toàn tính toàn vẹn phiên cũ. |
| **NFR-AI-04** | AI | **AI Worker tách riêng khỏi Web Backend.** | Must | Server AI độc lập, giao tiếp qua Message Broker / Task Queue. |
| **NFR-VID-01** | Video | Hỗ trợ video định dạng container MP4 (H.264 / AAC). | Must | Định dạng chuẩn web streaming. |
| **NFR-VID-02** | Video | Hỗ trợ trận đấu đơn (Singles) với góc quay camera cố định từ sau sân. | Must | Phù hợp năng lực mô hình Computer Vision. |
| **NFR-VID-03** | Video | Giới hạn dung lượng video ($\le 500\text{MB}$) và thời lượng ($\le 60$ phút). | Must | Validate kích thước file và thời lượng. |
| **NFR-VID-04** | Video | **Xử lý upload file lớn bằng S3 Presigned URL.** | Must | Client upload trực tiếp lên MinIO, tránh quá tải RAM Web Server. |
| **NFR-STO-01** | Storage | Kết quả phân tích AI (`ai_events`, `rallies`, `statistics`) phải lưu trữ bền vững trong RDBMS. | Must | PostgreSQL 15+. |
| **NFR-STO-02** | Storage | Dữ liệu trận đấu sử dụng cơ chế Soft Delete. | Must | Sử dụng trường `deleted_at`. |
| **NFR-SEC-01** | Security | Mật khẩu người dùng bắt buộc được băm an toàn (BCrypt). | Must | Spring Security PasswordEncoder. |
| **NFR-SEC-02** | Security | Xác thực người dùng bằng JWT (Access Token 30p + Refresh Token 7 ngày). | Must | Bearer Token trong header HTTP. |
| **NFR-SEC-03** | Security | Phân quyền truy cập tài nguyên nghiêm ngặt (Authorization). | Must | Chỉ chủ sở hữu (Owner) hoặc Admin mới có quyền sửa/xóa match. |
| **NFR-SEC-04** | Security | Phân quyền theo vai trò (Role-based Access Control - RBAC). | Must | `ROLE_USER`, `ROLE_ADMIN`. |
| **NFR-PRI-01** | Privacy | Video riêng tư chỉ được truy cập bởi chủ sở hữu và Admin. Video public cho phép khách xem preview 5 phút. | Must | Kiểm tra quyền trước khi cấp stream URL / range chunk. |
| **NFR-ERR-01** | Error | Phân loại rõ mã lỗi: Upload, Validation, AI processing, System error. | Must | Chuẩn hóa Error Response DTO. |
| **NFR-LOG-01** | Logging | Ghi log các thao tác quan trọng (đăng nhập, publish, retry, soft delete). | Must | Logback / SLF4J structured logging. |
| **NFR-MNT-01** | Maintainability | Kiến trúc Web Backend phân lớp rõ ràng: **Controller - Service - Repository**. | Must | Spring Boot 3 Modular Monolith. |
| **NFR-SCA-01** | Scalability | Khả năng mở rộng server AI độc lập mà không ảnh hưởng Web Backend. | Should | Tách biệt hoàn toàn qua Message Broker. |
| **NFR-AVL-01** | Availability | Khởi động lại dịch vụ không làm mất dữ liệu đã lưu. | Must | Persistent storage MinIO volume và PostgreSQL volume. |
| **NFR-CON-01** | Consistency | Thống kê trận đấu phải phản ánh nhất quán với tập sự kiện `ai_events` và `rallies`. | Must | Tính toán trong cùng transaction / aggregate service. |
| **NFR-INT-01** | Integrity | Dữ liệu sự kiện cú đánh (`ai_events`) do AI sinh ra không được phép chỉnh sửa tùy tiện. | Must | Read-only sau khi hoàn tất phiên phân tích. |

---

# Final Permission Matrix

| Tài nguyên / Hành động | Khách vãng lai (Guest) | User thường (Viewer) | User chủ sở hữu (Owner) | Admin Quản trị |
| :--- | :---: | :---: | :---: | :---: |
| **Đăng ký, Đăng nhập, Quên MK** | Full | — | — | — |
| **Thông tin cá nhân (Profile)** | — | — | CRUD bản thân | Quản lý toàn bộ |
| **Match metadata (Private)** | — | — | CRUD bản thân | CRUD toàn bộ |
| **Match metadata (Public)** | R | R | CRUD bản thân | CRUD toàn bộ |
| **Video Stream (Private)** | — | — | Stream toàn bộ | Stream toàn bộ |
| **Video Stream (Public)** | Stream Preview $\le 5\text{ phút}$ | Stream toàn bộ | Stream toàn bộ | Stream toàn bộ |
| **Khởi tạo AI Analysis** | — | — | Khởi tạo trên match của mình | Khởi tạo trên mọi match |
| **Theo dõi trạng thái AI** | — | — | Xem trạng thái match của mình | Xem toàn bộ |
| **Retry AI Analysis** | — | — | **Retry match của mình** | **Retry mọi match** |
| **Hủy (Cancel) AI Analysis** | — | — | Hủy match của mình | Hủy mọi match |
| **AI Events & Rallies (Public)** | R | R | R | R |
| **Statistics (Public)** | R | R | R | R |
| **Publish / Unpublish Match** | — | — | — | Duyệt / Hủy duyệt |
| **Soft Delete / Restore Match** | — | — | Soft Delete match của mình | Soft Delete / Restore mọi match |
| **Khóa / Mở khóa tài khoản** | — | — | — | Manage |

---

# DB (Database Schema)

### Các Kiểu Dữ Liệu Liệt Kê (Enum Definitions)
* **`UserRole`**: `ROLE_USER`, `ROLE_ADMIN`
* **`UserStatus`**: `ACTIVE`, `LOCKED`, `UNVERIFIED`
* **`Gender`**: `MALE`, `FEMALE`, `OTHER`
* **`BadmintonLevel`**: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PRO`
* **`MatchStatus`**: 
  * `DRAFT`: Vừa tạo, chưa có video.
  * `READY`: Đã upload video, sẵn sàng phân tích.
  * `ANALYZING`: Đang trong tiến trình AI phân tích.
  * `ANALYZED`: Đã phân tích xong, ở chế độ riêng tư (Private).
  * `PUBLISHED`: Đã được Admin phê duyệt công khai vào thư viện Public Library.
* **`MatchSource`**: `USER_UPLOAD`, `ADMIN_CURATED`
* **`CourtPosition`**: `PLAYER_A`, `PLAYER_B` (chỉ định ai đứng nửa sân trên camera, ai đứng nửa sân dưới camera)
* **`VideoStatus`**: `UPLOADING` $\rightarrow$ `UPLOADED` $\rightarrow$ `READY` $\rightarrow$ `FAILED`
* **`AnalysisStatus`**: `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` $\rightarrow$ `FAILED` / `CANCELLED`
* **`PlayerSide`**: `UPPER` (nửa sân trên), `LOWER` (nửa sân dưới)
* **`StrokeType`**: `SERVE`, `SMASH`, `CLEAR`, `DROP`, `LIFT`, `DRIVE`, `NET_SHOT`, `PUSH`, `UNKNOWN`
* **`StrokeSide`**: `FOREHAND`, `BACKHAND`, `AROUNDHEAD`, `UNKNOWN`
* **`BoundaryType`**: `TIME_GAP`, `SHUTTLE_DEAD`, `SERVICE_DETECTED`

---

## 1. users

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính tự tăng hoặc UUID |
| `email` | VARCHAR(255) | NO | UNIQUE | User | Địa chỉ email đăng nhập |
| `password_hash` | VARCHAR(255) | NO | — | Hệ thống | Mật khẩu băm BCrypt |
| `role` | VARCHAR(20) | NO | — | Admin | `ROLE_USER`, `ROLE_ADMIN` |
| `avatar_url` | VARCHAR(500) | YES | — | User | Đường dẫn ảnh đại diện trên MinIO |
| `full_name` | VARCHAR(100) | YES | — | User | Họ và tên hiển thị |
| `age` | INT | YES | — | User | Tuổi |
| `gender` | VARCHAR(20) | YES | — | User | `MALE`, `FEMALE`, `OTHER` |
| `badminton_level` | VARCHAR(30) | YES | — | User | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PRO` |
| `status` | VARCHAR(20) | NO | — | Admin | `ACTIVE`, `LOCKED`, `UNVERIFIED` (Mặc định `ACTIVE`) |
| `created_at` | TIMESTAMP | NO | — | ❌ | Thời điểm tạo tài khoản |
| `updated_at` | TIMESTAMP | NO | — | Hệ thống | Thời điểm cập nhật gần nhất |

---

## 2. matches

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính |
| `owner_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `users.id` |
| `player_a_name` | VARCHAR(100) | NO | — | User/Admin | Tên người chơi A |
| `player_b_name` | VARCHAR(100) | NO | — | User/Admin | Tên người chơi B |
| `upper_player` | VARCHAR(20) | NO | — | User/Admin | Người chơi ở nửa sân trên: `PLAYER_A` hoặc `PLAYER_B` |
| `lower_player` | VARCHAR(20) | NO | — | User/Admin | Người chơi ở nửa sân dưới: `PLAYER_A` hoặc `PLAYER_B` |
| `match_date` | DATE | NO | — | User/Admin | Ngày diễn ra trận đấu (Mặc định `CURRENT_DATE`) |
| `title` | VARCHAR(200) | YES | — | User/Admin | Tiêu đề trận đấu |
| `description` | TEXT | YES | — | User/Admin | Ghi chú hoặc mô tả trận đấu |
| `source` | VARCHAR(20) | NO | — | Hệ thống | `USER_UPLOAD` hoặc `ADMIN_CURATED` |
| `status` | VARCHAR(20) | NO | — | Hệ thống | `DRAFT`, `READY`, `ANALYZING`, `ANALYZED`, `PUBLISHED` |
| `deleted_at` | TIMESTAMP | YES | — | Hệ thống | Thời điểm xóa mềm (nếu có) |
| `created_at` | TIMESTAMP | NO | — | ❌ | |
| `updated_at` | TIMESTAMP | NO | — | Hệ thống | |

---

## 3. videos (Quan hệ 1-1 với matches)

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính |
| `match_id` | BIGINT / UUID | NO | FK, UNIQUE | ❌ | Tham chiếu `matches.id` (1 Match chỉ có 1 Video) |
| `file_name` | VARCHAR(255) | NO | — | ❌ | Tên file gốc người dùng tải lên |
| `storage_path` | VARCHAR(1000) | NO | — | ❌ | Đường dẫn object trên MinIO bucket |
| `mime_type` | VARCHAR(100) | NO | — | ❌ | `video/mp4` |
| `file_size` | BIGINT | NO | — | ❌ | Dung lượng file (Bytes) |
| `duration_seconds` | DECIMAL(10,2) | YES | — | Hệ thống | Thời lượng video (giây) sau khi đọc metadata |
| `width` | INT | YES | — | Hệ thống | Chiều rộng khung hình (pixels) |
| `height` | INT | YES | — | Hệ thống | Chiều cao khung hình (pixels) |
| `fps` | DECIMAL(5,2) | YES | — | Hệ thống | Tốc độ khung hình (khung hình/giây) |
| `status` | VARCHAR(20) | NO | — | Hệ thống | `UPLOADING`, `UPLOADED`, `READY`, `FAILED` |
| `created_at` | TIMESTAMP | NO | — | ❌ | |

---

## 4. ai_analyses

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính phiên phân tích |
| `match_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `matches.id` |
| `video_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `videos.id` |
| `status` | VARCHAR(20) | NO | — | Hệ thống | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `model_name` | VARCHAR(100) | NO | — | Hệ thống | Tên model xử lý (ví dụ: `BadmintonVision-v1`) |
| `model_version` | VARCHAR(100) | YES | — | Hệ thống | Phiên bản model |
| `started_at` | TIMESTAMP | YES | — | Hệ thống | Thời điểm bắt đầu chạy xử lý |
| `completed_at` | TIMESTAMP | YES | — | Hệ thống | Thời điểm kết thúc xử lý |
| `error_code` | VARCHAR(100) | YES | — | Hệ thống | Mã lỗi nếu phân tích thất bại |
| `error_message` | TEXT | YES | — | Hệ thống | Chi tiết thông điệp lỗi |
| `court_corners` | JSONB / TEXT | YES | — | Hệ thống | Tọa độ 4 góc sân phát hiện bởi AI: `[{x, y}, ...]` |
| `is_current` | BOOLEAN | NO | — | Hệ thống | `true` nếu là kết quả phân tích có hiệu lực hiện tại |
| `created_at` | TIMESTAMP | NO | — | ❌ | |

---

## 5. ai_events

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính sự kiện |
| `analysis_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `ai_analyses.id` |
| `event_order` | INT | NO | — | ❌ | Thứ tự sự kiện trong toàn bộ video |
| `start_frame` | INT | NO | — | ❌ | Frame bắt đầu chuẩn bị vung vợt |
| `hit_frame` | INT | NO | — | ❌ | Frame tiếp xúc quả cầu |
| `end_frame` | INT | NO | — | ❌ | Frame kết thúc cú đánh |
| `time_seconds` | DECIMAL(10,3) | NO | — | ❌ | Thời điểm tiếp xúc cầu tính theo giây |
| `player_side` | VARCHAR(20) | NO | — | ❌ | Nửa sân thực hiện cú đánh: `UPPER` hoặc `LOWER` |
| `stroke` | VARCHAR(50) | NO | — | ❌ | Loại cú đánh: `SMASH`, `CLEAR`, `DROP`, `NET_SHOT`... |
| `stroke_side` | VARCHAR(30) | NO | — | ❌ | `FOREHAND`, `BACKHAND`, `AROUNDHEAD`, `UNKNOWN` |
| `confidence` | DECIMAL(4,3) | NO | — | ❌ | Độ tự tin của mô hình ($0.000 - 1.000$) |
| `created_at` | TIMESTAMP | NO | — | ❌ | |

---

## 6. rallies

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính pha cầu |
| `match_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `matches.id` |
| `analysis_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `ai_analyses.id` |
| `rally_number` | INT | NO | — | ❌ | Số thứ tự của pha cầu trong trận đấu (Rally 1, 2, 3...) |
| `start_event_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `ai_events.id` (cú đánh đầu tiên của pha cầu) |
| `end_event_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `ai_events.id` (cú đánh cuối cùng của pha cầu) |
| `start_time` | DECIMAL(10,3) | NO | — | ❌ | Thời điểm bắt đầu pha cầu (giây) |
| `end_time` | DECIMAL(10,3) | NO | — | ❌ | Thời điểm kết thúc pha cầu (giây) |
| `duration` | DECIMAL(10,3) | NO | — | ❌ | Thời lượng pha cầu: `end_time - start_time` (giây) |
| `total_strokes` | INT | NO | — | ❌ | Tổng số cú đánh trong pha cầu |
| `boundary_type` | VARCHAR(30) | NO | — | ❌ | Phương pháp ngắt pha: `TIME_GAP`, `SHUTTLE_DEAD`, `SERVICE_DETECTED` |
| `created_at` | TIMESTAMP | NO | — | ❌ | |

---

## 7. match_statistics

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính thống kê |
| `match_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `matches.id` |
| `analysis_id` | BIGINT / UUID | NO | FK, UNIQUE | ❌ | Tham chiếu phiên phân tích `ai_analyses.id` |
| `total_strokes` | INT | NO | — | ❌ | Tổng số cú đánh trong trận |
| `total_rallies` | INT | NO | — | ❌ | Tổng số pha cầu trong trận |
| `avg_strokes_per_rally` | DECIMAL(6,2) | NO | — | ❌ | Số cú đánh trung bình mỗi pha cầu |
| `avg_rally_duration` | DECIMAL(6,2) | NO | — | ❌ | Thời lượng trung bình mỗi pha cầu (giây) |
| `player_a_strokes` | INT | NO | — | ❌ | Số cú đánh do Player A thực hiện |
| `player_b_strokes` | INT | NO | — | ❌ | Số cú đánh do Player B thực hiện |
| `forehand_count` | INT | NO | — | ❌ | Tổng số cú đánh thuận tay |
| `backhand_count` | INT | NO | — | ❌ | Tổng số cú đánh trái tay |
| `aroundhead_count` | INT | NO | — | ❌ | Tổng số cú đánh vòng qua đầu |
| `unknown_side_count` | INT | NO | — | ❌ | Số cú đánh chưa nhận diện được góc tay |
| `avg_confidence` | DECIMAL(4,3) | NO | — | ❌ | Độ tin cậy trung bình của phiên phân tích |
| `created_at` | TIMESTAMP | NO | — | ❌ | |

---

## 8. password_resets (Bổ sung cho Magic Reset Link Flow)

| Cột | Kiểu dữ liệu | Null | Khóa | Sửa bởi | Mô tả |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | BIGINT / UUID | NO | PK | ❌ | Khóa chính |
| `user_id` | BIGINT / UUID | NO | FK | ❌ | Tham chiếu `users.id` |
| `token_hash` | VARCHAR(255) | NO | UNIQUE | Hệ thống | Token ngẫu nhiên đã băm bảo mật |
| `expires_at` | TIMESTAMP | NO | — | Hệ thống | Thời điểm hết hạn (thời lượng 15 phút) |
| `is_used` | BOOLEAN | NO | — | Hệ thống | Mặc định `false`, chuyển `true` sau khi đổi pass thành công |
| `created_at` | TIMESTAMP | NO | — | ❌ | |

---

# API Specification

> **Quy chuẩn Response chung:**
> * API danh sách đều hỗ trợ query parameters phân trang: `?page=0&size=10&sort=createdAt,desc`.
> * Response danh sách chuẩn: `{ "data": [...], "pagination": { "page": 0, "size": 10, "totalElements": 100, "totalPages": 10 } }`.

| # | Method | Endpoint | Actor | Mục đích | Payload / Params chính | Response chính |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | POST | `/api/auth/register` | Guest | Đăng ký tài khoản | `{email, password, fullName}` | User DTO |
| **2** | POST | `/api/auth/login` | Guest | Đăng nhập hệ thống | `{email, password}` | `{accessToken, refreshToken, user}` |
| **3** | POST | `/api/auth/refresh-token` | Guest/User | Cấp lại access token | `{refreshToken}` | `{accessToken, refreshToken}` |
| **4** | POST | `/api/auth/logout` | User/Admin | Đăng xuất | `{refreshToken}` | `{success: true}` |
| **5** | POST | `/api/auth/forgot-password` | Guest | Yêu cầu gửi Magic Reset Link | `{email}` | `{message: "Reset link sent"}` |
| **6** | POST | `/api/auth/reset-password` | Guest | Đặt mật khẩu mới bằng Token | `{token, newPassword}` | `{success: true}` |
| **7** | GET | `/api/users/me` | User/Admin | Xem thông tin profile cá nhân | Header Bearer Token | User DTO |
| **8** | PUT | `/api/users/me` | User/Admin | Cập nhật thông tin profile | `{fullName, age, gender, badmintonLevel}` | User DTO |
| **9** | POST | `/api/users/me/avatar` | User/Admin | Upload ảnh đại diện lên MinIO | Multipart Form File (`avatar`) | `{avatarUrl: "..."}` |
| **10** | POST | `/api/matches` | User/Admin | Tạo mới trận đấu | `{playerAName, playerBName, upperPlayer, lowerPlayer, matchDate, title, description}` | Match DTO (`status: DRAFT`) |
| **11** | GET | `/api/matches` | User/Admin | Danh sách trận đấu của mình | `?page=0&size=10&status={status}` | `Page<MatchDTO>` |
| **12** | GET | `/api/matches/{id}` | User/Admin | Xem chi tiết trận đấu của mình | Path `{id}` | Match Detail DTO |
| **13** | PUT | `/api/matches/{id}` | Owner/Admin | Sửa thông tin metadata match | `{playerAName, playerBName, upperPlayer, lowerPlayer, title, description}` | Match DTO |
| **14** | DELETE | `/api/matches/{id}` | Owner/Admin | Xóa mềm trận đấu | Path `{id}` | `{success: true}` |
| **15** | POST | `/api/matches/{id}/videos/upload-url` | Owner/Admin | Xin S3 Presigned URL để upload video | `{fileName, fileSize, mimeType}` | `{uploadUrl: "...", storagePath: "..."}` |
| **16** | POST | `/api/matches/{id}/videos/complete` | Owner/Admin | Xác nhận video đã tải lên MinIO thành công | `{storagePath, fileName, fileSize}` | Video DTO (`status: READY`) |
| **17** | GET | `/api/matches/{id}/video` | Authorized/Public | Xem thông tin video metadata của trận đấu | Path `{id}` | Video DTO |
| **18** | GET | `/api/videos/{id}/stream` | **Guest / User / Admin** | Phát / Stream video (HTTP Range Request) | Path `{id}` | Video byte stream (Guest preview $\le 5\text{p}$) |
| **19** | POST | `/api/matches/{id}/ai-analyses` | Owner/Admin | Bắt đầu phân tích AI | Path `{id}` | `202 Accepted` `{analysisId, status: QUEUED}` |
| **20** | GET | `/api/ai-analyses/{id}` | Authorized | Theo dõi trạng thái phiên phân tích | Path `{id}` | Analysis DTO (`QUEUED`, `PROCESSING`, ...) |
| **21** | GET | `/api/matches/{id}/ai-analyses` | Owner/Admin | Xem lịch sử các lần phân tích của match | Path `{id}` | `AnalysisDTO[]` |
| **22** | POST | `/api/matches/{id}/ai-analyses/{analysisId}/retry` | **Owner / Admin** | Thử lại phân tích AI khi bị FAILED | Path `{id}`, `{analysisId}` | `202 Accepted` `{analysisId, status: QUEUED}` |
| **23** | POST | `/api/matches/{id}/ai-analyses/{analysisId}/cancel` | Owner/Admin | Hủy phiên phân tích đang chạy dở | Path `{id}`, `{analysisId}` | `{status: CANCELLED}` |
| **24** | GET | `/api/ai-analyses/{id}/events` | Authorized/Public | Danh sách stroke events cho replay timeline | Path `{id}` | `EventDTO[]` |
| **25** | GET | `/api/ai-analyses/{id}/rallies` | Authorized/Public | Danh sách các pha cầu của trận đấu | Path `{id}` | `RallyDTO[]` |
| **26** | GET | `/api/rallies/{id}` | Authorized/Public | Xem chi tiết 1 pha cầu và sequence cú đánh | Path `{id}` | Rally Detail DTO |
| **27** | GET | `/api/ai-analyses/{id}/statistics` | Authorized/Public | Xem dữ liệu thống kê chuyên sâu của trận đấu | Path `{id}` | Match Statistics DTO |
| **28** | GET | `/api/public-matches` | **Guest / User / Admin** | Tra cứu thư viện trận đấu công khai | `?page=0&size=10&search={text}&level={level}&sort={field}` | `Page<PublicMatchDTO>` |
| **29** | GET | `/api/public-matches/{id}` | **Guest / User / Admin** | Xem chi tiết trận đấu công khai | Path `{id}` | Public Match Detail DTO |
| **30** | GET | `/api/admin/users` | Admin | Quản lý danh sách người dùng | `?page=0&size=10&search={email}` | `Page<UserDTO>` |
| **31** | GET | `/api/admin/users/{id}` | Admin | Xem chi tiết người dùng | Path `{id}` | User Detail DTO |
| **32** | PUT | `/api/admin/users/{id}/status` | Admin | Khóa / Mở khóa tài khoản | `{status: "LOCKED" / "ACTIVE"}` | User DTO |
| **33** | GET | `/api/admin/matches` | Admin | Quản lý toàn bộ trận đấu trong hệ thống | `?page=0&size=10&status={status}` | `Page<MatchDTO>` |
| **34** | GET | `/api/admin/matches/{id}` | Admin | Xem chi tiết trận đấu bất kỳ | Path `{id}` | Match Detail DTO |
| **35** | DELETE | `/api/admin/matches/{id}` | Admin | Xóa mềm trận đấu vi phạm | Path `{id}` | `{success: true}` |
| **36** | POST | `/api/admin/matches/{id}/restore` | Admin | Khôi phục trận đấu đã xóa mềm | Path `{id}` | Match DTO |
| **37** | POST | `/api/admin/matches/{id}/publish` | Admin | Duyệt xuất bản trận đấu lên Public Library | Path `{id}` | Match DTO (`status: PUBLISHED`) |
| **38** | POST | `/api/admin/matches/{id}/unpublish` | Admin | Hủy xuất bản trận đấu về chế độ riêng tư | Path `{id}` | Match DTO (`status: ANALYZED`) |
| **39** | GET | `/api/admin/ai-analyses` | Admin | Giám sát toàn bộ phiên phân tích AI | `?page=0&size=10&status={status}` | `Page<AnalysisDTO>` |
| **40** | POST | `/api/admin/ai-analyses/{id}/retry` | Admin | Kích hoạt retry phiên AI bất kỳ từ admin | Path `{id}` | `202 Accepted` `{analysisId, status: QUEUED}` |
