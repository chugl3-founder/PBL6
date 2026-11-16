# Media Worker — video highlight

Dựng video highlight (MP4) từ các pha cầu đã phân tích. Chỉ cần CPU và ffmpeg, chạy cùng máy với backend
(không chạy trên máy GPU của AI worker).

## Luồng xử lý

1. Chủ trận bấm **Tạo video highlight** trên trang replay → `POST /api/matches/{id}/highlights` trả `202`,
   backend lưu dòng `highlight_reels` (QUEUED) và gửi job vào `badminton.media.queue`.
2. Worker đọc **đúng các đoạn cần cắt** của video gốc qua HTTP (S3 presigned URL hoặc stream YouTube);
   nếu stream lỗi thì tải cả file về rồi cắt.
3. Mỗi pha được encode riêng (1280x720, 30 fps, H.264 + AAC) kèm bảng tỉ số góc phải, nhãn pha cầu và
   fade; thêm màn hình tiêu đề 3 giây; ghép lại bằng stream copy.
4. Upload lên bucket video tại `highlights/{matchId}/{reelId}.mp4`, cập nhật COMPLETED.

Bitrate được tính theo tổng thời lượng để file luôn dưới ~40 MB (Supabase giới hạn 50 MB/file);
backend giới hạn 180 giây và 20 pha mỗi video.

## Ảnh thumbnail

Sau khi video MP4 được tải lên, backend gửi job `{"type": "thumbnail"}` vào cùng hàng đợi. Worker cắt một khung
hình (ở 20% thời lượng, tối đa giây 60), lưu `thumbnails/{matchId}.jpg` và ghi `videos.thumbnail_path`
(migration V12). Video YouTube dùng ảnh của YouTube. Tạo bù cho video cũ: `python thumbnail.py --backfill`.

## Chạy

```bash
pip install -r requirements.txt   # cần ffmpeg + ffprobe trong PATH
python worker.py
```

Cấu hình đọc từ `.env` trong thư mục này, rồi dùng tiếp `../ai-worker/.env` (chung broker, DB, S3).
Biến riêng: `MEDIA_QUEUE` (mặc định `badminton.media.queue`), `HIGHLIGHT_FONT`, `HIGHLIGHT_FONT_BOLD`
(file .ttf có dấu tiếng Việt; mặc định Segoe UI/Arial trên Windows, DejaVu trên Linux).

Thử dựng từ file cục bộ, không cần broker:

```bash
python render.py --input match.mp4 --clips clips.json --out reel.mp4 --title "Highlight" --name-a "A" --name-b "B"
# clips.json: [{"start": 12.0, "end": 30.5, "label": "Smash ăn điểm", "scoreA": 5, "scoreB": 3, "game": 1}]
```
