import { Platform } from 'react-native';

/**
 * Cấu hình kết nối Backend Spring Boot & MinIO cho Mobile App.
 *
 * Lưu ý khi kiểm thử:
 * - Máy thật (Physical device qua Expo Go): Dùng IP máy tính trên cùng mạng Wi-Fi (ví dụ: '10.10.28.61').
 * - Android Emulator: Dùng '10.0.2.2' hoặc IP Wi-Fi.
 * - iOS Simulator: Dùng 'localhost' hoặc IP Wi-Fi.
 */
// 10.0.2.2 là địa chỉ loopback chuẩn của Android Emulator để gọi localhost máy tính
// Nếu dùng điện thoại thật kết nối cùng Wi-Fi: đổi thành IP Wi-Fi hiện tại (ví dụ: '192.168.2.149')
const EMULATOR_HOST_IP = '10.0.2.2';
const LAN_WIFI_IP = '192.168.2.149';

// Đang chạy trên điện thoại thật kết nối cùng Wi-Fi -> dùng LAN_WIFI_IP (192.168.2.149)
// Nếu chuyển sang máy ảo Pixel 8a -> đổi thành EMULATOR_HOST_IP (10.0.2.2)
const DEFAULT_HOST_IP = LAN_WIFI_IP;

const getBaseHost = (): string => {
  if (Platform.OS === 'android') {
    // Có thể dùng DEFAULT_HOST_IP để đồng nhất giữa máy thật & giả lập
    return DEFAULT_HOST_IP;
  }
  if (Platform.OS === 'ios') {
    return DEFAULT_HOST_IP;
  }
  return 'localhost';
};

export const ENV = {
  HOST_IP: DEFAULT_HOST_IP,
  API_BASE_URL: `http://${getBaseHost()}:8080/api`,
  STORAGE_BASE_URL: `http://${getBaseHost()}:9000`,
  TIMEOUT_MS: 15000,
};

export default ENV;

