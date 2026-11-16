import { useEffect, useState } from 'react';
import { getAnalysisStatus, getReplayEvents, getReplayRallies, getReplayStatistics } from '../api/analysis';
import { getMatch, getMatchVideo, getPublicMatch, getPublicMatchVideo } from '../api/matches';
import { errorMessage } from '../api/errors';
import type { MatchStatisticsData } from '../components/replay/StatisticsDashboard';
import type { Match, MatchVideo } from '../types/match';
import { AiEventData, AnalysisStatus, LIVE_ANALYSIS_STATES, RallyData } from '../types/replay';

/** While the AI still runs, new strokes and rallies are fetched this often. */
const LIVE_POLL_MS = 3000;

/**
 * Everything the Replay page shows for a match: the match, its video, the AI's stroke events, rallies and
 * statistics. While an analysis is still running (owner only) results arrive rally by rally, so the data is
 * re-fetched every few seconds until it completes; then onAnalysisDone is called once.
 */
export const useReplayData = (id: string | undefined, isPublic: boolean, onAnalysisDone: () => void) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [video, setVideo] = useState<MatchVideo | null>(null);
  const [events, setEvents] = useState<AiEventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AiEventData | null>(null);
  const [rallies, setRallies] = useState<RallyData[]>([]);
  const [selectedRally, setSelectedRally] = useState<RallyData | null>(null);
  const [statistics, setStatistics] = useState<MatchStatisticsData | null>(null);
  const [analysisLive, setAnalysisLive] = useState<AnalysisStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAnalysisLive = !isPublic && LIVE_ANALYSIS_STATES.includes(analysisLive?.status ?? '');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setMatch(await (isPublic ? getPublicMatch(id) : getMatch(id)));
        setVideo(await (isPublic ? getPublicMatchVideo(id) : getMatchVideo(id)));

        // A running analysis still opens the Replay; results appear as they come.
        let streaming = false;
        if (!isPublic) {
          try {
            const status = await getAnalysisStatus(id);
            setAnalysisLive(status);
            streaming = LIVE_ANALYSIS_STATES.includes(status?.status);
          } catch {
            setAnalysisLive(null);
          }
        }

        try {
          const loadedEvents = await getReplayEvents(id, isPublic);
          setEvents(loadedEvents);
          if (loadedEvents.length > 0) setSelectedEvent(loadedEvents[0]);
        } catch (eventsErr) {
          // Analysing but no rally yet: the video can still be watched.
          if (!streaming) throw eventsErr;
        }

        try {
          const loadedRallies = await getReplayRallies(id, isPublic);
          setRallies(loadedRallies);
          if (loadedRallies.length > 0) setSelectedRally(loadedRallies[0]);
        } catch (ralliesErr) {
          console.warn('Chưa có dữ liệu Rallies:', ralliesErr);
        }

        try {
          setStatistics(await getReplayStatistics(id, isPublic));
        } catch (statsErr) {
          console.warn('Chưa có dữ liệu Thống kê:', statsErr);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Replay:', err);
        setError(errorMessage(err, 'Không thể tải dữ liệu trận đấu hoặc phiên phân tích.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isPublic]);

  // Streaming: while the AI runs, reload events and rallies; new markers appear as they come.
  useEffect(() => {
    if (!id || !isAnalysisLive) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const status = await getAnalysisStatus(id);
        if (cancelled) return;
        const done = status?.status === 'COMPLETED';
        const [nextEvents, nextRallies] = await Promise.all([
          getReplayEvents(id),
          getReplayRallies(id).catch(() => [] as RallyData[]),
        ]);
        if (cancelled) return;
        setEvents(nextEvents);
        // Partial results are rewritten each time (ids change): keep the selection by time and number.
        setSelectedEvent(prev => (prev ? nextEvents.find(e => e.timeSeconds === prev.timeSeconds) ?? prev : nextEvents[0] ?? null));
        setRallies(nextRallies);
        setSelectedRally(prev => (prev ? nextRallies.find(r => r.rallyNumber === prev.rallyNumber) ?? prev : nextRallies[0] ?? null));
        if (done) {
          try {
            const stats = await getReplayStatistics(id);
            if (!cancelled) setStatistics(stats);
          } catch {
            // Statistics may not be ready yet.
          }
          onAnalysisDone();
        }
        setAnalysisLive(status);
      } catch {
        // A network hiccup: try again next round.
      }
    };

    const timer = setInterval(refresh, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, isAnalysisLive]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    match,
    video,
    events,
    selectedEvent,
    setSelectedEvent,
    rallies,
    selectedRally,
    setSelectedRally,
    statistics,
    analysisLive,
    isAnalysisLive,
    loading,
    error,
  };
};
