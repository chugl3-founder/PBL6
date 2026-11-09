import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ENV } from '../../config/env';
import {
  User as UserIcon,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  Server,
  Sparkles,
  Info,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <UserIcon color="#ffffff" size={36} />
        </View>

        {user ? (
          <>
            <Text style={styles.userName}>{user.fullName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Shield color="#38bdf8" size={12} />
              <Text style={styles.roleText}>{user.role || 'ROLE_USER'}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.userName}>Khách Vãng Lai</Text>
            <Text style={styles.userEmail}>Chưa đăng nhập</Text>
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <Text style={[styles.roleText, { color: '#fbbf24' }]}>Giới hạn 5 phút/trận</Text>
            </View>
          </>
        )}
      </View>

      {/* Auth Actions if Guest */}
      {!user ? (
        <View style={styles.guestActionBox}>
          <Text style={styles.guestActionTitle}>Trải nghiệm không giới hạn</Text>
          <Text style={styles.guestActionDesc}>
            Đăng nhập để xem trọn vẹn toàn bộ trận đấu, tạo trận đấu mới và lưu trữ phân tích cá nhân.
          </Text>

          <View style={styles.authBtnRow}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <LogIn color="#ffffff" size={16} />
              <Text style={styles.loginBtnText}>Đăng Nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <UserPlus color="#38bdf8" size={16} />
              <Text style={styles.registerBtnText}>Đăng Ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={18} />
          <Text style={styles.logoutText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>
      )}

      {/* Server & System Connection Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoTitleRow}>
          <Server color="#38bdf8" size={16} />
          <Text style={styles.infoTitle}>Thông Tin Kết Nối Máy Chủ</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Spring Boot API:</Text>
          <Text style={styles.infoValue}>{ENV.API_BASE_URL}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MinIO Storage:</Text>
          <Text style={styles.infoValue}>{ENV.STORAGE_BASE_URL}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phiên bản Mobile:</Text>
          <Text style={styles.infoValue}>v1.0.0 (Expo SDK 52)</Text>
        </View>
      </View>

      {/* App Information */}
      <View style={styles.appInfoCard}>
        <View style={styles.infoTitleRow}>
          <Sparkles color="#34d399" size={16} />
          <Text style={styles.infoTitle}>Về Badminton AI Platform</Text>
        </View>
        <Text style={styles.appDesc}>
          Hệ thống trực quan hóa và phân tích kỹ thuật cầu lông tự động bằng Trí Tuệ Nhân Tạo (PBL6 ĐH Bách Khoa - ĐH Đà Nẵng).
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1424',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#122340',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 10,
  },
  roleText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  guestActionBox: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  guestActionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  guestActionDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  authBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  loginBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 10,
    height: 44,
    gap: 6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  registerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 10,
    height: 44,
    gap: 6,
    borderColor: '#38bdf8',
    borderWidth: 1,
  },
  registerBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  infoValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  appInfoCard: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  appDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});

