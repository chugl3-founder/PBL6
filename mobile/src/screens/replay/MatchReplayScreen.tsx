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
} from 'lucide-react-native';

type ReplayRouteProp = RouteProp<RootStackParamList, 'MatchReplay'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5];

export const MatchReplayScreen: React.FC = () => {
  const route = useRoute<ReplayRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { matchId, isPublic = true } = route.params;
  const { user } = useAuth();

  const webViewRef = useRef<WebView>(null);

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

  const [activeTab, setActiveTab] = useState<'EVENTS' | 'COURT' | 'RALLIES'>('EVENTS');
  const [showGuestModal, setShowGuestModal] = useState<boolean>(false);

  // Nhận diện video YouTube hay video MP4 từ MinIO
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

  // Chuẩn hóa URL video nếu trỏ về container minio hoặc localhost nội bộ của máy chủ
  const resolvedVideoUrl = useMemo(() => {
    if (!videoData?.videoUrl) return '';
    if (isYouTube) return videoData.videoUrl;
    return videoData.videoUrl
      .replace('http://minio:9000', ENV.STORAGE_BASE_URL)
      .replace('http://localhost:9000', ENV.STORAGE_BASE_URL)
      .replace('http://127.0.0.1:9000', ENV.STORAGE_BASE_URL);
  }, [videoData?.videoUrl, isYouTube]);

  // Chỉ khởi tạo expo-video nếu là file video thông thường (không phải YouTube)
  const videoSource = !isYouTube && resolvedVideoUrl ? { uri: resolvedVideoUrl } : null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

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

      // Giới hạn 5 phút (300s) cho Khách vãng lai
      if (!user && isPublic && currentSecs >= 300) {
        if (player.playing) {
          player.pause();
          setShowGuestModal(true);
        }
      }

      // Tự động tìm event gần nhất
      if (events.length > 0) {
        const nearest = events.find((e) => Math.abs(e.timeSeconds - currentSecs) < 0.6);
        if (nearest && nearest.id !== selectedEvent?.id) {
          setSelectedEvent(nearest);
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

  // Cập nhật source cho file MP4
  useEffect(() => {
    if (!isYouTube && player && resolvedVideoUrl) {
      player.replace({ uri: resolvedVideoUrl });
    }
  }, [player, isYouTube, resolvedVideoUrl]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Match info
        const m = isPublic
          ? await matchApi.getPublicMatchDetail(matchId)
          : await matchApi.getMyMatchDetail(matchId);
        setMatch(m);

        // 2. Video info
        const v = isPublic
          ? await matchApi.getPublicMatchVideo(matchId)
          : await matchApi.getMyMatchVideo(matchId);
        setVideoData(v);
        if (v.durationSeconds) {
          setDuration(Number(v.durationSeconds));
        }

        // 3. AI Events
        const evts = await replayApi.getAiEvents(matchId, isPublic);
        setEvents(evts);
        if (evts.length > 0) {
          setSelectedEvent(evts[0]);
        }

        // 4. Rallies
        try {
          const rls = await replayApi.getRallies(matchId, isPublic);
          setRallies(rls);
          if (rls.length > 0) {
            setSelectedRally(rls[0]);
          }
        } catch (e) {
          console.warn('Chưa có dữ liệu Rallies:', e);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Replay:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId, isPublic]);

  // Xử lý message từ YouTube IFrame trong WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.event === 'timeUpdate' && typeof data.currentTime === 'number') {
        const timeSecs = data.currentTime;
        setCurrentTime(timeSecs);

        if (events.length > 0) {
          const nearest = events.find((e) => Math.abs(e.timeSeconds - timeSecs) < 0.6);
          if (nearest && nearest.id !== selectedEvent?.id) {
            setSelectedEvent(nearest);
          }
        }

        // Giới hạn 5 phút cho Khách
        if (!user && isPublic && timeSecs >= 300) {
          setShowGuestModal(true);
          webViewRef.current?.injectJavaScript('if(window.player && window.player.pauseVideo) window.player.pauseVideo();');
        }
      } else if (data.event === 'stateChange') {
        // 1: PLAYING, 2: PAUSED
        setIsPlaying(data.state === 1);
      }
    } catch (e) {}
  };

  const handlePlayPause = () => {
    if (!user && isPublic && currentTime >= 300) {
      setShowGuestModal(true);
      return;
    }

    if (isYouTube && webViewRef.current) {
      webViewRef.current.injectJavaScript('if(window.togglePlayPause) window.togglePlayPause();');
    } else if (player) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
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
      webViewRef.current.injectJavaScript(`if(window.seekToSeconds) window.seekToSeconds(${seconds});`);
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
      webViewRef.current.injectJavaScript(`if(window.player && window.player.setPlaybackRate) window.player.setPlaybackRate(${nextRate});`);
    } else if (player) {
      player.playbackRate = nextRate;
    }
  };

  const handleSelectEvent = (evt: AiEventData) => {
    setSelectedEvent(evt);
    handleSeek(evt.timeSeconds);
  };

  const handleSelectRally = (rally: RallyData) => {
    setSelectedRally(rally);
    handleSeek(rally.startTime);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Đang chuẩn bị video và dữ liệu AI...</Text>
      </View>
    );
  }

  const currentRate = PLAYBACK_RATES[rateIndex];

  // HTML nhúng YouTube IFrame Player API
  const youtubeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000000; overflow: hidden; }
        #player { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script src="https://www.youtube.com/iframe_api"></script>
      <script>
        var player;
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            videoId: '${youtubeId}',
            playerVars: {
              autoplay: 1,
              playsinline: 1,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1,
              origin: 'https://www.youtube.com'
            },
            events: {
              'onReady': onPlayerReady,
              'onStateChange': onPlayerStateChange,
              'onError': function(e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'error', error: e.data }));
              }
            }
          });
          window.player = player;
        }
        function onPlayerReady(event) {
          setInterval(function() {
            if (player && player.getCurrentTime) {
              var time = player.getCurrentTime();
              window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'timeUpdate', currentTime: time }));
            }
          }, 400);
        }
        function onPlayerStateChange(event) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'stateChange', state: event.data }));
        }
        window.seekToSeconds = function(sec) {
          if (player && player.seekTo) {
            player.seekTo(sec, true);
          }
        };
        window.togglePlayPause = function() {
          if (player && player.getPlayerState) {
            var state = player.getPlayerState();
            if (state === 1) { player.pauseVideo(); } else { player.playVideo(); }
          }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {match?.title || `${match?.playerAName || 'A'} vs ${match?.playerBName || 'B'}`}
        </Text>
        <TouchableOpacity
          style={styles.statsIconBtn}
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
          <BarChart2 color="#38bdf8" size={20} />
        </TouchableOpacity>
      </View>

      {/* Video Player Area */}
      <View style={styles.playerContainer}>
        {isYouTube && youtubeId ? (
          <WebView
            ref={webViewRef}
            style={styles.videoPlayer}
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
            mixedContentMode="always"
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
            onMessage={handleWebViewMessage}
          />
        ) : videoData?.videoUrl && player ? (
          <VideoView
            style={styles.videoPlayer}
            player={player}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <View style={styles.noVideoBox}>
            <Text style={styles.noVideoText}>Video không sẵn sàng hoặc đang xử lý</Text>
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
          <RotateCcw color="#ffffff" size={18} />
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
          <RotateCw color="#ffffff" size={18} />
          <Text style={styles.skipText}>+5s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rateBtn} onPress={cyclePlaybackRate}>
          <Gauge color="#38bdf8" size={14} style={{ marginRight: 4 }} />
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
          style={[styles.tabItem, activeTab === 'EVENTS' && styles.activeTabItem]}
          onPress={() => setActiveTab('EVENTS')}
        >
          <Text style={[styles.tabText, activeTab === 'EVENTS' && styles.activeTabText]}>
            Cú đánh ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'COURT' && styles.activeTabItem]}
          onPress={() => setActiveTab('COURT')}
        >
          <Text style={[styles.tabText, activeTab === 'COURT' && styles.activeTabText]}>
            Sân 2D Radar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'RALLIES' && styles.activeTabItem]}
          onPress={() => setActiveTab('RALLIES')}
        >
          <Text style={[styles.tabText, activeTab === 'RALLIES' && styles.activeTabText]}>
            Pha cầu ({rallies.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content Area */}
      <View style={styles.tabContent}>
        {activeTab === 'EVENTS' && (
          <FlatList
            data={events}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.eventsList}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedEvent?.id;
              return (
                <TouchableOpacity
                  style={[styles.eventRow, isSelected && styles.selectedEventRow]}
                  onPress={() => handleSelectEvent(item)}
                >
                  <View style={styles.eventTimeBox}>
                    <Text style={styles.eventTimeText}>
                      {item.timeSeconds.toFixed(1)}s
                    </Text>
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventStroke}>{item.stroke}</Text>
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
        )}

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

        {activeTab === 'RALLIES' && (
          <FlatList
            data={rallies}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.ralliesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.rallyListItem,
                  item.id === selectedRally?.id && styles.selectedRallyItem,
                ]}
                onPress={() => handleSelectRally(item)}
              >
                <View>
                  <Text style={styles.rallyListTitle}>Pha cầu #{item.rallyNumber}</Text>
                  <Text style={styles.rallyListSub}>
                    {item.startTime.toFixed(1)}s - {item.endTime.toFixed(1)}s ({item.duration.toFixed(1)}s)
                  </Text>
                </View>
                <View style={styles.rallyListScore}>
                  <Text style={styles.scoreNumber}>
                    {item.scoreUpper} - {item.scoreLower}
                  </Text>
                  <Text style={styles.rallyWinnerTag}>
                    Thắng: {item.winnerSide === 'UPPER' ? match?.playerAName : match?.playerBName}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Modal Giới hạn 5 phút dành cho Khách vãng lai */}
      <Modal visible={showGuestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.lockCircle}>
              <Lock color="#fbbf24" size={32} />
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
    backgroundColor: '#0b1424',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1424',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    backgroundColor: '#0b1424',
  },
  backButton: {
    padding: 6,
  },
  topBarTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  statsIconBtn: {
    padding: 6,
  },
  playerContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 20,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13233e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  playPauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f1d35',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e3a5f',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#38bdf8',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  eventsList: {
    padding: 12,
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  selectedEventRow: {
    borderColor: '#38bdf8',
    backgroundColor: '#172c4e',
  },
  eventTimeBox: {
    backgroundColor: '#0b1424',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  eventTimeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  eventDetails: {
    flex: 1,
  },
  eventStroke: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  eventSide: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    color: '#34d399',
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
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  selectedRallyItem: {
    borderColor: '#38bdf8',
  },
  rallyListTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  rallyListSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  rallyListScore: {
    alignItems: 'flex-end',
  },
  scoreNumber: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  rallyWinnerTag: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#122340',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
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
