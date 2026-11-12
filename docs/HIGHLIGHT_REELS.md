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

## Vấn đề còn tồn tại

1. **Thống kê theo người vẫn tính theo sân.** "Đáng chú ý", "Vì sao mất điểm", heatmap, thống kê cú đánh và `match_statistics` gán số liệu theo sân. Với video nhiều ván, từ ván 2 trở đi số liệu của hai VĐV bị trộn. `match_statistics` do AI worker tính sẵn nên phía web không tách lại được. Cách sửa tận gốc thuộc pipeline AI (AI_Classifier): ghi nhận người đánh theo danh tính, hoặc ít nhất đánh dấu thời điểm đổi sân và tách ván.
2. **Pha bắt nhầm sau khi trận kết thúc.** Trận 294 có pha 82–84 bị xếp vào "ván 3" dù trận kết thúc 2–0; nhiều khả năng AI bắt các đoạn sau trận. Cũng thuộc phía AI.
3. **Tỉ số tự đếm khi không đọc được bảng điểm.** Không có OCR, AI đếm từ 0–0 ở đầu video, nên clip bắt đầu giữa ván sẽ lệch tỉ số thật (trận 245: video ghi 1–4, đài ghi 2–5).
4. **Lỗ hổng phân quyền có từ trước.** `GET /api/matches/{id}/analysis/rallies` trả dữ liệu cho cả người không phải chủ trận (đã thử: tài khoản E2E Tester đọc được rally của trận 294 thuộc E2E YT Full). Cần kiểm tra quyền giống các API khác của trận. Nên rà luôn các API `/analysis/*` cùng controller.
5. **API tạo video mất khoảng 0,5–0,9 giây**, chậm hơn mức dưới 200 ms của API phân tích AI. Nguyên nhân là 7–8 lượt truy vấn tới Supabase. Có thể gộp còn 1–2 truy vấn như `AnalysisQueueRepository`.
6. **Thông báo lỗi khi backend chưa có endpoint.** `GlobalExceptionHandler` biến mọi lỗi lạ thành 500 "Lỗi hệ thống nội bộ", kể cả đường dẫn không tồn tại (`NoResourceFoundException`); nên trả 404.
7. **Chạy hai backend cùng lúc** với pool mặc định (8 + 8) vượt giới hạn 15 kết nối của Supabase (session mode). Khi cần backend thứ hai để thử, đặt `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=3`.
8. **Video highlight tạo trước ngày 12/11/2026** (trận 294, reel id 4) lưu tỉ số cộng dồn cũ. Xóa và tạo lại.
9. **Chưa kiểm tra giao diện xem trước pha YouTube** trong hộp thoại với tài khoản chủ trận thật; mới kiểm tra riêng các lời gọi YouTube IFrame API (`loadVideoById` với `startSeconds`/`endSeconds`, sự kiện ENDED).
