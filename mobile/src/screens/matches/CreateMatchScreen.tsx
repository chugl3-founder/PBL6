import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { matchApi } from '../../api/matchApi';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  User,
  Calendar,
  MapPin,
  FileText,
  Lock,
  Globe,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';

export const CreateMatchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [courtName, setCourtName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreate = async () => {
    if (!playerAName.trim() || !playerBName.trim()) {
      setErrorMessage('Vui lòng nhập tên cho cả 2 vận động viên');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const newMatch = await matchApi.createMatch({
        title: title.trim() || `${playerAName.trim()} vs ${playerBName.trim()}`,
        playerAName: playerAName.trim(),
        playerBName: playerBName.trim(),
        matchDate: todayStr,
        courtName: courtName.trim() || 'Sân tiêu chuẩn BWF',
        isPublic,
      });

      Alert.alert(
        'Tạo trận đấu thành công',
        'Trận đấu đã được khởi tạo! Bạn có thể kích hoạt phân tích AI ngay bây giờ.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Không thể tạo trận đấu. Vui lòng thử lại!'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Plus color="#38bdf8" size={28} />
        </View>
        <Text style={styles.title}>Tạo Trận Đấu Mới</Text>
        <Text style={styles.subtitle}>
          Khởi tạo hồ sơ trận đấu để chuẩn bị phân tích AI và phát lại
        </Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên trận đấu (Tùy chọn)</Text>
          <View style={styles.inputWrapper}>
            <FileText color="#94a3b8" size={18} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="VD: Chung kết Toàn Anh 2026"
              placeholderTextColor="#64748b"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vận động viên A (Sân trên / Xa camera) *</Text>
          <View style={styles.inputWrapper}>
            <User color="#38bdf8" size={18} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="VD: Viktor Axelsen"
              placeholderTextColor="#64748b"
              value={playerAName}
              onChangeText={setPlayerAName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vận động viên B (Sân dưới / Gần camera) *</Text>
          <View style={styles.inputWrapper}>
            <User color="#34d399" size={18} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="VD: Shi Yuqi"
              placeholderTextColor="#64748b"
              value={playerBName}
              onChangeText={setPlayerBName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sân thi đấu / Giải đấu</Text>
          <View style={styles.inputWrapper}>
            <MapPin color="#94a3b8" size={18} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="VD: Sân số 1 - Sân Cầu Lông ĐH Bách Khoa"
              placeholderTextColor="#64748b"
              value={courtName}
              onChangeText={setCourtName}
            />
          </View>
        </View>

        {/* Visibility switch */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <View style={styles.switchTitleRow}>
              {isPublic ? <Globe color="#38bdf8" size={16} /> : <Lock color="#94a3b8" size={16} />}
              <Text style={styles.switchTitle}>
                {isPublic ? 'Trận đấu công khai' : 'Trận đấu riêng tư'}
              </Text>
            </View>
            <Text style={styles.switchDesc}>
              {isPublic
                ? 'Mọi người đều có thể xem trận đấu trong Thư viện công khai'
                : 'Chỉ có bạn mới xem và phân tích được trận đấu này'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#334155', true: '#0284c7' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Tạo Trận Đấu</Text>
              <ArrowRight color="#ffffff" size={18} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  errorBox: {
    backgroundColor: '#451a1a',
    borderColor: '#f87171',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputGroup: {},
  label: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  switchTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  switchDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
  },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#0284c7',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

