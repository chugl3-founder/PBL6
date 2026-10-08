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

---

*(Tài liệu này sẽ được tự động bổ sung liên tục các bảng test case của VS-03, VS-04,... cho đến khi hoàn thành toàn bộ hệ thống).*

