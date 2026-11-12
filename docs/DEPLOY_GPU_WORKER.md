# Chạy AI worker trên máy GPU thuê

Hướng dẫn thuê một máy GPU theo giờ (Vast.ai, EzyCloudX hoặc máy Ubuntu bất kỳ có card NVIDIA) để chạy AI worker, trong khi frontend và backend vẫn chạy trên laptop.

Đã chạy thử ngày 11/11/2026 trên Vast.ai, RTX 3090: một đoạn video 13–14 phút phân tích xong trong khoảng 1 phút (phần AI), khoảng 1,5–2,5 phút tính cả tải video và ghi DB. Trên laptop RTX 3050 chậm hơn khoảng 4,5 lần.

## Cách các phần nối với nhau

```
Laptop: frontend + backend ──gửi job──> CloudAMQP ──> Worker trên máy GPU
              ▲                                             │
              └─────── đọc kết quả ── Supabase DB/S3 <── ghi kết quả
```

- Worker chỉ cần ra được internet (CloudAMQP, Supabase, GitHub, YouTube). Không cần mở cổng, laptop và máy GPU không cần biết IP của nhau.
- Chỉ được có **một** worker chạy. Nếu worker trên laptop vẫn bật, hai worker sẽ chia nhau job.
- Model không nằm trong git. Script tải từ GitHub Release [`models-v1`](https://github.com/dattt-cy/Badminton_AI/releases/tag/models-v1) của repo Badminton_AI.

## 1. Chuẩn bị (làm một lần)

1. Đăng ký [cloud.vast.ai](https://cloud.vast.ai), xác nhận email.
2. **Billing → Add Credit → Stripe**, nạp tối thiểu $5. Thẻ ghi nợ Visa/Mastercard dùng được, nhưng phải bật thanh toán trực tuyến và giao dịch quốc tế trong app ngân hàng. Vast không cộng VAT; ngân hàng thu thêm khoảng 1–3% phí ngoại tệ.
3. Thêm thẻ sẽ tự bật **Auto Top-Up**. Nạp xong thì vào **Payment Methods → ⋮ → xoá thẻ**, để Vast không tự trừ tiền.

## 2. Thuê máy

Ở trang **Search**, làm đúng thứ tự (đổi template sau sẽ đưa dung lượng đĩa về mặc định):

1. **Select Template → PyTorch (Vast)**.
2. **Container Size: 40 GB**. Không đổi được sau khi thuê; 16 GB mặc định là quá ít.
3. Bộ lọc: **On-Demand**, GPU **RTX 3090** (hoặc 4090 / 5060 Ti 16GB), **1x**, Reliability ≥ 98%.
4. Chọn máy:
   - **verified**, Max CUDA ≥ 12.8, giá khoảng $0.15–0.30/giờ.
   - Mạng tải xuống càng cao càng tốt (≥ 1000 Mbps).
   - Ưu tiên máy ở **Singapore, Nhật, Hàn, Đài Loan**: Supabase đặt ở Singapore nên tải video nhanh hơn.
   - **Tránh máy ở Trung Quốc** (GitHub, PyPI, YouTube, Supabase bị chặn hoặc rất chậm).
   - Chọn đúng dòng **1x**, không chọn dòng 2x của cùng máy (đắt gấp đôi).
5. **Rent**, vào **Instances**, đợi nút **Open** hiện ra (2–10 phút), bấm **Open → Jupyter Terminal → Launch Application**.

Thông báo "Setup Jupyter Direct HTTPS" xin cài chứng chỉ: bấm **I Understand**, không cần cài. Nếu trình duyệt báo kết nối không riêng tư thì chọn **Nâng cao → Tiếp tục**.

## 3. Kiểm tra mạng của máy (30 giây)

```bash
curl -L -o /dev/null -s -w '%{http_code} %{speed_download}\n' --max-time 15 \
  https://github.com/dattt-cy/Badminton_AI/releases/download/models-v1/visual_backbone.pth
```

Kết quả dạng `200 17914689`: số sau là byte/giây. **Dưới 5.000.000 (5 MB/s) thì Destroy và thuê máy khác** — đừng cài trên máy mạng kém, sẽ treo ở bước tải torch.

## 4. Tạo file `.env`

Nội dung lấy từ `backend/integrations/ai-worker/.env` trên laptop (file này chứa mật khẩu, không đưa vào git). Trong terminal của máy thuê, dán **cả khối** sau, thay phần giữa bằng nội dung file:

```bash
cat > ~/.env <<'EOF'
AMQP_URL=...
RABBITMQ_QUEUE=...
DB_HOST=...
...
S3_REGION=...
EOF
grep -c = ~/.env
```

Dòng cuối phải in ra `12`. Dòng `AI_CLASSIFIER_ROOT` không cần, script tự điền.

Lỡ dán nội dung `.env` thẳng vào terminal (không có dòng `cat > ~/.env <<'EOF'`) thì không hỏng gì, mỗi dòng đã thành biến của terminal đó. Ghi chúng ra file bằng:

```bash
for v in AMQP_URL RABBITMQ_QUEUE DB_HOST DB_PORT DB_NAME DB_USER DB_PASS S3_ENDPOINT S3_ACCESS_KEY S3_SECRET_KEY S3_BUCKET S3_REGION; do echo "$v=${!v}"; done > ~/.env; grep -c '=$' ~/.env; grep -c = ~/.env
```

Phải in ra `0` rồi `12`.

## 5. Cài và bật worker

```bash
curl -fsSL https://raw.githubusercontent.com/dattt-cy/Badminton_AI/main/scripts/deploy/setup_gpu_server.sh | bash
```

Khoảng 5–15 phút tuỳ mạng. Script ([setup_gpu_server.sh](https://github.com/dattt-cy/Badminton_AI/blob/main/scripts/deploy/setup_gpu_server.sh)) lần lượt:

1. Kiểm tra GPU và driver.
2. Cài `git`, `ffmpeg`, `libgl1`.
3. Clone PBL6, Badminton_AI và TrackNetV3.
4. Tạo Python 3.12 bằng `uv`, cài torch 2.8 (CUDA 12.8) và thư viện.
5. Tải 6 file model, kiểm tra checksum.
6. Ghi `.env` cho worker.
7. Kiểm tra torch thấy GPU, tải trước model EasyOCR.
8. Chạy thử pipeline trên clip 8 giây (in ra `OK sau …s`; trên RTX 3090 khoảng 11 giây).
9. Bật worker chạy nền (systemd nếu có, không thì `nohup`).

Thấy chữ xanh **XONG** là worker đang nghe hàng đợi. Chạy lại script lúc nào cũng an toàn: phần đã có được bỏ qua, code được cập nhật, worker được khởi động lại.

## 6. Trên laptop

- Chạy **`START_WEB_ONLY.bat`** (backend + frontend, không bật worker).
- Kiểm tra laptop không còn worker nào chạy (kể cả worker chạy ngầm không có cửa sổ):

  ```powershell
  Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'worker\.py' -and $_.Name -eq 'python.exe' } | Select-Object ProcessId
  ```

  Có kết quả thì tắt: `Stop-Process -Id <ProcessId>`.

## 7. Theo dõi

Trên máy thuê:

```bash
tail -f ~/pbl6/worker.log                       # log worker (không có systemd)
journalctl -u pbl6-worker -f                    # log worker (có systemd)
nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv
du -sh ~/pbl6/venv                              # lúc cài: số tăng dần là đang tải, đứng yên là treo
```

## 8. Xử lý sự cố đã gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Bước cài thư viện đứng im, `WARNING: Connection interrupted` liên tục, tốc độ vài trăm KB/s | Mạng của máy thuê kém | Destroy, thuê máy khác; kiểm tra mạng (mục 3) trước khi cài |
| `curl: (6) Could not resolve host: github.com` | DNS của máy chập chờn | curl tự thử lại; nếu vẫn lỗi thì chạy lại script |
| Ctrl+C hiện `^C` nhưng không dừng | Tiến trình kẹt ở kết nối mạng | Mở terminal khác (**File → New → Terminal**): `pkill -9 -f "pip install"` |
| Phân tích đứng ở 97%, log lặp `[pass] scanning from …s`, GPU 0% | File video khai báo nhiều frame hơn số đọc được (hay gặp ở video cắt hoặc tải về) | Đã sửa trong `run_pipeline.py` (commit `8510a1f`). Máy cũ thì chạy lại script để cập nhật; job đang kẹt tự được giao lại |
| Upload video lỗi `Connection aborted` | Supabase gói miễn phí giới hạn **50 MB mỗi file** | Dùng video dưới 50 MB (720p khoảng 14 phút) |
| `Terminated` ở cuối khi chạy lại script | Script tắt worker cũ trước khi bật worker mới | Bình thường |
| `Could not resolve host` hoặc tải rất chậm với máy ở Trung Quốc | Tường lửa | Không thuê máy ở Trung Quốc |

## 9. Cập nhật

- **Code AI hoặc worker thay đổi**: push lên GitHub, rồi chạy lại lệnh ở mục 5 trên máy thuê.
- **Model mới**: trên laptop, trong `AI_Classifier`, chạy `bash scripts/deploy/publish_models.sh models-v2`, rồi trên máy thuê:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/dattt-cy/Badminton_AI/main/scripts/deploy/setup_gpu_server.sh | MODELS_TAG=models-v2 bash
  ```

## 10. Dùng xong

- **Stop**: giữ máy, chỉ trả tiền ổ đĩa (vài xu mỗi ngày); bật lại có thể phải đợi nếu chủ máy đã cho người khác thuê GPU.
- **Destroy**: xoá hẳn, hết tính tiền. Lần sau làm lại từ mục 2 (khoảng 15 phút).
- Khi đã tắt máy GPU mà muốn phân tích trên laptop: chạy `START_ALL_SERVICES.bat` (bật cả worker trên laptop).

Dữ liệu (video, kết quả) nằm trên Supabase, nên xoá máy không mất gì.
