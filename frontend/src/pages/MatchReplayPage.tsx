import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { 
  Play, Pause, ArrowLeft, Clock, 
  AlertCircle, AlertTriangle,
  Layers, Volume2, Volume1, VolumeX,
  Target, ChevronRight,
  RotateCcw, RotateCw, SkipBack, SkipForward,
  Gauge, Maximize, Eye, Keyboard, X, Trophy, BarChart3,
  LogIn, UserPlus, MapPin
} from 'lucide-react';
import apiClient from '../api/client';
import { Court2DViewer, AiEventData } from '../components/court/Court2DViewer';
import { TimelineMarkers } from '../components/replay/TimelineMarkers';
import { StrokeDetailCard } from '../components/replay/StrokeDetailCard';
import { RalliesExplorer, RallyData } from '../components/replay/RalliesExplorer';
import { StatisticsDashboard, MatchStatisticsData } from '../components/replay/StatisticsDashboard';
import { TacticsBreakdown } from '../components/replay/TacticsBreakdown';
import { PointLossInsights, PlaylistClip } from '../components/replay/PointLossInsights';
import { ScoreFlow } from '../components/replay/ScoreFlow';
import { CourtHeatmap } from '../components/court/CourtHeatmap';
import { MatchHighlights } from '../components/replay/MatchHighlights';
import { strokeLabel, LOW_CONFIDENCE } from '../utils/strokeLabels';
import { normalizeStrokeSide, strokeSideLabel } from '../utils/strokeSide';
import { playerPath } from '../api/players';

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
  videoSourceType?: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  durationSeconds?: number;
}

interface AnalysisLiveStatus {
  status: string;
  progressPercent?: number;
  analyzedUntilSeconds?: number | null;
  videoDurationSeconds?: number | null;
  analyzedRanges?: [number, number][] | null;
}

const LIVE_STATUSES = ['QUEUED', 'PROCESSING'];
const LIVE_POLL_MS = 3000;

// Mức 2: tua vào đoạn chưa phân tích thì báo backend để GPU worker quét đoạn đó trước.
const FOCUS_RESEND_GAP_S = 15;
const FOCUS_MIN_INTERVAL_MS = 3000;
// Worker bắt đầu quét trước điểm tua ~10 s và cần thêm ~25 s video để chốt pha cầu đầu tiên.
const FOCUS_VIDEO_SECONDS_TO_FIRST_RALLY = 35;
const DEFAULT_AI_SPEED = 3; // giây video phân tích được mỗi giây (đo thực tế ~3.3x)

const coveredSeconds = (ranges: [number, number][]) =>
  ranges.reduce((total, [start, end]) => total + Math.max(0, end - start), 0);

const isAnalyzedAt = (ranges: [number, number][], seconds: number) =>
  ranges.some(([start, end]) => seconds >= start && seconds <= end);

const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

export const MatchReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isPublic = location.pathname.includes('/public-matches');
  const [match, setMatch] = useState<MatchData | null>(null);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [events, setEvents] = useState<AiEventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AiEventData | null>(null);
  const [rallies, setRallies] = useState<RallyData[]>([]);
  const [selectedRally, setSelectedRally] = useState<RallyData | null>(null);
  const [statistics, setStatistics] = useState<MatchStatisticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'STROKES' | 'RALLIES' | 'POINTS' | 'TACTICS' | 'COURT'>('RALLIES');
  const [analysisTab, setAnalysisTab] = useState<'FLOW' | 'HEATMAP' | 'STATS'>('FLOW');
  // Chi tiết kỹ thuật (sân 2D, ô 3×3, thống kê) thu gọn mặc định: HLV xem câu trả lời trước
  // Danh sách phát: xem liền các pha cầu của một nhóm "Vì sao mất điểm"
  const [playlist, setPlaylist] = useState<{ title: string; clips: PlaylistClip[]; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Phân tích dạng streaming: GPU worker ghi kết quả tạm theo từng rally trong lúc chạy
  const [analysisLive, setAnalysisLive] = useState<AnalysisLiveStatus | null>(null);
  const isAnalysisLive = !isPublic && LIVE_STATUSES.includes(analysisLive?.status ?? '');
  // Các đoạn đã có kết quả cuối; sau khi tua, AI có thể đã làm nhiều đoạn rời nhau
  const liveRanges: [number, number][] | null = isAnalysisLive
    ? (analysisLive?.analyzedRanges ??
        (analysisLive?.analyzedUntilSeconds != null ? [[0, analysisLive.analyzedUntilSeconds]] : []))
    : null;
  // Tốc độ AI đo từ các lần cập nhật trạng thái, để ước lượng thời gian chờ
  const aiSpeedSamplesRef = useRef<{ at: number; covered: number }[]>([]);
  const focusSentRef = useRef<{ seconds: number; at: number } | null>(null);

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [prevVolume, setPrevVolume] = useState<number>(1.0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [filterStroke, setFilterStroke] = useState<string>('ALL');
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);

  // Tự động cuộn danh sách cú đánh bên phải theo cú đánh đang phát
  const strokesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScrollStrokes, setAutoScrollStrokes] = useState<boolean>(true);

  // Tab chuyển đổi bên dưới video: Sân 2D vs Chi tiết cú đánh

  const isYouTube = video?.videoSourceType === 'YOUTUBE' || Boolean(video?.youtubeVideoId);

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
        const matchEndpoint = isPublic ? `/public-matches/${id}` : `/matches/${id}`;
        const matchRes = await apiClient.get(matchEndpoint);
        setMatch(matchRes.data);

        // 2. Lấy thông tin video & URL phát
        const videoEndpoint = isPublic ? `/public-matches/${id}/video` : `/matches/${id}/video`;
        const videoRes = await apiClient.get(videoEndpoint);
        setVideo(videoRes.data);
        if (videoRes.data?.durationSeconds) {
          setDuration(Number(videoRes.data.durationSeconds));
        }

        // 2b. Trạng thái phân tích: khi AI còn đang chạy, Replay vẫn mở được và kết quả hiện dần
        let streaming = false;
        if (!isPublic) {
          try {
            const statusRes = await apiClient.get(`/matches/${id}/analysis/status`);
            setAnalysisLive(statusRes.data);
            streaming = LIVE_STATUSES.includes(statusRes.data?.status);
          } catch {
            setAnalysisLive(null);
          }
        }

        // 3. Lấy danh sách AI events phục vụ timeline & 2D radar
        const eventsEndpoint = isPublic ? `/public-matches/${id}/events` : `/matches/${id}/analysis/events`;
        try {
          const eventsRes = await apiClient.get(eventsEndpoint);
          setEvents(eventsRes.data);
          if (eventsRes.data.length > 0) {
            setSelectedEvent(eventsRes.data[0]);
          }
        } catch (eErr) {
          // Đang phân tích nhưng chưa có rally nào: vẫn cho xem video
          if (!streaming) throw eErr;
        }

        // 4. Lấy danh sách Rallies (VS-11)
        try {
          const ralliesEndpoint = isPublic ? `/public-matches/${id}/rallies` : `/matches/${id}/analysis/rallies`;
          const ralliesRes = await apiClient.get(ralliesEndpoint);
          setRallies(ralliesRes.data);
          if (ralliesRes.data.length > 0) {
            setSelectedRally(ralliesRes.data[0]);
          }
        } catch (rErr) {
          console.warn('Chưa có dữ liệu Rallies:', rErr);
        }

        // 5. Lấy dữ liệu thống kê chuyên sâu toàn diện (VS-12)
        try {
          const statsEndpoint = isPublic ? `/public-matches/${id}/statistics` : `/matches/${id}/analysis/statistics`;
          const statsRes = await apiClient.get(statsEndpoint);
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
  }, [id, isPublic]);

  useEffect(() => {
    if (!liveRanges) return;
    const samples = aiSpeedSamplesRef.current;
    samples.push({ at: Date.now(), covered: coveredSeconds(liveRanges) });
    while (samples.length > 2 && samples[samples.length - 1].at - samples[0].at > 60000) samples.shift();
  }, [analysisLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const aiSpeed = (() => {
    const samples = aiSpeedSamplesRef.current;
    if (samples.length < 2) return DEFAULT_AI_SPEED;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const speed = (last.covered - first.covered) / Math.max(1, (last.at - first.at) / 1000);
    return speed > 0.5 ? speed : DEFAULT_AI_SPEED;
  })();

  // Người xem đang ở đoạn AI chưa phân tích xong
  const watchingUnanalyzed = liveRanges != null && !isAnalyzedAt(liveRanges, currentTime);

  // Mức 2: báo vị trí xem để worker nhảy tới đó (giới hạn tần suất, bỏ qua dịch chuyển nhỏ)
  useEffect(() => {
    if (!id || !watchingUnanalyzed || analysisLive?.status !== 'PROCESSING') return;
    const now = Date.now();
    const last = focusSentRef.current;
    if (last && Math.abs(last.seconds - currentTime) < FOCUS_RESEND_GAP_S) return;
    if (last && now - last.at < FOCUS_MIN_INTERVAL_MS) return;
    focusSentRef.current = { seconds: currentTime, at: now };
    apiClient.post(`/matches/${id}/analysis/focus`, { seconds: Math.floor(currentTime) }).catch(() => {
      // Chỉ là gợi ý ưu tiên; lỗi thì AI vẫn chạy theo thứ tự bình thường
    });
  }, [id, watchingUnanalyzed, currentTime, analysisLive?.status]);

  const lastAnalyzedBefore = liveRanges
    ? liveRanges.filter(([start]) => start <= currentTime).map(([, end]) => end).filter(end => end < currentTime).sort((a, b) => b - a)[0]
    : undefined;
  const focusEtaSeconds = Math.round(
    Math.min(180, Math.max(10, FOCUS_VIDEO_SECONDS_TO_FIRST_RALLY / aiSpeed + 3))
  );

  // Danh sách phát: mỗi pha bắt đầu sớm hơn 1.5 s và kết thúc sau cú cuối 1.5 s, rồi tự sang pha kế
  const PLAYLIST_LEAD_S = 1.5;
  const PLAYLIST_TAIL_S = 1.5;
  const playClip = (clips: PlaylistClip[], index: number, title: string) => {
    setPlaylist({ title, clips, index });
    handleSeekToTime(Math.max(0, clips[index].start - PLAYLIST_LEAD_S), `${title} • ${index + 1}/${clips.length}`);
  };
  const handlePlayPlaylist = (title: string, clips: PlaylistClip[]) => {
    if (clips.length > 0) playClip(clips, 0, title);
  };
  const stopPlaylist = () => setPlaylist(null);

  useEffect(() => {
    if (!playlist) return;
    const clip = playlist.clips[playlist.index];
    // Người dùng tự tua ra xa đoạn đang phát: thoát danh sách phát
    if (currentTime < clip.start - 10 || currentTime > clip.end + 10) {
      setPlaylist(null);
      return;
    }
    if (currentTime > clip.end + PLAYLIST_TAIL_S) {
      if (playlist.index + 1 < playlist.clips.length) {
        playClip(playlist.clips, playlist.index + 1, playlist.title);
      } else {
        setPlaylist(null);
        showOsd('Đã xem hết danh sách');
      }
    }
  }, [currentTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Streaming: khi AI còn đang chạy, tải lại events/rallies định kỳ; marker mới hiện dần.
  useEffect(() => {
    if (!id || !isAnalysisLive) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const statusRes = await apiClient.get(`/matches/${id}/analysis/status`);
        if (cancelled) return;
        const done = statusRes.data?.status === 'COMPLETED';
        const [eventsRes, ralliesRes] = await Promise.all([
          apiClient.get(`/matches/${id}/analysis/events`),
          apiClient.get(`/matches/${id}/analysis/rallies`).catch(() => ({ data: [] as RallyData[] })),
        ]);
        if (cancelled) return;
        const nextEvents: AiEventData[] = eventsRes.data;
        setEvents(nextEvents);
        // Kết quả tạm được ghi lại mỗi lần (id đổi); giữ cú đang chọn theo thời điểm đánh
        setSelectedEvent(prev => {
          if (!prev) return nextEvents[0] ?? null;
          return nextEvents.find(e => e.timeSeconds === prev.timeSeconds) ?? prev;
        });
        setRallies(ralliesRes.data);
        setSelectedRally(prev => {
          if (!prev) return ralliesRes.data[0] ?? null;
          return ralliesRes.data.find((r: RallyData) => r.rallyNumber === prev.rallyNumber) ?? prev;
        });
        if (done) {
          try {
            const statsRes = await apiClient.get(`/matches/${id}/analysis/statistics`);
            if (!cancelled) setStatistics(statsRes.data);
          } catch {
            // Thống kê có thể chưa sẵn sàng
          }
          showOsd('AI đã phân tích xong toàn trận');
        }
        setAnalysisLive(statusRes.data);
      } catch {
        // Lỗi mạng tạm thời: thử lại ở lượt sau
      }
    };

    const timer = setInterval(refresh, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, isAnalysisLive]);

  // Khởi tạo YouTube IFrame Player
  useEffect(() => {
    if (loading || !isYouTube || !video?.youtubeVideoId) return;

    let isMounted = true;
    let pollTimer: any = null;

    const setupPlayer = () => {
      const container = document.getElementById('youtube-player-frame');
      if (!container) {
        pollTimer = setTimeout(setupPlayer, 100);
        return;
      }

      const YT = (window as any).YT;
      if (!YT || !YT.Player) {
        pollTimer = setTimeout(setupPlayer, 100);
        return;
      }

      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new YT.Player('youtube-player-frame', {
        videoId: video.youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2 || event.data === 0) {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setupPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        if (isMounted) setupPlayer();
      };
      pollTimer = setTimeout(setupPlayer, 200);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [loading, isYouTube, video?.youtubeVideoId]);

  // Vòng lặp đồng bộ thời gian từ YouTube Player sang Timeline & 2D Court
  useEffect(() => {
    if (!isYouTube) return;

    if (isPlaying) {
      ytIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const curr = ytPlayerRef.current.getCurrentTime();
          if (typeof curr === 'number' && !isNaN(curr)) {
            // Giới hạn preview 5 phút (300 giây) đối với Khách vãng lai
            const isGuest = isPublic && !localStorage.getItem('access_token');
            if (isGuest && curr >= 300) {
              ytPlayerRef.current.pauseVideo();
              setIsPlaying(false);
              setShowGuestLimitModal(true);
              return;
            }

            setCurrentTime(curr);
            const active = events.find((e) => Math.abs(e.timeSeconds - curr) <= 0.8);
            if (active && (!selectedEvent || selectedEvent.id !== active.id)) {
              setSelectedEvent(active);
            }
          }
        }
      }, 150);
    } else {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    }

    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, [isPlaying, isYouTube, isPublic, events, selectedEvent]);

  // Đồng bộ Video TimeUpdate với Timeline & 2D Court (cho Video MP4 MinIO)
  // Đồng bộ cú đánh được chọn theo mốc thời gian video
  const syncEventWithTime = (timeSec: number) => {
    if (!events.length) return;
    // 1. Tìm cú đánh trong bán kính +/- 1.2s
    let candidate = events.find((e) => Math.abs(e.timeSeconds - timeSec) <= 1.2);
    // 2. Nếu ở khoảng giữa 2 cú đánh, chọn cú đánh vừa diễn ra trước mốc thời gian này
    if (!candidate) {
      const pastEvents = events.filter((e) => e.timeSeconds <= timeSec);
      if (pastEvents.length > 0) {
        candidate = pastEvents[pastEvents.length - 1];
      } else {
        candidate = events[0];
      }
    }
    if (candidate && (!selectedEvent || selectedEvent.id !== candidate.id)) {
      setSelectedEvent(candidate);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;

    // Giới hạn preview 5 phút (300 giây) đối với Khách vãng lai
    const isGuest = isPublic && !localStorage.getItem('access_token');
    if (isGuest && curr >= 300) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowGuestLimitModal(true);
      return;
    }

    setCurrentTime(curr);
    syncEventWithTime(curr);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur || 60);
      videoRef.current.volume = volume;
    }
  };

  // Tự động cuộn danh sách cú đánh bên phải theo cú đánh đang phát
  useEffect(() => {
    if (activeTab === 'STROKES' && autoScrollStrokes && selectedEvent && strokesContainerRef.current) {
      const container = strokesContainerRef.current;
      const el = document.getElementById(`stroke-item-${selectedEvent.id}`);
      if (el) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Khoảng cách tương đối từ đỉnh của el đến đỉnh của container
        const relativeTop = elRect.top - containerRect.top;
        // Tính toán để căn cú đánh vào chính giữa khung cuộn
        const targetScrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (elRect.height / 2);

        // Khi video đang phát (isPlaying): dùng 'auto' (tức thì) để bám sát 100% thời gian thực, không bị trễ/lag do animation
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: isPlaying ? 'auto' : 'smooth'
        });
      }
    }
  }, [selectedEvent?.id, activeTab, autoScrollStrokes, isPlaying]);

  const togglePlay = () => {
    if (isYouTube && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
        setIsControlsVisible(true);
        showOsd('Tạm dừng');
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        showOsd('Đang phát');
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          setIsControlsVisible(false);
        }, 2500);
      }
      return;
    }

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
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(clamped * 100);
      if (clamped === 0) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (videoRef.current) {
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
    if (isYouTube && ytPlayerRef.current) {
      if (isMuted || volume === 0) {
        const restore = prevVolume > 0 ? prevVolume : 0.8;
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(restore * 100);
        setVolume(restore);
        setIsMuted(false);
        showOsd(`Bật tiếng: ${Math.round(restore * 100)}%`);
      } else {
        setPrevVolume(volume);
        ytPlayerRef.current.mute();
        setVolume(0);
        setIsMuted(true);
        showOsd('Đã tắt tiếng');
      }
      return;
    }

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
    if (isYouTube && ytPlayerRef.current) {
      const curr = ytPlayerRef.current.getCurrentTime() || currentTime;
      const newTime = Math.max(0, Math.min(duration, curr + seconds));
      ytPlayerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      syncEventWithTime(newTime);
      showOsd(seconds > 0 ? `Tua tới +${seconds}s` : `Tua lùi ${seconds}s`);
      return;
    }

    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    syncEventWithTime(newTime);
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
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate(speed);
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
      showOsd(`Tốc độ: ${speed}x`);
      return;
    }

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
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(event.timeSeconds, true);
      setCurrentTime(event.timeSeconds);
      setSelectedEvent(event);
      if (!isPlaying) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    if (!videoRef.current) return;
    videoRef.current.currentTime = event.timeSeconds;
    setCurrentTime(event.timeSeconds);
    setSelectedEvent(event);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Tua tới một thời điểm bất kỳ (ví dụ đoạn chiến thuật từ dashboard) và phát
  const handleSeekToTime = (seconds: number, label: string) => {
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
      syncEventWithTime(seconds);
      if (!isPlaying) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      showOsd(label);
      return;
    }

    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    syncEventWithTime(seconds);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    showOsd(label);
  };

  // Deep link "?t=<seconds>" (e.g. a clip cited in a scouting report): seek once the player is ready.
  const deepLinkSeconds = useMemo(() => {
    const t = Number(new URLSearchParams(location.search).get('t'));
    return Number.isFinite(t) && t > 0 ? t : null;
  }, [location.search]);
  const deepLinkDone = useRef<number | null>(null);
  useEffect(() => {
    if (deepLinkSeconds == null || deepLinkDone.current === deepLinkSeconds) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      try {
        if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
          ytPlayerRef.current.seekTo(deepLinkSeconds, true);
        } else if (!isYouTube && videoRef.current && videoRef.current.readyState >= 1) {
          videoRef.current.currentTime = deepLinkSeconds;
        } else {
          if (tries > 60) window.clearInterval(timer);
          return;
        }
      } catch {
        return;
      }
      deepLinkDone.current = deepLinkSeconds;
      setCurrentTime(deepLinkSeconds);
      syncEventWithTime(deepLinkSeconds);
      showOsd('Đoạn được dẫn tới');
      playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [deepLinkSeconds, isYouTube, video]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phát lại chậm 0.5x cho cú đánh được chọn
  const handlePlaySlow = (timeSeconds: number) => {
    const startSec = Math.max(0, timeSeconds - 0.3);
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(startSec, true);
      ytPlayerRef.current.setPlaybackRate(0.5);
      setPlaybackRate(0.5);
      setCurrentTime(startSec);
      if (!isPlaying) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      showOsd('Soi chậm 0.5x');
      return;
    }

    if (!videoRef.current) return;
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
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(rally.startTime, true);
      setCurrentTime(rally.startTime);
      setSelectedRally(rally);
      syncEventWithTime(rally.startTime);
      if (!isPlaying) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      showOsd(`Phát pha cầu #${rally.rallyNumber}`);
      return;
    }

    if (!videoRef.current) return;
    videoRef.current.currentTime = rally.startTime;
    setCurrentTime(rally.startTime);
    setSelectedRally(rally);
    syncEventWithTime(rally.startTime);

    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    showOsd(`Phát pha cầu #${rally.rallyNumber}`);
  };

  // Xử lý kéo thanh trượt seeker
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(val, true);
      setCurrentTime(val);
      syncEventWithTime(val);
    } else if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
      syncEventWithTime(val);
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
        return 'bg-rose-500/20 text-rose-700 border-rose-500/40';
      case 'DROP':
      case 'NET_SHOT':
        return 'bg-sky-500/20 text-sky-700 border-sky-500/40';
      case 'CLEAR':
      case 'LIFT':
        return 'bg-amber-500/20 text-amber-700 border-amber-500/40';
      case 'DRIVE':
      case 'PUSH':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40';
      case 'SERVE':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/40';
      default:
        return 'bg-blue-500/20 text-blue-700 border-blue-500/40';
    }
  };

  // Lọc các cú đánh
  // Each player keeps the colour of their side of the court everywhere on the page.
  const playerAColor = match?.upperPlayer === 'PLAYER_B' ? 'text-pb' : 'text-pa';
  const playerBColor = match?.upperPlayer === 'PLAYER_B' ? 'text-pa' : 'text-pb';
  const upperName = match ? (match.upperPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName) : '';
  const lowerName = match ? (match.upperPlayer === 'PLAYER_A' ? match.playerBName : match.playerAName) : '';

  const filteredEvents = filterStroke === 'ALL'
    ? events
    : events.filter(e => e.stroke.toUpperCase() === filterStroke);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-pitch border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-700 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">Chưa sẵn sàng xem lại</h2>
        <p className="text-ink/70 text-sm max-w-md mb-6">{error || 'Trận đấu chưa có dữ liệu Replay.'}</p>
        <Link
          to={`/matches/${id}`}
          className="px-6 py-2.5 rounded-full bg-pitch hover:bg-pitch-deep text-white text-sm font-semibold transition-colors"
        >
          Quay lại chi tiết trận đấu
        </Link>
      </div>
    );
  }

  // Rally scores are (upper, lower) after each rally; show them in Player A / B order.
  const toPlayerOrder = (upper: number, lower: number) =>
    match.upperPlayer === 'PLAYER_A' ? { playerA: upper, playerB: lower } : { playerA: lower, playerB: upper };
  const scoredRallies = rallies.filter((r) => r.scoreText);
  const firstRally = scoredRallies[0];
  const lastRally = scoredRallies[scoredRallies.length - 1];
  // Follow the video: the score after the latest finished rally, or the score
  // before the first rally (its point taken back) while that rally is still ahead.
  // endTime is the last hit; broadcast scoreboards update about 3-6 s later.
  const SCORE_UPDATE_DELAY_SECONDS = 3;
  const finishedRally = [...scoredRallies]
    .reverse()
    .find((r) => r.endTime + SCORE_UPDATE_DELAY_SECONDS <= currentTime);
  const liveScore = finishedRally
    ? toPlayerOrder(finishedRally.scoreUpper, finishedRally.scoreLower)
    : firstRally
    ? toPlayerOrder(
        Math.max(0, firstRally.scoreUpper - (firstRally.isComplete && firstRally.winnerSide === 'UPPER' ? 1 : 0)),
        Math.max(0, firstRally.scoreLower - (firstRally.isComplete && firstRally.winnerSide === 'LOWER' ? 1 : 0))
      )
    : null;
  const finalScore = lastRally ? toPlayerOrder(lastRally.scoreUpper, lastRally.scoreLower) : null;
  const scoreFromScoreboard = rallies.some((r) => r.winReason?.toLowerCase().startsWith('ocr_confirmed'));

  return (
    <div className="min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Tiêu đề kiểu bảng điểm truyền hình: mỗi người một hàng, tỉ số gắn liền tên */}
      <header className="space-y-3">
        <Link
          to={isPublic ? "/public-matches" : `/matches/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isPublic ? 'Thư viện công khai' : 'Thông tin trận đấu'}</span>
        </Link>
        <h1 className="sr-only">{match.playerAName} gặp {match.playerBName}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div
            className="inline-block min-w-[13rem] rounded-md bg-ink text-white overflow-hidden"
            role="group"
            aria-label="Bảng điểm"
            title={scoreFromScoreboard
              ? 'Tỉ số đọc từ bảng điểm của video, cập nhật theo thời điểm đang xem'
              : 'Không đọc được bảng điểm: AI tự đếm số pha thắng từ 0-0 ở đầu video'}
          >
            {[
              { name: match.playerAName, score: liveScore?.playerA, bar: playerAColor.replace('text-', 'bg-') },
              { name: match.playerBName, score: liveScore?.playerB, bar: playerBColor.replace('text-', 'bg-') },
            ].map((row, index, rows) => {
              const other = rows[1 - index].score;
              const leading = row.score != null && other != null && row.score > other;
              return (
                <div key={row.name} className="flex items-center h-8 border-b border-white/10 last:border-b-0">
                  <span className={`w-1 self-stretch ${row.bar}`} />
                  <Link
                    to={playerPath(row.name)}
                    title={`Hồ sơ ${row.name}`}
                    className={`flex-1 min-w-0 truncate pl-2.5 pr-4 text-sm hover:underline underline-offset-2 ${leading ? 'font-semibold text-white' : 'font-medium text-white/70 hover:text-white'}`}
                  >
                    {row.name}
                  </Link>
                  {row.score != null && (
                    <span className="w-8 self-stretch flex items-center justify-center bg-white/10 font-score text-lg font-semibold tabular-nums">
                      {row.score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {liveScore && finalScore && (
            <p className="text-xs text-ink/70 leading-relaxed">
              {scoreFromScoreboard ? 'Tỉ số ở thời điểm đang xem' : 'Điểm ước tính ở thời điểm đang xem'}
              <br />
              Cuối video {finalScore.playerA}–{finalScore.playerB}, {scoreFromScoreboard ? 'đọc từ bảng điểm' : 'AI ước tính'}
            </p>
          )}
        </div>
      </header>

      {/* Tầng 1: câu trả lời trước — các nhận định chính, bấm là xem đúng các pha chứng minh */}
      {match && (
        <MatchHighlights
          rallies={rallies}
          events={events}
          playerAName={match.playerAName}
          playerBName={match.playerBName}
          upperPlayer={match.upperPlayer}
          isAnalysisLive={isAnalysisLive}
          onPlayPlaylist={handlePlayPlaylist}
          onOpenPointLoss={() => setActiveTab('POINTS')}
        />
      )}

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
            {isYouTube ? (
              <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                <div 
                  id="youtube-player-frame" 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" 
                />
              </div>
            ) : video?.videoUrl ? (
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
                <span className="text-xs">Đang tải video…</span>
              </div>
            )}

            {/* Danh sách phát "Vì sao mất điểm" */}
            {playlist && (
              <div className="absolute bottom-20 left-3 z-30 max-w-[min(92%,26rem)]">
                <div className="rounded-2xl border border-rose-400/40 bg-slate-950/85 backdrop-blur-md px-3 py-2 text-[11px] text-white shadow-2xl flex flex-wrap items-center gap-2">
                  <span className="font-bold text-rose-200">
                    {playlist.index + 1}/{playlist.clips.length}
                  </span>
                  <span className="truncate flex-1 min-w-0">{playlist.title}</span>
                  {playlist.index + 1 < playlist.clips.length && (
                    <button
                      type="button"
                      onClick={() => playClip(playlist.clips, playlist.index + 1, playlist.title)}
                      className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-0.5 font-semibold"
                    >
                      Pha kế
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopPlaylist}
                    className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-0.5 font-semibold"
                  >
                    Dừng
                  </button>
                </div>
              </div>
            )}

            {/* Mức 1: đang xem đoạn AI chưa phân tích, nói rõ AI đang làm gì và khi nào có */}
            {watchingUnanalyzed && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[min(92%,30rem)]" role="status" aria-live="polite">
                <div className="rounded-2xl border border-cyan-400/40 bg-slate-950/85 backdrop-blur-md px-4 py-2.5 text-[12px] text-cyan-50 shadow-2xl flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  </span>
                  <span className="flex-1 min-w-[12rem]">
                    {analysisLive?.status === 'QUEUED'
                      ? 'AI đang chờ GPU worker, cú đánh sẽ hiện dần khi bắt đầu phân tích.'
                      : `AI đang ưu tiên phân tích đoạn bạn đang xem, cú đánh sẽ hiện sau khoảng ${focusEtaSeconds} giây.`}
                  </span>
                  {lastAnalyzedBefore !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleSeekToTime(Math.max(0, lastAnalyzedBefore - 5), 'Về đoạn đã phân tích')}
                      className="rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 px-3 py-1 font-semibold text-cyan-100 transition-colors"
                    >
                      Về đoạn đã phân tích
                    </button>
                  )}
                </div>
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

            {/* Center Play Button Watermark when Paused (Hover to see for MP4 videos) */}
            {!isPlaying && video?.videoUrl && !isYouTube && (
              <div 
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center z-15 cursor-pointer bg-black/20 group-hover:bg-black/30 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-pitch/90 hover:bg-pitch text-white flex items-center justify-center transition-transform transform group-hover:scale-110">
                  <Play className="w-8 h-8 ml-1" />
                </div>
              </div>
            )}

            {/* Top Indicator Overlay (Tên cú đánh đang diễn ra - Căn giữa thể thao cân đối).
                A paused YouTube embed draws its own title across the top, so the chip waits for playback. */}
            {selectedEvent && (isPlaying || !isYouTube) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs shadow-2xl transition-all duration-300 pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="font-extrabold text-white tracking-wide">{strokeLabel(selectedEvent.stroke)}</span>
                <span className="text-white/50 text-[11px] font-mono">#{selectedEvent.eventOrder}</span>
                {selectedEvent.confidence < LOW_CONFIDENCE && (
                  <span className="text-amber-300 text-[11px] font-semibold">• cần xem lại</span>
                )}
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
                  aria-label="Tua video"
                  className="video-seek w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #5FB88A ${(currentTime / (duration || 100)) * 100}%, rgba(255,255,255,0.25) ${(currentTime / (duration || 100)) * 100}%)`,
                  }}
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
                    <span className="text-[11px] font-mono hidden sm:inline">5s</span>
                  </button>

                  {/* Nút Play / Pause chính */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    title={isPlaying ? "Tạm dừng (Space / K)" : "Phát (Space / K)"}
                    className="w-9 h-9 rounded-full bg-pitch hover:bg-pitch-deep text-white flex items-center justify-center transition-transform hover:scale-105"
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
                    <span className="text-[11px] font-mono hidden sm:inline">5s</span>
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
                        className="w-16 h-1 bg-white/30 accent-[#5FB88A] rounded-full appearance-none cursor-pointer"
                        title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}% (↑ / ↓)`}
                      />
                      <span className="text-[11px] font-mono text-white/70 select-none">
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
                      <Gauge className="w-3.5 h-3.5 text-pitch" />
                      <span>{playbackRate}x</span>
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-9 right-0 bg-[#0f172a] border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 w-24">
                        <div className="text-[11px] text-white/40 font-bold px-2 py-0.5 uppercase">Tốc độ</div>
                        {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => handleChangeSpeed(rate)}
                            className={`px-2 py-1 rounded-lg text-xs font-mono text-left transition-colors flex items-center justify-between ${
                              playbackRate === rate
                                ? 'bg-pitch text-white font-bold'
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

          {/* 2. Diễn biến trận: mỗi pha cầu tô theo người thắng điểm, chấm trắng là cú đánh */}
          <section className="rounded-xl bg-sheet border border-ink/10 p-5 space-y-3" aria-labelledby="match-flow-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="match-flow-title" className="text-base font-semibold text-ink">Diễn biến trận</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-pa" />
                  {upperName} thắng điểm
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-pb" />
                  {lowerName} thắng điểm
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/60" />
                  cú đánh
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc cú đánh">
              <span className="text-xs text-ink/70 mr-1">Chỉ hiện cú</span>
              {['ALL', 'SMASH', 'DROP', 'CLEAR', 'NET_SHOT', 'SERVE'].map((stroke) => (
                <button
                  key={stroke}
                  type="button"
                  onClick={() => setFilterStroke(stroke)}
                  aria-pressed={filterStroke === stroke}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterStroke === stroke
                      ? 'bg-pitch text-white'
                      : 'text-ink/70 border border-ink/15 hover:border-pitch/50 hover:text-ink'
                  }`}
                >
                  {stroke === 'ALL' ? 'Tất cả' : strokeLabel(stroke)}
                </button>
              ))}
            </div>

            <TimelineMarkers
              events={filteredEvents}
              durationSeconds={duration || 60}
              currentTimeSeconds={currentTime}
              currentEvent={selectedEvent}
              onSeekToEvent={handleSeekToEvent}
              rallies={rallies}
              upperName={upperName}
              lowerName={lowerName}
              onSelectRally={handlePlayRally}
              analyzedRanges={liveRanges}
            />

            {isAnalysisLive && (
              <p className="text-xs text-ink/70 flex flex-wrap items-center gap-x-2" role="status" aria-live="polite">
                <span className="w-2 h-2 rounded-full bg-pitch frontier-glow" />
                {analysisLive?.status === 'QUEUED'
                  ? 'AI đang chờ máy phân tích.'
                  : `AI đã phân tích ${formatClock(coveredSeconds(liveRanges ?? []))} trên ${formatClock(
                      analysisLive?.videoDurationSeconds ?? duration
                    )}. Tua tới đoạn nào, AI phân tích đoạn đó trước.`}
              </p>
            )}
          </section>

        </div>

        {/* CỘT PHẢI (4 cols): DANH SÁCH CÚ ĐÁNH DỌC (VERTICAL STROKES LIST) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl bg-sheet border border-ink/10 p-5 flex flex-col h-[700px]">
            {/* Header Tabs chuyển đổi giữa Cú đánh, Pha cầu & Thống kê (VS-11, VS-12) */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-ink/[0.04] rounded-lg border border-ink/10 mb-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('RALLIES')}
                className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
                  activeTab === 'RALLIES'
                    ? 'bg-pitch text-white '
                    : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
                title={`Pha cầu (${rallies.length})`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate max-w-full">Pha cầu</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('POINTS')}
                className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
                  activeTab === 'POINTS'
                    ? 'bg-pitch text-white '
                    : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
                title="Vì sao mất điểm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span className="truncate max-w-full">Mất điểm</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STROKES')}
                className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
                  activeTab === 'STROKES'
                    ? 'bg-pitch text-white '
                    : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
                title={`Cú đánh (${filteredEvents.length})`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">Cú đánh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TACTICS')}
                className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
                  activeTab === 'TACTICS'
                    ? 'bg-pitch text-white '
                    : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
                title="Chiến thuật"
              >
                <Target className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span className="truncate max-w-full">Lối chơi</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COURT')}
                className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
                  activeTab === 'COURT'
                    ? 'bg-pitch text-white '
                    : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
                title="Cú đang phát trên sơ đồ sân"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate max-w-full">Sân</span>
              </button>
            </div>

            {activeTab === 'STROKES' && (
              <>
                {/* Thanh tiện ích Tự động cuộn theo video */}
                <div className="flex items-center justify-between pb-2 px-1 text-xs text-ink/70">
                  <span className="text-[11px] text-ink/70">
                    {filteredEvents.length} cú đánh đã nhận diện
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !autoScrollStrokes;
                      setAutoScrollStrokes(nextState);
                      showOsd(nextState ? 'Bật tự cuộn theo cú đánh' : 'Tắt tự cuộn theo cú đánh');
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                      autoScrollStrokes
                        ? 'bg-pitch-soft text-pitch-deep border border-pitch/30'
                        : 'bg-ink/[0.04] text-ink/65 hover:text-ink/70 border border-ink/10'
                    }`}
                    title={autoScrollStrokes ? 'Đang tự động cuộn danh sách theo cú đánh đang phát' : 'Nhấp để bật tự động cuộn'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${autoScrollStrokes ? 'bg-pitch animate-ping' : 'bg-ink/15'}`} />
                    <span>{autoScrollStrokes ? 'Tự cuộn: BẬT' : 'Tự cuộn: TẮT'}</span>
                  </button>
                </div>

                {/* List cuộn dọc các cú đánh */}
                <div 
                  ref={strokesContainerRef}
                  className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin"
                >
                  {filteredEvents.map((evt) => {
                    const isActive = selectedEvent?.id === evt.id;
                    const isLowConf = evt.confidence < LOW_CONFIDENCE;
                    const badgeClass = getStrokeBadgeClass(evt.stroke);

                    return (
                      <div
                        key={evt.id}
                        id={`stroke-item-${evt.id}`}
                        onClick={() => handleSeekToEvent(evt)}
                        className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'bg-pitch/25 border-pitch ring-2 ring-pitch/30 scale-[1.01]'
                            : isLowConf
                            ? 'bg-amber-500/5 border-amber-500/25 hover:bg-amber-500/10'
                            : 'bg-ink/[0.04] border-ink/10 hover:bg-ink/[0.06] hover:border-ink/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Số thứ tự & Indicator phát */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center tabular-nums text-xs font-bold shrink-0 transition-transform ${
                              isActive 
                                ? 'bg-pitch text-white scale-105' 
                                : isLowConf
                                ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                                : 'bg-ink/[0.06] text-ink/70'
                            }`}
                          >
                            {isActive ? (
                              <Play className="w-3.5 h-3.5 fill-current text-ink" />
                            ) : (
                              `#${evt.eventOrder}`
                            )}
                          </div>

                          {/* Thông tin cú đánh */}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${badgeClass}`}>
                                {strokeLabel(evt.stroke)}
                              </span>
                              {strokeSideLabel(evt.strokeSide) && (
                                <span className={`text-[11px] px-1.5 py-0.5 rounded tabular-nums font-medium border ${
                                  normalizeStrokeSide(evt.strokeSide) === 'FOREHAND'
                                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                    : 'bg-purple-500/10 text-purple-700 border-purple-500/20'
                                }`}>
                                  {strokeSideLabel(evt.strokeSide)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink/70 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${evt.playerSide === 'UPPER' ? 'bg-pa' : 'bg-amber-400'}`} />
                              <span className="font-semibold">
                                {(evt.playerSide === 'UPPER') === (match.upperPlayer === 'PLAYER_A') ? match.playerAName : match.playerBName}
                              </span>
                              <span className="text-ink/40">•</span>
                              <span className="tabular-nums text-ink/70">{evt.timeSeconds.toFixed(1)}s</span>
                            </div>
                          </div>
                        </div>

                        {/* Chỉ báo khi AI không chắc chắn; không hiện phần trăm hay vận tốc pixel */}
                        <div className="text-right flex items-center gap-2">
                          {isLowConf && (
                            <span
                              title="AI không chắc chắn về cú này"
                              className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                              cần xem lại
                            </span>
                          )}
                          <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-pitch translate-x-0.5' : 'text-ink/40'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
                tacticRallies={statistics?.structuredTactics?.rallies}
                onPlayPlaylist={handlePlayPlaylist}
              />
            )}

            {activeTab === 'POINTS' && (
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <PointLossInsights
                  rallies={rallies}
                  events={events}
                  playerAName={match.playerAName}
                  playerBName={match.playerBName}
                  upperPlayer={match.upperPlayer}
                  onPlayPlaylist={handlePlayPlaylist}
                />
              </div>
            )}

            {activeTab === 'TACTICS' && (
              /* Chiến thuật cạnh video: bấm là tua, không phải cuộn trang */
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                {statistics ? (
                  <TacticsBreakdown
                    tactics={statistics.structuredTactics}
                    playerAName={match.playerAName}
                    playerBName={match.playerBName}
                    upperPlayer={match.upperPlayer}
                    compact={true}
                    onSeekTime={handleSeekToTime}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-ink/70 space-y-3">
                    <BarChart3 className="w-10 h-10 text-ink/30" />
                    <p className="text-xs">Đang tải dữ liệu thống kê chuyên sâu…</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'COURT' && (
              /* Cú đang phát: ai đứng đâu, cầu rơi vào ô nào */
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-3">
                <Court2DViewer
                  currentEvent={selectedEvent}
                  playerAName={match.playerAName}
                  playerBName={match.playerBName}
                  upperPlayer={match.upperPlayer}
                  compact
                />
                <StrokeDetailCard
                  event={selectedEvent}
                  playerAName={match.playerAName}
                  playerBName={match.playerBName}
                  upperPlayer={match.upperPlayer}
                  onSeek={(t) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = t;
                      setCurrentTime(t);
                      syncEventWithTime(t);
                      if (!isPlaying) {
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }
                  }}
                  onPlaySlow={handlePlaySlow}
                />
              </div>
            )}

            {/* Footer tóm tắt */}
            <div className="border-t border-ink/10 pt-3 mt-3 flex items-center justify-between text-[11px] text-ink/70">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-pitch" />
                <span>
                  {activeTab === 'STROKES'
                    ? 'Nhấp chọn để tua trực tiếp cú đánh'
                    : activeTab === 'RALLIES'
                    ? 'Nhấp chọn để phát trọn vẹn pha cầu'
                    : activeTab === 'COURT'
                    ? 'Sơ đồ đi theo cú đang phát trên video'
                    : 'Nhấp ▶ để xem lại đoạn chiến thuật'}
                </span>
              </span>
              <Target className="w-3.5 h-3.5 text-emerald-700" />
            </div>
          </div>
        </div>

      </div>

      {/* PHÂN TÍCH CẢ TRẬN: một khối, ba tab; bấm "Xem" ở đâu cũng tua video phía trên */}
      <section className="rounded-xl bg-sheet border border-ink/10 p-4 sm:p-6 space-y-5" aria-labelledby="match-analysis-title">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-ink/10 pb-4">
          <div>
            <h2 id="match-analysis-title" className="text-lg font-semibold text-ink">Phân tích cả trận</h2>
            <p className="text-xs text-ink/70 mt-0.5">
              {match.playerAName} và {match.playerBName}: tỉ số, vị trí trên sân và số liệu cú đánh
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-ink/[0.04] rounded-lg border border-ink/10 text-xs sm:w-[420px]" role="tablist">
            {([
              ['FLOW', 'Tỉ số'],
              ['HEATMAP', 'Bản đồ nhiệt'],
              ['STATS', 'Thống kê'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={analysisTab === key}
                onClick={() => setAnalysisTab(key)}
                className={`py-2 px-2 rounded-md font-semibold truncate transition-colors ${
                  analysisTab === key ? 'bg-pitch text-white' : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={analysisTab === 'HEATMAP' ? 'max-w-4xl' : ''}>
          {analysisTab === 'FLOW' && (
            <ScoreFlow
              rallies={rallies}
              playerAName={match.playerAName}
              playerBName={match.playerBName}
              upperPlayer={match.upperPlayer}
              currentTimeSeconds={currentTime}
              onPlayRally={handlePlayRally}
              onPlayPlaylist={handlePlayPlaylist}
            />
          )}
          {analysisTab === 'HEATMAP' && (
            <CourtHeatmap
              events={events}
              playerAName={match.playerAName}
              playerBName={match.playerBName}
              upperPlayer={match.upperPlayer}
              onPlayPlaylist={handlePlayPlaylist}
            />
          )}
          {analysisTab === 'STATS' && (
            statistics ? (
              <StatisticsDashboard
                stats={statistics}
                playerAName={match.playerAName}
                playerBName={match.playerBName}
                upperPlayer={match.upperPlayer}
                compact={false}
                onSeekTime={handleSeekToTime}
              />
            ) : (
              <p className="text-xs text-ink/70 py-8 text-center">Số liệu sẽ có khi AI phân tích xong.</p>
            )
          )}
        </div>
      </section>

      {/* MODAL HƯỚNG DẪN PHÍM TẮT ĐIỀU KHIỂN (KEYBOARD SHORTCUTS GUIDE) */}
      {showShortcutsModal && (
        <div 
          onClick={() => setShowShortcutsModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/[0.04] animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-sheet border border-ink/15 rounded-xl p-6 max-w-lg w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div className="flex items-center gap-2.5 text-ink">
                <div className="w-9 h-9 rounded-xl bg-pitch/20 border border-pitch/40 flex items-center justify-center text-pitch">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Phím Tắt Điều Khiển Video</h3>
                  <p className="text-[11px] text-ink/70">Thao tác nhanh trên bàn phím khi xem trận đấu</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1.5 rounded-full hover:bg-ink/[0.06] text-ink/70 hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Phát / Tạm dừng</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">Space / K</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Tua lùi 5s</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">← / J</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Tua tới 5s</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">→ / L</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Tăng âm lượng</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">↑</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Giảm âm lượng</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">↓</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Tắt / Bật tiếng</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">M</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Cú đánh trước đó</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">[</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Cú đánh kế tiếp</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">]</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Toàn màn hình</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">F</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
                <span className="text-ink/70">Đổi tốc độ phát</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">&lt; / &gt;</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between col-span-2">
                <span className="text-ink/70">Mở bảng hướng dẫn này</span>
                <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">?</kbd>
              </div>
            </div>

            <div className="border-t border-ink/10 pt-3 flex items-center justify-between text-[11px] text-ink/70">
              <span>Bấm phím <kbd className="px-1.5 py-0.5 rounded bg-ink/[0.06] tabular-nums text-ink">Esc</kbd> để đóng</span>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-pitch hover:bg-pitch-deep text-white text-xs font-semibold transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest 5-Minute Preview Limit Modal */}
      {showGuestLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/[0.04] p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md from-[#14233c] to-[#0d1627] border border-ink/15 rounded-xl p-6 sm:p-7 text-ink space-y-6 text-center">
            <div className="w-16 h-16 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-700 mx-auto flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-xl font-bold text-ink">Hết Thời Lượng Xem Thử</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Khách vãng lai được xem trước tối đa <strong>5 phút (300 giây)</strong> trận đấu công khai. Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục xem toàn bộ video và trải nghiệm telemetry phân tích không giới hạn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                to="/login"
                className="w-full py-3 rounded-full bg-pitch hover:bg-pitch-deep text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập ngay</span>
              </Link>
              <Link
                to="/register"
                className="w-full py-3 rounded-full bg-ink/[0.06] hover:bg-ink/[0.08] text-ink text-xs font-semibold transition-colors border border-ink/15 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản</span>
              </Link>
            </div>

            <button
              onClick={() => setShowGuestLimitModal(false)}
              className="text-xs text-ink/65 hover:text-ink transition-colors"
            >
              Đóng thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
