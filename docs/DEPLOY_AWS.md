# Deploy web lên AWS Lightsail

Frontend, backend và media-worker chạy trên một máy Lightsail. Database và video vẫn ở Supabase, hàng đợi ở CloudAMQP, AI worker chạy trên máy GPU thuê theo [DEPLOY_GPU_WORKER.md](DEPLOY_GPU_WORKER.md).

```
Trình duyệt ──HTTP(S)──> Lightsail: Caddy ─┬─ /api/* ──> backend (Spring Boot)
                                           └─ còn lại ─> frontend (nginx)
                                             media-worker (ffmpeg)
backend / media-worker ──> Supabase (DB + video), CloudAMQP ──> AI worker (GPU)
```

File liên quan: [docker-compose.prod.yml](../docker-compose.prod.yml), [deploy/Caddyfile](../deploy/Caddyfile), [deploy/setup-server.sh](../deploy/setup-server.sh), [deploy/deploy.sh](../deploy/deploy.sh), [.env.prod.example](../.env.prod.example).

## 1. Tạo máy (làm một lần)

1. Lightsail → **Create instance**, region **Singapore**.
2. **Linux operating system → Ubuntu 24.04 LTS**.
3. Plan **General purpose, Dual-stack, $24 (4 GB RAM, 2 vCPU)**.
4. Tên `badminton-web` → **Create instance**.
5. Vào máy → tab **Networking**:
   - **Attach static IP**.
   - IPv4 Firewall: thêm **HTTPS (443)** (22 và 80 có sẵn).

## 2. Cài đặt máy (làm một lần)

Vào máy → **Connect using SSH** (mở terminal ngay trên trình duyệt), chạy:

```bash
curl -fsSL https://raw.githubusercontent.com/chugl3-founder/PBL6/main/deploy/setup-server.sh -o setup-server.sh
bash setup-server.sh
exit
```

Lệnh `exit` để đăng xuất; mở lại **Connect using SSH** để quyền chạy Docker có hiệu lực.

## 3. Tạo file `.env.prod`

Trên laptop, file `PBL6/.env.prod` đã có đủ giá trị (không nằm trong git). Mở file đó, copy toàn bộ nội dung. Trong terminal của máy, dán **cả khối** sau, thay dòng giữa bằng nội dung vừa copy:

```bash
cat > ~/PBL6/.env.prod <<'EOF'
...dán nội dung .env.prod ở đây...
EOF
chmod 600 ~/PBL6/.env.prod
```

## 4. Deploy

```bash
bash ~/PBL6/deploy/deploy.sh
```

Lần đầu build mất khoảng 5–10 phút. Xong thì mở `http://<static IP>` trên trình duyệt.

Kiểm tra nhanh:

```bash
curl -s http://localhost/api/health                     # {"status":"UP",...}
docker compose -f ~/PBL6/docker-compose.prod.yml logs -f backend   # Ctrl+C để thoát
```

## Cập nhật code

Merge vào `main` trên GitHub, rồi trên máy chạy lại:

```bash
bash ~/PBL6/deploy/deploy.sh
```

## Gắn domain và bật HTTPS

1. Trỏ bản ghi **A** của domain về static IP.
2. Trong `~/PBL6/.env.prod` đổi `SITE_ADDRESS=:80` thành `SITE_ADDRESS=ten-mien-cua-ban.com`.
3. Chạy lại `bash ~/PBL6/deploy/deploy.sh`. Caddy tự xin chứng chỉ HTTPS.

## Lưu ý

- **Supabase chỉ cho 15 kết nối** (session mode). Backend trên server giữ 6. Khi server đang chạy, không bật thêm backend trên laptop cùng trỏ vào Supabase quá lâu.
- **Chỉ một media-worker** nên chạy. Nếu laptop cũng bật media-worker, hai bên sẽ chia nhau job render highlight.
- **YouTube có thể chặn IP của AWS** ("Sign in to confirm you're not a bot"). Nếu render highlight của trận YouTube báo không đọc được video, đó là nguyên nhân.
- **Tiền:** Lightsail tính theo giờ, **Stop máy vẫn bị tính tiền**. Muốn ngừng tốn: tạo snapshot → Delete instance. Static IP không gắn vào máy nào cũng bị tính tiền.
