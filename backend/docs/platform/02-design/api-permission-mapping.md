# Bảng Đối Chiếu Ma Trận Phân Quyền & Quy Tắc Xác Thực API (Permission Matrix Mapping)

* **Dự án:** PBL6 Badminton - Match Analysis & Replay Platform
* **Tài liệu nguồn:** `docs/00-requirements/PBL6-Badminton_requirements.md` (Mục Final Permission Matrix) & `docs/02-design/openapi.yaml`
* **Ngày tạo:** 2026-10-08
* **Mục tiêu:** Chứng minh mỗi dòng trong Ma trận phân quyền (Permission Matrix) được hiện thực hóa bằng ít nhất một endpoint API cụ thể kèm quy tắc kiểm soát truy cập (Authorization Rules).

---

## Bảng Đối Chiếu Ma Trận Phân Quyền vs Quy Tắc API (Traceability of AuthZ)

| # | Tài nguyên / Hành động trong Permission Matrix | Đối tượng phân quyền theo Matrix | Endpoint API tương ứng (OpenAPI.yaml) | Quy tắc Xác thực & Phân quyền (Spring Security AuthZ) | Mã phản hồi khi vi phạm |
| :-: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Profile** (Thông tin cá nhân) | - **Owner:** CRUD own<br>- **Viewer:** Không có<br>- **Admin:** Manage | `GET /api/users/me`<br>`PUT /api/users/me`<br>`POST /api/users/me/avatar`<br>`GET /api/admin/users/**` | - User chỉ xem và sửa profile của chính mình (`principal.id == user.id`).<br>- Endpoint `/api/admin/users/**` bắt buộc quyền `hasRole('ADMIN')`. | `401 Unauthorized`<br>`403 Forbidden` |
| **2** | **Match metadata (Private)** | - **Owner:** CRUD own<br>- **Viewer:** Không có<br>- **Admin:** CRUD | `POST /api/matches`<br>`GET /api/matches`<br>`GET /api/matches/{id}`<br>`PUT /api/matches/{id}`<br>`DELETE /api/matches/{id}` | - `@PreAuthorize("isAuthenticated()")` cho tạo mới và xem danh sách của mình.<br>- Sửa/xóa match riêng tư: `@PreAuthorize("@matchSecurity.isOwner(#id) or hasRole('ADMIN')")`. | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| **3** | **Match metadata (Public)** | - **Guest:** R<br>- **Viewer:** R<br>- **Owner:** CRUD own<br>- **Admin:** CRUD | `GET /api/public-matches`<br>`GET /api/public-matches/{id}` | - `permitAll()`: Không yêu cầu Header Authorization, phục vụ cả khách chưa đăng nhập (Guest).<br>- Chỉ truy vấn các match có `status = 'PUBLISHED' AND deleted_at IS NULL`. | `404 Not Found` (nếu private) |
| **4** | **Video Stream (Private)** | - **Owner:** Stream full<br>- **Viewer:** Không có<br>- **Admin:** Stream full | `GET /api/videos/{id}/stream` | - Kiểm tra quan hệ match: Nếu match riêng tư, kiểm tra `principal.id == match.ownerId or hasRole('ADMIN')`. Ngược lại từ chối truy cập. | `401 Unauthorized`<br>`403 Forbidden` |
| **5** | **Video Stream (Public)** | - **Guest:** Stream preview $\le 5\text{p}$<br>- **Viewer / Owner / Admin:** Stream full | `GET /api/videos/{id}/stream` | - Nếu match ở trạng thái `PUBLISHED`: Cho phép Guest truy cập, kiểm tra header `Range` byte và chặn nếu thời lượng vượt quá 300 giây (5 phút).<br>- Người dùng có token hợp lệ được stream không giới hạn. | `403 Forbidden` (khi Guest xem quá 5p) |
| **6** | **AI Analysis** (Khởi chạy, theo dõi) | - **Owner:** R / Start own<br>- **Viewer:** Không có<br>- **Admin:** R / Start all | `POST /api/matches/{id}/ai-analyses`<br>`GET /api/ai-analyses/{id}`<br>`GET /api/matches/{id}/ai-analyses` | - Start AI: Phải là Chủ sở hữu trận đấu hoặc Admin.<br>- Theo dõi: Cho phép Owner và Admin tra cứu tiến trình qua ID. | `401 Unauthorized`<br>`403 Forbidden` |
| **7** | **AI Analysis Retry & Cancel** | - **Owner:** Retry own / Cancel own<br>- **Admin:** Retry all / Cancel all | `POST /api/matches/{id}/ai-analyses/{analysisId}/retry`<br>`POST /api/matches/{id}/ai-analyses/{analysisId}/cancel`<br>`POST /api/admin/ai-analyses/{id}/retry` | - Kiểm tra `match.ownerId == principal.id or hasRole('ADMIN')`.<br>- Phiên cũ bắt buộc phải ở trạng thái `FAILED`, `UNSUPPORTED`, hoặc `CANCELLED`. | `400 Bad Request`<br>`403 Forbidden` |
| **8** | **AI Events & Rallies** | - **Guest:** R (Public)<br>- **Viewer:** R (Public)<br>- **Owner:** R own (Private & Public)<br>- **Admin:** R all | `GET /api/ai-analyses/{id}/events`<br>`GET /api/ai-analyses/{id}/rallies`<br>`GET /api/rallies/{id}` | - Nếu match là `PUBLISHED`: Cho phép đọc công khai (`permitAll()`).<br>- Nếu match là Private: Yêu cầu xác thực và kiểm tra quyền sở hữu của caller. | `403 Forbidden`<br>`404 Not Found` |
| **9** | **Statistics** (Thống kê trận đấu) | - **Guest:** R (Public)<br>- **Viewer:** R (Public)<br>- **Owner:** R own (Private & Public)<br>- **Admin:** R all | `GET /api/ai-analyses/{id}/statistics` | - Nếu match là `PUBLISHED`: Cho phép đọc công khai (`permitAll()`).<br>- Nếu match là Private: Yêu cầu xác thực và kiểm tra quyền sở hữu. | `403 Forbidden`<br>`404 Not Found` |
| **10** | **Public Status** (Duyệt / Hủy duyệt) | - **User:** Không có<br>- **Admin:** CRUD status | `POST /api/admin/matches/{id}/publish`<br>`POST /api/admin/matches/{id}/unpublish` | - `@PreAuthorize("hasRole('ADMIN')")`.<br>- Người dùng thường gọi vào sẽ bị từ chối với mã 403 Forbidden. | `403 Forbidden` |
| **11** | **Quản lý Tài khoản & Khóa người dùng** | - **User:** Chỉ sở hữu tài khoản mình<br>- **Admin:** Manage (Lock/Unlock) | `GET /api/admin/users`<br>`GET /api/admin/users/{id}`<br>`PUT /api/admin/users/{id}/status` | - `@PreAuthorize("hasRole('ADMIN')")`.<br>- Cho phép Admin xem chi tiết mọi User và thay đổi trạng thái giữa `ACTIVE` và `LOCKED`. | `403 Forbidden` |
| **12** | **Xóa mềm & Khôi phục trận đấu** | - **Owner:** Soft delete own<br>- **Admin:** Soft delete & Restore all | `DELETE /api/matches/{id}`<br>`DELETE /api/admin/matches/{id}`<br>`POST /api/admin/matches/{id}/restore` | - User chỉ được xóa mềm match do chính mình tạo ra (`owner_id`).<br>- Khôi phục trận đấu (`/restore`) bắt buộc yêu cầu quyền `hasRole('ADMIN')`. | `403 Forbidden` |

---

## Kết luận Đánh giá Tính Tuân thủ (Compliance Summary)
1. **100% các dòng trong Permission Matrix** đều có ít nhất 1 (thậm chí 2-3) endpoint API tương ứng phụ trách kiểm soát logic xác thực và ủy quyền.
2. **Quy tắc phân tầng bảo vệ (Layered Security):**
   * *Tầng 1 (URL Filter Chain):* Phân loại công khai (`permitAll()`) cho các route `/api/auth/**`, `/api/public-matches/**`, và chặn quyền quản trị `/api/admin/**` với `hasRole('ADMIN')`.
   * *Tầng 2 (Method Security `@PreAuthorize`):* Kiểm tra quyền sở hữu tài nguyên động (`isOwner(#matchId)`) trực tiếp trên tầng Service/Controller trước khi thao tác CSDL.
3. **Mã phản hồi chuẩn RESTful:**
   * Không có token / token hết hạn: `401 Unauthorized`.
   * Có token nhưng không đúng quyền sở hữu hoặc không phải Admin: `403 Forbidden`.
   * Không tìm thấy tài nguyên: `404 Not Found`.

