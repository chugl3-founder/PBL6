import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Trophy, Calendar, ArrowLeft, CheckCircle2, Clock, 
  UploadCloud, AlertCircle, RefreshCw, FileVideo, 
  HardDrive, Sparkles, Check, ExternalLink
} from 'lucide-react';
import apiClient from '../api/client';

interface MatchData {
  id: number;
  ownerId: number;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  lowerPlayer: string;
  matchDate: string;
  title: string | null;
  description: string | null;
  source: string;
  status: string;
  createdAt: string;
}

interface VideoData {
  id: number;
  matchId: number;
  fileName: string;
  storagePath: string;
  videoUrl: string;
  mimeType: string;
  fileSize: number;
  status: string;
}

export const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'presigning' | 'uploading' | 'verifying' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/matches/${id}`);
      setMatch(res.data);

      // Nếu match đã READY hoặc ANALYZING, thử lấy metadata video
      if (res.data.status !== 'DRAFT') {
        try {
          const videoRes = await apiClient.get(`/matches/${id}/video`);
          setVideo(videoRes.data);
        } catch (vErr) {
          // Bỏ qua nếu chưa có video
        }
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể tải thông tin trận đấu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMatchDetails();
    }
  }, [id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (500MB)
    const maxSizeBytes = 500 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError('Dung lượng file vượt quá giới hạn tối đa 500MB.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile || !id) return;

    setUploadStatus('presigning');
    setUploadError(null);
    setUploadProgress(0);

    try {
      // BƯỚC 1: Xin S3 Presigned URL từ Backend
      const presignRes = await apiClient.post(`/matches/${id}/videos/upload-url`, {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'video/mp4'
      });

      const { uploadUrl, storagePath } = presignRes.data;

      // BƯỚC 2: Tải trực tiếp Binary lên MinIO bằng HTTP PUT
      setUploadStatus('uploading');
      let startTime = Date.now();
      let lastLoaded = 0;

      await axios.put(uploadUrl, selectedFile, {
        headers: {
          'Content-Type': selectedFile.type || 'video/mp4'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);

            // Tính toán tốc độ
            const elapsedSec = (Date.now() - startTime) / 1000;
            if (elapsedSec > 0.5) {
              const bytesPerSec = (progressEvent.loaded - lastLoaded) / elapsedSec;
              const mbps = (bytesPerSec / (1024 * 1024)).toFixed(1);
              setUploadSpeed(`${mbps} MB/s`);
              startTime = Date.now();
              lastLoaded = progressEvent.loaded;
            }
          }
        }
      });

      // BƯỚC 3: Xác nhận hoàn tất với Backend
      setUploadStatus('verifying');
      const completeRes = await apiClient.post(`/matches/${id}/videos/complete`, {
        storagePath,
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      });

      setVideo(completeRes.data);
      if (match) {
        setMatch({ ...match, status: 'READY' });
      }
      setUploadStatus('idle');
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Lỗi trong tiến trình upload video:', err);
      const serverMsg = err.response?.data?.message;
      setUploadStatus('error');
      setUploadError(
        serverMsg || 
        (err.code === 'ERR_NETWORK' 
          ? 'Mất kết nối mạng trong quá trình upload video. Vui lòng bấm "Thử lại".' 
          : 'Upload video không thành công. Vui lòng kiểm tra lại file.')
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Bản nháp (Chờ tải video)</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Video sẵn sàng</span>
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Đang phân tích AI</span>
          </span>
        );
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/30">
            <Trophy className="w-3.5 h-3.5" />
            <span>Đã phân tích</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/30">
            <span>{status}</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy trận đấu</h2>
        <p className="text-white/60 text-sm max-w-md mb-6">{error || 'Trận đấu không tồn tại hoặc đã bị xóa.'}</p>
        <Link
          to="/my-matches"
          className="px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors"
        >
          Về danh sách trận đấu
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Background Court Ambient */}
      <div 
        className="fixed inset-0 bg-cover bg-center brightness-[0.25] pointer-events-none -z-10"
        style={{ backgroundImage: `url('/images/court-bg.jpg')` }}
      />
      <div className="fixed inset-0 bg-slate-950/80 -z-10" />

      {/* Navigation Top */}
      <div className="mb-8">
        <Link 
          to="/my-matches" 
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors mb-4 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Danh sách trận đấu của tôi</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {getStatusBadge(match.status)}
              <span className="text-xs text-white/40 font-mono">ID: #{match.id}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {match.title || `${match.playerAName} vs ${match.playerBName}`}
            </h1>
            <div className="flex items-center gap-4 text-xs text-white/60 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand" />
                <span>Ngày đấu: {match.matchDate}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Match Details Card & Video Player */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand" />
                <span>Thông tin trận đấu</span>
              </h2>
            </div>

            {/* Players Faceoff Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Player A */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand">VẬN ĐỘNG VIÊN A</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-brand/20 text-brand font-mono font-bold">
                    {match.upperPlayer === 'PLAYER_A' ? 'Sân trên (Xa)' : 'Sân dưới (Gần)'}
                  </span>
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                    A
                  </div>
                  <span className="truncate">{match.playerAName}</span>
                </div>
              </div>

              {/* Player B */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">VẬN ĐỘNG VIÊN B</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                    {match.upperPlayer === 'PLAYER_B' ? 'Sân trên (Xa)' : 'Sân dưới (Gần)'}
                  </span>
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                    B
                  </div>
                  <span className="truncate">{match.playerBName}</span>
                </div>
              </div>
            </div>

            {/* Description / Notes */}
            {match.description && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-white/50">Ghi chú trận đấu</label>
                <div className="p-3.5 rounded-xl bg-[#0f172a] border border-white/10 text-sm text-slate-300 leading-relaxed">
                  {match.description}
                </div>
              </div>
            )}
          </div>

          {/* Video Preview Card if video exists */}
          {video && (
            <div className="rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileVideo className="w-5 h-5 text-emerald-400" />
                  <span>Video Trận Đấu</span>
                </h3>
                <div className="flex items-center gap-3">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 hover:underline"
                    title="Mở video trực tiếp trong tab mới"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở tab mới</span>
                  </a>
                  <span className="text-xs text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {(video.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video relative group flex items-center justify-center">
                <video 
                  src={video.videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                  preload="metadata"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                <span className="truncate max-w-[300px]">Tên file: {video.fileName}</span>
                <span className="font-mono">{video.storagePath}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Upload Component & Workflow */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Video Upload Dropzone (Visible if status is DRAFT or re-upload) */}
          {match.status === 'DRAFT' && (
            <div className="rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-semibold mb-2">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>S3 DIRECT UPLOAD (≤ 500MB)</span>
                </div>
                <h2 className="text-lg font-bold text-white">Tải Lên Video Trận Đấu</h2>
                <p className="text-xs text-white/60 mt-1">
                  Đẩy trực tiếp lên MinIO qua S3 Presigned URL mà không làm nghẽn máy chủ.
                </p>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
                onChange={handleFileSelect}
                className="hidden" 
              />

              {/* Dropzone Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  selectedFile 
                    ? 'border-brand/60 bg-brand/5' 
                    : 'border-white/15 hover:border-brand/40 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white truncate max-w-[280px] mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-brand font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Nhấp để chọn file khác
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Kéo thả video hoặc bấm để chọn</p>
                    <p className="text-xs text-white/40">Hỗ trợ MP4, MOV, MKV, WebM (Tối đa 500MB)</p>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {uploadStatus !== 'idle' && (
                <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      {uploadStatus === 'presigning' && 'Đang sinh Presigned URL an toàn...'}
                      {uploadStatus === 'uploading' && `Đang tải trực tiếp lên MinIO (${uploadProgress}%)`}
                      {uploadStatus === 'verifying' && 'Đang xác thực file hoàn tất...'}
                      {uploadStatus === 'error' && 'Quá trình tải lên bị gián đoạn'}
                    </span>
                    {uploadStatus === 'uploading' && uploadSpeed && (
                      <span className="text-brand font-mono">{uploadSpeed}</span>
                    )}
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        uploadStatus === 'error' ? 'bg-rose-500' : 'bg-brand'
                      }`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Actions */}
              <div>
                {uploadStatus === 'error' ? (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="w-full h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Thử lại tải lên</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadStatus !== 'idle'}
                    className="w-full h-12 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold shadow-glow-blue transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {uploadStatus === 'presigning' || uploadStatus === 'uploading' || uploadStatus === 'verifying' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Bắt đầu tải lên MinIO</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stepper Workflow Card */}
          <div className="rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <HardDrive className="w-4 h-4 text-brand" />
              <span>Quy trình xử lý trận đấu</span>
            </h2>

            <div className="space-y-3.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Bước 1: Khởi tạo Metadata</div>
                  <div className="text-[11px] text-emerald-200/80 mt-0.5">
                    Đã lưu tên 2 vận động viên & vị trí sân (VS-05)
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-start gap-3 p-3 rounded-2xl border ${
                match.status !== 'DRAFT' 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-brand/10 border-brand/30'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${
                  match.status !== 'DRAFT'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-brand/20 text-brand'
                }`}>
                  {match.status !== 'DRAFT' ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Bước 2: Tải lên video S3 Presigned URL</div>
                  <div className="text-[11px] text-white/60 mt-0.5">
                    {match.status !== 'DRAFT' 
                      ? 'Video đã lưu trữ an toàn trên MinIO' 
                      : 'Đang chờ tải video (≤ 500MB)'}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex items-start gap-3 p-3 rounded-2xl border ${
                match.status === 'READY'
                  ? 'bg-brand/10 border-brand/30'
                  : 'bg-white/5 border-white/10 opacity-60'
              }`}>
                <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Bước 3: Phân tích AI & Replay</div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    {match.status === 'READY' 
                      ? 'Sẵn sàng kích hoạt Mock Engine AI (VS-08)' 
                      : 'Cần tải xong video trước khi kích hoạt phân tích'}
                  </div>
                </div>
              </div>
            </div>

            {/* Next Action CTA if READY */}
            {match.status === 'READY' && (
              <div className="pt-2">
                <button
                  type="button"
                  className="w-full h-12 rounded-full bg-gradient-to-r from-brand to-blue-600 hover:from-brand-hover hover:to-blue-500 text-white font-bold shadow-glow-blue transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Kích hoạt Phân tích AI (Sắp ra mắt ở VS-08)</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
