import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Cấu hình kết nối Backend Spring Boot & MinIO cho Mobile App.
 *
 * Tự động lấy địa chỉ IP máy tính từ Expo Go (Constants.expoConfig?.hostUri),
 * giúp bạn đổi mạng Wi-Fi (ở nhà, ở trường, phát 4G) mà không bị lỗi timeout hay phải sửa IP thủ công.
 */
const getAutoDetectedHost = (): string => {
  // 1. Tự động lấy IP từ hostUri mà Expo Go kết nối tới (dạng "172.31.99.36:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const detectedIp = hostUri.split(':')[0];
    if (detectedIp && detectedIp !== 'localhost' && detectedIp !== '127.0.0.1') {
      return detectedIp;
    }
  }

  // 2. Nếu là Android Emulator và không có hostUri
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // 3. Fallback IP Wi-Fi hiện tại của máy tính
  return '172.31.99.36';
};

const DETECTED_HOST = getAutoDetectedHost();

export const ENV = {
  HOST_IP: DETECTED_HOST,
  API_BASE_URL: `http://${DETECTED_HOST}:8080/api`,
  STORAGE_BASE_URL: `http://${DETECTED_HOST}:9000`,
  TIMEOUT_MS: 15000,
};

export default ENV;
