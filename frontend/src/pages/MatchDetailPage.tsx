import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, UploadCloud, AlertCircle, RefreshCw,
  Sparkles, Check, AlertTriangle, Ban, Play, Youtube, Link2, ArrowUpDown, Film
} from 'lucide-react';
import { CameraCourt } from '../components/court/CameraCourt';
import { StartScoreForm } from '../components/match/StartScoreForm';
import { StepIndicator } from '../components/match/StepIndicator';
import { attachYoutubeVideo, getMatch, getMatchVideo, updateMatch, uploadMatchVideo } from '../api/matches';
import { cancelAnalysis, dispatchAnalysis, getAnalysisStatus, retryAnalysis } from '../api/analysis';
import { errorMessage, isNetworkError } from '../api/errors';
import type { Match, MatchVideo } from '../types/match';
import type { AnalysisStatus } from '../types/replay';

/** Same patterns the backend accepts: watch?v=, youtu.be/, /shorts/, /live/ and /embed/ links. */
const YOUTUBE_ID = /^(?:https?:\/\/)?(?:(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/;
const parseYoutubeId = (url: string) => url.trim().match(YOUTUBE_ID)?.[1] ?? null;

/** Name plates laid over the video frame: upper (far) player at the top, lower (near) at the bottom. */
const SidePlates: React.FC<{ upper: string; lower: string }> = ({ upper, lower }) => (
  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between items-start p-3 pb-14">
    <span className="rounded-md bg-pa/90 px-2.5 py-1 text-sm font-semibold text-white shadow">Sân trên · {upper}</span>
    <span className="rounded-md bg-pb/90 px-2.5 py-1 text-sm font-semibold text-white shadow">Sân dưới · {lower}</span>
  </div>
);

export const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [video, setVideo] = useState<MatchVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis State
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
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

  // Local preview of the chosen file, before anything is uploaded
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [swappingSides, setSwappingSides] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);
  const uploadBusy = uploadStatus === 'presigning' || uploadStatus === 'uploading' || uploadStatus === 'verifying';

  const fetchAnalysisStatus = useCallback(async () => {
    try {
      const status = await getAnalysisStatus(id!);
      setAnalysisStatus(status);
      return status;
    } catch (err) {
      console.error('Không thể lấy trạng thái phân tích AI:', err);
      return null;
    }
  }, [id]);

  const fetchMatchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loaded = await getMatch(id!);
      setMatch(loaded);

      // Nếu match đã READY, ANALYZING hoặc COMPLETED, thử lấy metadata video
      if (loaded.status !== 'DRAFT') {
        try {
          setVideo(await getMatchVideo(id!));
        } catch {
          // Bỏ qua nếu chưa có video
        }

        // Lấy thông tin phân tích AI
        await fetchAnalysisStatus();
      }
    } catch (err) {
      setError(errorMessage(err, 'Không thể tải thông tin trận đấu.'));
    } finally {
      setLoading(false);
    }
  }, [id, fetchAnalysisStatus]);

  // Polling tiến trình phân tích khi status đang là QUEUED hoặc PROCESSING
  const matchStatus = match?.status;
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (matchStatus && (matchStatus === 'ANALYZING' || analysisStatus?.status === 'QUEUED' || analysisStatus?.status === 'PROCESSING')) {
      intervalId = setInterval(async () => {
        const latest = await fetchAnalysisStatus();
        if (latest && (latest.status === 'COMPLETED' || latest.status === 'FAILED' || latest.status === 'CANCELLED')) {
          clearInterval(intervalId);
          // Cập nhật lại trạng thái match
          setMatch(await getMatch(id!));
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id, matchStatus, analysisStatus?.status, fetchAnalysisStatus]);

  const handleStartAnalysis = async () => {
    if (!id) return;
    setDispatchingAnalysis(true);
    setAnalysisError(null);
    setCancelSuccessMsg(null);

    try {
      await dispatchAnalysis(id);
      // Lập tức chuyển match sang trạng thái ANALYZING
      if (match) {
        setMatch({ ...match, status: 'ANALYZING' });
      }
      await fetchAnalysisStatus();
    } catch (err) {
      setAnalysisError(errorMessage(err, 'Không thể khởi động phân tích AI. Vui lòng thử lại.'));
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
      setAnalysisStatus(await cancelAnalysis(id));
      if (match) {
        setMatch({ ...match, status: 'READY' });
      }
      setCancelSuccessMsg('Đã hủy phiên phân tích AI thành công.');
      setTimeout(() => setCancelSuccessMsg(null), 4000);
    } catch (err) {
      setAnalysisError(errorMessage(err, 'Không thể hủy phiên phân tích. Vui lòng thử lại.'));
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
      await retryAnalysis(id);
      if (match) {
        setMatch({ ...match, status: 'ANALYZING' });
      }
      await fetchAnalysisStatus();
    } catch (err) {
      setAnalysisError(errorMessage(err, 'Không thể thử lại phân tích AI. Vui lòng thử lại.'));
    } finally {
      setRetryingAnalysis(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMatchDetails();
    }
  }, [id, fetchMatchDetails]);

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type && file.type !== 'video/mp4') {
      setUploadError('Chỉ nhận video MP4. Hãy chuyển định dạng rồi chọn lại.');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError('Video lớn hơn 500 MB. Hãy cắt ngắn hoặc giảm độ phân giải rồi chọn lại.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  // The coach confirms sides against the preview; a wrong side mislabels every stroke later.
  const handleSwapSides = async () => {
    if (!id || !match) return;
    setSwappingSides(true);
    setSwapError(null);
    try {
      setMatch(await updateMatch(id, { upperPlayer: match.lowerPlayer, lowerPlayer: match.upperPlayer }));
    } catch (err) {
      setSwapError(errorMessage(err, 'Chưa đổi được sân. Hãy thử lại.'));
    } finally {
      setSwappingSides(false);
    }
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
      setVideo(await attachYoutubeVideo(id, youtubeUrl.trim()));
      if (match) setMatch({ ...match, status: 'READY' });
      setYoutubeUrl('');
    } catch (err) {
      setYoutubeError(errorMessage(err, 'Không lưu được link YouTube. Hãy thử lại.'));
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
      const uploaded = await uploadMatchVideo(id, selectedFile, {
        onStage: setUploadStatus,
        onProgress: setUploadProgress,
        onSpeed: setUploadSpeed,
      });
      setVideo(uploaded);
      if (match) {
        setMatch({ ...match, status: 'READY' });
      }
      setUploadStatus('idle');
      setSelectedFile(null);
    } catch (err) {
      console.error('Lỗi trong tiến trình upload video:', err);
      setUploadStatus('error');
      setUploadError(
        errorMessage(
          err,
          isNetworkError(err)
            ? 'Mất kết nối mạng trong quá trình upload video. Vui lòng bấm "Thử lại".'
            : 'Upload video không thành công. Vui lòng kiểm tra lại file.',
        ),
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
        <p className="text-ink/70 text-sm max-w-md mb-6">{error || 'Trận đấu không tồn tại hoặc đã bị xóa.'}</p>
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
    <div className="w-full py-8 max-w-6xl mx-auto space-y-6 font-vn">
      <header className="space-y-3">
        <Link to="/my-matches" className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Trận của tôi</span>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">
            {upperName} <span className="font-normal text-ink/65">gặp</span> {lowerName}
          </h1>
          <p className="text-sm text-ink/70 mt-1">
            {match.matchDate ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(match.matchDate)) : null}
            {subtitle && <> · {subtitle}</>}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* What to do next: the only part of this page that changes */}
        <section className={`${match.status === 'DRAFT' ? 'lg:col-span-8' : 'lg:col-span-7'} rounded-lg bg-sheet border border-ink/10 p-6 space-y-5`} aria-label="Bước tiếp theo">
          {!analyzed && <StepIndicator current={step} />}

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
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Video trận đấu</h2>
                  <p className="text-sm text-ink/70 mt-1">
                    {videoSource === 'file'
                      ? 'MP4, tối đa 500 MB. Giữ trang này mở cho đến khi tải xong.'
                      : 'Link một video YouTube công khai. AI tự tải về khi bắt đầu phân tích.'}
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
                      disabled={uploadBusy || youtubeSaving}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                        videoSource === tab.key ? 'bg-sheet text-ink shadow-sm' : 'text-ink/70 hover:text-ink'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" aria-hidden />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* One 16:9 frame for both sources: the picture the coach will check sides against */}
              {videoSource === 'file' ? (
                <>
                  <input ref={fileInputRef} type="file" accept="video/mp4" onChange={handleFileSelect} className="hidden" />
                  {previewUrl ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-ink">
                      <video src={previewUrl} controls muted playsInline preload="metadata" className="w-full h-full object-contain" />
                      <SidePlates upper={upperName} lower={lowerName} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`w-full aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 ${
                        dragOver ? 'border-pitch bg-pitch-soft' : 'border-ink/20 bg-ground/60 hover:border-pitch/60 hover:bg-pitch-soft/50'
                      }`}
                    >
                      <span className="w-14 h-14 rounded-full bg-pitch text-white flex items-center justify-center">
                        <UploadCloud className="w-7 h-7" aria-hidden />
                      </span>
                      <span className="text-base font-semibold text-ink">{dragOver ? 'Thả video vào đây' : 'Kéo video vào đây, hoặc bấm để chọn'}</span>
                      <span className="text-sm text-ink/70">MP4, tối đa 500 MB · xem trước ngay, chưa tải lên</span>
                    </button>
                  )}

                  {selectedFile && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink">
                        <Film className="inline w-4 h-4 mr-1.5 -mt-0.5 text-ink/65" aria-hidden />
                        {selectedFile.name}
                        <span className="text-ink/65 tabular-nums"> · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadBusy}
                        className="shrink-0 font-medium text-pitch hover:text-pitch-deep disabled:opacity-50"
                      >
                        Chọn video khác
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <form id="youtube-form" onSubmit={handleUseYoutube} className="space-y-3">
                  <label htmlFor="youtube-url" className="sr-only">Link YouTube</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/65" aria-hidden />
                    <input
                      id="youtube-url"
                      name="youtubeUrl"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={youtubeUrl}
                      onChange={e => {
                        setYoutubeUrl(e.target.value);
                        setYoutubeError(null);
                      }}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className="w-full h-11 pl-9 pr-3 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder:text-ink/55 focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
                    />
                  </div>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-ink flex items-center justify-center">
                    {youtubeId ? (
                      <>
                        <img
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          alt="Ảnh đầu video YouTube"
                          width={480}
                          height={360}
                          className="w-full h-full object-cover"
                        />
                        <SidePlates upper={upperName} lower={lowerName} />
                      </>
                    ) : (
                      <span className="text-sm text-white/70 px-6 text-center">
                        {youtubeUrl.trim()
                          ? 'Chưa nhận ra link. Link cần có dạng youtube.com/watch?v=… hoặc youtu.be/…'
                          : 'Dán link vào ô trên để xem trước video.'}
                      </span>
                    )}
                  </div>
                  {youtubeError && (
                    <div className="px-3 py-2.5 rounded-md bg-loss/10 text-sm text-loss flex items-center gap-2" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                      <span>{youtubeError}</span>
                    </div>
                  )}
                </form>
              )}

              {/* Sides are wrong more often than anything else; settle them while the picture is on screen */}
              {(previewUrl || (videoSource === 'youtube' && youtubeId)) && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-ground px-4 py-3">
                  <p className="text-sm text-ink">
                    Người ở <strong>nửa sân trên</strong>, xa camera, là <strong className="text-pa">{upperName}</strong>?
                  </p>
                  <button
                    type="button"
                    onClick={handleSwapSides}
                    disabled={swappingSides || uploadBusy || youtubeSaving}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-sheet px-3 h-8 text-sm font-medium text-ink hover:border-pitch hover:text-pitch-deep transition-colors disabled:opacity-50"
                  >
                    <ArrowUpDown className="w-4 h-4" aria-hidden />
                    {swappingSides ? 'Đang đổi…' : 'Sai, đổi sân'}
                  </button>
                  {swapError && <p className="w-full text-sm text-loss" role="alert">{swapError}</p>}
                </div>
              )}

              {videoSource === 'file' && uploadStatus !== 'idle' && (
                <div className="space-y-2" aria-live="polite">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">
                      {uploadStatus === 'presigning' && 'Đang chuẩn bị tải lên…'}
                      {uploadStatus === 'uploading' && `Đang tải lên (${uploadProgress}%)`}
                      {uploadStatus === 'verifying' && 'Đang kiểm tra video…'}
                      {uploadStatus === 'error' && 'Tải lên bị gián đoạn'}
                    </span>
                    {uploadStatus === 'uploading' && uploadSpeed && <span className="text-ink/70 tabular-nums">{uploadSpeed}</span>}
                  </div>
                  <div className="w-full h-2 rounded-full bg-ink/10 overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-300 rounded-full ${uploadStatus === 'error' ? 'bg-loss' : 'bg-pitch'}`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {videoSource === 'file' && uploadError && (
                <div className="px-3 py-2.5 rounded-md bg-loss/10 text-sm text-loss flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                  <span>{uploadError}</span>
                </div>
              )}

              {videoSource === 'file' ? (
                selectedFile && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploadStatus === 'error' ? false : uploadStatus !== 'idle'}
                    className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-60 text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {uploadBusy ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                    ) : uploadStatus === 'error' ? (
                      <RefreshCw className="w-4 h-4" aria-hidden />
                    ) : (
                      <UploadCloud className="w-4 h-4" aria-hidden />
                    )}
                    {uploadBusy ? 'Đang tải lên…' : uploadStatus === 'error' ? 'Thử tải lại' : 'Đúng rồi, tải video lên'}
                  </button>
                )
              ) : (
                youtubeId && (
                  <button
                    type="submit"
                    form="youtube-form"
                    disabled={youtubeSaving}
                    className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-60 text-white font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {youtubeSaving ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                    ) : (
                      <Youtube className="w-4 h-4" aria-hidden />
                    )}
                    {youtubeSaving ? 'Đang lưu…' : 'Đúng rồi, dùng video này'}
                  </button>
                )
              )}
            </div>
          )}

          {match.status === 'READY' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Video đã sẵn sàng</h2>
                <p className="text-sm text-ink/70 mt-1">
                  AI sẽ tìm từng cú đánh và pha cầu. Bạn xem được trận ngay khi AI bắt đầu, kết quả hiện dần theo từng pha.
                </p>
              </div>
              {analysisStatus?.status === 'CANCELLED' && (
                <p className="text-sm text-ink/70">Lần phân tích trước đã dừng. Bấm bên dưới để phân tích lại.</p>
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
                <p className="text-sm text-ink/70 mt-1">Bạn có thể xem trận ngay, các pha cầu hiện dần khi AI phân tích tới.</p>
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
                className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-loss transition-colors disabled:opacity-50"
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
                <p className="text-sm text-ink/70 mt-1">Xem lại trận, những điểm bị mất và các pha cầu đáng chú ý.</p>
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
                className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{dispatchingAnalysis ? 'Đang gửi...' : 'Phân tích lại'}</span>
              </button>
            </div>
          )}
        </section>

        {/* Who plays on which side: while the video is still missing, as the camera will show it */}
        {match.status === 'DRAFT' ? (
          <aside className="lg:col-span-4 lg:sticky lg:top-16 space-y-4">
            <div className="rounded-lg bg-sheet border border-ink/10 p-5 space-y-3">
              <h2 className="text-lg font-semibold text-ink">Như trong video</h2>
              <CameraCourt upperName={upperName} lowerName={lowerName} />
            </div>
            <div className="rounded-lg bg-sheet border border-ink/10 p-5">
              <h2 className="text-sm font-semibold text-ink">Video để AI phân tích tốt</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-ink/70">
                {[
                  'Quay từ phía sau một đầu sân, như truyền hình.',
                  'Thấy trọn cả hai nửa sân trong khung hình.',
                  'Một trận liền mạch, không cắt ghép hay quay chậm.',
                  'Rõ nét từ 720p trở lên.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-pitch" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : (
        <aside className="lg:col-span-5 rounded-lg bg-sheet border border-ink/10 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink/70">Hai vận động viên</h2>
          <ul className="space-y-3">
            {[
              { name: upperName, side: 'Sân trên, phía xa camera', bar: 'bg-pa' },
              { name: lowerName, side: 'Sân dưới, gần camera', bar: 'bg-pb' },
            ].map(row => (
              <li key={row.side} className="flex items-center gap-3">
                <span className={`w-1 h-9 rounded-full ${row.bar}`} />
                <span>
                  <span className="block font-semibold text-ink">{row.name}</span>
                  <span className="block text-xs text-ink/70">{row.side}</span>
                </span>
              </li>
            ))}
          </ul>
          {match.description && (
            <p className="text-sm text-ink/70 leading-relaxed border-t border-ink/10 pt-4">{match.description}</p>
          )}
          <StartScoreForm
            matchId={match.id}
            playerAName={match.playerAName}
            playerBName={match.playerBName}
            startGame={match.startGame}
            startScoreA={match.startScoreA}
            startScoreB={match.startScoreB}
            onSaved={setMatch}
          />
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
        )}
      </div>
    </div>
  );
};
