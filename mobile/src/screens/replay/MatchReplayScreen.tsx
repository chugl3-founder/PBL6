import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../../navigation/types';
import { matchApi } from '../../api/matchApi';
import { replayApi } from '../../api/replayApi';
import { MatchData, VideoData } from '../../types/match';
import { AiEventData, RallyData } from '../../types/replay';
import { useAuth } from '../../context/AuthContext';
import { TouchTimeline } from '../../components/TouchTimeline';
import { RallyScroller } from '../../components/RallyScroller';
import { Court2DViewer } from '../../components/Court2DViewer';
import { ENV } from '../../config/env';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Gauge,
  ArrowLeft,
  Lock,
  LogIn,
  BarChart2,
  Zap,
  Target,
  Sparkles,
  Trophy,
  Clock,
  Shield,
  Award,
} from 'lucide-react-native';

type ReplayRouteProp = RouteProp<RootStackParamList, 'MatchReplay'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5];

export const STROKE_LABELS: Record<string, string> = {
  SMASH: 'Đập cầu',
  DROP: 'Bỏ nhỏ',
  CLEAR: 'Phông cầu',
  SERVE: 'Giao cầu',
  LIFT: 'Hất cầu',
  DRIVE: 'Tạt cầu',
  NET_SHOT: 'Kéo lưới',
  NET_ATTACK: 'Vồ lưới',
  PUSH: 'Đẩy cầu',
  BLOCK: 'Chặn cầu',
  UNKNOWN: 'Chưa rõ',
};

export const STROKE_COLORS: Record<string, string> = {
  SMASH: '#ef4444',
  DROP: '#06b6d4',
  CLEAR: '#eab308',
  SERVE: '#10b981',
  LIFT: '#8b5cf6',
  DRIVE: '#ec4899',
  NET_SHOT: '#3b82f6',
  NET_ATTACK: '#f97316',
  PUSH: '#6366f1',
  BLOCK: '#14b8a6',
  UNKNOWN: '#64748b',
};

const STROKE_FILTER_OPTIONS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'SMASH', label: 'Đập cầu' },
  { id: 'DROP', label: 'Bỏ nhỏ' },
  { id: 'CLEAR', label: 'Phông cầu' },
  { id: 'SERVE', label: 'Giao cầu' },
  { id: 'DRIVE', label: 'Tạt cầu' },
  { id: 'NET_SHOT', label: 'Kéo lưới' },
];

export const MatchReplayScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<ReplayRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { matchId, isPublic = true } = route.params;
  const { user } = useAuth();

  const webViewRef = useRef<WebView<{}>>(null);
  const eventsListRef = useRef<FlatList>(null);
  const selectedEventRef = useRef<AiEventData | null>(null);
  const selectedRallyRef = useRef<RallyData | null>(null);

  const [match, setMatch] = useState<MatchData | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [events, setEvents] = useState<AiEventData[]>([]);
  const [rallies, setRallies] = useState<RallyData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AiEventData | null>(null);
  const [selectedRally, setSelectedRally] = useState<RallyData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [rateIndex, setRateIndex] = useState<number>(2); // 1.0x

  const [activeTab, setActiveTab] = useState<'RALLIES' | 'EVENTS' | 'COURT'>('RALLIES');
  const [selectedFilterStroke, setSelectedFilterStroke] = useState<string>('ALL');
  const [showGuestModal, setShowGuestModal] = useState<boolean>(false);

  // Nhận diện video YouTube hay MP4
  const isYouTube =
    videoData?.videoSourceType === 'YOUTUBE' ||
    Boolean(videoData?.youtubeVideoId) ||
    Boolean(videoData?.videoUrl?.includes('youtube.com') || videoData?.videoUrl?.includes('youtu.be'));

  const youtubeId =
    videoData?.youtubeVideoId ||
    (videoData?.videoUrl?.includes('v=')
      ? videoData.videoUrl.split('v=')[1]?.split('&')[0]
      : videoData?.videoUrl?.includes('youtu.be/')
      ? videoData.videoUrl.split('youtu.be/')[1]?.split('?')[0]
      : null);

  // Chuẩn hóa URL video nếu trỏ về minio/localhost nội bộ
  const resolvedVideoUrl = useMemo(() => {
    if (!videoData?.videoUrl) return '';
    if (isYouTube) return videoData.videoUrl;
    return videoData.videoUrl
      .replace('http://minio:9000', ENV.STORAGE_BASE_URL)
      .replace('http://localhost:9000', ENV.STORAGE_BASE_URL)
      .replace('http://127.0.0.1:9000', ENV.STORAGE_BASE_URL);
  }, [videoData?.videoUrl, isYouTube]);

  // VideoPlayer cho MP4
  const videoSource = !isYouTube && resolvedVideoUrl ? { uri: resolvedVideoUrl } : null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

  // Tải dữ liệu trận đấu
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [matchDetail, videoInfo, aiEvts, ralliesData] = await Promise.all([
          isPublic ? matchApi.getPublicMatchDetail(matchId) : matchApi.getMyMatchDetail(matchId),
          isPublic ? matchApi.getPublicMatchVideo(matchId) : matchApi.getMyMatchVideo(matchId),
          replayApi.getAiEvents(matchId, isPublic).catch(() => []),
          replayApi.getRallies(matchId, isPublic).catch(() => []),
        ]);

        setMatch(matchDetail);
        setVideoData(videoInfo);
        setEvents(aiEvts || []);
        setRallies(ralliesData || []);

        if (videoInfo?.durationSeconds) {
          setDuration(videoInfo.durationSeconds);
        } else if (matchDetail?.durationSeconds) {
          setDuration(matchDetail.durationSeconds);
        }

        if (ralliesData && ralliesData.length > 0) {
          setSelectedRally(ralliesData[0]);
          selectedRallyRef.current = ralliesData[0];
        }
        if (aiEvts && aiEvts.length > 0) {
          setSelectedEvent(aiEvts[0]);
          selectedEventRef.current = aiEvts[0];
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết trận đấu:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId, isPublic]);

  // Đăng ký event listeners cho VideoPlayer (file MP4)
  useEffect(() => {
    if (isYouTube || !player) return;

    const playListener = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });

    const timeListener = player.addListener('timeUpdate', (event) => {
      const currentSecs = event.currentTime;
      setCurrentTime(currentSecs);
      if (player.duration && duration === 0) {
        setDuration(player.duration);
      }

      // Giới hạn 5 phút cho Khách
      if (!user && isPublic && currentSecs >= 300) {
        if (player.playing) {
          player.pause();
          setShowGuestModal(true);
        }
      }

      // Đồng bộ cú đánh
      if (events.length > 0) {
        let activeEvt = [...events].reverse().find((e) => e.timeSeconds <= currentSecs + 0.3);
        if (!activeEvt && currentSecs < events[0].timeSeconds) {
          activeEvt = events[0];
        }
        if (activeEvt && activeEvt.id !== selectedEventRef.current?.id) {
          selectedEventRef.current = activeEvt;
          setSelectedEvent(activeEvt);
        }
      }

      // Đồng bộ pha cầu
      if (rallies.length > 0) {
        const activeR = rallies.find((r) => currentSecs >= r.startTime && currentSecs <= r.endTime);
        if (activeR && activeR.id !== selectedRallyRef.current?.id) {
          selectedRallyRef.current = activeR;
          setSelectedRally(activeR);
        }
      }
    });

    const statusListener = player.addListener('statusChange', () => {
      if (player.duration) {
        setDuration(player.duration);
      }
    });

    return () => {
      playListener.remove();
      timeListener.remove();
      statusListener.remove();
    };
  }, [player, isYouTube, events, selectedEvent?.id, user, isPublic, duration]);

  // Tự động cuộn danh sách cú đánh
  useEffect(() => {
    if (selectedEvent && activeTab === 'EVENTS' && events.length > 0) {
      const filtered = selectedFilterStroke === 'ALL'
        ? events
        : events.filter((e) => e.stroke === selectedFilterStroke);
      const idx = filtered.findIndex((e) => e.id === selectedEvent.id);
      if (idx !== -1 && eventsListRef.current) {
        try {
          eventsListRef.current.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.3,
          });
        } catch {}
      }
    }
  }, [selectedEvent?.id, activeTab, selectedFilterStroke, events]);

  // Xử lý message từ YouTube IFrame trong WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = typeof event.nativeEvent.data === 'string'
        ? JSON.parse(event.nativeEvent.data)
        : event.nativeEvent.data;

      if (data.event === 'timeUpdate' && typeof data.currentTime === 'number') {
        const timeSecs = data.currentTime;
        setCurrentTime(timeSecs);

        if (events.length > 0) {
          let activeEvt = [...events].reverse().find((e) => e.timeSeconds <= timeSecs + 0.3);
          if (!activeEvt && timeSecs < events[0].timeSeconds) {
            activeEvt = events[0];
          }
          if (activeEvt && activeEvt.id !== selectedEventRef.current?.id) {
            selectedEventRef.current = activeEvt;
            setSelectedEvent(activeEvt);
          }
        }

        if (rallies.length > 0) {
          const activeR = rallies.find((r) => timeSecs >= r.startTime && timeSecs <= r.endTime);
          if (activeR && activeR.id !== selectedRallyRef.current?.id) {
            selectedRallyRef.current = activeR;
            setSelectedRally(activeR);
          }
        }

        // Giới hạn 5 phút cho Khách
        if (!user && isPublic && timeSecs >= 300) {
          setShowGuestModal(true);
          webViewRef.current?.injectJavaScript('if(window.togglePlayPause) window.togglePlayPause(false); true;');
        }
      } else if (data.event === 'stateChange') {
        // 1: PLAYING, 2: PAUSED
        setIsPlaying(data.state === 1);
      }
    } catch {}
  };

  const handlePlayPause = () => {
    if (!user && isPublic && currentTime >= 300) {
      setShowGuestModal(true);
      return;
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (isYouTube && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if(window.togglePlayPause) window.togglePlayPause(${nextState}); true;`
      );
    } else if (player) {
      if (nextState) {
        player.play();
      } else {
        player.pause();
      }
    }
  };

  const handleSeek = (seconds: number) => {
    if (!user && isPublic && seconds >= 300) {
      setShowGuestModal(true);
      return;
    }
    setCurrentTime(seconds);
    if (isYouTube && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if(window.seekToSeconds) window.seekToSeconds(${seconds}); true;`
      );
    } else if (player) {
      player.currentTime = seconds;
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    const target = Math.max(0, Math.min(duration || 3600, currentTime + deltaSeconds));
    handleSeek(target);
  };

  const cyclePlaybackRate = () => {
    const nextIdx = (rateIndex + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIdx];
    setRateIndex(nextIdx);
    if (isYouTube && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if(window.setPlaybackRate) window.setPlaybackRate(${nextRate}); true;`
      );
    } else if (player) {
      player.playbackRate = nextRate;
    }
  };

  const handleSelectEvent = (evt: AiEventData) => {
    setSelectedEvent(evt);
    handleSeek(evt.timeSeconds);
  };

  const handleSelectRally = (rally: RallyData) => {
    selectedRallyRef.current = rally;
    setSelectedRally(rally);
    handleSeek(rally.startTime);
    const firstEvt = events.find(
      (e) => e.id === rally.startEventId || (e.timeSeconds >= rally.startTime && e.timeSeconds <= rally.endTime)
    );
    if (firstEvt) {
      selectedEventRef.current = firstEvt;
      setSelectedEvent(firstEvt);
    }
  };

  // Tính toán bảng điểm Live Scoreboard cập nhật theo thời gian xem (như trên Web)
  const currentRally = useMemo(() => {
    if (!rallies || rallies.length === 0) return null;
    const past = rallies.filter((r) => r.endTime <= currentTime + 2);
    return past.length > 0 ? past[past.length - 1] : rallies[0];
  }, [rallies, currentTime]);

  const liveGame = currentRally?.gameNumber || 1;
  const liveScoreA = currentRally ? (currentRally.scoreA ?? currentRally.scoreUpper ?? 0) : 0;
  const liveScoreB = currentRally ? (currentRally.scoreB ?? currentRally.scoreLower ?? 0) : 0;

  // Lọc cú đánh theo phân loại
  const filteredEvents = useMemo(() => {
    if (selectedFilterStroke === 'ALL') return events;
    return events.filter((e) => e.stroke === selectedFilterStroke);
  }, [events, selectedFilterStroke]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Đang chuẩn bị video và dữ liệu AI...</Text>
      </View>
    );
  }

  const currentRate = PLAYBACK_RATES[rateIndex];

  // HTML chuẩn nhúng YouTube: Nhúng trực tiếp iframe có origin rõ ràng, hỗ trợ phần cứng GPU 100% không đen màn hình
  const youtubeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000000; overflow: hidden; }
    .video-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    iframe { width: 100% !important; height: 100% !important; border: 0 !important; }
  </style>
</head>
<body>
  <div class="video-container">
    <iframe
      id="yt-player"
      src="https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&playsinline=1&autoplay=1&controls=1&rel=0&modestbranding=1"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
  <script>
    var playerWindow = null;
    var iframe = document.getElementById('yt-player');
    if (iframe) playerWindow = iframe.contentWindow;

    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'timeUpdate',
              currentTime: data.info.currentTime
            }));
          }
          if (typeof data.info.playerState === 'number') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'stateChange',
              state: data.info.playerState
            }));
          }
        }
      } catch (e) {}
    });

    window.seekToSeconds = function(sec) {
      if (!playerWindow && iframe) playerWindow = iframe.contentWindow;
      if (playerWindow) {
        playerWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [sec, true]
        }), '*');
      }
    };

    window.togglePlayPause = function(shouldPlay) {
      if (!playerWindow && iframe) playerWindow = iframe.contentWindow;
      if (playerWindow) {
        playerWindow.postMessage(JSON.stringify({
          event: 'command',
          func: shouldPlay ? 'playVideo' : 'pauseVideo',
          args: []
        }), '*');
      }
    };

    window.setPlaybackRate = function(rate) {
      if (!playerWindow && iframe) playerWindow = iframe.contentWindow;
      if (playerWindow) {
        playerWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'setPlaybackRate',
          args: [rate]
        }), '*');
      }
    };
  </script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          testID="btn-back-replay"
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#0f172a" size={20} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} numberOfLines={1}>
          {match?.title || `${match?.playerAName || 'A'} vs ${match?.playerBName || 'B'}`}
        </Text>

        <TouchableOpacity
          style={styles.statsIconBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() =>
            navigation.navigate('MatchStatistics', {
              matchId,
              isPublic,
              title: match?.title || undefined,
              playerAName: match?.playerAName,
              playerBName: match?.playerBName,
            })
          }
        >
          <BarChart2 color="#059669" size={20} />
        </TouchableOpacity>
      </View>

      {/* Broadcast Live Scoreboard (Đồng bộ phong cách phát sóng như trên Web) */}
      <View style={styles.scoreboardBanner}>
        <View style={styles.scoreboardHeaderRow}>
          <View style={styles.gameBadge}>
            <Text style={styles.gameBadgeText}>VÁN {liveGame}</Text>
          </View>
          <Text style={styles.scoreboardMetaText}>
            {rallies.length} pha cầu • {events.length} cú đánh
          </Text>
        </View>

        <View style={styles.scoreboardMatchRow}>
          {/* Player A */}
          <View style={styles.playerCol}>
            <Text style={styles.playerName} numberOfLines={1}>
              {match?.playerAName || 'Tuyển thủ A'}
            </Text>
            <Text style={[styles.playerScore, liveScoreA > liveScoreB && styles.playerScoreLeading]}>
              {liveScoreA}
            </Text>
          </View>

          <View style={styles.scoreVsBox}>
            <Text style={styles.scoreVsText}>-</Text>
          </View>

          {/* Player B */}
          <View style={[styles.playerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.playerName} numberOfLines={1}>
              {match?.playerBName || 'Tuyển thủ B'}
            </Text>
            <Text style={[styles.playerScore, liveScoreB > liveScoreA && styles.playerScoreLeading]}>
              {liveScoreB}
            </Text>
          </View>
        </View>
      </View>

      {/* Video Player Area */}
      <View style={styles.playerContainer}>
        {isYouTube && youtubeId ? (
          <WebView
            ref={webViewRef}
            style={[styles.videoPlayer, { opacity: 0.99 }]}
            source={{
              html: youtubeHtml,
              baseUrl: 'https://www.youtube.com',
            }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            androidLayerType="hardware"
            mixedContentMode="always"
            onMessage={handleWebViewMessage}
          />
        ) : videoData?.videoUrl && player ? (
          <VideoView
            style={[styles.videoPlayer, { flex: 1 }]}
            player={player}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <View style={styles.noVideoBox}>
            <Text style={styles.noVideoText}>Video không sẵn sàng hoặc đang xử lý</Text>
          </View>
        )}

        {/* Live Stroke Chip Badge floating on video (như trên Web) */}
        {selectedEvent && (
          <View style={styles.strokeFloatingPill} pointerEvents="none">
            <View
              style={[
                styles.strokeDot,
                { backgroundColor: STROKE_COLORS[selectedEvent.stroke] || '#10b981' },
              ]}
            />
            <Text style={styles.strokeFloatingText}>
              {STROKE_LABELS[selectedEvent.stroke] || selectedEvent.stroke}
            </Text>
            <Text style={styles.strokeFloatingOrder}>#{selectedEvent.eventOrder}</Text>
            <Text style={styles.strokeFloatingSide}>
              • {selectedEvent.playerSide === 'UPPER' ? (match?.playerAName || 'Phía trên') : (match?.playerBName || 'Phía dưới')}
            </Text>
          </View>
        )}
      </View>

      {/* Interactive Touch Timeline */}
      <TouchTimeline
        duration={duration}
        currentTime={currentTime}
        events={events}
        selectedEventId={selectedEvent?.id}
        onSeek={handleSeek}
        onSelectEvent={handleSelectEvent}
      />

      {/* Player Control Buttons */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => handleSkip(-5)}>
          <RotateCcw color="#475569" size={16} />
          <Text style={styles.skipText}>-5s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playPauseBtn} onPress={handlePlayPause}>
          {isPlaying ? (
            <Pause color="#ffffff" size={22} fill="#ffffff" />
          ) : (
            <Play color="#ffffff" size={22} fill="#ffffff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => handleSkip(5)}>
          <RotateCw color="#475569" size={16} />
          <Text style={styles.skipText}>+5s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rateBtn} onPress={cyclePlaybackRate}>
          <Gauge color="#059669" size={14} style={{ marginRight: 4 }} />
          <Text style={styles.rateText}>{currentRate}x</Text>
        </TouchableOpacity>
      </View>

      {/* Rallies Horizontal Scroller */}
      {rallies.length > 0 && (
        <RallyScroller
          rallies={rallies}
          currentTime={currentTime}
          selectedRallyId={selectedRally?.id}
          onSelectRally={handleSelectRally}
          playerAName={match?.playerAName}
          playerBName={match?.playerBName}
        />
      )}

      {/* Navigation Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          testID="tab-rallies"
          style={[styles.tabItem, activeTab === 'RALLIES' && styles.activeTabItem]}
          onPress={() => setActiveTab('RALLIES')}
        >
          <Text style={[styles.tabText, activeTab === 'RALLIES' && styles.activeTabText]}>
            Pha cầu ({rallies.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="tab-events"
          style={[styles.tabItem, activeTab === 'EVENTS' && styles.activeTabItem]}
          onPress={() => setActiveTab('EVENTS')}
        >
          <Text style={[styles.tabText, activeTab === 'EVENTS' && styles.activeTabText]}>
            Cú đánh ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="tab-court"
          style={[styles.tabItem, activeTab === 'COURT' && styles.activeTabItem]}
          onPress={() => setActiveTab('COURT')}
        >
          <Text style={[styles.tabText, activeTab === 'COURT' && styles.activeTabText]}>
            Sân 2D Radar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content Area */}
      <View style={styles.tabContent}>
        {/* TAB 1: RALLIES (Pha cầu) */}
        {activeTab === 'RALLIES' && (
          <FlatList
            data={rallies}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.ralliesList}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedRally?.id;
              const winnerName =
                item.winnerSide === 'UPPER' ? match?.playerAName : match?.playerBName;
              return (
                <TouchableOpacity
                  style={[styles.rallyListItem, isSelected && styles.selectedRallyItem]}
                  onPress={() => handleSelectRally(item)}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.rallyItemHeader}>
                      <Text style={styles.rallyListTitle}>Pha cầu #{item.rallyNumber}</Text>
                      {item.gameNumber ? (
                        <View style={styles.rallyGamePill}>
                          <Text style={styles.rallyGamePillText}>Ván {item.gameNumber}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.rallyMetaRow}>
                      <Clock size={12} color="#64748b" />
                      <Text style={styles.rallyListSub}>
                        {item.startTime.toFixed(1)}s - {item.endTime.toFixed(1)}s ({item.duration.toFixed(1)}s)
                      </Text>
                    </View>
                    {winnerName ? (
                      <View style={styles.winnerRow}>
                        <Trophy size={12} color="#059669" />
                        <Text style={styles.rallyWinnerTag} numberOfLines={1}>
                          Thắng: {winnerName}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.rallyListScore}>
                    <Text style={styles.scoreNumber}>
                      {item.scoreUpper} - {item.scoreLower}
                    </Text>
                    <View style={styles.watchNowBadge}>
                      <Play size={10} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.watchNowText}>Xem pha</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* TAB 2: STROKES (Cú đánh) */}
        {activeTab === 'EVENTS' && (
          <View style={{ flex: 1 }}>
            {/* Filter Chips Bar (Giống thanh lọc cú đánh trên Web) */}
            <View style={styles.filterChipsScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                {STROKE_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedFilterStroke === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setSelectedFilterStroke(opt.id)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <FlatList
              ref={eventsListRef}
              data={filteredEvents}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.eventsList}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  eventsListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.3,
                  });
                }, 100);
              }}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedEvent?.id;
                const strokeColor = STROKE_COLORS[item.stroke] || '#059669';
                const strokeVietnamese = STROKE_LABELS[item.stroke] || item.stroke;

                return (
                  <TouchableOpacity
                    style={[styles.eventRow, isSelected && styles.selectedEventRow]}
                    onPress={() => handleSelectEvent(item)}
                  >
                    <View style={styles.eventTimeBox}>
                      <Text style={styles.eventTimeText}>{item.timeSeconds.toFixed(1)}s</Text>
                    </View>

                    <View style={styles.eventDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.strokeColorIndicator, { backgroundColor: strokeColor }]} />
                        <Text style={styles.eventStroke}>{strokeVietnamese}</Text>
                        <Text style={styles.eventStrokeCode}>{item.stroke}</Text>
                      </View>
                      <Text style={styles.eventSide}>
                        {item.playerSide === 'UPPER'
                          ? match?.playerAName || 'Phía trên'
                          : match?.playerBName || 'Phía dưới'}{' '}
                        • {item.strokeSide}
                      </Text>
                    </View>

                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(item.confidence * 100)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* TAB 3: 2D COURT RADAR */}
        {activeTab === 'COURT' && (
          <ScrollView contentContainerStyle={styles.courtScroll}>
            <Court2DViewer
              currentEvent={selectedEvent}
              playerAName={match?.playerAName}
              playerBName={match?.playerBName}
              upperPlayer={match?.upperPlayer}
            />
          </ScrollView>
        )}
      </View>

      <TouchableOpacity
        testID="trigger-guest-limit"
        accessibilityLabel="trigger-guest-limit"
        style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 2, opacity: 0.01 }}
        onPress={() => setShowGuestModal(true)}
      />

      {/* Modal Giới hạn 5 phút dành cho Khách vãng lai */}
      <Modal visible={showGuestModal} transparent animationType="fade">
        <View testID="guest-modal" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.lockCircle}>
              <Lock color="#d97706" size={30} />
            </View>
            <Text style={styles.modalTitle}>Thời gian xem thử kết thúc</Text>
            <Text style={styles.modalDesc}>
              Bạn đã xem hết 5 phút miễn phí ở chế độ Khách vãng lai. Vui lòng đăng nhập để mở khóa toàn bộ thời lượng trận đấu và dữ liệu AI!
            </Text>
            <TouchableOpacity
              style={styles.modalLoginBtn}
              onPress={() => {
                setShowGuestModal(false);
                navigation.navigate('Login');
              }}
            >
              <LogIn color="#ffffff" size={18} style={{ marginRight: 6 }} />
              <Text style={styles.modalLoginText}>Đăng nhập ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="btn-close-guest-modal"
              style={styles.modalCloseBtn}
              onPress={() => setShowGuestModal(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 99,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  topBarTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  statsIconBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
  },
  scoreboardBanner: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scoreboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gameBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gameBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoreboardMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  scoreboardMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCol: {
    flex: 1,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  playerScore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#64748b',
  },
  playerScoreLeading: {
    color: '#059669',
  },
  scoreVsBox: {
    paddingHorizontal: 16,
  },
  scoreVsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
  },
  playerContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  noVideoBox: {
    padding: 20,
    alignItems: 'center',
  },
  noVideoText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  strokeFloatingPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
    zIndex: 20,
  },
  strokeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  strokeFloatingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  strokeFloatingOrder: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  strokeFloatingSide: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 18,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  skipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  playPauseBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#059669',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterChipsScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  eventsList: {
    padding: 12,
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedEventRow: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  eventTimeBox: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  eventTimeText: {
    color: '#059669',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  eventDetails: {
    flex: 1,
  },
  strokeColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventStroke: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  eventStrokeCode: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  eventSide: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  confidenceText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  courtScroll: {
    padding: 12,
  },
  ralliesList: {
    padding: 12,
    gap: 8,
  },
  rallyListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedRallyItem: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  rallyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  rallyListTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  rallyGamePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rallyGamePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  rallyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rallyListSub: {
    color: '#64748b',
    fontSize: 11,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rallyWinnerTag: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  rallyListScore: {
    alignItems: 'flex-end',
    gap: 6,
  },
  scoreNumber: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  watchNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  watchNowText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    width: '100%',
    height: 48,
    marginBottom: 10,
  },
  modalLoginText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCloseBtn: {
    paddingVertical: 10,
  },
  modalCloseText: {
    color: '#64748b',
    fontSize: 13,
  },
});
