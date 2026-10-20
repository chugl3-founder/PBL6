# KẾ HOẠCH PHÁT TRIỂN ỨNG DỤNG DI ĐỘNG (MOBILE APP DEVELOPMENT PLAN)
# PBL6 BADMINTON - BADMINTONAI MOBILE (REACT NATIVE + EXPO)

## I. MỤC TIÊU VÀ ĐỊNH HƯỚNG CỐT LÕI
1. **Nền tảng công nghệ:** React Native với Expo (TypeScript) để tối ưu thời gian phát triển, tái sử dụng mô hình dữ liệu DTO và quy tắc từ Web Frontend.
2. **Đối tượng sử dụng & Phạm vi:**
   - Đầy đủ tính năng tương tự Web: Đăng ký/đăng nhập, duyệt thư viện công khai, quản lý trận đấu cá nhân, tải video phân tích và xem dashboard thống kê.
   - Trọng tâm trải nghiệm di động: **Trình phát video tương tác trên màn hình cảm ứng** (vuốt tua, chạm trực tiếp vào các vạch cú đánh trên timeline để nhảy thời gian, tự động đồng bộ pha cầu đang phát).
3. **Chiến lược Backend:**
   - Tái sử dụng 100% hệ thống RESTful API hiện tại trên Spring Boot 3 (`:8080`) và MinIO Object Storage (`:9000`).
   - Kết nối thông qua IP mạng nội bộ hoặc cấu hình domain/tunnel.

---

## II. KIẾN TRÚC VÀ CẤU TRÚC DỰ ÁN
```text
mobile/
├── App.tsx                     # Điểm khởi chạy ứng dụng (AuthContext, Theme, Font)
├── app.json                    # Cấu hình Expo, Bundle ID, Permissions
├── package.json                # Dependencies: React Native, Expo, React Navigation, Axios, Lucide
├── tsconfig.json
└── src/
    ├── api/                    # Axios Client, Auth, Match, Analysis, Replay API
    ├── components/             # Reusable UI Components, Touch Timeline, Markers, Charts
    ├── navigation/             # RootNavigator, BottomTabNavigator, StackNavigator
    ├── screens/                # Auth, PublicMatches, MyMatches, Replay, Statistics, Profile
    ├── types/                  # TypeScript Types & DTOs
    └── utils/                  # Storage, Formatters, Constants
```

---

## III. LỘ TRÌNH TRIỂN KHAI 4 GIAI ĐOẠN

### Giai đoạn 1: Khởi tạo Project & Cấu hình Nền tảng (Hiển thị & Kết nối API)
- Khởi tạo project Expo TypeScript trong thư mục `mobile/`.
- Cài đặt React Navigation (Bottom Tabs + Native Stack), Axios, Lucide React Native, Async Storage.
- Xây dựng tầng API Client với cơ chế cấu hình linh hoạt Host IP (Backend Spring Boot & MinIO).
- Tạo cấu trúc Types và State Quản lý Xác thực (`AuthContext`).

### Giai đoạn 2: Phân hệ Xác thực & Quản lý Trận đấu
- Màn hình Đăng nhập, Đăng ký, Quên mật khẩu, Hồ sơ cá nhân.
- Màn hình Khám phá Thư viện Công khai (`PublicMatchesScreen`) với tìm kiếm và phân trang.
- Màn hình Quản lý Trận đấu Cá nhân (`MyMatchesScreen`) với tạo trận, xóa mềm.
- Màn hình Tạo trận mới (`CreateMatchScreen`) kết hợp chọn video từ thư viện hoặc quay từ Camera và tải lên qua S3 Presigned URL.
- Điều phối Phân tích AI và thanh tiến trình Polling thời gian thực.

### Giai đoạn 3: Trình phát Video Tương tác Cảm ứng & Biểu đồ Thống kê
- Trình phát Video toàn màn hình / ngang / dọc với `expo-av`.
- Thanh **Touch Timeline** có vạch màu đánh dấu cú đánh (`Smash`, `Clear`, `Drop`, `Net Shot`...).
- Chạm vào vạch cú đánh $\rightarrow$ video nhảy tức thì đến mili-giây cú đánh.
- Danh sách Pha cầu (`Rallies`) tự động cuộn và làm nổi bật theo thời gian video.
- Biểu đồ Radar Ngũ giác 5 trục đối đầu và Biểu đồ Cột phân bổ kỹ thuật.

### Giai đoạn 4: Kiểm thử End-to-End, Tinh chỉnh Giao diện Tối màu & Đóng gói
- Tinh chỉnh theme Dark Sports Analytics (`#070e1b` / `#0f1d35`) đồng bộ với Web.
- Kiểm thử luồng nghiệp vụ từ Điện thoại $\rightarrow$ Spring Boot $\rightarrow$ MinIO $\rightarrow$ AI Engine.
- Hướng dẫn chạy thử nghiệm trên máy thật qua Expo Go (quét mã QR) và đóng gói APK Android.

