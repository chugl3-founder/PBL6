# Ma trận Truy vết Yêu cầu (Requirements Traceability Matrix - RTM)

* **Dự án:** PBL6 Badminton - Match Analysis & Replay Platform
* **Tài liệu nguồn:** `docs/00-requirements/PBL6-Badminton_requirements.md` & `docs/01-analysis/gaps-and-questions.md`
* **Mục tiêu:** Ánh xạ từ Yêu cầu Chức năng (FR) $\rightarrow$ API Endpoint $\rightarrow$ Bảng CSDL $\rightarrow$ Màn hình/Component Frontend $\rightarrow$ Test Case.
* **Ghi chú cột Test Case:** Cột Test Case ghi nhận mã định danh chuẩn `TC-xxx` (kèm trạng thái thực hiện: `Pending` nếu chưa viết/chưa chạy test).

---

## 1. M01 — Quản lý Tài khoản (Account Management)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M01-01** | Đăng ký tài khoản bằng email & password | `POST /api/auth/register` | `users` | Màn hình Đăng ký (`/register`) | `TC-M01-01` (Pending) |
| **FR-M01-02** | Xác thực đăng nhập (Access + Refresh Token) | `POST /api/auth/login` | `users` | Màn hình Đăng nhập (`/login`) | `TC-M01-02` (Pending) |
| **FR-M01-03** | Đăng xuất khỏi hệ thống | `POST /api/auth/logout` | `users` | User Menu Dropdown (Header) | `TC-M01-03` (Pending) |
| **FR-M01-04** | Xem và cập nhật thông tin cá nhân | `GET /api/users/me`<br>`PUT /api/users/me` | `users` | Màn hình Profile (`/profile`) | `TC-M01-04` (Pending) |
| **FR-M01-05** | Cập nhật avatar qua MinIO & thông tin cầu lông | `POST /api/users/me/avatar`<br>`PUT /api/users/me` | `users` | Component `AvatarUploader` (`/profile`) | `TC-M01-05` (Pending) |
| **FR-M01-06** | Yêu cầu gửi Magic Reset Link qua email | `POST /api/auth/forgot-password` | `users`, `password_resets` | Màn hình Quên mật khẩu (`/forgot-password`) | `TC-M01-06` (Pending) |
| **FR-M01-07** | Đặt lại mật khẩu mới bằng token | `POST /api/auth/reset-password` | `users`, `password_resets` | Màn hình Reset Password (`/reset-password`) | `TC-M01-07` (Pending) |
| **FR-M01-08** | Đăng nhập bằng Google (OAuth2) | `GET /api/auth/oauth2/google` (Could) | `users` | Nút "Login with Google" (`/login`) | *(Post-MVP)* |

---

## 2. M02 — Quản lý Trận đấu (Match Management)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M02-01** | User tạo trận đấu mới (chế độ DRAFT) | `POST /api/matches` | `matches` | Màn hình Tạo trận đấu (`/matches/create`) | `TC-M02-01` (Pending) |
| **FR-M02-02** | Admin tạo trận đấu mẫu cho thư viện public | `POST /api/matches` | `matches` | Màn hình Admin New Match (`/admin/matches/new`) | `TC-M02-02` (Pending) |
| **FR-M02-03** | Nhập metadata trận đấu (Player A/B, vị trí sân) | `POST /api/matches` | `matches` | Form `MatchInfoForm` | `TC-M02-03` (Pending) |
| **FR-M02-04** | Cập nhật metadata trận đấu | `PUT /api/matches/{id}` | `matches` | Màn hình Sửa trận đấu (`/matches/{id}/edit`) | `TC-M02-04` (Pending) |
| **FR-M02-05** | Upload video trận đấu bằng S3 Presigned URL | `POST /api/matches/{id}/videos/upload-url` | `videos`, `matches` | Component `VideoDropzoneUploader` | `TC-M02-05` (Pending) |
| **FR-M02-06** | Xác nhận hoàn tất upload & lưu metadata video | `POST /api/matches/{id}/videos/complete` | `videos`, `matches` | Component `VideoUploadProgress` | `TC-M02-06` (Pending) |
| **FR-M02-07** | Xem danh sách trận đấu do mình tạo (phân trang) | `GET /api/matches` | `matches` | Màn hình Trận đấu của tôi (`/my-matches`) | `TC-M02-07` (Pending) |
| **FR-M02-08** | Xem chi tiết thông tin trận đấu của mình | `GET /api/matches/{id}`<br>`GET /api/matches/{id}/video` | `matches`, `videos` | Màn hình Chi tiết trận đấu (`/matches/{id}`) | `TC-M02-08` (Pending) |
| **FR-M02-09** | Xóa mềm (Soft delete) trận đấu | `DELETE /api/matches/{id}` | `matches` | Nút Xóa / Modal Xác nhận Xóa | `TC-M02-09` (Pending) |
| **FR-M02-10** | Admin quản lý toàn bộ trận đấu hệ thống | `GET /api/admin/matches` | `matches`, `users` | Màn hình Quản lý Trận đấu (`/admin/matches`) | `TC-M02-10` (Pending) |
| **FR-M02-11** | Admin phê duyệt xuất bản match (Publish) | `POST /api/admin/matches/{id}/publish` | `matches` | Nút Publish trong Admin Match Detail | `TC-M02-11` (Pending) |
| **FR-M02-12** | Admin hủy xuất bản match (Unpublish) | `POST /api/admin/matches/{id}/unpublish` | `matches` | Nút Unpublish trong Admin Match Detail | `TC-M02-12` (Pending) |
| **FR-M02-13** | Admin khôi phục trận đấu đã xóa mềm | `POST /api/admin/matches/{id}/restore` | `matches` | Nút Restore trong Thùng rác Admin | `TC-M02-13` (Pending) |

---

## 3. M03 — Phân tích Video AI (AI Analysis)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M03-01** | Kiểm tra tính hợp lệ của video trước phân tích | Internal Service Validation | `videos` | Alert thông báo trạng thái video | `TC-M03-01` (Pending) |
| **FR-M03-02** | Khởi tạo phiên phân tích với trạng thái `QUEUED` | `POST /api/matches/{id}/ai-analyses` | `ai_analyses` | Nút "Bắt đầu phân tích AI" | `TC-M03-02` (Pending) |
| **FR-M03-03** | Gửi yêu cầu bắt đầu phân tích (HTTP 202) | `POST /api/matches/{id}/ai-analyses` | `ai_analyses` | Modal xác nhận khởi chạy AI | `TC-M03-03` (Pending) |
| **FR-M03-04** | Đưa phiên phân tích vào trạng thái `PROCESSING` | Async Job Execution (Mock/Worker) | `ai_analyses` | Badge trạng thái `PROCESSING` | `TC-M03-04` (Pending) |
| **FR-M03-05** | Hiển thị tiến trình & trạng thái AI thời gian thực | `GET /api/ai-analyses/{id}` | `ai_analyses` | Component `AIAnalysisStatusBar` (Polling) | `TC-M03-05` (Pending) |
| **FR-M03-06** | Tiếp nhận kết quả sau khi xử lý xong | Async Completion Handler | `ai_analyses`, `ai_events`, `rallies`, `match_statistics` | Auto-refresh sang màn hình kết quả | `TC-M03-06` (Pending) |
| **FR-M03-07** | Lưu kết quả AI và đánh dấu `is_current = true` | Database Transaction | `ai_analyses` | Tab Kết quả phân tích hiện tại | `TC-M03-07` (Pending) |
| **FR-M03-08** | Lưu danh sách các sự kiện cú đánh (strokes) | Bulk Insert | `ai_events` | Bảng danh sách cú đánh | `TC-M03-08` (Pending) |
| **FR-M03-09** | Xử lý và ghi nhận trường hợp AI thất bại | Error Handler | `ai_analyses` | Banner cảnh báo lỗi phân tích | `TC-M03-09` (Pending) |
| **FR-M03-10** | Xử lý video ngoài phạm vi hỗ trợ (góc quay lỗi) | Error Handler (`UNSUPPORTED_VIDEO`) | `ai_analyses` | Thông báo lỗi không đúng chuẩn góc máy | `TC-M03-10` (Pending) |
| **FR-M03-11** | Cảnh báo đối với các cú đánh có confidence thấp | `GET /api/ai-analyses/{id}/events` | `ai_events` | Icon cảnh báo màu vàng tại event list | `TC-M03-11` (Pending) |
| **FR-M03-12** | **User Owner & Admin retry AI khi thất bại** | `POST /api/matches/{id}/ai-analyses/{analysisId}/retry`<br>`POST /api/admin/ai-analyses/{id}/retry` | `ai_analyses` | Nút "Thử lại phân tích (Retry)" | `TC-M03-12` (Pending) |
| **FR-M03-13** | Hủy phiên phân tích AI đang chạy dở | `POST /api/matches/{id}/ai-analyses/{analysisId}/cancel` | `ai_analyses` | Nút "Hủy phân tích" | `TC-M03-13` (Pending) |

---

## 4. M04 — Phát lại Trận đấu (Match Replay)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M04-01** | Phát video (Guest preview 5p, User xem toàn bộ) | `GET /api/videos/{id}/stream` | `videos`, `matches` | Trình phát video Video.js (`/matches/{id}/replay`) | `TC-M04-01` (Pending) |
| **FR-M04-02** | Điều khiển phát video (play, pause, seek, speed) | Frontend Video Player Controller | — | Video Controls Bar | `TC-M04-02` (Pending) |
| **FR-M04-03** | Hiển thị dòng thời gian timeline các sự kiện AI | `GET /api/ai-analyses/{id}/events` | `ai_events` | Component `ReplayTimeline` | `TC-M04-03` (Pending) |
| **FR-M04-04** | Hiển thị stroke markers màu sắc tương ứng cú đánh | `GET /api/ai-analyses/{id}/events` | `ai_events` | Component `StrokeMarkerPin` (Smash, Drop...) | `TC-M04-04` (Pending) |
| **FR-M04-05** | Người dùng click chọn một stroke event | Frontend Event Interaction | `ai_events` | Bảng sự kiện cú đánh / Marker click | `TC-M04-05` (Pending) |
| **FR-M04-06** | Nhảy video (seek) tức thì đến thời điểm cú đánh | Video Player `currentTime = time_seconds` | — | Player Seek Engine | `TC-M04-06` (Pending) |
| **FR-M04-07** | Hiển thị thẻ thông tin cú đánh đang chọn | Frontend State Selection | `ai_events` | Component `StrokeDetailCard` | `TC-M04-07` (Pending) |
| **FR-M04-08** | Replay vị trí player trên sơ đồ sân 2D | (Could - Tạm hoãn sau MVP) | `ai_analyses` | Component `Court2DViewer` | *(Post-MVP)* |

---

## 5. M05 — Phân tích Pha cầu (Rally & Timeline Analysis)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M05-01** | Nhóm các cú đánh liên tiếp thành từng pha cầu | Service Aggregator | `rallies`, `ai_events` | Tab Phân tích Pha cầu (`Rallies Tab`) | `TC-M05-01` (Pending) |
| **FR-M05-02** | Xác định ranh giới bắt đầu/kết thúc mỗi pha cầu | Boundary Detection Algorithm | `rallies` | Danh sách Rally Cards | `TC-M05-02` (Pending) |
| **FR-M05-03** | Ghi nhận phương pháp ngắt pha (`boundary_type`) | Service Logic | `rallies` | Badge loại ngắt pha (`TIME_GAP`...) | `TC-M05-03` (Pending) |
| **FR-M05-04** | Tạo tóm tắt pha cầu (thời lượng, số cú đánh) | Service Summary Builder | `rallies` | Card `RallySummaryCard` | `TC-M05-04` (Pending) |
| **FR-M05-05** | Người dùng xem danh sách các rallies trong trận | `GET /api/ai-analyses/{id}/rallies` | `rallies` | Component `RallyListView` | `TC-M05-05` (Pending) |
| **FR-M05-06** | Xem chi tiết thông tin một rally | `GET /api/rallies/{id}` | `rallies`, `ai_events` | Component `RallyDetailModal` | `TC-M05-06` (Pending) |
| **FR-M05-07** | Hiển thị chuỗi (sequence) các cú đánh trong rally | `GET /api/rallies/{id}` | `ai_events` | Component `RallyStrokeSequence` | `TC-M05-07` (Pending) |
| **FR-M05-08** | Click chuyển video nhảy tới thời điểm bắt đầu rally | Player Seek to `rally.start_time` | — | Nút "Play Rally" trên từng card | `TC-M05-08` (Pending) |
| **FR-M05-09** | Tự động highlight rally tương ứng khi video đang chạy | Listener `timeupdate` | — | Active Rally Auto-scroller | `TC-M05-09` (Pending) |

---

## 6. M06 — Thống kê Trận đấu (Match Statistics)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M06-01** | Tổng số cú đánh trong toàn trận đấu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Widget `TotalStrokesCounter` | `TC-M06-01` (Pending) |
| **FR-M06-02** | Tổng số pha cầu (rallies) trong trận đấu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Widget `TotalRalliesCounter` | `TC-M06-02` (Pending) |
| **FR-M06-03** | Thống kê phân bổ theo loại cú đánh (Smash, Clear...) | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Biểu đồ tròn `StrokeDistributionPieChart` | `TC-M06-03` (Pending) |
| **FR-M06-04** | Thống kê số lượng cú đánh theo từng người chơi | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Card so sánh `PlayerComparisonCard` | `TC-M06-04` (Pending) |
| **FR-M06-05** | Thống kê tay thuận / nghịch / vòng qua đầu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Biểu đồ cột `StrokeSideBarChart` | `TC-M06-05` (Pending) |
| **FR-M06-06** | Thống kê độ tự tin trung bình của phân tích | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Badge `AvgConfidenceBadge` | `TC-M06-06` (Pending) |
| **FR-M06-07** | Tính số cú đánh trung bình trên mỗi pha cầu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Chỉ số `AvgStrokesPerRally` | `TC-M06-07` (Pending) |
| **FR-M06-08** | Tính thời lượng trung bình của một pha cầu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Chỉ số `AvgRallyDuration` | `TC-M06-08` (Pending) |
| **FR-M06-09** | Màn hình Dashboard tổng quan thống kê trận đấu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Màn hình Thống kê (`/matches/{id}/stats`) | `TC-M06-09` (Pending) |
| **FR-M06-10** | Hiển thị biểu đồ phân bố cú đánh | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Component `StrokeTypeChart` | `TC-M06-10` (Pending) |
| **FR-M06-11** | Hiển thị biểu đồ so sánh chi tiết Player A vs B | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Component `HeadToHeadStatsView` | `TC-M06-11` (Pending) |
| **FR-M06-12** | Hiển thị thống kê chi tiết các pha cầu | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Component `RallyStatsOverview` | `TC-M06-12` (Pending) |
| **FR-M06-13** | Bộ lọc thống kê nâng cao theo hiệp đấu / thời gian | Query Filter Params (Should) | `match_statistics` | Filter Dropdown Bar | `TC-M06-13` (Pending) |

---

## 7. M07 — Thư viện Trận đấu Công khai (Public Match Library)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M07-01** | Duyệt danh sách public match (Guest & User) | `GET /api/public-matches` | `matches`, `videos` | Màn hình Thư viện (`/public-matches`) | `TC-M07-01` (Pending) |
| **FR-M07-02** | Tìm kiếm trận đấu công khai theo từ khóa | `GET /api/public-matches?search={q}` | `matches` | Thanh Search Input | `TC-M07-02` (Pending) |
| **FR-M07-03** | Lọc trận đấu công khai theo trình độ, ngày | `GET /api/public-matches?level={lvl}` | `matches` | Dropdown Filter Group | `TC-M07-03` (Pending) |
| **FR-M07-04** | Sắp xếp trận đấu công khai (mới nhất...) | `GET /api/public-matches?sort={s}` | `matches` | Dropdown Sort By | `TC-M07-04` (Pending) |
| **FR-M07-05** | Xem preview thẻ trận đấu và thumbnail | `GET /api/public-matches` | `matches`, `videos` | Card `PublicMatchCard` | `TC-M07-05` (Pending) |
| **FR-M07-06** | Xem chi tiết trận đấu công khai | `GET /api/public-matches/{id}` | `matches`, `videos` | Màn hình Chi tiết (`/public-matches/{id}`) | `TC-M07-06` (Pending) |
| **FR-M07-07** | Mở Replay (Guest preview 5p, User xem full) | `GET /api/videos/{id}/stream` | `videos` | Màn hình Replay (`/public-matches/{id}/replay`) | `TC-M07-07` (Pending) |
| **FR-M07-08** | Xem bảng thống kê trận đấu công khai | `GET /api/ai-analyses/{id}/statistics` | `match_statistics` | Tab Thống kê trên trang Public Match | `TC-M07-08` (Pending) |
| **FR-M07-09** | Xem danh sách rallies của trận đấu công khai | `GET /api/ai-analyses/{id}/rallies` | `rallies` | Tab Rally trên trang Public Match | `TC-M07-09` (Pending) |

---

## 8. M08 — Quản trị Hệ thống (Admin Management)

| FR ID | Mô tả Yêu cầu | API Endpoint (Method & URI) | Bảng DB liên quan | Màn hình / Component Frontend | Test Case ID & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-M08-01** | Xem Dashboard quản trị tổng quan hệ thống | `GET /api/admin/dashboard` | `users`, `matches`, `ai_analyses` | Màn hình Admin Dashboard (`/admin`) | `TC-M08-01` (Pending) |
| **FR-M08-02** | Xem danh sách người dùng (kèm phân trang) | `GET /api/admin/users` | `users` | Màn hình Quản lý User (`/admin/users`) | `TC-M08-02` (Pending) |
| **FR-M08-03** | Xem chi tiết thông tin và hoạt động của người dùng | `GET /api/admin/users/{id}` | `users`, `matches` | Màn hình Admin User Detail (`/admin/users/{id}`) | `TC-M08-03` (Pending) |
| **FR-M08-04** | Khóa (Lock) hoặc mở khóa (Unlock) tài khoản user | `PUT /api/admin/users/{id}/status` | `users` | Nút Khóa / Mở khóa tài khoản | `TC-M08-04` (Pending) |
| **FR-M08-05** | Quản lý toàn bộ trận đấu trong hệ thống | `GET /api/admin/matches` | `matches` | Màn hình Quản lý Trận đấu (`/admin/matches`) | `TC-M08-05` (Pending) |
| **FR-M08-06** | Giám sát toàn bộ phiên phân tích AI theo trạng thái | `GET /api/admin/ai-analyses` | `ai_analyses` | Màn hình Giám sát AI (`/admin/ai-monitor`) | `TC-M08-06` (Pending) |
| **FR-M08-07** | Xem danh sách các phiên AI thất bại & mã lỗi | `GET /api/admin/ai-analyses?status=FAILED` | `ai_analyses` | Tab "Phân tích Thất bại" (`/admin/ai-monitor`) | `TC-M08-07` (Pending) |
| **FR-M08-08** | Duyệt xuất bản (Publish) hoặc hủy duyệt (Unpublish) | `POST /api/admin/matches/{id}/publish`<br>`POST /api/admin/matches/{id}/unpublish` | `matches` | Nút Duyệt / Hủy duyệt xuất bản | `TC-M08-08` (Pending) |
| **FR-M08-09** | Xóa mềm trận đấu vi phạm quy định | `DELETE /api/admin/matches/{id}` | `matches` | Nút Xóa vi phạm | `TC-M08-09` (Pending) |
| **FR-M08-10** | Khôi phục trận đấu đã xóa mềm | `POST /api/admin/matches/{id}/restore` | `matches` | Nút Khôi phục trận đấu trong Admin Trash | `TC-M08-10` (Pending) |
| **FR-M08-11** | Kích hoạt chạy lại (Retry) phiên phân tích AI lỗi | `POST /api/admin/ai-analyses/{id}/retry` | `ai_analyses` | Nút Retry trên bảng AI Monitor | `TC-M08-11` (Pending) |

