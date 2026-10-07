# FR  

## M01 — Account Management 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M01-01** | Hệ thống cho phép người dùng đăng ký tài khoản bằng email và password. | User | Must |
| **FR-M01-02** | Hệ thống xác thực thông tin đăng nhập trước khi cho phép truy cập hệ thống. | User | Must |
| **FR-M01-03** | Hệ thống cho phép người dùng đăng xuất. | User/Admin | Must |
| **FR-M01-04** | Hệ thống cho phép người dùng xem và cập nhật thông tin profile. | User/Admin | Must |
| **FR-M01-05** | Hệ thống cho phép người dùng cập nhật avatar, tên, tuổi, giới tính và trình độ badminton. | User | Must |
| **FR-M01-06** | Hệ thống hỗ trợ quy trình quên mật khẩu. | User | Must |
| **FR-M01-07** | Hệ thống cho phép đặt lại mật khẩu thông qua quy trình xác thực phù hợp. | User | Must |
| **FR-M01-08** | Hệ thống hỗ trợ đăng nhập bằng tài khoản Google. | User | Could |


## M02 — Match Management 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M02-01** | User có thể tạo một match mới. | User | Must |
| **FR-M02-02** | Admin có thể tạo một match mới để xây dựng public match. | Admin | Must |
| **FR-M02-03** | Người tạo match có thể nhập thông tin match. | User/Admin | Must |
| **FR-M02-04** | Người tạo match có thể cập nhật thông tin match trước/trong phạm vi cho phép của hệ thống. | User/Admin | Must |
| **FR-M02-05** | Người tạo match có thể upload video trận đấu. | User/Admin | Must |
| **FR-M02-06** | Hệ thống lưu metadata của video được upload. | System | Must |
| **FR-M02-07** | User có thể xem danh sách các match do mình tạo. | User | Must |
| **FR-M02-08** | User có thể xem thông tin chi tiết match của mình. | User | Must |
| **FR-M02-09** | User có thể soft delete match của mình. | User | Must |
| **FR-M02-10** | Admin có thể quản lý các match trong hệ thống. | Admin | Must |
| **FR-M02-11** | Admin có thể publish một match đã đủ điều kiện. | Admin | Must |
| **FR-M02-12** | Admin có thể unpublish public match. | Admin | Must |
| **FR-M02-13** | Admin có thể restore match đã soft delete. | Admin | Must |


## M03 — AI Analysis 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M03-01** | Hệ thống kiểm tra video trước khi đưa vào AI processing. | System | Must |
| **FR-M03-02** | Hệ thống tạo một AI analysis session cho match. | System | Must |
| **FR-M03-03** | User/Admin có thể yêu cầu bắt đầu AI analysis. | User/Admin | Must |
| **FR-M03-04** | Hệ thống đưa AI analysis vào trạng thái processing. | System | Must |
| **FR-M03-05** | Hệ thống cung cấp trạng thái xử lý AI cho User/Admin. | System | Must |
| **FR-M03-06** | Hệ thống tiếp nhận kết quả AI sau khi processing hoàn tất. | System | Must |
| **FR-M03-07** | Hệ thống lưu AI analysis result. | System | Must |
| **FR-M03-08** | Hệ thống lưu các stroke events do AI phát hiện. | System | Must |
| **FR-M03-09** | Hệ thống xử lý trường hợp AI analysis thất bại. | System | Must |
| **FR-M03-10** | Hệ thống xử lý trường hợp video nằm ngoài phạm vi hỗ trợ. | System | Must |
| **FR-M03-11** | Hệ thống hiển thị cảnh báo đối với event có confidence thấp. | System | Must |
| **FR-M03-12** | Admin có thể retry một AI analysis thất bại. | Admin | Must |


## M04 — Match Replay 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M04-01** | User/Admin có thể phát video match. | User/Admin | Must |
| **FR-M04-02** | Hệ thống cung cấp play/pause/seek và các video controls cơ bản. | System | Must |
| **FR-M04-03** | Hệ thống hiển thị timeline của AI events trên video. | System | Must |
| **FR-M04-04** | Hệ thống hiển thị stroke markers tương ứng với AI events. | System | Must |
| **FR-M04-05** | User/Admin có thể chọn một stroke event trên timeline. | User/Admin | Must |
| **FR-M04-06** | Khi chọn event, hệ thống đưa video tới thời điểm tương ứng với event. | System | Must |
| **FR-M04-07** | Hệ thống hiển thị thông tin stroke event được chọn. | System | Must |
| **FR-M04-08** | Hệ thống có thể hiển thị replay vị trí player trên court 2D. | System | Could |


## M05 — Rally & Timeline Analysis 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M05-01** | Hệ thống nhóm các stroke events thành các rally. | System | Must |
| **FR-M05-02** | Hệ thống xác định boundary giữa các rally. | System | Must |
| **FR-M05-03** | Hệ thống ghi nhận phương pháp xác định rally boundary. | System | Must |
| **FR-M05-04** | Hệ thống tạo summary cho từng rally. | System | Must |
| **FR-M05-05** | User/Admin có thể xem danh sách rally. | User/Admin | Must |
| **FR-M05-06** | User/Admin có thể xem chi tiết một rally. | User/Admin | Must |
| **FR-M05-07** | Hệ thống hiển thị sequence các stroke trong rally. | System | Must |
| **FR-M05-08** | User/Admin có thể chuyển trực tiếp tới rally tương ứng trên video. | User/Admin | Must |
| **FR-M05-09** | Hệ thống đồng bộ rally với Match Replay. | System | Must |


## M06 — Match Statistics 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M06-01** | Hệ thống tính tổng số stroke events. | System | Must |
| **FR-M06-02** | Hệ thống tính tổng số rallies. | System | Must |
| **FR-M06-03** | Hệ thống tính các thống kê về stroke type. | System | Must |
| **FR-M06-04** | Hệ thống tính thống kê stroke theo player. | System | Must |
| **FR-M06-05** | Hệ thống tính thống kê forehand/backhand/aroundhead/unknown. | System | Must |
| **FR-M06-06** | Hệ thống tính thống kê confidence. | System | Should |
| **FR-M06-07** | Hệ thống tính average strokes per rally. | System | Must |
| **FR-M06-08** | Hệ thống tính average rally duration. | System | Must |
| **FR-M06-09** | User/Admin có thể xem match overview statistics. | User/Admin | Must |
| **FR-M06-10** | User/Admin có thể xem stroke distribution. | User/Admin | Must |
| **FR-M06-11** | User/Admin có thể xem player statistics. | User/Admin | Must |
| **FR-M06-12** | User/Admin có thể xem rally statistics. | User/Admin | Must |
| **FR-M06-13** | User/Admin có thể filter statistics. | User/Admin | Should |


## M07 — Public Match Library 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M07-01** | User/Admin có thể xem danh sách public matches. | User/Admin | Must |
| **FR-M07-02** | User/Admin có thể tìm kiếm public matches. | User/Admin | Must |
| **FR-M07-03** | User/Admin có thể filter public matches. | User/Admin | Should |
| **FR-M07-04** | User/Admin có thể sort public matches. | User/Admin | Should |
| **FR-M07-05** | User/Admin có thể xem preview của public match. | User/Admin | Must |
| **FR-M07-06** | User/Admin có thể xem public match detail. | User/Admin | Must |
| **FR-M07-07** | User/Admin có thể mở replay của public match. | User/Admin | Must |
| **FR-M07-08** | User/Admin có thể xem statistics của public match. | User/Admin | Must |
| **FR-M07-09** | User/Admin có thể xem rally của public match. | User/Admin | Must |


## M08 — Admin Management 

| ID | Requirement | Actor | Priority |
| :--- | :--- | :--- | :--- |
| **FR-M08-01** | Admin có thể xem dashboard quản trị. | Admin | Must |
| **FR-M08-02** | Admin có thể xem danh sách user. | Admin | Must |
| **FR-M08-03** | Admin có thể xem user detail. | Admin | Must |
| **FR-M08-04** | Admin có thể quản lý match. | Admin | Must |
| **FR-M08-05** | Admin có thể xem match detail. | Admin | Must |
| **FR-M08-06** | Admin có thể monitor AI analyses. | Admin | Must |
| **FR-M08-07** | Admin có thể xem các AI analyses thất bại. | Admin | Must |
| **FR-M08-08** | Admin có thể publish/unpublish public match. | Admin | Must |
| **FR-M08-09** | Admin có thể soft delete match. | Admin | Must |
| **FR-M08-10** | Admin có thể restore match đã soft delete. | Admin | Must |
| **FR-M08-11** | Admin có thể retry AI analysis thất bại. | Admin | Must |

---

# NFR  

| ID | Nhóm | Yêu cầu | MVP |
| :--- | :--- | :--- | :--- |
| NFR-PER-01 | Performance | Request thông thường ≤ khoảng 2s | Must |
| NFR-PER-02 | Performance | AI không block HTTP request | Must |
| NFR-AI-01 | AI | AI processing asynchronous | Must |
| NFR-AI-02 | AI | Có trạng thái AI processing | Must |
| NFR-AI-03 | AI | Hỗ trợ retry | Must |
| NFR-AI-04 | AI | AI Worker tách khỏi Web Backend | Must |
| NFR-VID-01 | Video | Hỗ trợ MP4 | Must |
| NFR-VID-02 | Video | Chỉ hỗ trợ singles/fixed-camera phù hợp | Must |
| NFR-VID-03 | Video | Có giới hạn size/duration | Must |
| NFR-VID-04 | Video | Upload phải xử lý được file lớn | Should |
| NFR-STO-01 | Storage | AI result phải persistent | Must |
| NFR-STO-02 | Storage | Match sử dụng soft delete | Must |
| NFR-SEC-01 | Security | Password được hash | Must |
| NFR-SEC-02 | Security | Authentication | Must |
| NFR-SEC-03 | Security | Authorization | Must |
| NFR-SEC-04 | Security | Role-based access | Must |
| NFR-PRI-01 | Privacy | Video chỉ được truy cập theo quyền | Must |
| NFR-ERR-01 | Error | Phân biệt upload/validation/AI/system error | Must |
| NFR-LOG-01 | Logging | Log các thao tác quan trọng | Must |
| NFR-MNT-01 | Maintainability | Tách Controller/Service/Repository | Must |
| NFR-SCA-01 | Scalability | Có thể tách/mở rộng AI Worker | Should |
| NFR-AVL-01 | Availability | Restart không làm mất persistent data | Must |
| NFR-CON-01 | Consistency | Statistics dựa trên AI Events/Rallies | Must |
| NFR-INT-01 | Integrity | AI Events không được chỉnh sửa | Must |

---

# Final Permission Matrix  

| Resource | User Owner | User Public Viewer | Admin |
| :--- | :--- | :--- | :--- |
| Profile | CRUD own | — | Manage |
| Match metadata | CRUD own | R | CRUD |
| Video | CRUD own | R | CRUD |
| AI Analysis | R / Start own | R | R / Start / Retry |
| AI Events | R | R | R |
| Rally | R | R | R |
| Statistics | R | R | R |
| Public status | — | — | CRUD status |
| User accounts | Own only | — | Manage |
| Deleted Match | — | — | Restore |

---

# DB  

## 1. User

| Field | Type đề xuất | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| email | VARCHAR(255) | NO | UNIQUE | User có thể đổi* |
| password_hash | VARCHAR(255) | NO | — | Hệ thống |
| role | ENUM | NO | — | Admin |
| avatar_url | VARCHAR(500) | YES | — | User |
| full_name | VARCHAR(100) | YES | — | User |
| age | INT | YES | — | User |
| gender | VARCHAR/ENUM | YES | — | User |
| badminton_level | VARCHAR/ENUM | YES | — | User |
| status | ENUM | NO | — | Admin |
| created_at | DATETIME | NO | — | ❌ |
| updated_at | DATETIME | NO | — | System |


## 2. matches 

| Field | Type | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| owner_id | BIGINT/UUID | NO | FK | ❌ |
| player_a_name | VARCHAR(100) | NO | — | ✅ |
| player_b_name | VARCHAR(100) | NO | — | ✅ |
| upper_player | ENUM | NO | — | ✅ |
| lower_player | ENUM | NO | — | ✅ |
| match_date | DATE | YES | — | ✅ |
| title | VARCHAR(200) | YES | — | ✅ |
| description | TEXT | YES | — | ✅ |
| source | ENUM | NO | — | System |
| status | ENUM | NO | — | System |
| deleted_at | DATETIME | YES | — | System |
| created_at | DATETIME | NO | — | System |
| updated_at | DATETIME | NO | — | System |


## 3. videos 

| Field | Type | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| match_id | BIGINT/UUID | NO | FK | ❌ |
| file_name | VARCHAR(255) | NO | — | ❌ |
| storage_path | VARCHAR(1000) | NO | — | ❌ |
| mime_type | VARCHAR(100) | NO | — | ❌ |
| file_size | BIGINT | NO | — | ❌ |
| duration_seconds | DECIMAL | YES | — | System |
| width | INT | YES | — | System |
| height | INT | YES | — | System |
| fps | DECIMAL | YES | — | System |
| status | ENUM | NO | — | System |
| created_at | DATETIME | NO | — | System |


## 4. ai_analyses 

| Field | Type | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| match_id | BIGINT/UUID | NO | FK | ❌ |
| video_id | BIGINT/UUID | NO | FK | ❌ |
| status | ENUM | NO | — | System |
| model_name | VARCHAR(100) | NO | — | System |
| model_version | VARCHAR(100) | YES | — | System |
| started_at | DATETIME | YES | — | System |
| completed_at | DATETIME | YES | — | System |
| error_code | VARCHAR(100) | YES | — | System |
| error_message | TEXT | YES | — | System |
| court_corners | JSON | YES | — | System |
| is_current | BOOLEAN | NO | — | System |
| created_at | DATETIME | NO | — | System |


## 5. ai_events 

| Field | Type | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| analysis_id | BIGINT/UUID | NO | FK | ❌ |
| event_order | INT | NO | — | ❌ |
| start_frame | INT | NO | — | ❌ |
| hit_frame | INT | NO | — | ❌ |
| end_frame | INT | NO | — | ❌ |
| time_seconds | DECIMAL | NO | — | ❌ |
| player_side | ENUM | NO | — | ❌ |
| stroke | ENUM/VARCHAR | NO | — | ❌ |
| stroke_side | ENUM/VARCHAR | NO | — | ❌ |
| confidence | DECIMAL | NO | — | ❌ |
| created_at | DATETIME | NO | — | ❌ |


## 6. rallies 

| Field | Type | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| match_id | BIGINT/UUID | NO | FK | ❌ |
| analysis_id | BIGINT/UUID | NO | FK | ❌ |
| rally_number | INT | NO | — | ❌ |
| start_event_id | BIGINT/UUID | NO | FK | ❌ |
| end_event_id | BIGINT/UUID | NO | FK | ❌ |
| start_time | DECIMAL | NO | — | ❌ |
| end_time | DECIMAL | NO | — | ❌ |
| duration | DECIMAL | NO | — | ❌ |
| total_strokes | INT | NO | — | ❌ |
| boundary_type | ENUM | NO | — | ❌ |
| created_at | DATETIME | NO | — | ❌ |


## 7. match_statistics 

| Field | Type | Null | Key | Có sửa? |
| :--- | :--- | :--- | :--- | :--- |
| id | BIGINT/UUID | NO | PK | ❌ |
| match_id | BIGINT/UUID | NO | FK | ❌ |
| analysis_id | BIGINT/UUID | NO | FK UNIQUE | ❌ |
| total_strokes | INT | NO | — | ❌ |
| total_rallies | INT | NO | — | ❌ |
| avg_strokes_per_rally | DECIMAL | NO | — | ❌ |
| avg_rally_duration | DECIMAL | NO | — | ❌ |
| player_a_strokes | INT | NO | — | ❌ |
| player_b_strokes | INT | NO | — | ❌ |
| forehand_count | INT | NO | — | ❌ |
| backhand_count | INT | NO | — | ❌ |
| aroundhead_count | INT | NO | — | ❌ |
| unknown_side_count | INT | NO | — | ❌ |
| avg_confidence | DECIMAL | NO | — | ❌ |
| created_at | DATETIME | NO | — | ❌ |

---

# API Specification  

| # | Method | Endpoint | Actor | Mục đích | Response chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | POST | /api/auth/register | Guest | Đăng ký | User |
| 2 | POST | /api/auth/login | Guest | Đăng nhập | Token + User |
| 3 | POST | /api/auth/logout | User/Admin | Đăng xuất | Success |
| 4 | POST | /api/auth/forgot-password | Guest | Yêu cầu reset password | Success |
| 5 | POST | /api/auth/reset-password | Guest | Đặt password mới | Success |
| 6 | GET | /api/users/me | User/Admin | Xem profile | User |
| 7 | PUT | /api/users/me | User/Admin | Sửa profile | User |
| 8 | POST | /api/matches | User/Admin | Tạo Match | Match |
| 9 | GET | /api/matches | User/Admin | Danh sách Match của mình | Match[] |
| 10 | GET | /api/matches/{id} | User/Admin | Xem Match | Match |
| 11 | PUT | /api/matches/{id} | Owner/Admin | Sửa metadata Match | Match |
| 12 | DELETE | /api/matches/{id} | Owner/Admin | Soft delete Match | Success |
| 13 | POST | /api/matches/{id}/videos | Owner/Admin | Upload video | Video |
| 14 | GET | /api/matches/{id}/videos | Owner/Admin/Public | Xem video metadata | Video[] |
| 15 | GET | /api/videos/{id}/stream | Authorized | Stream video | Video stream |
| 16 | POST | /api/matches/{id}/ai-analyses | Owner/Admin | Start AI Analysis | Analysis |
| 17 | GET | /api/ai-analyses/{id} | Authorized | Theo dõi AI | Analysis |
| 18 | GET | /api/matches/{id}/ai-analyses | Owner/Admin | Lịch sử AI Analysis | Analysis[] |
| 19 | GET | /api/ai-analyses/{id}/events | Authorized | Xem Stroke Events | Event[] |
| 20 | GET | /api/ai-analyses/{id}/rallies | Authorized | Xem Rally list | Rally[] |
| 21 | GET | /api/rallies/{id} | Authorized | Xem Rally detail | Rally |
| 22 | GET | /api/ai-analyses/{id}/statistics | Authorized | Xem Statistics | Statistics |
| 23 | GET | /api/public-matches | User/Admin | Browse Public Matches | Match[] |
| 24 | GET | /api/public-matches/{id} | User/Admin | Xem Public Match | Match |
| 25 | GET | /api/admin/users | Admin | Danh sách User | User[] |
| 26 | GET | /api/admin/users/{id} | Admin | Xem User detail | User |
| 27 | PUT | /api/admin/users/{id}/status | Admin | Lock/Unlock User | User |
| 28 | GET | /api/admin/matches | Admin | Quản lý toàn bộ Match | Match[] |
| 29 | GET | /api/admin/matches/{id} | Admin | Xem Match detail | Match |
| 30 | DELETE | /api/admin/matches/{id} | Admin | Soft delete Match | Success |
| 31 | POST | /api/admin/matches/{id}/restore | Admin | Restore Match | Match |
| 32 | POST | /api/admin/matches/{id}/publish | Admin | Publish Public Match | Match |
| 33 | POST | /api/admin/matches/{id}/unpublish | Admin | Unpublish Match | Match |
| 34 | POST | /api/admin/ai-analyses/{id}/retry | Admin | Retry AI | New Analysis |
