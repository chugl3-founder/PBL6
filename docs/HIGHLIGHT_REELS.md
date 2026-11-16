# Video highlight tự động

Chủ trận chọn các pha cầu hay nhất (AI chọn sẵn), máy chủ dựng thành một file MP4 có màn tiêu đề, bảng tỉ số và nhãn từng pha. Việc dựng chạy nền: người dùng đóng hộp thoại, đi trang khác, tiến độ hiện ở khay góc dưới phải.

Đã chạy thử ngày 12/11/2026 với trận 245 (video trên Supabase S3) và trận 294 (video YouTube): dựng 9 giây video mất khoảng 7 giây, 75 giây video từ YouTube mất khoảng 1 phút, phần lớn là thời gian tải các đoạn video.

## Cách các phần nối với nhau

```
Trang replay ── POST /api/matches/{id}/highlights (202) ──> backend ──job──> badminton.media.queue
     ▲                                                                              │
     │                                                                        Media worker (CPU, ffmpeg)
     │                                                                        đọc đúng các đoạn cần cắt
     └── khay tiến độ / trang Highlight <── GET /api/highlights <── Supabase DB/S3 <── ghi kết quả
```

- **Chọn pha** — [HighlightSelector.java](../backend/src/main/java/com/badminton/service/HighlightSelector.java): chấm điểm từng pha (pha dài, kết thúc ván +40, cứu điểm game +30, smash hoặc tấn công lưới ăn điểm +20), mặc định chọn khoảng 2 phút, tối đa 12 pha, luôn gợi ý ít nhất 3 pha. Giới hạn cứng: 180 giây, 20 pha mỗi video.
- **Dựng video** — [backend/integrations/media-worker](../backend/integrations/media-worker/README.md): mỗi pha encode riêng 1280x720 H.264 + AAC, ghép bằng stream copy. Bitrate tính theo tổng thời lượng để file dưới khoảng 40 MB vì Supabase giới hạn 50 MB mỗi file. Chạy bằng CPU (libx264), không dùng GPU.
- **Lưu trữ** — file ở bucket `badminton-videos`, đường dẫn `highlights/{matchId}/{reelId}.mp4`; thông tin ở bảng `highlight_reels` (migration V10).
- **Giao diện** — nút "Tạo video highlight" trên trang replay (chỉ chủ trận, khi phân tích xong): xem lại từng pha ngay trong hộp thoại rồi tick chọn. Trang **Highlight** (`/highlights`) liệt kê video của mọi trận; khay tiến độ hiện trên mọi trang và tự khôi phục sau khi tải lại trang.

## Chạy

`START_ALL_SERVICES.bat` (và `START_WEB_ONLY.bat`) bật thêm cửa sổ **Media Worker**. Cần ffmpeg và ffprobe trong PATH. Worker dùng chung `.env` với ai-worker. Với Docker: service `media-worker` trong `docker-compose.yml`.

## Tỉ số theo ván và theo người

AI ghi tỉ số theo **sân** (trên/dưới) và có video không tính lại từ 0 khi sang ván mới (trận 294 lưu 1 ván duy nhất, tỉ số cộng dồn tới 36–43). Hai VĐV lại đổi sân sau mỗi ván và ở 11 điểm của ván 3. Phía web tự tách:

- `HighlightSelector.trackGames` đi lần lượt các pha: một bên thắng ván theo luật (21 và hơn 2 điểm, hoặc chạm 30) thì ván sau bắt đầu lại 0–0; đồng thời theo dõi ai đang ở sân nào. Nếu dữ liệu đã tự về 0 mỗi ván thì vẫn dùng đúng.
- API rally (`/api/matches/{id}/analysis/rallies` và bản công khai) trả thêm `gameNumber`, `scoreA`, `scoreB` (sau pha), `winnerPlayer`, `upperPlayer`.
- Dùng ở: video highlight (bảng tỉ số theo người, nhãn "VÁN N"), bảng điểm đầu trang replay, danh sách pha, biểu đồ diễn biến tỉ số.

Kiểm tra với trận 294: ván 1 kết thúc 24–22, ván 2 kết thúc 21–9, pha 72 là 17–5 trước pha, khớp bảng điểm của đài.

## Đã xử lý ngày 13/11/2026

- **Thống kê theo người khi đổi sân** (phần tính ở frontend): trang replay chuyển dữ liệu về "sân lúc video bắt đầu" theo `upperPlayer` của từng pha ([courtEnds.ts](../frontend/src/utils/courtEnds.ts)) trước khi đưa vào "Đáng chú ý", "Vì sao mất điểm", heatmap (lật cả toạ độ), biểu đồ tỉ số, timeline, danh sách cú đánh và số cú mỗi người ở tab Thống kê. Sơ đồ sân 2D và thẻ cú đánh dùng đúng người đang đứng sân trên tại thời điểm đó.
- **Pha sau khi trận kết thúc**: `trackGames` kết thúc trận khi một người thắng 2 ván (hoặc xong ván 3); các pha sau đó có `afterMatch = true`, giữ tỉ số cuối, không vào gợi ý highlight, tỉ số, thống kê; danh sách pha ghi "Sau trận". Trận 294: pha 82–84.
- **Tỉ số khi video bắt đầu giữa trận**: migration V11 thêm `start_game`, `start_score_a`, `start_score_b` cho bảng `matches`; chủ trận nhập ở trang chi tiết trận (khung "Hai vận động viên"). Tỉ số được tính lúc đọc nên áp dụng ngay, không cần phân tích lại. `upper_player` nghĩa là người ở sân trên **lúc video bắt đầu**.
- **Phân quyền**: `/api/matches/{id}/analysis/{status,events,rallies,statistics}` và `/api/ai-analyses/{id}/statistics` chỉ cho chủ trận hoặc admin (403 với người khác). Trận công khai vẫn đọc qua `/api/public-matches/*`.
- **API tạo video**: `HighlightQueryRepository` đọc trận, phân tích, video, trạng thái bận và toàn bộ rally trong 1 lượt; insert 1 lượt. Đo được: POST 0,29 s (gồm gửi RabbitMQ), gợi ý 0,12–0,22 s.
- **Lỗi đường dẫn**: 404 `ERR_NOT_FOUND` cho đường dẫn không tồn tại, 405 cho sai phương thức, 400 cho JSON hỏng hoặc tham số sai kiểu.
- **Pool kết nối**: mặc định còn 6 (+ 6 idle) mỗi backend, hai backend cùng chạy vẫn dưới 15.
- **Reel 4** (trận 294) đã xóa; reel 5 tạo lại với các pha gợi ý mặc định, nhãn "Kết thúc ván 1 · 24-22", "Kết thúc ván 2 · 21-9".
- **Xem trước pha YouTube** đã kiểm tra bằng tài khoản chủ trận (trình duyệt tự động) và sửa 2 lỗi trong [RallyPreviewPlayer.tsx](../frontend/src/components/replay/RallyPreviewPlayer.tsx):
  - Bấm một pha trong 1–2 giây đầu sau khi mở hộp thoại thì YouTube bỏ qua lệnh phát. Giờ player kiểm tra vị trí phát sau 1,5 s và gửi lại tối đa 4 lần.
  - "Xem liền các pha đã chọn" đôi khi bỏ qua một pha vì YouTube báo ENDED hai lần. Giờ mỗi lần nạp chỉ báo kết thúc một lần, và chỉ khi đang ở cuối đoạn.
  - Kết quả: bấm ngay 8/8 lần phát đúng pha 49 (2660 → 2671 rồi dừng); "Xem liền" 3/3 lần phát đủ 42 → 44 → 46 → 49.

## Vấn đề còn tồn tại

1. **Số liệu do AI tính sẵn vẫn theo sân**: biểu đồ radar, nhận xét HLV và chiến thuật trong `match_statistics`. Phía web không có dữ liệu từng cú để tách lại. Cần pipeline AI (AI_Classifier) tách theo ván hoặc theo danh tính người đánh.
2. **Phát hiện pha sau trận** chỉ dựa vào luật tính điểm: nếu AI bỏ sót điểm kết thúc một ván thì trận không được coi là đã kết thúc. Gốc vẫn ở phía AI.
3. **Tỉ số bắt đầu là nhập tay**: khi không có OCR, chủ trận phải tự nhập. Trận 245 (video ghi 1–4, đài ghi 2–5) chưa được nhập.
