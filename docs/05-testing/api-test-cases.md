# TÀI LIỆU KỊCH BẢN KIỂM THỬ API (API TEST CASES SPECIFICATION)
**Dự án:** PBL6 Badminton - Match Analysis & Replay Platform  
**Phiên bản:** 1.0  
**Tài liệu tham chiếu:** [openapi.yaml](../02-design/openapi.yaml), [traceability.md](../01-analysis/traceability.md), [backlog.md](../04-tasks/backlog.md)

---

## MỤC LỤC
1. [Module 1: Xác thực & Người dùng (Authentication & User Management)](#1-module-xác-thực--người-dùng)
2. [Module 2: Quản lý Trận đấu & Video (Matches & Videos)](#2-module-trận-đấu--video)
3. [Module 3: Phân tích AI & Replay (AI Analyses & Replay)](#3-module-phân-tích-ai--replay)

---

## 1. MODULE XÁC THỰC & NGƯỜI DÙNG

### 1.1. API: Đăng Ký Tài Khoản (`POST /api/auth/register`)
- **Vertical Slice:** `VS-01`
- **FR Traceability:** `FR-M01-01`
- **Mô tả:** Cho phép người dùng đăng ký tài khoản mới với vai trò mặc định `ROLE_USER`. Mật khẩu được mã hóa an toàn bằng BCrypt.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-REG-01** | Đăng ký tài khoản thành công với thông tin hợp lệ | ```json { "email": "athlete_new@badminton.vn", "password": "Password@123", "fullName": "Nguyễn Văn A", "badmintonLevel": "INTERMEDIATE", "gender": "MALE", "age": 22 } ``` | **201 Created** | Trả về thông tin User mới được tạo. Mật khẩu không bị lộ. Trường `role` là `ROLE_USER`, `status` là `ACTIVE`. | ✅ **PASS** |
| **TC-AUTH-REG-02** | Bắt lỗi trùng email đã tồn tại trong hệ thống | ```json { "email": "athlete_new@badminton.vn", "password": "Password@123", "fullName": "Nguyễn Văn B" } ``` | **409 Conflict** | Trả về lỗi dạng `{ errorType: "VALIDATION", code: "AUTH_EMAIL_ALREADY_EXISTS", message: "Email này đã được sử dụng..." }`. | ✅ **PASS** |
| **TC-AUTH-REG-03** | Bắt lỗi định dạng email không hợp lệ | ```json { "email": "invalid-email-format", "password": "Password@123", "fullName": "Nguyễn Văn C" } ``` | **400 Bad Request** | Bắt lỗi trường `email`: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "email", issue: "Định dạng email không hợp lệ" }] }`. | ✅ **PASS** |
| **TC-AUTH-REG-04** | Bắt lỗi mật khẩu quá ngắn (< 6 ký tự) | ```json { "email": "athlete_shortpass@badminton.vn", "password": "123", "fullName": "Nguyễn Văn D" } ``` | **400 Bad Request** | Bắt lỗi trường `password`: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "password", issue: "Mật khẩu phải từ 6 đến 50 ký tự" }] }`. | ✅ **PASS** |
| **TC-AUTH-REG-05** | Bắt lỗi để trống họ và tên | ```json { "email": "athlete_noname@badminton.vn", "password": "Password@123", "fullName": "" } ``` | **400 Bad Request** | Bắt lỗi trường `fullName`: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "fullName", issue: "Họ và tên không được để trống" }] }`. | ✅ **PASS** |

### 1.2. API: Đăng Nhập & Cấp JWT (`POST /api/auth/login`)
- **Vertical Slice:** `VS-02`
- **FR Traceability:** `FR-M01-02`
- **Mô tả:** Xác thực người dùng bằng Email và Mật khẩu. Khi thành công, cấp Access Token (15 phút) và Refresh Token (7 ngày) lưu hash vào database.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-LOG-01** | Đăng nhập thành công với tài khoản và mật khẩu đúng | ```json { "email": "athlete@test.com", "password": "password123" } ``` | **200 OK** | Trả về `accessToken` (JWT hợp lệ), `refreshToken`, `tokenType: "Bearer"`, `expiresIn: 900` và thông tin `user`. Bản ghi lưu vào bảng `refresh_tokens`. | ✅ **PASS** |
| **TC-AUTH-LOG-02** | Bắt lỗi mật khẩu không chính xác | ```json { "email": "athlete@test.com", "password": "wrong_password" } ``` | **401 Unauthorized** | Trả về lỗi dạng `{ errorType: "VALIDATION", code: "AUTH_INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không chính xác." }`. | ✅ **PASS** |
| **TC-AUTH-LOG-03** | Bắt lỗi email chưa tồn tại trong hệ thống | ```json { "email": "non_existent@badminton.vn", "password": "password123" } ``` | **401 Unauthorized** | Trả về lỗi dạng `{ errorType: "VALIDATION", code: "AUTH_INVALID_CREDENTIALS", message: "Email hoặc mật khẩu không chính xác." }`. | ✅ **PASS** |
| **TC-AUTH-LOG-04** | Bắt lỗi để trống email hoặc mật khẩu | ```json { "email": "", "password": "" } ``` | **400 Bad Request** | Bắt lỗi validation payload: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [...] }`. | ✅ **PASS** |

### 1.3. API: Gia Hạn Phiên & Refresh Token (`POST /api/auth/refresh-token`)
- **Vertical Slice:** `VS-03`
- **FR Traceability:** `NFR-SEC-02`
- **Mô tả:** Cấp lại Access Token mới (15 phút) và Refresh Token mới (Token Rotation an toàn) khi cung cấp Refresh Token hợp lệ và chưa hết hạn. Thu hồi Refresh Token cũ ngay sau khi sử dụng.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-REF-01** | Cấp Access Token mới thành công và xoay vòng Refresh Token | ```json { "refreshToken": "<valid_raw_refresh_token>" } ``` | **200 OK** | Trả về `accessToken` mới, `refreshToken` mới, `tokenType: "Bearer"`, `expiresIn: 900`. Token cũ trong DB được cập nhật `revoked = true`. | ✅ **PASS** |
| **TC-AUTH-REF-02** | Bắt lỗi khi sử dụng Refresh Token đã bị thu hồi (Revoked) | ```json { "refreshToken": "<already_revoked_token>" } ``` | **401 Unauthorized** | Trả về lỗi: `{ errorType: "VALIDATION", code: "AUTH_REFRESH_TOKEN_REVOKED", message: "Refresh token này đã bị thu hồi..." }`. | ✅ **PASS** |
| **TC-AUTH-REF-03** | Bắt lỗi khi Refresh Token không tồn tại hoặc sai chuỗi hash | ```json { "refreshToken": "invalid_fake_token_string" } ``` | **401 Unauthorized** | Trả về lỗi: `{ errorType: "VALIDATION", code: "AUTH_INVALID_REFRESH_TOKEN", message: "Refresh token không hợp lệ..." }`. | ✅ **PASS** |
| **TC-AUTH-REF-04** | Bắt lỗi để trống Refresh Token | ```json { "refreshToken": "" } ``` | **400 Bad Request** | Bắt lỗi validation: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "refreshToken", issue: "Refresh token không được để trống" }] }`. | ✅ **PASS** |

### 1.4. API: Đăng Xuất Hệ Thống (`POST /api/auth/logout`)
- **Vertical Slice:** `VS-03`
- **FR Traceability:** `FR-M01-03`
- **Mô tả:** Thu hồi Refresh Token hiện tại trong cơ sở dữ liệu (`revoked = true`) để ngăn chặn việc sử dụng lại token này để lấy access token mới.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-OUT-01** | Đăng xuất thành công với Refresh Token hợp lệ | ```json { "refreshToken": "<valid_raw_refresh_token>" } ``` | **200 OK** | Trả về `{ "message": "Đăng xuất thành công." }`. Bản ghi tương ứng trong bảng `refresh_tokens` được set `revoked = true`. | ✅ **PASS** |
| **TC-AUTH-OUT-02** | Sử dụng token đã đăng xuất để Refresh Token bị từ chối | ```json { "refreshToken": "<logged_out_refresh_token>" } ``` | **401 Unauthorized** | Không thể cấp token mới, trả về `AUTH_REFRESH_TOKEN_REVOKED`. | ✅ **PASS** |
| **TC-AUTH-OUT-03** | Bắt lỗi để trống Refresh Token khi đăng xuất | ```json { "refreshToken": "" } ``` | **400 Bad Request** | Bắt lỗi validation payload: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD" }`. | ✅ **PASS** |

### 1.5. API: Lấy Thông Tin Hồ Sơ Cá Nhân (`GET /api/users/me`)
- **Vertical Slice:** `VS-03 (Profile)`
- **FR Traceability:** `FR-M01-04`
- **Mô tả:** Lấy thông tin chi tiết của người dùng đang đăng nhập dựa trên JWT token được gửi kèm header Authorization.

| Mã Test Case | Tên Kịch Bản | Header / Payload | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-USER-PRF-01** | Lấy thông tin hồ sơ thành công khi có Token hợp lệ | `Authorization: Bearer <accessToken>` | **200 OK** | Trả về `id`, `email`, `role`, `fullName`, `avatarUrl`, `age`, `gender`, `badmintonLevel`, `status`, `createdAt`. Mật khẩu không bị lộ. | ✅ **PASS** |
| **TC-USER-PRF-02** | Bắt lỗi từ chối khi không truyền Token | Không truyền header Authorization | **401 Unauthorized** | Không cho phép truy cập tài nguyên bảo vệ. | ✅ **PASS** |

### 1.6. API: Cập Nhật Thông Tin Hồ Sơ (`PUT /api/users/me`)
- **Vertical Slice:** `VS-03 (Profile)`
- **FR Traceability:** `FR-M01-04`, `FR-M01-05`
- **Mô tả:** Cho phép người dùng cập nhật họ tên, tuổi, giới tính và trình độ chơi cầu lông.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-USER-PRF-03** | Cập nhật thông tin profile thành công | ```json { "fullName": "Lê Quang Liêm Pro", "age": 24, "gender": "MALE", "badmintonLevel": "PRO" } ``` | **200 OK** | Trả về UserResponse với thông tin mới đã được cập nhật chính xác trong database. | ✅ **PASS** |
| **TC-USER-PRF-04** | Bắt lỗi khi nhập tuổi không hợp lệ (< 5 hoặc > 100) | ```json { "fullName": "Nguyễn Văn A", "age": 150 } ``` | **400 Bad Request** | Bắt lỗi validation: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "age", issue: "Tuổi tối đa là 100" }] }`. | ✅ **PASS** |

### 1.7. API: Tải Lên Ảnh Đại Diện lên MinIO (`POST /api/users/me/avatar`)
- **Vertical Slice:** `VS-03 (Profile)`
- **FR Traceability:** `FR-M01-05`
- **Mô tả:** Upload file ảnh đại diện multipart lên bucket `badminton-avatars` trên MinIO, lưu đường dẫn công khai vào cột `avatar_url` của bảng `users`.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Multipart) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-USER-AVA-01** | Upload ảnh đại diện thành công (.jpg/.png < 2MB) | File ảnh hợp lệ: `avatar: court-bg.jpg` | **200 OK** | Upload thành công vào bucket MinIO `badminton-avatars`, cập nhật `avatar_url` vào DB và trả về dạng `{ "avatarUrl": "http://localhost:9000/badminton-avatars/..." }`. | ✅ **PASS** |
| **TC-USER-AVA-02** | Bắt lỗi khi không đính kèm file ảnh | Không gửi param `avatar` hoặc file rỗng | **400 Bad Request** | Trả về lỗi: `{ errorType: "VALIDATION", code: "ERR_EMPTY_FILE", message: "File ảnh đại diện không được để trống." }`. | ✅ **PASS** |
| **TC-USER-AVA-03** | Bắt lỗi file sai định dạng (không phải ảnh jpg/png/webp) | Gửi file text/pdf `test.pdf` | **400 Bad Request** | Trả về lỗi: `{ errorType: "VALIDATION", code: "ERR_INVALID_FILE_TYPE", message: "Định dạng ảnh không hợp lệ..." }`. | ✅ **PASS** |

### 1.8. API: Yêu Cầu Quên Mật Khẩu (`POST /api/auth/forgot-password`)
- **Vertical Slice:** `VS-04`
- **FR Traceability:** `FR-M01-06`
- **Mô tả:** Tiếp nhận email người dùng, sinh mã Token ngẫu nhiên (URL-safe Base64), băm SHA-256 lưu vào bảng `password_resets` với hạn dùng 15 phút, đồng thời vô hiệu hóa các mã reset trước đó. Trả về thông báo thành công và in Magic Link vào console/log.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-FORGOT-01** | Gửi yêu cầu đặt lại mật khẩu thành công cho email hợp lệ | ```json { "email": "athlete@test.com" } ``` | **200 OK** | Trả về `{ "message": "Yêu cầu đặt lại mật khẩu đã được tiếp nhận..." }`. Bản ghi mới được tạo trong `password_resets` với `is_used = false`. | ✅ **PASS** |
| **TC-AUTH-FORGOT-02** | Bắt lỗi email không tồn tại trong hệ thống | ```json { "email": "not_exist_email@badminton.vn" } ``` | **404 Not Found** | Trả về lỗi: `{ errorType: "VALIDATION", code: "ERR_USER_NOT_FOUND", message: "Không tìm thấy tài khoản với email này." }`. | ✅ **PASS** |
| **TC-AUTH-FORGOT-03** | Bắt lỗi định dạng email không hợp lệ | ```json { "email": "invalid_email_format" } ``` | **400 Bad Request** | Bắt lỗi validation payload: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD" }`. | ✅ **PASS** |
| **TC-AUTH-FORGOT-04** | Bắt lỗi để trống email | ```json { "email": "" } ``` | **400 Bad Request** | Bắt lỗi validation payload: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD" }`. | ✅ **PASS** |

### 1.9. API: Đặt Lại Mật Khẩu Mới Bằng Magic Token (`POST /api/auth/reset-password`)
- **Vertical Slice:** `VS-04`
- **FR Traceability:** `FR-M01-07`
- **Mô tả:** Xác thực mã token (kiểm tra hash, hạn dùng 15 phút, cờ `is_used`), băm mật khẩu mới bằng BCrypt và cập nhật cho người dùng, đánh dấu token `is_used = true` và thu hồi toàn bộ Refresh Token đang hoạt động để buộc đăng xuất các phiên cũ.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-RESET-01** | Đặt lại mật khẩu thành công với Token hợp lệ | ```json { "token": "<valid_raw_reset_token>", "newPassword": "NewPassword@123" } ``` | **200 OK** | Cập nhật mật khẩu mới thành công, bản ghi trong `password_resets` được set `is_used = true`. Toàn bộ token trong `refresh_tokens` của user bị thu hồi (`revoked = true`). | ✅ **PASS** |
| **TC-AUTH-RESET-02** | Bắt lỗi khi sử dụng lại Token đã qua sử dụng | ```json { "token": "<already_used_token>", "newPassword": "AnotherPassword@123" } ``` | **400 Bad Request** | Trả về lỗi: `{ errorType: "VALIDATION", code: "ERR_TOKEN_ALREADY_USED", message: "Token này đã được sử dụng..." }`. | ✅ **PASS** |
| **TC-AUTH-RESET-03** | Bắt lỗi Token không hợp lệ hoặc không tồn tại | ```json { "token": "invalid_token_string", "newPassword": "NewPassword@123" } ``` | **400 Bad Request** | Trả về lỗi: `{ errorType: "VALIDATION", code: "ERR_INVALID_TOKEN", message: "Token đặt lại mật khẩu không hợp lệ." }`. | ✅ **PASS** |
| **TC-AUTH-RESET-04** | Bắt lỗi mật khẩu mới quá ngắn (< 6 ký tự) | ```json { "token": "<valid_raw_reset_token>", "newPassword": "123" } ``` | **400 Bad Request** | Bắt lỗi validation payload: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "newPassword", issue: "Mật khẩu mới phải từ 6 đến 50 ký tự" }] }`. | ✅ **PASS** |
| **TC-AUTH-RESET-05** | Đăng nhập thành công với mật khẩu mới sau khi reset | ```json { "email": "athlete@test.com", "password": "NewPassword@123" } ``` | **200 OK** | Đăng nhập thành công bằng mật khẩu mới, cấp JWT và refresh token mới. Mật khẩu cũ không còn tác dụng. | ✅ **PASS** |

---

## 2. MODULE QUẢN LÝ TRẬN ĐẤU & VIDEO (MATCHES & VIDEOS)

### 2.1. API: Khởi Tạo Trận Đấu Mới (`POST /api/matches`)
- **Vertical Slice:** `VS-05`
- **FR Traceability:** `FR-M02-01`, `FR-M02-03`
- **Mô tả:** Khởi tạo thông tin trận đấu ở trạng thái `DRAFT`, lưu tên 2 vận động viên, xác định góc nhìn sân trên/dưới cho camera, gán `owner_id` tự động theo JWT token.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MATCH-CRE-01** | Tạo trận đấu thành công với thông tin hợp lệ | ```json { "playerAName": "Nguyễn Tiến Minh", "playerBName": "Lee Chong Wei", "upperPlayer": "PLAYER_A", "lowerPlayer": "PLAYER_B", "matchDate": "2026-10-09", "title": "Chung kết Đơn Nam 2026" } ``` | **201 Created** | Trả về `MatchResponse` với `status: "DRAFT"`, `source: "USER_UPLOAD"`, `ownerId` khớp với tài khoản đang đăng nhập. | ✅ **PASS** |
| **TC-MATCH-CRE-02** | Bắt lỗi vị trí sân trên và sân dưới trùng nhau | ```json { "playerAName": "Player 1", "playerBName": "Player 2", "upperPlayer": "PLAYER_A", "lowerPlayer": "PLAYER_A" } ``` | **400 Bad Request** | Bắt lỗi nghiệp vụ: `{ errorType: "VALIDATION", code: "ERR_INVALID_COURT_POSITION", message: "Vị trí sân trên và sân dưới không được trùng nhau." }`. | ✅ **PASS** |
| **TC-MATCH-CRE-03** | Bắt lỗi để trống tên vận động viên | ```json { "playerAName": "", "playerBName": "Lee Chong Wei" } ``` | **400 Bad Request** | Bắt lỗi validation payload: `{ errorType: "VALIDATION", code: "ERR_INVALID_PAYLOAD", details: [{ field: "playerAName", issue: "Tên người chơi A không được để trống" }] }`. | ✅ **PASS** |

### 2.2. API: Xem Chi Tiết Trận Đấu (`GET /api/matches/{id}`)
- **Vertical Slice:** `VS-05`
- **FR Traceability:** `FR-M02-08`
- **Mô tả:** Trả về thông tin chi tiết của trận đấu. Kiểm tra quyền sở hữu (chỉ Owner hoặc Admin mới có quyền xem trận đấu ở trạng thái riêng tư/DRAFT).

| Mã Test Case | Tên Kịch Bản | Header / Params | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MATCH-GET-01** | Lấy thông tin trận đấu thành công của chính mình | `GET /api/matches/1` + `Bearer <token>` | **200 OK** | Trả về đầy đủ thông tin `id`, `ownerId`, tên 2 vận động viên, ngày đấu, trạng thái `DRAFT`. | ✅ **PASS** |
| **TC-MATCH-GET-02** | Bắt lỗi khi ID trận đấu không tồn tại | `GET /api/matches/9999` + `Bearer <token>` | **404 Not Found** | Trả về lỗi: `{ errorType: "VALIDATION", code: "ERR_MATCH_NOT_FOUND", message: "Không tìm thấy trận đấu với ID: 9999" }`. | ✅ **PASS** |

### 2.3. API: Chỉnh Sửa Thông Tin Trận Đấu (`PUT /api/matches/{id}`)
- **Vertical Slice:** `VS-05`
- **FR Traceability:** `FR-M02-04`
- **Mô tả:** Cập nhật thông tin tiêu đề, mô tả, ngày đấu hoặc vị trí sân của trận đấu. Chỉ Owner hoặc Admin được phép cập nhật.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MATCH-UPD-01** | Cập nhật tiêu đề trận đấu thành công | ```json { "title": "Chung kết Đơn Nam 2026 - Bản Cập Nhật" } ``` | **200 OK** | Trả về thông tin trận đấu với `title` mới được cập nhật vào database. | ✅ **PASS** |
| **TC-MATCH-UPD-02** | Bắt lỗi khi cập nhật sân trên và dưới trùng nhau | ```json { "upperPlayer": "PLAYER_A", "lowerPlayer": "PLAYER_A" } ``` | **400 Bad Request** | Bắt lỗi nghiệp vụ `ERR_INVALID_COURT_POSITION`. | ✅ **PASS** |

---

## 3. Module Video: Upload Trực Tiếp MinIO & Xác Nhận (VS-06)

*Các API liên quan:*
- `POST /api/matches/{id}/videos/upload-url`: Sinh S3 Presigned URL (PUT) tải file trực tiếp lên MinIO bucket `badminton-videos`.
- `POST /api/matches/{id}/videos/complete`: Xác nhận file đã có trên MinIO, cập nhật trạng thái `READY` cho video và trận đấu.
- `GET /api/matches/{id}/video`: Lấy thông tin video và link stream công khai.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-VID-URL-01** | Lấy Presigned Upload URL thành công | ```json { "fileName": "match_sample.mp4", "fileSize": 15728640 } ``` | **200 OK** | Trả về `uploadUrl` có chữ ký HMAC-SHA256, `storagePath` chuẩn (`matches/{matchId}/{uuid}.mp4`), `expiresInSeconds: 900`. Video tạo với status `UPLOADING`. | ✅ **PASS** |
| **TC-VID-URL-02** | Video vượt quá giới hạn 500MB | ```json { "fileName": "huge_match.mp4", "fileSize": 629145600 } ``` | **413 Payload Too Large** | Bắt lỗi `ERR_PAYLOAD_TOO_LARGE`: "Dung lượng video vượt quá giới hạn tối đa cho phép (500MB)." | ✅ **PASS** |
| **TC-VID-URL-03** | Định dạng file không hợp lệ | ```json { "fileName": "malicious.exe", "fileSize": 10485760 } ``` | **400 Bad Request** | Bắt lỗi `ERR_INVALID_FILE_TYPE`: "Định dạng video không được hỗ trợ. Vui lòng chọn file MP4, MOV, MKV hoặc WebM." | ✅ **PASS** |
| **TC-VID-PUT-01** | Upload binary trực tiếp lên MinIO | HTTP PUT binary data kèm `Content-Type: video/mp4` đến `uploadUrl` | **200 OK** | MinIO tiếp nhận dữ liệu streaming trực tiếp, không đi qua Spring Boot backend. | ✅ **PASS** |
| **TC-VID-COM-01** | Xác nhận upload video hoàn tất | ```json { "storagePath": "matches/1/...", "fileName": "match_sample.mp4", "fileSize": 15728640, "durationSeconds": 120.5, "resolution": "1080p", "fps": 30.0 } ``` | **200 OK** | Hệ thống gọi MinIO `statObject` xác thực file thật, cập nhật `Video.status = READY`, `Match.status = READY`, tính toán kích thước thực tế. | ✅ **PASS** |
| **TC-VID-COM-02** | Xác nhận file không tồn tại trên MinIO | ```json { "storagePath": "matches/1/non_existent.mp4", ... } ``` | **400 Bad Request** | Bắt lỗi `ERR_VIDEO_FILE_NOT_FOUND`: "Không tìm thấy file video trên hệ thống lưu trữ. Vui lòng tải lên lại." | ✅ **PASS** |
| **TC-VID-GET-01** | Lấy thông tin video trận đấu | `GET /api/matches/1/video` kèm Bearer Token | **200 OK** | Trả về `VideoResponse` đầy đủ metadata (`fileName`, `fileSize`, `storagePath`, `videoUrl`, `status: READY`). | ✅ **PASS** |

---

## 4. Module Trận Đấu: Danh Sách Của Tôi & Xóa Mềm (VS-07)

*Các API liên quan:*
- `GET /api/matches`: Lấy danh sách trận đấu do chính mình tạo (phân trang, lọc theo status, loại trừ trận đã xóa mềm).
- `DELETE /api/matches/{id}`: Xóa mềm trận đấu (`deleted_at = CURRENT_TIMESTAMP`). Chỉ chủ sở hữu (Owner) hoặc Admin được phép xóa.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MATCH-LIST-01** | Lấy danh sách trận đấu thành công | `GET /api/matches?page=0&size=10` kèm Bearer Token | **200 OK** | Trả về danh sách trận đấu của người dùng kèm metadata phân trang (`page`, `size`, `totalElements`, `totalPages`). Loại bỏ các trận đã bị xóa mềm. | ✅ **PASS** |
| **TC-MATCH-LIST-02** | Lọc danh sách theo trạng thái | `GET /api/matches?status=READY` | **200 OK** | Chỉ trả về các trận đấu có `status = READY`. | ✅ **PASS** |
| **TC-MATCH-DEL-01** | Xóa mềm trận đấu thành công | `DELETE /api/matches/{id}` do chính Owner gọi | **200 OK** | Trả về thông điệp "Trận đấu đã được xóa mềm thành công.". Cập nhật `deleted_at = NOW()`, bản ghi vẫn lưu trong CSDL nhưng không còn xuất hiện trong API danh sách. | ✅ **PASS** |
| **TC-MATCH-DEL-02** | Xóa trận đấu của người khác (Forbidden) | `DELETE /api/matches/{id}` gọi bởi User không phải Owner/Admin | **403 Forbidden** | Bắt lỗi `AUTH_FORBIDDEN_RESOURCE`: "Bạn không có quyền xóa trận đấu này." | ✅ **PASS** |
| **TC-MATCH-DEL-03** | Xóa trận đấu không tồn tại hoặc đã xóa trước đó | `DELETE /api/matches/9999` hoặc gọi lại ID đã xóa | **404 Not Found** | Bắt lỗi `ERR_MATCH_NOT_FOUND`: "Không tìm thấy trận đấu với ID: ..." | ✅ **PASS** |

---

## 5. Module Phân Tích AI: Điều Phối Bất Đồng Bộ & Polling (VS-08)

*Các API liên quan:*
- `POST /api/matches/{id}/analysis/dispatch`: Điều phối phân tích AI, phản hồi ngay lập tức `HTTP 202 Accepted` (< 200ms) theo chuẩn NFR-PER-02, NFR-AI-01.
- `GET /api/matches/{id}/analysis/status`: Polling tiến trình phân tích AI (tỷ lệ %, giai đoạn xử lý).

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AI-DISP-01** | Bắt đầu phân tích AI thành công | `POST /api/matches/{id}/analysis/dispatch` kèm Bearer Token | **202 Accepted** | Trả về `AnalysisDispatchResponse` chứa `analysisId`, `matchId`, `status: QUEUED`, phản hồi dưới 200ms. Tiến trình mô phỏng chạy ngầm sinh dữ liệu. | ✅ **PASS** |
| **TC-AI-DISP-02** | Bắt lỗi phân tích trận đấu không tồn tại | `POST /api/matches/99999/analysis/dispatch` | **404 Not Found** | Bắt lỗi `ERR_MATCH_NOT_FOUND`: "Không tìm thấy trận đấu với ID: 99999". | ✅ **PASS** |
| **TC-AI-DISP-03** | Phân tích khi chưa có video tải lên | `POST /api/matches/{id}/analysis/dispatch` cho trận `status = DRAFT` | **400 Bad Request** | Bắt lỗi `ERR_VIDEO_REQUIRED`: "Trận đấu chưa có video hoặc video chưa sẵn sàng để phân tích." | ✅ **PASS** |
| **TC-AI-STAT-01** | Polling tiến trình phân tích AI | `GET /api/matches/{id}/analysis/status` | **200 OK** | Trả về `AnalysisStatusResponse` gồm `progressPercent` (0..100%), `currentStage`, `status: PROCESSING/COMPLETED`. | ✅ **PASS** |

---

## 6. Module Replay & AI Events Telemetry (VS-09 & VS-10)

*Các API liên quan:*
- `GET /api/matches/{id}/analysis/events`: Lấy toàn bộ danh sách các cú đánh kèm tọa độ 2D chuẩn hóa và phân vùng 3x3 phục vụ Replay, Sân 2D & Thẻ chi tiết cú đánh.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AI-EVT-01** | Lấy danh sách cú đánh 2D cho Replay | `GET /api/matches/{id}/analysis/events` | **200 OK** | Trả về mảng `AiEventResponse` gồm `stroke`, `strokeSide`, `timeSeconds`, tọa độ `playerPositionCourt [x, y]`, `landingPositionCourtProxy [x, y]`. | ✅ **PASS** |
| **TC-AI-EVT-02** | Kiểm tra dữ liệu Telemetry & Cảnh báo độ tin cậy thấp (VS-10) | `GET /api/matches/{id}/analysis/events` | **200 OK** | Dữ liệu chứa thông số vận tốc `averageShuttleSpeedImagePerSecond`, `averageWristSpeedImagePerSecond`, phân vùng `hittingArea3x3`, `landingArea3x3Proxy`, và tồn tại sự kiện có `confidence < 0.60` (ví dụ `0.52`) để kích hoạt cảnh báo AI. | ✅ **PASS** |
| **TC-AI-EVT-03** | Lấy danh sách cú đánh trận không tồn tại | `GET /api/matches/99999/analysis/events` | **404 Not Found** | Bắt lỗi `ERR_MATCH_NOT_FOUND` hoặc danh sách rỗng nếu chưa phân tích. | ✅ **PASS** |

---

## 7. Module Pha Cầu: Gom Nhóm & Điều Hướng Trực Quan (VS-11)

*Các API liên quan:*
- `GET /api/matches/{id}/analysis/rallies`: Lấy toàn bộ danh sách các đợt cầu (`Rallies`) của trận đấu kèm thời lượng, tỷ số, bên thắng và chuỗi cú đánh.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-RALLY-LIST-01** | Lấy danh sách pha cầu thành công | `GET /api/matches/{id}/analysis/rallies` | **200 OK** | Trả về mảng `RallyResponse` gồm `rallyNumber`, `startTime`, `endTime`, `duration`, `totalStrokes`, `winnerSide`, `winReason`, `scoreText`, `strokeSequence`. | ✅ **PASS** |
| **TC-RALLY-LIST-02** | Lấy danh sách pha cầu trận không tồn tại | `GET /api/matches/99999/analysis/rallies` | **404 Not Found** | Bắt lỗi `ERR_MATCH_NOT_FOUND`: "Không tìm thấy trận đấu". | ✅ **PASS** |

---

## 8. Module Thống Kê Trận Đấu Chuyên Sâu (VS-12)

*Các API liên quan:*
- `GET /api/matches/{id}/analysis/statistics`: Lấy dữ liệu thống kê chuyên sâu toàn diện của trận đấu theo Match ID (FR-M06-09).
- `GET /api/ai-analyses/{id}/statistics`: Lấy dữ liệu thống kê theo Analysis ID chuẩn đặc tả OpenAPI 3.0.

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-STATS-01** | Lấy thống kê trận đấu theo Match ID thành công | `GET /api/matches/{id}/analysis/statistics` | **200 OK** | Trả về `MatchStatisticsResponse` chứa `totalStrokes: 40`, `totalRallies: 5`, `avgStrokesPerRally: 8.00`, `avgRallyDuration`, phân bố cú đánh `strokeDistribution` (Smash, Clear, Drop...), số cú đánh Player A & B, tỷ lệ thuận tay/trái tay (`forehandCount`, `backhandCount`), và dữ liệu `summaryData`, `coachInsights`. | ✅ **PASS** |
| **TC-STATS-02** | Lấy thống kê theo Analysis ID (OpenAPI standard) | `GET /api/ai-analyses/{id}/statistics` | **200 OK** | Trả về `MatchStatisticsResponse` tương ứng với ID phiên phân tích AI. | ✅ **PASS** |
| **TC-STATS-03** | Lấy thống kê của trận đấu không tồn tại | `GET /api/matches/99999/analysis/statistics` | **404 Not Found** | Bắt lỗi `ERR_MATCH_NOT_FOUND`: "Không tìm thấy trận đấu". | ✅ **PASS** |

---

## 9. Module Luồng Thử Lại (Retry) & Hủy (Cancel) Phân Tích AI (VS-13)

*Các API liên quan:*
- `POST /api/matches/{id}/ai-analyses/{analysisId}/cancel`: Hủy tiến trình phân tích AI đang chạy (QUEUED hoặc PROCESSING).
- `POST /api/matches/{id}/ai-analyses/{analysisId}/retry`: Khởi tạo lại phiên phân tích mới sau khi phiên trước bị thất bại (FAILED).

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AI-CANCEL-01** | Hủy tiến trình phân tích AI đang chạy | `POST /api/matches/{id}/ai-analyses/{analysisId}/cancel` | **200 OK** | Trả về `AnalysisStatusResponse` với `status: CANCELLED`, ngắt Mock AI Engine và chuyển trạng thái Match về `READY`. | ✅ **PASS** |
| **TC-AI-CANCEL-02** | Bắt lỗi hủy khi phân tích không ở trạng thái QUEUED/PROCESSING | `POST /api/matches/{id}/ai-analyses/{analysisId}/cancel` trên phân tích đã COMPLETED hoặc CANCELLED | **400 Bad Request** | Bắt đúng mã lỗi `CANNOT_CANCEL`: "Chỉ có thể hủy phiên phân tích đang ở trạng thái QUEUED hoặc PROCESSING". | ✅ **PASS** |
| **TC-AI-RETRY-01** | Thử lại phân tích sau khi thất bại | `POST /api/matches/{id}/ai-analyses/{analysisId}/retry` trên phân tích bị `status: FAILED` | **202 Accepted** | Sinh bản ghi `AiAnalysis` mới với `is_current: true`, chuyển bản ghi cũ thành `is_current: false`, trả về `status: QUEUED` dưới 200ms và kích hoạt lại Mock AI Engine. | ✅ **PASS** |
| **TC-AI-RETRY-02** | Bắt lỗi thử lại khi phân tích không bị FAILED | `POST /api/matches/{id}/ai-analyses/{analysisId}/retry` trên phân tích đang `PROCESSING` hoặc `COMPLETED` | **400 Bad Request** | Bắt đúng mã lỗi `CANNOT_RETRY`: "Chỉ có thể thử lại khi phiên phân tích ở trạng thái FAILED". | ✅ **PASS** |

## 10. Module Thư Viện Trận Đấu Công Khai & Quản Trị Trận Đấu (VS-14)

*Các API liên quan:*
- `GET /api/public-matches`: Duyệt danh sách trận đấu công khai phân trang (Guest & All).
- `GET /api/public-matches?search={keyword}`: Tìm kiếm trận đấu công khai theo tên tuyển thủ hoặc giải đấu.
- `GET /api/public-matches/{id}`: Xem thông tin chi tiết một trận đấu công khai.
- `GET /api/public-matches/{id}/video`: Lấy nguồn video (YouTube Video ID / URL) của trận đấu công khai.
- `GET /api/public-matches/{id}/events`: Lấy dữ liệu telemetry các cú đánh (`Strokes`) của trận đấu công khai.
- `GET /api/public-matches/{id}/rallies`: Lấy danh sách pha cầu (`Rallies`) của trận đấu công khai.
- `GET /api/public-matches/{id}/statistics`: Lấy bảng thống kê chi tiết toàn diện của trận đấu công khai.
- `GET /api/admin/matches`: Admin xem danh sách toàn bộ trận đấu (yêu cầu `ROLE_ADMIN`).
- `POST /api/admin/matches/{id}/publish`: Admin phê duyệt & xuất bản trận đấu vào Thư viện công khai (yêu cầu `ROLE_ADMIN`).
- `POST /api/admin/matches/{id}/unpublish`: Admin gỡ trận đấu khỏi Thư viện công khai (yêu cầu `ROLE_ADMIN`).

| Mã Test Case | Tên Kịch Bản | Dữ Liệu Đầu Vào (Payload) | Mã Lỗi / HTTP Status | Kết Quả Mong Đợi (Expected Response) | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PUB-01** | Lấy danh sách trận đấu công khai (Guest không cần Token) | `GET /api/public-matches?page=0&size=10` | **200 OK** | Trả về danh sách trận đấu có `status: "PUBLISHED"`, đầy đủ `thumbnailUrl` (YouTube hqdefault), `youtubeVideoId`, `durationSeconds`, `totalStrokes`, `totalRallies`. | ✅ **PASS** |
| **TC-PUB-02** | Tìm kiếm trận đấu công khai theo từ khóa | `GET /api/public-matches?search=Axelsen&page=0&size=10` | **200 OK** | Trả về các trận đấu có `title` hoặc tên tuyển thủ chứa từ khóa "Axelsen". | ✅ **PASS** |
| **TC-PUB-03** | Xem chi tiết trận đấu công khai theo ID | `GET /api/public-matches/11` | **200 OK** | Trả về thông tin trận đấu `#11` (Kento Momota vs Viktor Axelsen), `status: "PUBLISHED"`. | ✅ **PASS** |
| **TC-PUB-04** | Lấy thông tin video YouTube trận đấu công khai | `GET /api/public-matches/11/video` | **200 OK** | Trả về `videoSourceType: "YOUTUBE"`, `youtubeVideoId: "boQC4J4E1ZQ"`, `videoUrl`. | ✅ **PASS** |
| **TC-PUB-05** | Lấy danh sách cú đánh (AI events) trận đấu công khai | `GET /api/public-matches/11/events` | **200 OK** | Trả về 756 cú đánh có tọa độ sân (`courtX`, `courtY`), loại cú đánh (`stroke`), độ tin cậy AI (`confidence`). | ✅ **PASS** |
| **TC-PUB-06** | Lấy danh sách pha cầu (Rallies) trận đấu công khai | `GET /api/public-matches/11/rallies` | **200 OK** | Trả về 46 pha cầu có thời gian bắt đầu/kết thúc, số cú đánh và bên ghi điểm. | ✅ **PASS** |
| **TC-PUB-07** | Lấy thống kê chi tiết trận đấu công khai | `GET /api/public-matches/11/statistics` | **200 OK** | Trả về thống kê chuyên sâu: `totalStrokes: 756`, `totalRallies: 46`, phân bố cú đánh Smash/Clear/Drop/Net, tốc độ và tỷ lệ lỗi. | ✅ **PASS** |
| **TC-ADM-PUB-01** | Admin lấy danh sách toàn bộ trận đấu trong hệ thống | `GET /api/admin/matches?page=0&size=20` với Bearer Token `ROLE_ADMIN` | **200 OK** | Trả về danh sách toàn bộ các trận đấu trong hệ thống (gồm PUBLISHED, READY, DRAFT, COMPLETED). | ✅ **PASS** |
| **TC-ADM-PUB-02** | Admin xuất bản trận đấu vào Thư viện công khai | `POST /api/admin/matches/11/publish` với Bearer Token `ROLE_ADMIN` | **200 OK** | Cập nhật trận đấu sang trạng thái `PUBLISHED`, xuất hiện ngay trong thư viện trang chủ. | ✅ **PASS** |
| **TC-ADM-PUB-03** | Admin hủy xuất bản trận đấu khỏi Thư viện | `POST /api/admin/matches/11/unpublish` với Bearer Token `ROLE_ADMIN` | **200 OK** | Cập nhật trận đấu về trạng thái `READY`, không còn xuất hiện trong thư viện công khai. | ✅ **PASS** |
| **TC-ADM-PUB-04** | Người dùng thường hoặc Guest truy cập Admin Match API bị chặn | `GET /api/admin/matches` không có Token hoặc Token `ROLE_USER` | **403 Forbidden** | Bắt lỗi phân quyền Spring Security: "Access Denied". | ✅ **PASS** |

---

*(Tài liệu này được tự động cập nhật liên tục đồng bộ cùng Postman Collection `badminton-api.postman_collection.json`).*


