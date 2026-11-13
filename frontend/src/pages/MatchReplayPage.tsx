import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Play, AlertCircle, Target, Eye, BarChart3 } from 'lucide-react';
import { focusAnalysis } from '../api/analysis';
import { isSignedIn } from '../auth/session';
import { Court2DViewer } from '../components/court/Court2DViewer';
import { TimelineMarkers } from '../components/replay/TimelineMarkers';
import { StrokeDetailCard } from '../components/replay/StrokeDetailCard';
import { RalliesExplorer } from '../components/replay/RalliesExplorer';
import { TacticsBreakdown } from '../components/replay/TacticsBreakdown';
import { PointLossInsights } from '../components/replay/PointLossInsights';
import { PlaylistClip } from '../utils/pointLoss';
import { MatchHighlights } from '../components/replay/MatchHighlights';
import { HighlightReelDialog } from '../components/replay/HighlightReelDialog';
import { ReplayScoreboard } from '../components/replay/ReplayScoreboard';
import { ReplaySideTab, ReplaySideTabs } from '../components/replay/ReplaySideTabs';
import { StrokeList } from '../components/replay/StrokeList';
import { VideoControlBar } from '../components/replay/VideoControlBar';
import { PLAYBACK_RATES } from '../components/replay/playback';
import { MatchAnalysisSection } from '../components/replay/MatchAnalysisSection';
import { ShortcutsModal } from '../components/replay/ShortcutsModal';
import { GuestLimitModal } from '../components/replay/GuestLimitModal';
import { useReplayData } from '../hooks/useReplayData';
import { usePlayerSides } from '../hooks/usePlayerSides';
import type { AiEventData, RallyData } from '../types/replay';
import { strokeLabel, LOW_CONFIDENCE } from '../utils/strokeLabels';
import { YouTubePlayer, youTubeGlobal } from '../types/youtube';

// Mức 2: tua vào đoạn chưa phân tích thì báo backend để GPU worker quét đoạn đó trước.
const FOCUS_RESEND_GAP_S = 15;
const FOCUS_MIN_INTERVAL_MS = 3000;
// Worker bắt đầu quét trước điểm tua ~10 s và cần thêm ~25 s video để chốt pha cầu đầu tiên.
const FOCUS_VIDEO_SECONDS_TO_FIRST_RALLY = 35;
const DEFAULT_AI_SPEED = 3; // giây video phân tích được mỗi giây (đo thực tế ~3.3x)
/** Guests may watch the first 5 minutes of a public match (AGENTS.md). */
const GUEST_PREVIEW_SECONDS = 300;
// Danh sách phát: mỗi pha bắt đầu sớm hơn 1.5 s và kết thúc sau cú cuối 1.5 s, rồi tự sang pha kế
const PLAYLIST_LEAD_S = 1.5;
const PLAYLIST_TAIL_S = 1.5;
/** The control bar hides itself this long after the mouse stops moving, while playing. */
const CONTROLS_HIDE_MS = 2500;

const coveredSeconds = (ranges: [number, number][]) =>
  ranges.reduce((total, [start, end]) => total + Math.max(0, end - start), 0);

const isAnalyzedAt = (ranges: [number, number][], seconds: number) =>
  ranges.some(([start, end]) => seconds >= start && seconds <= end);

/**
 * Where keys type text, so the player shortcuts stay out of the way. Sliders (the seek bar, volume) are not:
 * the shortcuts still work after dragging one, and preventDefault keeps the slider from moving as well.
 */
const isTypingField = (el: HTMLElement) => {
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el instanceof HTMLInputElement && el.type !== 'range' && el.type !== 'checkbox' && el.type !== 'radio';
};

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

  // OSD (On-Screen Display): a short message over the video for shortcuts and actions
  const [osdMessage, setOsdMessage] = useState<string | null>(null);
  const osdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showOsd = (msg: string) => {
    setOsdMessage(msg);
    if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    osdTimeoutRef.current = setTimeout(() => setOsdMessage(null), 1200);
  };

  const {
    match, video, events, selectedEvent, setSelectedEvent, rallies, selectedRally, setSelectedRally,
    statistics, analysisLive, isAnalysisLive, loading, error,
  } = useReplayData(id, isPublic, () => showOsd('AI đã phân tích xong toàn trận'));

  const [activeTab, setActiveTab] = useState<ReplaySideTab>('RALLIES');
  // Danh sách phát: xem liền các pha cầu của một nhóm "Vì sao mất điểm"
  const [playlist, setPlaylist] = useState<{ title: string; clips: PlaylistClip[]; index: number } | null>(null);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const highlightOpenRef = useRef(false);
  highlightOpenRef.current = highlightOpen;
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
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Tự động cuộn danh sách cú đánh bên phải theo cú đánh đang phát
  const strokesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScrollStrokes, setAutoScrollStrokes] = useState<boolean>(true);

  const isYouTube = video?.videoSourceType === 'YOUTUBE' || Boolean(video?.youtubeVideoId);
  const isGuest = isPublic && !isSignedIn();

  // Hover controls & auto-hide
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideControlsLater = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setIsControlsVisible(false), CONTROLS_HIDE_MS);
  };

  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) hideControlsLater();
  };

  const handleMouseLeave = () => {
    if (isPlaying) setIsControlsVisible(false);
  };

  useEffect(() => {
    if (video?.durationSeconds) setDuration(Number(video.durationSeconds));
  }, [video]);

  // ------------------------------------------------------------------ player
  // One set of operations for both players: the YouTube IFrame API or the <video> element of an MP4.
  const hasPlayer = () => (isYouTube ? Boolean(ytPlayerRef.current) : Boolean(videoRef.current));
  const seekPlayer = (seconds: number) => {
    if (isYouTube) ytPlayerRef.current?.seekTo(seconds, true);
    else if (videoRef.current) videoRef.current.currentTime = seconds;
  };
  const playPlayer = () => {
    if (isYouTube) ytPlayerRef.current?.playVideo();
    else videoRef.current?.play();
  };
  const pausePlayer = () => {
    if (isYouTube) ytPlayerRef.current?.pauseVideo();
    else videoRef.current?.pause();
  };
  const setPlayerRate = (rate: number) => {
    if (isYouTube) ytPlayerRef.current?.setPlaybackRate(rate);
    else if (videoRef.current) videoRef.current.playbackRate = rate;
  };
  /** Starts playback unless already playing. */
  const ensurePlaying = () => {
    if (!isPlaying) {
      playPlayer();
      setIsPlaying(true);
    }
  };

  // Đồng bộ cú đánh được chọn theo mốc thời gian video
  const syncEventWithTime = (timeSec: number) => {
    if (!events.length) return;
    // 1. Tìm cú đánh trong bán kính +/- 1.2s
    let candidate = events.find((e) => Math.abs(e.timeSeconds - timeSec) <= 1.2);
    // 2. Nếu ở khoảng giữa 2 cú đánh, chọn cú đánh vừa diễn ra trước mốc thời gian này
    if (!candidate) {
      const pastEvents = events.filter((e) => e.timeSeconds <= timeSec);
      candidate = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : events[0];
    }
    if (candidate && (!selectedEvent || selectedEvent.id !== candidate.id)) {
      setSelectedEvent(candidate);
    }
  };

  /** Seeks, follows the stroke at that time and (unless play is false) plays. False when no player yet. */
  const jumpTo = (seconds: number, { play = true, osd }: { play?: boolean; osd?: string } = {}) => {
    if (!hasPlayer()) return false;
    seekPlayer(seconds);
    setCurrentTime(seconds);
    syncEventWithTime(seconds);
    if (play) ensurePlaying();
    if (osd) showOsd(osd);
    return true;
  };

  // Khởi tạo YouTube IFrame Player
  useEffect(() => {
    if (loading || !isYouTube || !video?.youtubeVideoId) return;

    let isMounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const win = youTubeGlobal();

    const setupPlayer = () => {
      const container = document.getElementById('youtube-player-frame');
      if (!container || !win.YT?.Player) {
        pollTimer = setTimeout(setupPlayer, 100);
        return;
      }

      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { /* already gone */ }
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new win.YT!.Player('youtube-player-frame', {
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
          onReady: (event: { target: YouTubePlayer }) => {
            if (!isMounted) return;
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
          },
          onStateChange: (event: { data: number }) => {
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

    if (win.YT?.Player) {
      setupPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prevCallback = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        if (isMounted) setupPlayer();
      };
      pollTimer = setTimeout(setupPlayer, 200);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { /* already gone */ }
        ytPlayerRef.current = null;
      }
    };
  }, [loading, isYouTube, video?.youtubeVideoId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Guests stop at the preview limit; true when playback was stopped. */
  const stopAtGuestLimit = (seconds: number) => {
    if (!isGuest || seconds < GUEST_PREVIEW_SECONDS) return false;
    pausePlayer();
    setIsPlaying(false);
    setShowGuestLimitModal(true);
    return true;
  };

  // Vòng lặp đồng bộ thời gian từ YouTube Player sang Timeline & 2D Court
  useEffect(() => {
    if (!isYouTube) return;

    if (isPlaying) {
      ytIntervalRef.current = setInterval(() => {
        const curr = ytPlayerRef.current?.getCurrentTime?.();
        if (typeof curr !== 'number' || isNaN(curr)) return;
        if (stopAtGuestLimit(curr)) return;
        setCurrentTime(curr);
        const active = events.find((e) => Math.abs(e.timeSeconds - curr) <= 0.8);
        if (active && (!selectedEvent || selectedEvent.id !== active.id)) {
          setSelectedEvent(active);
        }
      }, 150);
    } else if (ytIntervalRef.current) {
      clearInterval(ytIntervalRef.current);
    }

    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, [isPlaying, isYouTube, isPublic, events, selectedEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đồng bộ Video TimeUpdate với Timeline & 2D Court (cho Video MP4)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    if (stopAtGuestLimit(curr)) return;
    setCurrentTime(curr);
    syncEventWithTime(curr);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 60);
      videoRef.current.volume = volume;
    }
  };

  // ------------------------------------------------------------------ live analysis
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
    focusAnalysis(id, currentTime).catch(() => {
      // Chỉ là gợi ý ưu tiên; lỗi thì AI vẫn chạy theo thứ tự bình thường
    });
  }, [id, watchingUnanalyzed, currentTime, analysisLive?.status]);

  const lastAnalyzedBefore = liveRanges
    ? liveRanges.filter(([start]) => start <= currentTime).map(([, end]) => end).filter(end => end < currentTime).sort((a, b) => b - a)[0]
    : undefined;
  const focusEtaSeconds = Math.round(
    Math.min(180, Math.max(10, FOCUS_VIDEO_SECONDS_TO_FIRST_RALLY / aiSpeed + 3))
  );

  // ------------------------------------------------------------------ playlists
  const playClip = (clips: PlaylistClip[], index: number, title: string) => {
    setPlaylist({ title, clips, index });
    handleSeekToTime(Math.max(0, clips[index].start - PLAYLIST_LEAD_S), `${title} • ${index + 1}/${clips.length}`);
  };
  const handlePlayPlaylist = (title: string, clips: PlaylistClip[]) => {
    if (clips.length > 0) playClip(clips, 0, title);
  };

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

  // Tự động cuộn danh sách cú đánh bên phải theo cú đánh đang phát
  useEffect(() => {
    if (activeTab !== 'STROKES' || !autoScrollStrokes || !selectedEvent || !strokesContainerRef.current) return;
    const container = strokesContainerRef.current;
    const el = document.getElementById(`stroke-item-${selectedEvent.id}`);
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    // Căn cú đánh vào giữa khung cuộn; khi đang phát thì cuộn tức thì để bám sát thời gian thực
    const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - container.clientHeight / 2 + elRect.height / 2;
    container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: isPlaying ? 'auto' : 'smooth' });
  }, [selectedEvent?.id, activeTab, autoScrollStrokes, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ controls
  const togglePlay = () => {
    if (!hasPlayer()) return;
    if (isPlaying) {
      pausePlayer();
      setIsPlaying(false);
      setIsControlsVisible(true);
      showOsd('Tạm dừng');
    } else {
      playPlayer();
      setIsPlaying(true);
      showOsd('Đang phát');
      hideControlsLater();
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
    if (clamped > 0) setPrevVolume(clamped);
  };

  const changeVolumeDelta = (delta: number) => {
    const target = Math.max(0, Math.min(1, Math.round((volume + delta) * 10) / 10));
    handleVolumeChange(target);
    showOsd(`Âm lượng: ${Math.round(target * 100)}%`);
  };

  const toggleMute = () => {
    if (!hasPlayer()) return;
    if (isMuted || volume === 0) {
      const restore = prevVolume > 0 ? prevVolume : 0.8;
      if (isYouTube) {
        ytPlayerRef.current?.unMute();
        ytPlayerRef.current?.setVolume(restore * 100);
      } else if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = restore;
      }
      setVolume(restore);
      setIsMuted(false);
      showOsd(`Bật tiếng: ${Math.round(restore * 100)}%`);
    } else {
      setPrevVolume(volume);
      if (isYouTube) {
        ytPlayerRef.current?.mute();
      } else if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      }
      setVolume(0);
      setIsMuted(true);
      showOsd('Đã tắt tiếng');
    }
  };

  // Tua tới / Tua lui
  const handleSkip = (seconds: number) => {
    if (!hasPlayer()) return;
    const now = isYouTube ? ytPlayerRef.current?.getCurrentTime() || currentTime : videoRef.current!.currentTime;
    jumpTo(Math.max(0, Math.min(duration, now + seconds)), {
      play: false,
      osd: seconds > 0 ? `Tua tới +${seconds}s` : `Tua lùi ${seconds}s`,
    });
  };

  const handleSeekToEvent = (event: AiEventData) => {
    if (!hasPlayer()) return;
    seekPlayer(event.timeSeconds);
    setCurrentTime(event.timeSeconds);
    setSelectedEvent(event);
    ensurePlaying();
  };

  // Chuyển sang Cú đánh Trước đó / Kế tiếp
  const handleJumpStroke = (direction: 'prev' | 'next') => {
    if (!events.length) return;
    const currentIndex = selectedEvent ? events.findIndex(e => e.id === selectedEvent.id) : 0;
    const targetIndex = direction === 'prev'
      ? Math.max(0, currentIndex - 1)
      : Math.min(events.length - 1, currentIndex + 1);
    showOsd(direction === 'prev' ? 'Cú đánh trước đó' : 'Cú đánh kế tiếp');
    handleSeekToEvent(events[targetIndex]);
  };

  // Điều chỉnh tốc độ phát
  const handleChangeSpeed = (speed: number) => {
    if (!hasPlayer()) return;
    setPlayerRate(speed);
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    showOsd(`Tốc độ: ${speed}x`);
  };

  const adjustPlaybackRate = (delta: number) => {
    let currIdx = PLAYBACK_RATES.indexOf(playbackRate);
    if (currIdx === -1) currIdx = PLAYBACK_RATES.indexOf(1.0);
    const nextIdx = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, currIdx + (delta > 0 ? 1 : -1)));
    handleChangeSpeed(PLAYBACK_RATES[nextIdx]);
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

  // Tua tới một thời điểm bất kỳ (ví dụ đoạn chiến thuật từ dashboard) và phát
  const handleSeekToTime = (seconds: number, label: string) => {
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    jumpTo(seconds, { osd: label });
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
    if (!hasPlayer()) return;
    const startSec = Math.max(0, timeSeconds - 0.3);
    seekPlayer(startSec);
    setPlayerRate(0.5);
    setPlaybackRate(0.5);
    setCurrentTime(startSec);
    ensurePlaying();
    showOsd('Soi chậm 0.5x');
  };

  // VS-11: Tua video và phát một đợt cầu (Rally)
  const handlePlayRally = (rally: RallyData) => {
    if (jumpTo(rally.startTime, { osd: `Phát pha cầu #${rally.rallyNumber}` })) {
      setSelectedRally(rally);
    }
  };

  // Xử lý kéo thanh trượt seeker
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    jumpTo(parseFloat(e.target.value), { play: false });
  };

  // BỘ LẮNG NGHE PHÍM TẮT ĐIỀU KHIỂN (KEYBOARD SHORTCUTS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua khi đang nhập liệu, hoặc khi hộp thoại highlight đang mở (có phím riêng)
      const target = e.target as HTMLElement;
      if (highlightOpenRef.current || isTypingField(target)) {
        return;
      }
      const actions: Record<string, () => void> = {
        ' ': togglePlay, k: togglePlay, K: togglePlay,
        ArrowLeft: () => handleSkip(-5), j: () => handleSkip(-5), J: () => handleSkip(-5),
        ArrowRight: () => handleSkip(5), l: () => handleSkip(5), L: () => handleSkip(5),
        ArrowUp: () => changeVolumeDelta(0.1),
        ArrowDown: () => changeVolumeDelta(-0.1),
        m: toggleMute, M: toggleMute,
        '[': () => handleJumpStroke('prev'),
        ']': () => handleJumpStroke('next'),
        f: handleToggleFullscreen, F: handleToggleFullscreen,
        '<': () => adjustPlaybackRate(-0.25), ',': () => adjustPlaybackRate(-0.25),
        '>': () => adjustPlaybackRate(0.25), '.': () => adjustPlaybackRate(0.25),
        '?': () => setShowShortcutsModal(prev => !prev),
      };
      if (e.key === 'Escape') {
        if (showShortcutsModal) setShowShortcutsModal(false);
        return;
      }
      const action = actions[e.key];
      if (action) {
        e.preventDefault();
        // A focused button (play, mute, ...) also "clicks" when Space is released, which would undo the
        // shortcut. Taking the focus away now sends the key-up elsewhere.
        if (e.key === ' ' && target instanceof HTMLButtonElement) target.blur();
        action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, selectedEvent, events, volume, isMuted, playbackRate, showShortcutsModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ derived data
  const filteredEvents = filterStroke === 'ALL'
    ? events
    : events.filter(e => e.stroke.toUpperCase() === filterStroke);

  const sides = usePlayerSides(match, rallies, events, filteredEvents, statistics, selectedEvent);
  const { upperName, lowerName } = sides;

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

  return (
    <div className="min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Tiêu đề kiểu bảng điểm truyền hình: mỗi người một hàng, tỉ số gắn liền tên */}
      <ReplayScoreboard
        match={match}
        inMatchRallies={sides.inMatchRallies}
        scoreFromScoreboard={rallies.some((r) => r.winReason?.toLowerCase().startsWith('ocr_confirmed'))}
        currentTime={currentTime}
        isPublic={isPublic}
        playerAColor={sides.playerAColor}
        playerBColor={sides.playerBColor}
        onCreateHighlight={!isPublic && !isAnalysisLive && rallies.length > 0
          ? () => {
              // The dialog has its own player; stop this one so the two do not play over each other.
              if (isPlaying) togglePlay();
              setHighlightOpen(true);
            }
          : null}
      />

      {!isPublic && id && (
        <HighlightReelDialog
          matchId={id}
          open={highlightOpen}
          onClose={() => setHighlightOpen(false)}
          nameA={match.playerAName}
          nameB={match.playerBName}
          videoUrl={isYouTube ? undefined : video?.videoUrl}
          youtubeVideoId={isYouTube ? video?.youtubeVideoId ?? undefined : undefined}
        />
      )}

      {/* Tầng 1: câu trả lời trước — các nhận định chính, bấm là xem đúng các pha chứng minh */}
      <MatchHighlights
        rallies={sides.playerRallies}
        events={sides.playerEvents}
        playerAName={match.playerAName}
        playerBName={match.playerBName}
        upperPlayer={match.upperPlayer}
        isAnalysisLive={isAnalysisLive}
        onPlayPlaylist={handlePlayPlaylist}
        onOpenPointLoss={() => setActiveTab('POINTS')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* CỘT TRÁI (8 cols): video và diễn biến trận */}
        <div className="lg:col-span-8 space-y-6">

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
                    onClick={() => setPlaylist(null)}
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

            {/* The stroke being played. A paused YouTube embed draws its own title across the top, so the chip
                waits for playback. */}
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

            <VideoControlBar
              isPlaying={isPlaying}
              isControlsVisible={isControlsVisible}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              playbackRate={playbackRate}
              showSpeedMenu={showSpeedMenu}
              setShowSpeedMenu={setShowSpeedMenu}
              togglePlay={togglePlay}
              toggleMute={toggleMute}
              handleSkip={handleSkip}
              handleJumpStroke={handleJumpStroke}
              handleSliderChange={handleSliderChange}
              handleVolumeChange={handleVolumeChange}
              handleChangeSpeed={handleChangeSpeed}
              handleToggleFullscreen={handleToggleFullscreen}
              onShowShortcuts={() => setShowShortcutsModal(true)}
            />
          </div>

          {/* Diễn biến trận: mỗi pha cầu tô theo người thắng điểm, chấm trắng là cú đánh */}
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
              events={sides.timelineEvents}
              durationSeconds={duration || 60}
              currentTimeSeconds={currentTime}
              currentEvent={selectedEvent}
              onSeekToEvent={(e) => handleSeekToEvent(events.find(x => x.id === e.id) ?? e)}
              rallies={sides.ralliesFromStart}
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

        {/* CỘT PHẢI (4 cols): pha cầu, điểm mất, cú đánh, lối chơi, sân */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl bg-sheet border border-ink/10 p-5 flex flex-col h-[700px]">
            <ReplaySideTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              ralliesCount={rallies.length}
              strokesCount={filteredEvents.length}
            />

            {activeTab === 'STROKES' && (
              <StrokeList
                filteredEvents={filteredEvents}
                selectedEvent={selectedEvent}
                handleSeekToEvent={handleSeekToEvent}
                strokesContainerRef={strokesContainerRef}
                autoScrollStrokes={autoScrollStrokes}
                onToggleAutoScroll={() => {
                  setAutoScrollStrokes(!autoScrollStrokes);
                  showOsd(!autoScrollStrokes ? 'Bật tự cuộn theo cú đánh' : 'Tắt tự cuộn theo cú đánh');
                }}
                hitByStartingUpper={sides.hitByStartingUpper}
                upperName={upperName}
                lowerName={lowerName}
              />
            )}

            {activeTab === 'RALLIES' && (
              <RalliesExplorer
                rallies={sides.ralliesFromStart}
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
                  rallies={sides.playerRallies}
                  events={sides.playerEvents}
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
                  upperPlayer={sides.liveUpperPlayer}
                  compact
                />
                <StrokeDetailCard
                  event={selectedEvent}
                  playerAName={match.playerAName}
                  playerBName={match.playerBName}
                  upperPlayer={sides.liveUpperPlayer}
                  onSeek={(t) => jumpTo(t)}
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
      <MatchAnalysisSection
        match={match}
        playerRallies={sides.playerRallies}
        playerEvents={sides.playerEvents}
        playerStatistics={sides.playerStatistics}
        currentTime={currentTime}
        handlePlayRally={handlePlayRally}
        handlePlayPlaylist={handlePlayPlaylist}
        handleSeekToTime={handleSeekToTime}
      />

      {showShortcutsModal && <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />}
      {showGuestLimitModal && <GuestLimitModal onClose={() => setShowGuestLimitModal(false)} />}
    </div>
  );
};
