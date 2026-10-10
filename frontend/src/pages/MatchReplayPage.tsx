import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Play, Pause, ArrowLeft, Clock, 
  Sparkles, AlertCircle, AlertTriangle,
  Layers, Volume2, Volume1, VolumeX,
  Zap, Target, ChevronRight,
  RotateCcw, RotateCw, SkipBack, SkipForward,
  Gauge, Maximize, Eye, Keyboard, X, Trophy, BarChart3
} from 'lucide-react';
import apiClient from '../api/client';
import { Court2DViewer, AiEventData } from '../components/court/Court2DViewer';
import { TimelineMarkers } from '../components/replay/TimelineMarkers';
import { StrokeDetailCard } from '../components/replay/StrokeDetailCard';
import { RalliesExplorer, RallyData } from '../components/replay/RalliesExplorer';
import { StatisticsDashboard, MatchStatisticsData } from '../components/replay/StatisticsDashboard';

interface MatchData {
  id: number;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  lowerPlayer: string;
  matchDate: string;
  title: string | null;
  status: string;
}

interface VideoData {
  id: number;
  matchId: number;
  fileName: string;
  storagePath: string;
  videoUrl: string;
  durationSeconds?: number;
}

export const MatchReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [events, setEvents] = useState<AiEventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AiEventData | null>(null);
  const [rallies, setRallies] = useState<RallyData[]>([]);
  const [selectedRally, setSelectedRally] = useState<RallyData | null>(null);
  const [statistics, setStatistics] = useState<MatchStatisticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'STROKES' | 'RALLIES' | 'STATISTICS'>('STROKES');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [prevVolume, setPrevVolume] = useState<number>(1.0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [filterStroke, setFilterStroke] = useState<string>('ALL');

  // Hover controls & Auto-hide
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OSD (On-Screen Display) toast notification for shortcuts
  const [osdMessage, setOsdMessage] = useState<string | null>(null);
  const osdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard Shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Helper hiển thị thông báo OSD nhanh
  const showOsd = (msg: string) => {
    setOsdMessage(msg);
    if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    osdTimeoutRef.current = setTimeout(() => {
      setOsdMessage(null);
    }, 1200);
  };

  // Hover timeout: tự động ẩn control bar sau 2.5s khi đang phát video
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setIsControlsVisible(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Lấy thông tin trận đấu
        const matchRes = await apiClient.get(`/matches/${id}`);
        setMatch(matchRes.data);

        // 2. Lấy thông tin video & URL phát
        const videoRes = await apiClient.get(`/matches/${id}/video`);
        setVideo(videoRes.data);

        // 3. Lấy danh sách AI events phục vụ timeline & 2D radar
        const eventsRes = await apiClient.get(`/matches/${id}/analysis/events`);
        setEvents(eventsRes.data);

        if (eventsRes.data.length > 0) {
          setSelectedEvent(eventsRes.data[0]);
        }

        // 4. Lấy danh sách Rallies (VS-11)
        try {
          const ralliesRes = await apiClient.get(`/matches/${id}/analysis/rallies`);
          setRallies(ralliesRes.data);
          if (ralliesRes.data.length > 0) {
            setSelectedRally(ralliesRes.data[0]);
          }
        } catch (rErr) {
          console.warn('Chưa có dữ liệu Rallies:', rErr);
        }

        // 5. Lấy dữ liệu thống kê chuyên sâu toàn diện (VS-12)
        try {
          const statsRes = await apiClient.get(`/matches/${id}/analysis/statistics`);
          setStatistics(statsRes.data);
        } catch (sErr) {
          console.warn('Chưa có dữ liệu Thống kê:', sErr);
        }
      } catch (err: any) {
        console.error('Lỗi khi tải dữ liệu Replay:', err);
        setError(err.response?.data?.message || 'Không thể tải dữ liệu trận đấu hoặc phiên phân tích.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Đồng bộ Video TimeUpdate với Timeline & 2D Court
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Tìm event gần nhất với curr (trong khoảng +/- 0.8 giây)
    const active = events.find((e) => Math.abs(e.timeSeconds - curr) <= 0.8);
    if (active && (!selectedEvent || selectedEvent.id !== active.id)) {
      setSelectedEvent(active);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur || 60);
      videoRef.current.volume = volume;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setIsControlsVisible(true);
      showOsd('Tạm dừng');
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      showOsd('Đang phát');
      // Thiết lập auto-hide sau 2.5s
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  };

  // Thay đổi âm lượng chính xác
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
    setVolume(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
    if (clamped > 0) {
      setPrevVolume(clamped);
    }
  };

  const changeVolumeDelta = (delta: number) => {
    const target = Math.max(0, Math.min(1, Math.round((volume + delta) * 10) / 10));
    handleVolumeChange(target);
    showOsd(`Âm lượng: ${Math.round(target * 100)}%`);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted || volume === 0) {
      const restore = prevVolume > 0 ? prevVolume : 0.8;
      videoRef.current.muted = false;
      videoRef.current.volume = restore;
      setVolume(restore);
      setIsMuted(false);
      showOsd(`Bật tiếng: ${Math.round(restore * 100)}%`);
    } else {
      setPrevVolume(volume);
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
      showOsd('Đã tắt tiếng');
    }
  };

  // Tua tới / Tua lui
  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    showOsd(seconds > 0 ? `Tua tới +${seconds}s` : `Tua lùi ${seconds}s`);
  };

  // Chuyển sang Cú đánh Trước đó / Kế tiếp
  const handleJumpStroke = (direction: 'prev' | 'next') => {
    if (!events.length) return;
    const currentIndex = selectedEvent 
      ? events.findIndex(e => e.id === selectedEvent.id) 
      : 0;

    let targetIndex = 0;
    if (direction === 'prev') {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      showOsd('Cú đánh trước đó');
    } else {
      targetIndex = currentIndex < events.length - 1 ? currentIndex + 1 : events.length - 1;
      showOsd('Cú đánh kế tiếp');
    }
    handleSeekToEvent(events[targetIndex]);
  };

  // Điều chỉnh tốc độ phát
  const handleChangeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    showOsd(`Tốc độ: ${speed}x`);
  };

  const adjustPlaybackRate = (delta: number) => {
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    let currIdx = speeds.indexOf(playbackRate);
    if (currIdx === -1) currIdx = 3; // 1.0x
    const nextIdx = Math.max(0, Math.min(speeds.length - 1, currIdx + (delta > 0 ? 1 : -1)));
    handleChangeSpeed(speeds[nextIdx]);
  };

  // Toàn màn hình
  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.();
      showOsd('Toàn màn hình');
    } else {
      document.exitFullscreen?.();
      showOsd('Thu nhỏ màn hình');
    }
  };

  const handleSeekToEvent = (event: AiEventData) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = event.timeSeconds;
    setCurrentTime(event.timeSeconds);
    setSelectedEvent(event);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Phát lại chậm 0.5x cho cú đánh được chọn
  const handlePlaySlow = (timeSeconds: number) => {
    if (!videoRef.current) return;
    const startSec = Math.max(0, timeSeconds - 0.3);
    videoRef.current.currentTime = startSec;
    videoRef.current.playbackRate = 0.5;
    setPlaybackRate(0.5);
    setCurrentTime(startSec);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    showOsd('Soi chậm 0.5x');
  };

  // VS-11: Tua video và phát một đợt cầu (Rally)
  const handlePlayRally = (rally: RallyData) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = rally.startTime;
    setCurrentTime(rally.startTime);
    setSelectedRally(rally);

    // Đồng bộ cú đánh đầu tiên của rally này
    const firstEvt = events.find((e) => Math.abs(e.timeSeconds - rally.startTime) <= 0.8);
    if (firstEvt) {
      setSelectedEvent(firstEvt);
    }

    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    showOsd(`Phát pha cầu #${rally.rallyNumber}`);
  };

  // Xử lý kéo thanh trượt seeker
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  // BỘ LẮNG NGHE PHÍM TẮT ĐIỀU KHIỂN (KEYBOARD SHORTCUTS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu người dùng đang nhập trong input, textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          handleSkip(-5);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          handleSkip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolumeDelta(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolumeDelta(-0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case '[':
          e.preventDefault();
          handleJumpStroke('prev');
          break;
        case ']':
          e.preventDefault();
          handleJumpStroke('next');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case '<':
        case ',':
          e.preventDefault();
          adjustPlaybackRate(-0.25);
          break;
        case '>':
        case '.':
          e.preventDefault();
          adjustPlaybackRate(0.25);
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal(prev => !prev);
          break;
        case 'Escape':
          if (showShortcutsModal) {
            setShowShortcutsModal(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, selectedEvent, events, volume, isMuted, playbackRate, showShortcutsModal]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStrokeBadgeClass = (stroke: string) => {
    switch (stroke.toUpperCase()) {
      case 'SMASH':
      case 'NET_ATTACK':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'DROP':
      case 'NET_SHOT':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'CLEAR':
      case 'LIFT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'DRIVE':
      case 'PUSH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'SERVE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  // Lọc các cú đánh
  const filteredEvents = filterStroke === 'ALL'
    ? events
    : events.filter(e => e.stroke.toUpperCase() === filterStroke);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Chưa sẵn sàng xem lại</h2>
        <p className="text-white/60 text-sm max-w-md mb-6">{error || 'Trận đấu chưa có dữ liệu Replay.'}</p>
        <Link
          to={`/matches/${id}`}
          className="px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors"
        >
          Quay lại chi tiết trận đấu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <Link
            to={`/matches/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Quản lý trận đấu</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="text-blue-400">{match.playerAName}</span>
              <span className="text-white/40 font-normal">VS</span>
              <span className="text-amber-400">{match.playerBName}</span>
            </h1>
            <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>COACHAI+ 2.0 REPLAY</span>
            </span>
          </div>
        </div>

        {/* Quick filter by stroke */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-white/50 text-[11px] mr-1">Lọc cú đánh:</span>
          {['ALL', 'SMASH', 'DROP', 'CLEAR', 'NET_SHOT', 'SERVE'].map((stroke) => (
            <button
              key={stroke}
              onClick={() => setFilterStroke(stroke)}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterStroke === stroke
                  ? 'bg-brand text-white shadow-glow-blue'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
              }`}
            >
              {stroke}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout (8 cols Cột Trái : 4 cols Cột Phải Danh Sách Cú Đánh Dọc) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CỘT TRÁI (8 cols): Video Player + Full Controls + Timeline + Sân 2D Nằm Ngang */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Video Player Container with Advanced Control Bar */}
          <div
            ref={playerContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-video group select-none flex flex-col justify-end"
          >
            {video?.videoUrl ? (
              <video
                ref={videoRef}
                src={video.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/40 space-y-2">
                <Play className="w-12 h-12" />
                <span className="text-xs">Đang tải video stream...</span>
              </div>
            )}

            {/* OSD (On-Screen Display) Center Toast Feedback for Shortcuts */}
            {osdMessage && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
                <div className="bg-black/80 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-2xl text-white animate-pulse">
                  <span className="text-xs sm:text-sm font-bold tracking-wide">{osdMessage}</span>
                </div>
              </div>
            )}

            {/* Center Play Button Watermark when Paused (Hover to see) */}
            {!isPlaying && video?.videoUrl && (
              <div 
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center z-15 cursor-pointer bg-black/20 group-hover:bg-black/30 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-brand/90 hover:bg-brand text-white flex items-center justify-center shadow-glow-blue transition-transform transform group-hover:scale-110">
                  <Play className="w-8 h-8 ml-1" />
                </div>
              </div>
            )}

            {/* Top Indicator Overlay (Tên cú đánh đang diễn ra) */}
            {selectedEvent && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs shadow-lg transition-opacity duration-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="font-extrabold text-white uppercase tracking-wider">{selectedEvent.stroke}</span>
                <span className="text-white/40 text-[11px]">#{selectedEvent.eventOrder}</span>
                <span className="text-white/30">•</span>
                <span className="text-emerald-300 font-mono text-[11px]">{(selectedEvent.confidence * 100).toFixed(0)}% AI</span>
              </div>
            )}

            {/* ADVANCED VIDEO CONTROL BAR (THANH ĐIỀU KHIỂN & ĐIỀU HƯỚNG TỰ ĐỘNG HIỆN KHI HOVER) */}
            <div 
              className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-3 px-4 space-y-2.5 transition-all duration-300 ${
                isControlsVisible || !isPlaying
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              
              {/* Thanh trượt điều hướng Seeker Bar */}
              <div className="relative flex items-center group/slider">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSliderChange}
                  className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-full appearance-none cursor-pointer accent-brand transition-all"
                />
              </div>

              {/* Hàng nút chức năng điều hướng & Tốc độ phát */}
              <div className="flex items-center justify-between text-white text-xs">
                
                {/* Cụm nút Play / Pause / Tua 5s / Cú đánh trước & sau */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Cú đánh trước */}
                  <button
                    type="button"
                    onClick={() => handleJumpStroke('prev')}
                    title="Cú đánh trước đó ([)"
                    className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Tua lùi 5 giây */}
                  <button
                    type="button"
                    onClick={() => handleSkip(-5)}
                    title="Tua lùi 5 giây (← hoặc J)"
                    className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center gap-0.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-[10px] font-mono hidden sm:inline">5s</span>
                  </button>

                  {/* Nút Play / Pause chính */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    title={isPlaying ? "Tạm dừng (Space / K)" : "Phát (Space / K)"}
                    className="w-9 h-9 rounded-full bg-brand hover:bg-brand-hover text-white flex items-center justify-center shadow-glow-blue transition-transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  {/* Tua tới 5 giây */}
                  <button
                    type="button"
                    onClick={() => handleSkip(5)}
                    title="Tua tới 5 giây (→ hoặc L)"
                    className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center gap-0.5"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span className="text-[10px] font-mono hidden sm:inline">5s</span>
                  </button>

                  {/* Cú đánh tiếp theo */}
                  <button
                    type="button"
                    onClick={() => handleJumpStroke('next')}
                    title="Cú đánh kế tiếp (])"
                    className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Cụm điều chỉnh Âm lượng với thanh trượt mượt mà (Volume Slider) */}
                  <div className="flex items-center group/vol ml-1 bg-white/5 hover:bg-white/10 px-1 py-0.5 rounded-xl border border-white/10 transition-colors">
                    <button
                      type="button"
                      onClick={toggleMute}
                      title={isMuted || volume === 0 ? "Bật tiếng (M)" : "Tắt tiếng (M)"}
                      className="p-1 rounded-full text-white/80 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                    {/* Thanh slider âm lượng mở rộng khi hover */}
                    <div className="flex items-center gap-1.5 w-0 opacity-0 group-hover/vol:w-24 group-hover/vol:opacity-100 transition-all duration-300 overflow-hidden px-0 group-hover/vol:px-1">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-white/30 accent-brand rounded-full appearance-none cursor-pointer"
                        title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}% (↑ / ↓)`}
                      />
                      <span className="text-[10px] font-mono text-white/70 select-none">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Bộ đếm thời gian */}
                  <div className="text-[11px] font-mono text-white/80 ml-1.5">
                    <span className="text-white font-bold">{formatTime(currentTime)}</span>
                    <span className="text-white/40"> / {formatTime(duration)}</span>
                  </div>
                </div>

                {/* Cụm nút Tốc độ phát (Speed), Hướng dẫn phím tắt & Toàn màn hình */}
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                  
                  {/* Menu Tốc độ phát (0.25x -> 2.0x) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      title="Tốc độ phát (< hoặc >)"
                      className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition-colors border border-white/10"
                    >
                      <Gauge className="w-3.5 h-3.5 text-brand" />
                      <span>{playbackRate}x</span>
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-9 right-0 bg-[#0f172a] border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 w-24">
                        <div className="text-[10px] text-white/40 font-bold px-2 py-0.5 uppercase">Tốc độ</div>
                        {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => handleChangeSpeed(rate)}
                            className={`px-2 py-1 rounded-lg text-xs font-mono text-left transition-colors flex items-center justify-between ${
                              playbackRate === rate
                                ? 'bg-brand text-white font-bold'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>{rate}x</span>
                            {playbackRate === rate && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nút hiển thị bảng hướng dẫn phím tắt */}
                  <button
                    type="button"
                    onClick={() => setShowShortcutsModal(true)}
                    title="Bảng phím tắt điều khiển (?)"
                    className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>

                  {/* Toàn màn hình Fullscreen */}
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    title="Toàn màn hình (F)"
                    className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>

                </div>

              </div>

            </div>
          </div>

          {/* 2. Interactive AI Timeline Bar Component */}
          <div className="rounded-3xl bg-[#0b1220]/80 border border-white/10 p-5 backdrop-blur-xl shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-brand" />
                <span>AI TIMELINE CÚ ĐÁNH ({filteredEvents.length} SỰ KIỆN)</span>
              </div>
              <span className="text-white/40 text-[11px]">
                Nhấp vào điểm ghim tròn để nhảy video đến đúng cú đánh
              </span>
            </div>

            {/* Markers Bar */}
            <TimelineMarkers
              events={filteredEvents}
              durationSeconds={duration || 60}
              currentTimeSeconds={currentTime}
              currentEvent={selectedEvent}
              onSeekToEvent={handleSeekToEvent}
            />

            {/* Stroke Legend Bar */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10 text-[11px] text-white/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Smash / Vồ lưới</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Drop / Bỏ nhỏ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Clear / Phông sâu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Drive / Tạt cầu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>Serve / Giao cầu</span>
              </div>
            </div>
          </div>

          {/* 3. THẺ CHI TIẾT CÚ ĐÁNH & CẢNH BÁO ĐỘ TIN CẬY THẤP (VS-10) */}
          <StrokeDetailCard
            event={selectedEvent}
            playerAName={match.playerAName}
            playerBName={match.playerBName}
            upperPlayer={match.upperPlayer}
            onSeek={(t) => {
              if (videoRef.current) {
                videoRef.current.currentTime = t;
                setCurrentTime(t);
                if (!isPlaying) {
                  videoRef.current.play();
                  setIsPlaying(true);
                }
              }
            }}
            onPlaySlow={handlePlaySlow}
          />

          {/* 4. SÂN 2D NẰM NGANG (HORIZONTAL 2D RADAR COURT) */}
          <div>
            <Court2DViewer
              currentEvent={selectedEvent}
              playerAName={match.playerAName}
              playerBName={match.playerBName}
              upperPlayer={match.upperPlayer}
            />
          </div>

        </div>

        {/* CỘT PHẢI (4 cols): DANH SÁCH CÚ ĐÁNH DỌC (VERTICAL STROKES LIST) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl bg-[#0b1220]/80 border border-white/10 p-5 backdrop-blur-xl shadow-2xl flex flex-col h-[980px]">
            {/* Header Tabs chuyển đổi giữa Cú đánh, Pha cầu & Thống kê (VS-11, VS-12) */}
            <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('STROKES')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'STROKES'
                    ? 'bg-brand text-white shadow-glow-blue'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="truncate">Cú đánh ({filteredEvents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('RALLIES')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'RALLIES'
                    ? 'bg-brand text-white shadow-glow-blue'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Pha cầu ({rallies.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STATISTICS')}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'STATISTICS'
                    ? 'bg-brand text-white shadow-glow-blue'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Thống kê</span>
              </button>
            </div>

            {activeTab === 'STROKES' && (
              /* List cuộn dọc các cú đánh */
              <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
                {filteredEvents.map((evt) => {
                  const isActive = selectedEvent?.id === evt.id;
                  const isLowConf = evt.confidence < 0.60;
                  const badgeClass = getStrokeBadgeClass(evt.stroke);

                  return (
                    <div
                      key={evt.id}
                      onClick={() => handleSeekToEvent(evt)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-brand/20 border-brand shadow-glow-blue ring-1 ring-brand/40'
                          : isLowConf
                          ? 'bg-amber-500/5 border-amber-500/25 hover:bg-amber-500/10'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Số thứ tự */}
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            isActive 
                              ? 'bg-brand text-white' 
                              : isLowConf
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          #{evt.eventOrder}
                        </div>

                        {/* Thông tin cú đánh */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${badgeClass}`}>
                              {evt.stroke}
                            </span>
                            <span className="text-[11px] text-white/50">{evt.strokeSide}</span>
                          </div>
                          <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${evt.playerSide === 'UPPER' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                            <span className="font-semibold">{evt.playerSide === 'UPPER' ? match.playerAName : match.playerBName}</span>
                            <span className="text-white/30">•</span>
                            <span className="font-mono text-white/50">{evt.timeSeconds.toFixed(1)}s</span>
                          </div>
                        </div>
                      </div>

                      {/* Vận tốc & Tương tác */}
                      <div className="text-right flex items-center gap-2">
                        <div className="hidden sm:block">
                          <div className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-0.5 justify-end">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>{evt.averageShuttleSpeedImagePerSecond ? `${evt.averageShuttleSpeedImagePerSecond.toFixed(0)}` : 'N/A'}</span>
                          </div>
                          {isLowConf ? (
                            <div 
                              title="Độ tin cậy AI thấp (< 60%)" 
                              className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-0.5 justify-end bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                              <span>{(evt.confidence * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-400 font-mono">
                              {(evt.confidence * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-brand translate-x-0.5' : 'text-white/30'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'RALLIES' && (
              /* VS-11: Rallies Explorer */
              <RalliesExplorer
                rallies={rallies}
                currentTimeSeconds={currentTime}
                selectedRallyId={selectedRally?.id}
                playerAName={match.playerAName}
                playerBName={match.playerBName}
                upperPlayer={match.upperPlayer}
                onPlayRally={handlePlayRally}
              />
            )}

            {activeTab === 'STATISTICS' && (
              /* VS-12: Statistics Dashboard */
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                {statistics ? (
                  <StatisticsDashboard 
                    stats={statistics} 
                    playerAName={match.playerAName}
                    playerBName={match.playerBName}
                    compact={true}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-white/50 space-y-3">
                    <BarChart3 className="w-10 h-10 text-white/20 animate-pulse" />
                    <p className="text-xs">Đang tải dữ liệu thống kê chuyên sâu...</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer tóm tắt */}
            <div className="border-t border-white/10 pt-3 mt-3 flex items-center justify-between text-[11px] text-white/50">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-brand" />
                <span>
                  {activeTab === 'STROKES'
                    ? 'Nhấp chọn để tua trực tiếp cú đánh'
                    : activeTab === 'RALLIES'
                    ? 'Nhấp chọn để phát trọn vẹn pha cầu'
                    : 'Số liệu tổng hợp & phân tích CoachAI+ 2.0'}
                </span>
              </span>
              <Target className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

      </div>

      {/* MODAL HƯỚNG DẪN PHÍM TẮT ĐIỀU KHIỂN (KEYBOARD SHORTCUTS GUIDE) */}
      {showShortcutsModal && (
        <div 
          onClick={() => setShowShortcutsModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f172a] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5 text-white">
                <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Phím Tắt Điều Khiển Video</h3>
                  <p className="text-[11px] text-white/50">Thao tác nhanh trên bàn phím khi xem trận đấu</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Phát / Tạm dừng</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">Space / K</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Tua lùi 5s</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">← / J</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Tua tới 5s</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">→ / L</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Tăng âm lượng</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">↑</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Giảm âm lượng</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">↓</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Tắt / Bật tiếng</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">M</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Cú đánh trước đó</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">[</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Cú đánh kế tiếp</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">]</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Toàn màn hình</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">F</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/70">Đổi tốc độ phát</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">&lt; / &gt;</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between col-span-2">
                <span className="text-white/70">Mở bảng hướng dẫn này</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-brand font-bold">?</kbd>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-white/50">
              <span>Bấm phím <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Esc</kbd> để đóng</span>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
