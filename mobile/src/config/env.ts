import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Cấu hình kết nối Backend Spring Boot & MinIO cho Mobile App.
 *
 * Tự động nhận diện môi trường:
 * - Android Emulator: Tự động dùng 10.0.2.2 để kết nối trực tiếp vào máy chủ máy tính mà không bị chặn bởi Windows Firewall.
 * - Thiết bị thật (Physical Device): Tự động lấy IP Wi-Fi từ Expo Go (hostUri).
 */
const getAutoDetectedHost = (): string => {
  // 1. Kiểm tra nếu là máy ảo Android (Emulator)
  const isAndroidEmulator =
    Platform.OS === 'android' &&
    ((Platform.constants as any)?.Brand === 'google' ||
      (Platform.constants as any)?.Model?.toLowerCase().includes('sdk') ||
      (Platform.constants as any)?.Fingerprint?.toLowerCase().includes('generic') ||
      (Platform.constants as any)?.Manufacturer?.toLowerCase().includes('google'));

  if (isAndroidEmulator) {
    return '10.0.2.2';
  }

  // 2. Tự động lấy IP từ hostUri mà Expo Go kết nối tới (dành cho máy thật)
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

  // 3. Fallback IP Wi-Fi hiện tại của máy tính
  return '192.168.2.149';
};

const DETECTED_HOST = getAutoDetectedHost();

export const ENV = {
  HOST_IP: DETECTED_HOST,
  API_BASE_URL: `http://${DETECTED_HOST}:8080/api`,
  STORAGE_BASE_URL: `http://${DETECTED_HOST}:9000`,
  TIMEOUT_MS: 15000,
};

export default ENV;
