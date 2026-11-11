import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, CheckCircle2, UploadCloud, AlertCircle, RefreshCw,
  Sparkles, Check, AlertTriangle, Ban, Play, Youtube, Link2
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
  fileSize: number | null;
  status: string;
  videoSourceType?: string;
  youtubeVideoId?: string | null;
}

/** Same patterns the backend accepts: watch?v=, youtu.be/, /shorts/, /live/ and /embed/ links. */
const YOUTUBE_ID = /^(?:https?:\/\/)?(?:(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/;
const parseYoutubeId = (url: string) => url.trim().match(YOUTUBE_ID)?.[1] ?? null;

interface AnalysisStatusData {
  analysisId: number | null;
  matchId: number;
  status: string; // NONE, QUEUED, PROCESSING, COMPLETED, FAILED, UNSUPPORTED, CANCELLED
  progressPercent: number;
  currentStage: string;
  modelName?: string;
  modelVersion?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis State
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatusData | null>(null);
  const [dispatchingAnalysis, setDispatchingAnalysis] = useState(false);
  const [cancellingAnalysis, setCancellingAnalysis] = useState(false);
  const [retryingAnalysis, setRetryingAnalysis] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'presigning' | 'uploading' | 'verifying' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A YouTube link instead of a file
  const [videoSource, setVideoSource] = useState<'file' | 'youtube'>('file');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeSaving, setYoutubeSaving] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const youtubeId = parseYoutubeId(youtubeUrl);

  const fetchAnalysisStatus = async () => {
    try {
      const res = await apiClient.get(`/matches/${id}/analysis/status`);
      setAnalysisStatus(res.data);
      return res.data;
    } catch (err) {
      console.error('Không thể lấy trạng thái phân tích AI:', err);
      return null;
    }
  };

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/matches/${id}`);
      setMatch(res.data);

      // Nếu match đã READY, ANALYZING hoặc COMPLETED, thử lấy metadata video
      if (res.data.status !== 'DRAFT') {
        try {
          const videoRes = await apiClient.get(`/matches/${id}/video`);
          setVideo(videoRes.data);
        } catch (vErr) {
          // Bỏ qua nếu chưa có video
        }

        // Lấy thông tin phân tích AI
        await fetchAnalysisStatus();
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể tải thông tin trận đấu.');
    } finally {
      setLoading(false);
    }
  };

  // Polling tiến trình phân tích khi status đang là QUEUED hoặc PROCESSING
  useEffect(() => {
    let intervalId: any;
    if (match && (match.status === 'ANALYZING' || analysisStatus?.status === 'QUEUED' || analysisStatus?.status === 'PROCESSING')) {
      intervalId = setInterval(async () => {
        const latest = await fetchAnalysisStatus();
        if (latest && (latest.status === 'COMPLETED' || latest.status === 'FAILED' || latest.status === 'CANCELLED')) {
          clearInterval(intervalId);
          // Cập nhật lại trạng thái match
          const matchRes = await apiClient.get(`/matches/${id}`);
          setMatch(matchRes.data);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, match?.status, analysisStatus?.status]);

  const handleStartAnalysis = async () => {
    if (!id) return;
    setDispatchingAnalysis(true);
    setAnalysisError(null);
    setCancelSuccessMsg(null);

    try {
      await apiClient.post(`/matches/${id}/analysis/dispatch`);
      // Lập tức chuyển match sang trạng thái ANALYZING
      if (match) {
        setMatch({ ...match, status: 'ANALYZING' });
      }
      await fetchAnalysisStatus();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setAnalysisError(serverMsg || 'Không thể khởi động phân tích AI. Vui lòng thử lại.');
    } finally {
      setDispatchingAnalysis(false);
    }
  };

  const handleCancelAnalysis = async () => {
    if (!id) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiên phân tích AI đang chạy?')) return;

    setCancellingAnalysis(true);
    setAnalysisError(null);

    try {
      const cancelRes = await apiClient.post(`/matches/${id}/analysis/cancel`);
      setAnalysisStatus(cancelRes.data);
      if (match) {
        setMatch({ ...match, status: 'READY' });
      }
      setCancelSuccessMsg('Đã hủy phiên phân tích AI thành công.');
      setTimeout(() => setCancelSuccessMsg(null), 4000);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setAnalysisError(serverMsg || 'Không thể hủy phiên phân tích. Vui lòng thử lại.');
    } finally {
      setCancellingAnalysis(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!id) return;
    setRetryingAnalysis(true);
    setAnalysisError(null);
    setCancelSuccessMsg(null);

    try {
      await apiClient.post(`/matches/${id}/analysis/retry`);
      if (match) {
        setMatch({ ...match, status: 'ANALYZING' });
      }
      await fetchAnalysisStatus();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setAnalysisError(serverMsg || 'Không thể thử lại phân tích AI. Vui lòng thử lại.');
    } finally {
      setRetryingAnalysis(false);
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

  const handleUseYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!youtubeId) {
      setYoutubeError('Link chưa đúng. Hãy dán link dạng youtube.com/watch?v=… hoặc youtu.be/…');
      return;
    }
    setYoutubeSaving(true);
    setYoutubeError(null);
    try {
      const res = await apiClient.post(`/matches/${id}/videos/youtube`, { url: youtubeUrl.trim() });
      setVideo(res.data);
      if (match) setMatch({ ...match, status: 'READY' });
      setYoutubeUrl('');
    } catch (err: any) {
      setYoutubeError(err.response?.data?.message || 'Không lưu được link YouTube. Hãy thử lại.');
    } finally {
      setYoutubeSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !id) return;

    setUploadStatus('presigning');
    setUploadError(null);
    setUploadProgress(0);

    try {
      let uploadSuccess = false;

      // CÁCH 1: Thử S3 Presigned URL
      // Only retry through the backend when presigning or the S3 PUT fails.
      // A verification failure must not upload the whole video a second time.
      let storagePath: string | null = null;
      try {
        const presignRes = await apiClient.post(`/matches/${id}/videos/upload-url`, {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type || 'video/mp4'
        });

        const { uploadUrl, storagePath: presignedStoragePath } = presignRes.data;
        storagePath = presignedStoragePath;

        setUploadStatus('uploading');
        let startTime = Date.now();
        let lastLoaded = 0;

        await axios.put(uploadUrl, selectedFile, {
          timeout: 600000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);

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

      } catch (presignErr) {
        console.warn('Presigned PUT không khả dụng, tự động chuyển sang Direct Upload:', presignErr);

        // CÁCH 2: Tự động Fallback sang Direct Upload qua Backend
        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('file', selectedFile);

        const directRes = await apiClient.post(`/matches/${id}/videos/direct-upload`, formData, {
          timeout: 600000,
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          }
        });

        setVideo(directRes.data);
        uploadSuccess = true;
        storagePath = null;
      }

      if (storagePath) {
        setUploadStatus('verifying');
        const completeRes = await apiClient.post(`/matches/${id}/videos/complete`, {
          storagePath,
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        });

        setVideo(completeRes.data);
        uploadSuccess = true;
      }

      if (uploadSuccess && match) {
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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pitch border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-700 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">Không tìm thấy trận đấu</h2>
        <p className="text-ink/60 text-sm max-w-md mb-6">{error || 'Trận đấu không tồn tại hoặc đã bị xóa.'}</p>
        <Link
          to="/my-matches"
          className="px-6 py-2.5 rounded-full bg-pitch hover:bg-pitch-deep text-white text-sm font-semibold transition-colors"
        >
          Về danh sách trận đấu
        </Link>
      </div>
    );
  }

  const analyzed = match.status === 'ANALYZED' || match.status === 'COMPLETED' || match.status === 'PUBLISHED';
  const analyzing = match.status === 'ANALYZING';
  const upperName = match.upperPlayer === 'PLAYER_B' ? match.playerBName : match.playerAName;
  const lowerName = match.upperPlayer === 'PLAYER_B' ? match.playerAName : match.playerBName;
  const players = `${match.playerAName} gặp ${match.playerBName}`;
  const subtitle = match.title && match.title !== players ? match.title : null;
  const step = match.status === 'DRAFT' ? 2 : analyzed ? 4 : 3;
  const progress = analysisStatus?.progressPercent ?? 0;
  const lastRunFailed = analysisStatus?.status === 'FAILED' || analysisStatus?.status === 'UNSUPPORTED';

  return (
    <div className="w-full py-8 max-w-4xl mx-auto space-y-6">
      <header className="space-y-3">
        <Link to="/my-matches" className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Trận của tôi</span>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">
            {upperName} <span className="font-normal text-ink/40">gặp</span> {lowerName}
          </h1>
          <p className="text-sm text-ink/55 mt-1">
            {match.matchDate}
            {subtitle && <> · {subtitle}</>}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* What to do next: the only part of this page that changes */}
        <section className="lg:col-span-7 rounded-lg bg-sheet border border-ink/10 p-6 space-y-5" aria-label="Bước tiếp theo">
          {!analyzed && (
            <ol className="flex flex-wrap items-center gap-2 text-xs text-ink/55" aria-label="Các bước">
              {['Thông tin trận', 'Tải video', 'AI phân tích'].map((label, index) => {
                const n = index + 1;
                const done = n < step;
                const current = n === step;
                return (
                  <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                    {index > 0 && <span className="w-6 h-px bg-ink/15" />}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                        done ? 'bg-pitch text-white' : current ? 'bg-ink text-white' : 'bg-ink/10 text-ink/50'
                      }`}
                    >
                      {done ? <Check className="w-3 h-3" /> : n}
                    </span>
                    <span className={current ? 'text-ink font-medium' : ''}>{label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {cancelSuccessMsg && (
            <div className="px-3 py-2.5 rounded-md bg-pitch-soft text-sm text-pitch-deep flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{cancelSuccessMsg}</span>
            </div>
          )}
          {analysisError && (
            <div className="px-3 py-2.5 rounded-md bg-loss/10 text-sm text-loss flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {match.status === 'DRAFT' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Video trận đấu</h2>
                <p className="text-sm text-ink/60 mt-1">
                  {videoSource === 'file'
                    ? 'Video MP4, tối đa 500 MB. Giữ trang này mở cho đến khi tải xong.'
                    : 'Dán link một video YouTube công khai. AI tự tải video về khi bắt đầu phân tích.'}
                </p>
              </div>

              <div role="tablist" aria-label="Nguồn video" className="inline-flex p-1 rounded-lg bg-ink/[0.06]">
                {([
                  { key: 'file', label: 'Tải file lên', icon: UploadCloud },
                  { key: 'youtube', label: 'Link YouTube', icon: Youtube },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={videoSource === tab.key}
                    onClick={() => setVideoSource(tab.key)}
                    disabled={uploadStatus === 'presigning' || uploadStatus === 'uploading' || uploadStatus === 'verifying' || youtubeSaving}
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                      videoSource === tab.key ? 'bg-sheet text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {videoSource === 'youtube' ? (
                <form onSubmit={handleUseYoutube} className="space-y-3">
                  <label htmlFor="youtube-url" className="sr-only">Link YouTube</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" aria-hidden />
                    <input
                      id="youtube-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      value={youtubeUrl}
                      onChange={e => {
                        setYoutubeUrl(e.target.value);
                        setYoutubeError(null);
                      }}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className="w-full h-11 pl-9 pr-3 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pitch"
                    />
                  </div>

                  {youtubeId ? (
                    <div className="flex items-center gap-3 rounded-md border border-pitch/30 bg-pitch-soft/40 p-2">
                      <img
                        src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                        alt=""
                        className="w-28 aspect-video rounded object-cover bg-ink/10 shrink-0"
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-ink">Đã nhận ra video</p>
                        <p className="text-ink/55 truncate">youtu.be/{youtubeId}</p>
                      </div>
                    </div>
                  ) : youtubeUrl.trim() ? (
                    <p className="text-sm text-ink/55">Chưa nhận ra link. Link cần có dạng youtube.com/watch?v=… hoặc youtu.be/…</p>
                  ) : null}

                  {youtubeError && (
                    <div className="px-3 py-2.5 rounded-md bg-loss/10 text-sm text-loss flex items-center gap-2" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{youtubeError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!youtubeId || youtubeSaving}
                    className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {youtubeSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Youtube className="w-4 h-4" />
                        <span>Dùng video này</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-ink/50">
                    Nên chọn video quay từ camera phía sau sân như truyền hình, không phải video ngắn hay video đã cắt ghép.
                  </p>
                </form>
              ) : (
              <>

              <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileSelect} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  selectedFile ? 'border-pitch/60 bg-pitch-soft/40' : 'border-ink/15 hover:border-pitch/40 bg-ink/[0.02]'
                }`}
              >
                <UploadCloud className="w-6 h-6 text-pitch mx-auto mb-2" />
                {selectedFile ? (
                  <>
                    <span className="block text-sm font-semibold text-ink truncate">{selectedFile.name}</span>
                    <span className="block text-xs text-ink/55 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · bấm để chọn video khác
                    </span>
                  </>
                ) : (
                  <span className="block text-sm font-medium text-ink">Bấm để chọn video</span>
                )}
              </button>

              {uploadStatus !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">
                      {uploadStatus === 'presigning' && 'Đang chuẩn bị tải lên...'}
                      {uploadStatus === 'uploading' && `Đang tải lên (${uploadProgress}%)`}
                      {uploadStatus === 'verifying' && 'Đang kiểm tra video...'}
                      {uploadStatus === 'error' && 'Tải lên bị gián đoạn'}
                    </span>
                    {uploadStatus === 'uploading' && uploadSpeed && <span className="text-ink/55 tabular-nums">{uploadSpeed}</span>}
                  </div>
                  <div className="w-full h-2 rounded-full bg-ink/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${uploadStatus === 'error' ? 'bg-loss' : 'bg-pitch'}`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="px-3 py-2.5 rounded-md bg-loss/10 text-sm text-loss flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadStatus === 'error' ? false : !selectedFile || uploadStatus !== 'idle'}
                className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {uploadStatus === 'presigning' || uploadStatus === 'uploading' || uploadStatus === 'verifying' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : uploadStatus === 'error' ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Thử tải lại</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Tải lên</span>
                  </>
                )}
              </button>
              </>
              )}
            </div>
          )}

          {match.status === 'READY' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Video đã sẵn sàng</h2>
                <p className="text-sm text-ink/60 mt-1">
                  AI sẽ tìm từng cú đánh và pha cầu. Bạn xem được trận ngay khi AI bắt đầu, kết quả hiện dần theo từng pha.
                </p>
              </div>
              {analysisStatus?.status === 'CANCELLED' && (
                <p className="text-sm text-ink/60">Lần phân tích trước đã dừng. Bấm bên dưới để phân tích lại.</p>
              )}
              {lastRunFailed && (
                <div className="px-3 py-2.5 rounded-md bg-loss/10 text-sm text-loss flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Lần phân tích trước không thành công.{' '}
                    {analysisStatus?.errorMessage || 'Góc quay không chuẩn hoặc người chơi bị che khuất quá lâu.'}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={lastRunFailed ? handleRetryAnalysis : handleStartAnalysis}
                disabled={dispatchingAnalysis || retryingAnalysis}
                className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {dispatchingAnalysis || retryingAnalysis ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Phân tích trận đấu</span>
                  </>
                )}
              </button>
            </div>
          )}

          {analyzing && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">AI đang phân tích</h2>
                <p className="text-sm text-ink/60 mt-1">Bạn có thể xem trận ngay, các pha cầu hiện dần khi AI phân tích tới.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/70">{analysisStatus?.currentStage || 'Đang khởi động'}</span>
                  <span className="text-ink font-semibold tabular-nums">{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-ink/10 overflow-hidden">
                  <div className="h-full bg-pitch transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <Link
                to={`/matches/${id}/replay`}
                className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Xem ngay</span>
              </Link>
              <button
                type="button"
                onClick={handleCancelAnalysis}
                disabled={cancellingAnalysis}
                className="inline-flex items-center gap-1.5 text-sm text-ink/55 hover:text-loss transition-colors disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{cancellingAnalysis ? 'Đang dừng...' : 'Dừng phân tích'}</span>
              </button>
            </div>
          )}

          {analyzed && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Đã phân tích xong</h2>
                <p className="text-sm text-ink/60 mt-1">Xem lại trận, những điểm bị mất và các pha cầu đáng chú ý.</p>
              </div>
              <Link
                to={`/matches/${id}/replay`}
                className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Xem lại trận đấu</span>
              </Link>
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={dispatchingAnalysis}
                className="inline-flex items-center gap-1.5 text-sm text-ink/55 hover:text-ink transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{dispatchingAnalysis ? 'Đang gửi...' : 'Phân tích lại'}</span>
              </button>
            </div>
          )}
        </section>

        {/* Who plays on which side: fixed facts, kept quiet */}
        <aside className="lg:col-span-5 rounded-lg bg-sheet border border-ink/10 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink/60">Hai vận động viên</h2>
          <ul className="space-y-3">
            {[
              { name: upperName, side: 'Sân trên, phía xa camera', bar: 'bg-pa' },
              { name: lowerName, side: 'Sân dưới, gần camera', bar: 'bg-pb' },
            ].map(row => (
              <li key={row.side} className="flex items-center gap-3">
                <span className={`w-1 h-9 rounded-full ${row.bar}`} />
                <span>
                  <span className="block font-semibold text-ink">{row.name}</span>
                  <span className="block text-xs text-ink/55">{row.side}</span>
                </span>
              </li>
            ))}
          </ul>
          {match.description && (
            <p className="text-sm text-ink/70 leading-relaxed border-t border-ink/10 pt-4">{match.description}</p>
          )}
          {video && match.status === 'READY' && (
            video.videoSourceType === 'YOUTUBE' && video.youtubeVideoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`}
                title="Video trận đấu trên YouTube"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full rounded-md bg-black aspect-video"
              />
            ) : (
              <video src={video.videoUrl} controls preload="metadata" className="w-full rounded-md bg-black aspect-video" />
            )
          )}
        </aside>
      </div>
    </div>
  );
};
