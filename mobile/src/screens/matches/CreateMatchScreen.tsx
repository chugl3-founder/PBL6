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
import * as ImagePicker from 'expo-image-picker';
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
  Video,
  UploadCloud,
  Check,
  X,
  Clock,
  HardDrive,
} from 'lucide-react-native';

interface SelectedVideoInfo {
  uri: string;
  fileName: string;
  fileSize?: number;
  duration?: number | null;
  mimeType?: string;
}

export const CreateMatchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [courtName, setCourtName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Video picker & upload state
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideoInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const handlePickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Yêu cầu quyền truy cập',
          'Vui lòng cấp quyền truy cập thư viện để chọn video trận đấu.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedVideo({
          uri: asset.uri,
          fileName: asset.fileName || `badminton_match_${Date.now()}.mp4`,
          fileSize: asset.fileSize,
          duration: asset.duration,
          mimeType: asset.mimeType || 'video/mp4',
        });
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.warn('Lỗi khi mở thư viện video:', err);
      Alert.alert('Thông báo', 'Không thể mở thư viện video trên thiết bị.');
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatVideoDuration = (durationMs?: number | null) => {
    if (!durationMs) return '';
    const totalSecs = Math.round(durationMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCreateAndUpload = async () => {
    if (!playerAName.trim() || !playerBName.trim()) {
      setErrorMessage('Vui lòng nhập tên cho cả 2 vận động viên');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setUploadProgress(0);

      // Bước 1: Khởi tạo hồ sơ trận đấu trên backend
      setStatusMessage('Đang khởi tạo hồ sơ trận đấu...');
      const newMatch = await matchApi.createMatch({
        title: title.trim() || `${playerAName.trim()} vs ${playerBName.trim()}`,
        playerAName: playerAName.trim(),
        playerBName: playerBName.trim(),
        matchDate: todayStr,
        courtName: courtName.trim() || 'Sân tiêu chuẩn BWF',
        isPublic,
      });

      // Bước 2: Tải video lên nếu người dùng đã chọn
      if (selectedVideo) {
        setStatusMessage('Đang tải video lên máy chủ (0%)...');
        await matchApi.uploadVideoDirect(
          newMatch.id,
          selectedVideo.uri,
          selectedVideo.fileName,
          selectedVideo.mimeType || 'video/mp4',
          (percent) => {
            setUploadProgress(percent);
            setStatusMessage(`Đang tải video lên máy chủ (${percent}%)...`);
          }
        );

        // Bước 3: Tự động kích hoạt phân tích AI
        setStatusMessage('Đang khởi động phân tích AI...');
        try {
          await matchApi.triggerAiAnalysis(newMatch.id);
        } catch (aiErr) {
          console.warn('Kích hoạt phân tích AI gặp cảnh báo:', aiErr);
        }
      }

      Alert.alert(
        'Thành công',
        selectedVideo
          ? 'Trận đấu và video đã được tải lên thành công! AI đang tiến hành phân tích.'
          : 'Trận đấu đã được tạo thành công!',
        [
          {
            text: 'Xem danh sách',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      console.error('Lỗi khi tạo trận đấu / upload:', err);
      setErrorMessage(
        err.response?.data?.message || 'Có lỗi xảy ra trong quá trình tạo hoặc tải video lên.'
      );
    } finally {
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Plus color="#38bdf8" size={28} />
        </View>
        <Text style={styles.title}>Tạo & Tải Lên Trận Đấu</Text>
        <Text style={styles.subtitle}>
          Khởi tạo hồ sơ trận đấu và tải lên video từ điện thoại để AI phân tích
        </Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Khu vực Chọn & Upload Video */}
      <View style={styles.videoSection}>
        <Text style={styles.sectionTitle}>Video Trận Đấu</Text>

        {!selectedVideo ? (
          <TouchableOpacity
            style={styles.uploadPlaceholder}
            onPress={handlePickVideo}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconCircle}>
              <UploadCloud color="#38bdf8" size={28} />
            </View>
            <Text style={styles.uploadMainText}>Chọn video trận đấu từ thiết bị</Text>
            <Text style={styles.uploadSubText}>
              Định dạng hỗ trợ: MP4, MOV (Quay góc camera cố định sau lưng sân)
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedVideoCard}>
            <View style={styles.videoCardHeader}>
              <View style={styles.videoIconBox}>
                <Video color="#38bdf8" size={22} />
              </View>
              <View style={styles.videoMetaDetails}>
                <Text style={styles.videoFileName} numberOfLines={1}>
                  {selectedVideo.fileName}
                </Text>
                <View style={styles.videoMetaRow}>
                  {selectedVideo.fileSize ? (
                    <View style={styles.metaBadge}>
                      <HardDrive color="#94a3b8" size={11} style={{ marginRight: 3 }} />
                      <Text style={styles.metaBadgeText}>
                        {formatFileSize(selectedVideo.fileSize)}
                      </Text>
                    </View>
                  ) : null}
                  {selectedVideo.duration ? (
                    <View style={styles.metaBadge}>
                      <Clock color="#94a3b8" size={11} style={{ marginRight: 3 }} />
                      <Text style={styles.metaBadgeText}>
                        {formatVideoDuration(selectedVideo.duration)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {!submitting && (
                <TouchableOpacity
                  style={styles.removeVideoBtn}
                  onPress={handleRemoveVideo}
                >
                  <X color="#ef4444" size={18} />
                </TouchableOpacity>
              )}
            </View>

            {/* Thanh tiến trình upload */}
            {submitting && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeaderRow}>
                  <Text style={styles.progressStatusText}>{statusMessage}</Text>
                  <Text style={styles.progressPercentText}>{uploadProgress}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${uploadProgress}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

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
              editable={!submitting}
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
              editable={!submitting}
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
              editable={!submitting}
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
              editable={!submitting}
            />
          </View>
        </View>

        {/* Chế độ công khai / riêng tư */}
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
                : 'Chỉ có bạn mới xem và quản lý được trận đấu này'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#334155', true: '#0284c7' }}
            thumbColor="#ffffff"
            disabled={submitting}
          />
        </View>

        {/* Nút gửi */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleCreateAndUpload}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>
                {statusMessage || 'Đang xử lý...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {selectedVideo ? 'Tạo Trận & Tải Lên Video' : 'Tạo Trận Đấu'}
              </Text>
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
    marginBottom: 20,
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
    paddingHorizontal: 16,
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
  videoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  uploadPlaceholder: {
    backgroundColor: '#13233e',
    borderColor: '#0284c7',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadMainText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadSubText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  selectedVideoCard: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  videoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  videoMetaDetails: {
    flex: 1,
  },
  videoFileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  videoMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  removeVideoBtn: {
    padding: 8,
  },
  progressContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#0b1424',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
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
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
