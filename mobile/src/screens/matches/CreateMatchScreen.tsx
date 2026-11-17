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
          <Video color="#059669" size={28} />
        </View>
        <Text style={styles.title}>Tạo Trận Đấu Mới</Text>
        <Text style={styles.subtitle}>
          Tải video trận đấu lên hệ thống để AI tự động trích xuất các pha cầu và phân tích chuyên sâu
        </Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Video Selection Section */}
      <View style={styles.videoSection}>
        <Text style={styles.sectionTitle}>Video Trận Đấu (MP4)</Text>

        {!selectedVideo ? (
          <TouchableOpacity
            style={styles.uploadPlaceholder}
            onPress={handlePickVideo}
            disabled={submitting}
          >
            <View style={styles.uploadIconCircle}>
              <UploadCloud color="#059669" size={26} />
            </View>
            <Text style={styles.uploadMainText}>Chạm để chọn video từ thiết bị</Text>
            <Text style={styles.uploadSubText}>
              Định dạng MP4 được hỗ trợ tối ưu cho tiến trình AI
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedVideoCard}>
            <View style={styles.videoCardHeader}>
              <View style={styles.videoIconBox}>
                <Video color="#059669" size={20} />
              </View>
              <View style={styles.videoMetaDetails}>
                <Text style={styles.videoFileName} numberOfLines={1}>
                  {selectedVideo.fileName}
                </Text>
                <View style={styles.videoMetaRow}>
                  {selectedVideo.fileSize && (
                    <View style={styles.metaBadge}>
                      <HardDrive color="#64748b" size={11} style={{ marginRight: 3 }} />
                      <Text style={styles.metaBadgeText}>{formatFileSize(selectedVideo.fileSize)}</Text>
                    </View>
                  )}
                  {selectedVideo.duration && (
                    <View style={styles.metaBadge}>
                      <Clock color="#64748b" size={11} style={{ marginRight: 3 }} />
                      <Text style={styles.metaBadgeText}>{formatVideoDuration(selectedVideo.duration)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {!submitting && (
                <TouchableOpacity
                  style={styles.removeVideoBtn}
                  onPress={handleRemoveVideo}
                >
                  <X color="#dc2626" size={18} />
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
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vận động viên A (Sân trên / Xa camera) *</Text>
          <View style={styles.inputWrapper}>
            <User color="#0284c7" size={18} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="VD: Viktor Axelsen"
              placeholderTextColor="#94a3b8"
              value={playerAName}
              onChangeText={setPlayerAName}
              editable={!submitting}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vận động viên B (Sân dưới / Gần camera) *</Text>
          <View style={styles.inputWrapper}>
            <User color="#059669" size={18} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="VD: Shi Yuqi"
              placeholderTextColor="#94a3b8"
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
              placeholderTextColor="#94a3b8"
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
              {isPublic ? <Globe color="#059669" size={16} /> : <Lock color="#64748b" size={16} />}
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
            trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
            thumbColor={isPublic ? '#059669' : '#f1f5f9'}
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
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
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
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },
  videoSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  uploadPlaceholder: {
    backgroundColor: '#ffffff',
    borderColor: '#059669',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadMainText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadSubText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  selectedVideoCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  videoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  videoMetaDetails: {
    flex: 1,
  },
  videoFileName: {
    color: '#0f172a',
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
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  removeVideoBtn: {
    padding: 8,
  },
  progressContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercentText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
  },
  form: {
    gap: 14,
  },
  inputGroup: {},
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
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
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  switchDesc: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 15,
    fontWeight: '700',
  },
});
