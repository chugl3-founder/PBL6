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
          <UserIcon color="#059669" size={36} />
        </View>

        {user ? (
          <>
            <Text style={styles.userName}>{user.fullName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Shield color="#059669" size={12} />
              <Text style={styles.roleText}>{user.role || 'ROLE_USER'}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.userName}>Khách Vãng Lai</Text>
            <Text style={styles.userEmail}>Chưa đăng nhập</Text>
            <View style={[styles.roleBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Text style={[styles.roleText, { color: '#b45309' }]}>Giới hạn 5 phút/trận</Text>
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
              <UserPlus color="#059669" size={16} />
              <Text style={styles.registerBtnText}>Đăng Ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#dc2626" size={18} />
          <Text style={styles.logoutText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>
      )}

      {/* Server & System Connection Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoTitleRow}>
          <Server color="#0284c7" size={16} />
          <Text style={styles.infoTitle}>Thông Tin Kết Nối Máy Chủ</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Spring Boot API:</Text>
          <Text style={styles.infoValue}>{ENV.API_BASE_URL}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>AI Coach Service:</Text>
          <Text style={styles.infoValue}>{ENV.COACH_API_URL}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phiên bản Mobile:</Text>
          <Text style={styles.infoValue}>v1.0.0 (Expo SDK 58)</Text>
        </View>
      </View>

      {/* App Information */}
      <View style={styles.appInfoCard}>
        <View style={styles.infoTitleRow}>
          <Sparkles color="#d97706" size={16} />
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
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 10,
  },
  roleText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  guestActionBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  guestActionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  guestActionDesc: {
    color: '#64748b',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    gap: 6,
  },
  registerBtnText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    gap: 8,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appInfoCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  infoValue: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
  },
  appDesc: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
});
