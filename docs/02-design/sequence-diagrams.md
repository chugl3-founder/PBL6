# Thiết kế Biểu Đồ Tuần Tự (Sequence Diagrams Specification)

* **Dự án:** PBL6 Badminton - Match Analysis & Replay Platform
* **Thư mục:** `docs/02-design/`
* **Ngày thiết kế:** 2026-10-08
* **Nội dung:** Chi tiết hóa 3 luồng hoạt động then chốt của hệ thống bằng biểu đồ tuần tự (Mermaid):
  1. Luồng xử lý phân tích hoàn chỉnh từ đầu đến cuối (End-to-End Processing Flow).
  2. Luồng thử lại phân tích (Retry Analysis) và cơ chế chuyển đổi cờ `is_current`.
  3. Luồng xử lý các tình huống lỗi: Video ngoài phạm vi hỗ trợ (FR-M03-10) và Lỗi kỹ thuật AI Worker (FR-M03-09).

---

## 1. Sequence Diagram: Luồng Xử lý Toàn diện từ Upload đến Phân tích

Mô tả chi tiết từ khi người dùng tải video lên MinIO, kiểm tra tính hợp lệ, kích hoạt phiên phân tích bất đồng bộ, trích xuất sự kiện cú đánh, phân nhóm pha cầu và tính toán bảng thống kê trận đấu.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant FE as Frontend (React Client)
    participant BE as Web Backend (Spring Boot 3)
    participant MinIO as Object Storage (MinIO)
    participant DB as PostgreSQL Database
    participant Queue as Message Broker (RabbitMQ)
    participant Worker as AI Worker (Python / Mock Engine)

    %% Giai đoạn 1: Upload Video
    rect rgb(240, 248, 255)
        note over User, MinIO: Giai đoạn 1: Upload Video qua S3 Presigned URL (NFR-VID-04)
        User->>FE: 1. Chọn file MP4 & bấm "Tải lên"
        FE->>BE: POST /api/matches/{id}/videos/upload-url<br/>{fileName, fileSize, mimeType}
        BE->>MinIO: Khởi tạo S3 Presigned PUT URL (TTL: 15 phút)
        MinIO-->>BE: uploadUrl
        BE-->>FE: 200 OK {uploadUrl, storagePath}
        FE->>MinIO: HTTP PUT binary video stream (Trực tiếp lên MinIO, không qua Web Server)
        MinIO-->>FE: 200 OK (Upload hoàn tất)
        FE->>BE: POST /api/matches/{id}/videos/complete<br/>{storagePath, fileName, fileSize}
        BE->>MinIO: Kiểm tra file tồn tại & đọc metadata (FFprobe: duration, fps, resolution)
        BE->>DB: INSERT / UPDATE videos (status='READY', duration, width, height, fps)
        BE->>DB: UPDATE matches (status='READY')
        BE-->>FE: 200 OK (Video đã sẵn sàng phân tích)
    end

    %% Giai đoạn 2: Kích hoạt AI Analysis
    rect rgb(245, 255, 245)
        note over User, Worker: Giai đoạn 2: Kích hoạt Bất đồng bộ (NFR-PER-02, NFR-AI-01)
        User->>FE: 2. Nhấn "Bắt đầu phân tích AI"
        FE->>BE: POST /api/matches/{id}/ai-analyses
        BE->>DB: Kiểm tra match.status=='READY' & video.status=='READY'
        BE->>DB: INSERT ai_analyses (status='QUEUED', is_current=false) -> Nhận analysisId
        BE->>DB: UPDATE matches (status='ANALYZING')
        BE->>Queue: Push Job {analysisId, matchId, videoStoragePath}
        BE-->>FE: 202 Accepted {analysisId, status: 'QUEUED'} (Phản hồi < 200ms)
    end

    %% Giai đoạn 3: Polling & Xử lý ngầm
    rect rgb(255, 250, 240)
        note over FE, Worker: Giai đoạn 3: Xử lý ngầm tại Worker & Polling trạng thái
        par Frontend Polling kiểm tra tiến trình
            loop Mỗi 2 - 3 giây
                FE->>BE: GET /api/ai-analyses/{analysisId}
                BE->>DB: SELECT status FROM ai_analyses WHERE id=analysisId
                DB-->>BE: Trả về trạng thái hiện tại
                BE-->>FE: 200 OK {status: 'PROCESSING'}
            end
        and Tiến trình AI Computer Vision
            Queue->>Worker: Pop Job {analysisId, videoStoragePath}
            Worker->>DB: UPDATE ai_analyses (status='PROCESSING', started_at=NOW())
            Worker->>MinIO: Tải video stream / file tạm
            Note over Worker: Pipeline Computer Vision:<br/>1. Court Detection (4 góc sân)<br/>2. Player & Shuttlecock Tracking<br/>3. Hit Detection & Stroke Classification
            Worker->>DB: UPDATE ai_analyses (court_corners = '[{x,y},...]')
            
            note over Worker, DB: Lưu tập sự kiện cú đánh (ai_events)
            Worker->>DB: BULK INSERT ai_events (analysisId, event_order, hit_frame, time_seconds, stroke, confidence...)
            
            note over Worker, DB: Phân nhóm pha cầu (rallies)
            Worker->>Worker: Rally Segmentation Logic (nhóm các cú đánh dựa trên time_gap & service)
            Worker->>DB: BULK INSERT rallies (matchId, analysisId, rally_number, start_event_id, end_event_id, duration...)
            
            note over Worker, DB: Tổng hợp dữ liệu thống kê (match_statistics)
            Worker->>Worker: Aggregate Statistics (tổng strokes, rallies, forehand/backhand count, avg duration)
            Worker->>DB: INSERT match_statistics (matchId, analysisId, total_strokes, total_rallies, avg_duration...)
            
            note over Worker, DB: Hoàn tất & Kích hoạt phiên hiện tại
            Worker->>DB: BEGIN TRANSACTION
            Worker->>DB: UPDATE ai_analyses SET is_current=false WHERE match_id=matchId
            Worker->>DB: UPDATE ai_analyses SET status='COMPLETED', completed_at=NOW(), is_current=true WHERE id=analysisId
            Worker->>DB: UPDATE matches SET status='ANALYZED' WHERE id=matchId
            Worker->>DB: COMMIT TRANSACTION
        end
    end

    %% Giai đoạn 4: Hiển thị kết quả Replay
    rect rgb(255, 240, 245)
        note over FE, DB: Giai đoạn 4: Hiển thị kết quả Replay & Thống kê
        FE->>BE: GET /api/ai-analyses/{analysisId}
        BE-->>FE: 200 OK {status: 'COMPLETED', is_current: true}
        FE->>BE: GET /api/ai-analyses/{analysisId}/events
        BE->>DB: SELECT * FROM ai_events WHERE analysis_id=analysisId
        DB-->>BE: Danh sách events
        BE-->>FE: 200 OK EventDTO[]
        FE->>BE: GET /api/ai-analyses/{analysisId}/rallies
        BE-->>FE: 200 OK RallyDTO[]
        FE->>BE: GET /api/ai-analyses/{analysisId}/statistics
        BE-->>FE: 200 OK MatchStatisticsDTO
        FE->>User: Render Trình phát video Video.js kèm Stroke Markers trên Timeline, danh sách Rally & Biểu đồ Thống kê
    end
```

---

## 2. Sequence Diagram: Luồng Thử lại Phân tích (Retry Analysis) & Chuyển đổi `is_current`

Khi một phiên phân tích trước đó bị `FAILED` hoặc `UNSUPPORTED`, người dùng sở hữu trận đấu (User Owner) hoặc Quản trị viên (Admin) có thể bấm **Thử lại (Retry)**. Hệ thống tạo một bản ghi phân tích **mới hoàn toàn** để bảo toàn lịch sử kiểm toán, và chỉ chuyển cờ `is_current = true` khi phiên mới thành công mỹ mãn.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Owner / Admin
    participant FE as Frontend Client
    participant BE as Web Backend
    participant DB as PostgreSQL
    participant Queue as RabbitMQ Broker
    participant Worker as AI Worker

    note over DB: Hiện trạng CSDL trước khi Retry:<br/>- ai_analyses (ID=101, status='FAILED', is_current=false)<br/>- matches (ID=10, status='READY')

    User->>FE: 1. Bấm nút "Thử lại phân tích (Retry)" trên giao diện
    FE->>BE: POST /api/matches/10/ai-analyses/101/retry
    
    BE->>DB: Kiểm tra quyền: caller == match.ownerId OR caller.isAdmin()
    BE->>DB: Kiểm tra trạng thái phiên cũ ID=101 (phải là FAILED, UNSUPPORTED, hoặc CANCELLED)
    
    note over BE, DB: Khởi tạo phiên phân tích MỚI (ID=102)
    BE->>DB: INSERT ai_analyses (match_id=10, video_id=V1, status='QUEUED', is_current=false) -> Nhận ID=102
    BE->>DB: UPDATE matches SET status='ANALYZING' WHERE id=10
    
    BE->>Queue: Push Job {analysisId: 102, matchId: 10, videoStoragePath: '...'}
    BE-->>FE: 202 Accepted {analysisId: 102, status: 'QUEUED'}
    
    FE->>FE: Bắt đầu Polling theo dõi analysisId=102

    Queue->>Worker: Pop Job {analysisId: 102}
    Worker->>DB: UPDATE ai_analyses SET status='PROCESSING', started_at=NOW() WHERE id=102
    
    Note over Worker: Worker phân tích video & sinh lại dữ liệu chuẩn xác...
    Worker->>DB: BULK INSERT ai_events (analysis_id=102, ...)
    Worker->>DB: BULK INSERT rallies (analysis_id=102, ...)
    Worker->>DB: INSERT match_statistics (analysis_id=102, ...)

    note over Worker, DB: Transaction chuyển giao cờ is_current
    Worker->>DB: BEGIN TRANSACTION
    Worker->>DB: UPDATE ai_analyses SET is_current=false WHERE match_id=10 AND id != 102
    Worker->>DB: UPDATE ai_analyses SET status='COMPLETED', completed_at=NOW(), is_current=true WHERE id=102
    Worker->>DB: UPDATE matches SET status='ANALYZED' WHERE id=10
    Worker->>DB: COMMIT TRANSACTION

    FE->>BE: GET /api/ai-analyses/102
    BE-->>FE: 200 OK {id: 102, status: 'COMPLETED', is_current: true}
    FE->>User: Cập nhật giao diện Replay với dữ liệu từ phiên ID=102
```

---

## 3. Sequence Diagram: Luồng Xử lý Lỗi (Error Handling Flows)

Hệ thống phân biệt rõ ràng 2 kịch bản lỗi chính:
* **Nhánh A:** Video nằm ngoài phạm vi hỗ trợ của mô hình Computer Vision ([FR-M03-10](file:///d:/DUT/HK1_Nam4_2026-2027/PBL6/PBL6_code/docs/00-requirements/PBL6-Badminton_requirements.md#L49)).
* **Nhánh B:** Lỗi kỹ thuật hạ tầng AI / Worker crash / Timeout ([FR-M03-09](file:///d:/DUT/HK1_Nam4_2026-2027/PBL6/PBL6_code/docs/00-requirements/PBL6-Badminton_requirements.md#L48)).

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend Client
    participant BE as Web Backend
    participant DB as PostgreSQL
    participant Worker as AI Worker (Python)
    actor Admin as Admin Dashboard

    %% ==========================================
    %% Nhánh A: Video ngoài phạm vi hỗ trợ (FR-M03-10)
    %% ==========================================
    rect rgb(255, 245, 230)
        note over Worker, FE: Nhánh A: Video ngoài phạm vi hỗ trợ (Góc máy lệch, không tìm thấy sân) - FR-M03-10
        Worker->>Worker: Quét các frame đầu tiên để nhận diện sân (Court Line Detection)
        Note over Worker: Court confidence < 0.6<br/>HOẶC góc máy lia/di động không phải fixed camera
        Worker->>Worker: Hủy tiến trình sớm (Fail-Fast) để tiết kiệm tài nguyên GPU
        
        Worker->>DB: BEGIN TRANSACTION
        Worker->>DB: UPDATE ai_analyses SET<br/>status='UNSUPPORTED',<br/>error_code='ERR_UNSUPPORTED_CAMERA_ANGLE',<br/>error_message='Không phát hiện được 4 góc sân cố định từ góc quay phía sau.',<br/>completed_at=NOW(), is_current=false WHERE id=analysisId
        Worker->>DB: UPDATE matches SET status='READY' WHERE id=matchId
        Worker->>DB: COMMIT TRANSACTION

        FE->>BE: GET /api/ai-analyses/{analysisId} (Polling)
        BE-->>FE: 200 OK {status: 'UNSUPPORTED', errorCode: 'ERR_UNSUPPORTED_CAMERA_ANGLE', ...}
        
        FE->>FE: Hiển thị Banner cảnh báo màu cam (Hướng dẫn tiêu chuẩn góc quay camera)
        FE->>FE: Bật lại nút "Tải video khác" hoặc "Thử lại"
    end

    %% ==========================================
    %% Nhánh B: Lỗi kỹ thuật AI Worker Crash / Timeout (FR-M03-09)
    %% ==========================================
    rect rgb(255, 235, 235)
        note over Worker, Admin: Nhánh B: Lỗi Kỹ thuật AI Worker (OOM, Timeout, Frame Corrupt) - FR-M03-09
        Worker->>Worker: Đang chạy inference...
        Note over Worker: Gặp Exception: Out Of Memory (OOM) / File Frame bị hỏng giữa chừng
        
        Worker->>DB: BEGIN TRANSACTION
        Worker->>DB: UPDATE ai_analyses SET<br/>status='FAILED',<br/>error_code='ERR_AI_INFERENCE_CRASH',<br/>error_message='Bộ nhớ worker vượt ngưỡng hoặc frame video bị lỗi. Vui lòng bấm Retry.',<br/>completed_at=NOW(), is_current=false WHERE id=analysisId
        Worker->>DB: UPDATE matches SET status='READY' WHERE id=matchId
        Worker->>DB: COMMIT TRANSACTION

        FE->>BE: GET /api/ai-analyses/{analysisId} (Polling)
        BE-->>FE: 200 OK {status: 'FAILED', errorCode: 'ERR_AI_INFERENCE_CRASH', ...}
        
        FE->>FE: Hiển thị Alert cảnh báo lỗi màu đỏ kèm nút "Thử lại phân tích (Retry)"
        
        par Giám sát từ Quản trị viên
            Admin->>BE: GET /api/admin/ai-analyses?status=FAILED
            BE->>DB: SELECT * FROM ai_analyses WHERE status='FAILED'
            DB-->>BE: Danh sách các session lỗi
            BE-->>Admin: Trả về danh sách kèm mã lỗi để Admin theo dõi sức khỏe worker
        end
    end
```

---

## 4. Bảng Tra cứu Mã Lỗi Chuẩn hóa (Error Code Dictionary)

| Mã Lỗi (`error_code`) | Nhóm Lỗi | Thông điệp hiển thị người dùng (`error_message`) | Hướng dẫn khắc phục |
| :--- | :---: | :--- | :--- |
| `ERR_UNSUPPORTED_CAMERA_ANGLE` | Nghiệp vụ (FR-M03-10) | Không phát hiện được 4 góc sân cố định từ góc quay phía sau sân. | Đảm bảo video được quay từ góc camera tĩnh, đặt chính giữa phía sau vạch cuối sân, nhìn rõ toàn bộ mặt sân. |
| `ERR_VIDEO_RESOLUTION_LOW` | Nghiệp vụ (FR-M03-10) | Độ phân giải video quá thấp (tối thiểu yêu cầu 720p HD). | Vui lòng tải lên video có độ phân giải tối thiểu $1280 \times 720$. |
| `ERR_CORRUPTED_VIDEO_STREAM` | Kỹ thuật (FR-M03-09) | Tệp video bị gián đoạn hoặc hỏng frame trong quá trình giải mã. | Kiểm tra lại file video gốc trên máy tính và tải lên lại. |
| `ERR_AI_TIMEOUT` | Kỹ thuật (FR-M03-09) | Quá thời gian xử lý tối đa (timeout sau 15 phút). | Bấm nút **"Thử lại phân tích (Retry)"** để đưa vào hàng đợi xử lý lại. |
| `ERR_AI_INFERENCE_CRASH` | Kỹ thuật (FR-M03-09) | Lỗi tiến trình suy luận mô hình thị giác máy tính. | Bấm **Retry** hoặc liên hệ Quản trị viên hệ thống để kiểm tra tài nguyên GPU. |

