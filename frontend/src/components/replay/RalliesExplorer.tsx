import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Play, PlayCircle, X } from 'lucide-react';
import { strokeLabelLower } from '../../utils/strokeLabels';
import { TacticRally, tacticLabel, tacticsOf } from './TacticsBreakdown';
import { PlaylistClip, toPlaylist } from './PointLossInsights';

export interface RallyData {
  id: number;
  rallyNumber: number;
  startEventId: number;
  endEventId: number;
  startTime: number;
  endTime: number;
  duration: number;
  totalStrokes: number;
  boundaryType: string;
  serverSide: string; // UPPER, LOWER
  winnerSide: string; // UPPER, LOWER
  winReason: string;
  scoreUpper: number;
  scoreLower: number;
  scoreText: string;
  strokeSequence: string[];
  isComplete: boolean;
}

interface RalliesExplorerProps {
  rallies: RallyData[];
  currentTimeSeconds: number;
  selectedRallyId?: number;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  onPlayRally: (rally: RallyData) => void;
  /** Tactics per rally and player, to filter by tactic. */
  tacticRallies?: TacticRally[];
  onPlayPlaylist?: (title: string, clips: PlaylistClip[]) => void;
}

type LengthFilter = 'ALL' | 'SHORT' | 'MEDIUM' | 'LONG';
const LENGTHS: Record<LengthFilter, { label: string; test: (n: number) => boolean }> = {
  ALL: { label: 'Mọi độ dài', test: () => true },
  SHORT: { label: 'Ngắn (≤ 5 cú)', test: n => n <= 5 },
  MEDIUM: { label: 'Vừa (6–14 cú)', test: n => n >= 6 && n <= 14 },
  LONG: { label: 'Dài (≥ 15 cú)', test: n => n >= 15 },
};
// A tactic row belongs to the rally that starts within this many seconds of it.
const TACTIC_MATCH_SECONDS = 1.5;

const selectClass =
  'h-8 w-full min-w-0 rounded-md border border-ink/15 bg-sheet px-2 text-xs font-medium text-ink disabled:opacity-50';

export const RalliesExplorer: React.FC<RalliesExplorerProps> = ({
  rallies,
  currentTimeSeconds,
  selectedRallyId,
  playerAName,
  playerBName,
  upperPlayer,
  onPlayRally,
  tacticRallies,
  onPlayPlaylist,
}) => {
  const activeRallyRef = useRef<HTMLButtonElement>(null);
  const [winner, setWinner] = useState<'ALL' | 'UPPER' | 'LOWER'>('ALL');
  const [length, setLength] = useState<LengthFilter>('ALL');
  const [lastStroke, setLastStroke] = useState('ALL');
  const [tactic, setTactic] = useState('ALL');

  // Tactics used in each rally (by either player), keyed by rally id.
  const tacticsByRally = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const row of tacticRallies ?? []) {
      const start = row.rally_start_time_seconds;
      const rally =
        (start != null
          ? rallies.find(r => Math.abs(r.startTime - start) <= TACTIC_MATCH_SECONDS)
          : undefined) ?? rallies.find(r => r.rallyNumber === row.rally_id);
      if (!rally) continue;
      const codes = map.get(rally.id) ?? new Set<string>();
      for (const code of tacticsOf(row)) {
        if (code !== 'short_rally' && code !== 'no_tactic') codes.add(code);
      }
      map.set(rally.id, codes);
    }
    return map;
  }, [tacticRallies, rallies]);

  const lastStrokeOf = (r: RallyData) => r.strokeSequence?.[r.strokeSequence.length - 1];
  const strokeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rallies) {
      const s = lastStrokeOf(r);
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rallies]);
  const tacticOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const codes of tacticsByRally.values()) for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tacticsByRally]);

  const filtering = winner !== 'ALL' || length !== 'ALL' || lastStroke !== 'ALL' || tactic !== 'ALL';
  const shown = useMemo(
    () =>
      rallies.filter(
        r =>
          (winner === 'ALL' || r.winnerSide === winner) &&
          LENGTHS[length].test(r.totalStrokes) &&
          (lastStroke === 'ALL' || lastStrokeOf(r) === lastStroke) &&
          (tactic === 'ALL' || tacticsByRally.get(r.id)?.has(tactic))
      ),
    [rallies, winner, length, lastStroke, tactic, tacticsByRally]
  );
  const resetFilters = () => {
    setWinner('ALL');
    setLength('ALL');
    setLastStroke('ALL');
    setTactic('ALL');
  };

  // Tìm rally đang diễn ra theo thời gian thực của video
  const activeRally = rallies.find(
    (r) => currentTimeSeconds >= r.startTime && currentTimeSeconds <= r.endTime
  );

  // Tự động cuộn theo rally đang phát
  useEffect(() => {
    if (activeRally && activeRallyRef.current) {
      activeRallyRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeRally?.id]);

  const getPlayerNameBySide = (side: string) => {
    if (side === 'UPPER') {
      return upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
    }
    return upperPlayer === 'PLAYER_A' ? playerBName : playerAName;
  };

  const playlistTitle = () => {
    const parts: string[] = [];
    if (winner !== 'ALL') parts.push(`${getPlayerNameBySide(winner)} ghi điểm`);
    if (length !== 'ALL') parts.push(`pha ${LENGTHS[length].label.toLowerCase()}`);
    if (lastStroke !== 'ALL') parts.push(`kết thúc bằng ${strokeLabelLower(lastStroke)}`);
    if (tactic !== 'ALL') parts.push(tacticLabel(tactic));
    return parts.length ? parts.join(', ') : 'Tất cả pha cầu';
  };

  // Scores read from the broadcast scoreboard (OCR) are the real match score;
  // otherwise they are counted from 0-0 at the start of the uploaded video.
  const ocrAnchored = rallies.some((r) => r.winReason?.toLowerCase().startsWith('ocr_confirmed'));
  const scoreTooltip = ocrAnchored
    ? 'Tỉ số đọc từ bảng điểm của video (OCR)'
    : 'Không đọc được bảng điểm: AI tự đếm số pha thắng, tính từ 0-0 ở đầu video, không phải tỉ số thật của trận';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!rallies || rallies.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink/70 space-y-1">
        <p className="text-sm font-medium">Chưa có pha cầu nào</p>
        <p className="text-xs text-ink/65">Các pha cầu sẽ hiện ở đây khi AI phân tích tới.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="space-y-2 pb-3 mb-1 border-b border-ink/10">
        <div className="grid grid-cols-2 gap-1.5">
          <select value={winner} onChange={e => setWinner(e.target.value as typeof winner)} aria-label="Người ghi điểm" className={selectClass}>
            <option value="ALL">Người thắng: bất kỳ</option>
            <option value="UPPER">{getPlayerNameBySide('UPPER')} ghi điểm</option>
            <option value="LOWER">{getPlayerNameBySide('LOWER')} ghi điểm</option>
          </select>
          <select value={length} onChange={e => setLength(e.target.value as LengthFilter)} aria-label="Độ dài pha cầu" className={selectClass}>
            {(Object.keys(LENGTHS) as LengthFilter[]).map(k => (
              <option key={k} value={k}>{LENGTHS[k].label}</option>
            ))}
          </select>
          <select value={lastStroke} onChange={e => setLastStroke(e.target.value)} aria-label="Cú cuối pha" className={selectClass}>
            <option value="ALL">Cú cuối: bất kỳ</option>
            {strokeOptions.map(([code, n]) => (
              <option key={code} value={code}>Cú cuối: {strokeLabelLower(code)} ({n})</option>
            ))}
          </select>
          <select value={tactic} onChange={e => setTactic(e.target.value)} aria-label="Chiến thuật" className={selectClass} disabled={tacticOptions.length === 0}>
            <option value="ALL">Chiến thuật: bất kỳ</option>
            {tacticOptions.map(([code, n]) => (
              <option key={code} value={code}>{tacticLabel(code)} ({n})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/70 tabular-nums flex-1">
            {filtering ? `${shown.length}/${rallies.length} pha khớp` : `${rallies.length} pha cầu`}
          </span>
          {filtering && (
            <button type="button" onClick={resetFilters} className="h-7 px-2 rounded-md text-xs text-ink/70 hover:text-ink hover:bg-ink/[0.04] flex items-center gap-1">
              <X className="w-3 h-3" /> Bỏ lọc
            </button>
          )}
          {onPlayPlaylist && shown.length > 0 && (
            <button
              type="button"
              onClick={() => onPlayPlaylist(playlistTitle(), toPlaylist(shown))}
              className="h-7 px-2.5 rounded-md border border-pitch/30 text-xs font-medium text-pitch hover:bg-pitch-soft flex items-center gap-1.5 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Xem liền {shown.length} pha
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
      {!ocrAnchored && (
        <p className="text-xs text-ink/70 px-1 pb-2" title={scoreTooltip}>
          Không đọc được bảng điểm: tỉ số do AI đếm từ 0–0 ở đầu video.
        </p>
      )}
      <ul className="divide-y divide-ink/10">
        {shown.map((rally) => {
          const isCurrentTimeInRally = activeRally?.id === rally.id;
          const isActive = isCurrentTimeInRally || selectedRallyId === rally.id;
          const winnerName = getPlayerNameBySide(rally.winnerSide);
          const lastStroke = rally.strokeSequence?.[rally.strokeSequence.length - 1];

          return (
            <li key={rally.id}>
              <button
                type="button"
                ref={isCurrentTimeInRally ? activeRallyRef : null}
                onClick={() => onPlayRally(rally)}
                aria-current={isCurrentTimeInRally ? 'true' : undefined}
                className={`w-full text-left flex items-center gap-3 px-2 py-2.5 rounded-md transition-colors group ${
                  isActive ? 'bg-pitch-soft' : 'hover:bg-ink/[0.04]'
                }`}
              >
                <span
                  className={`w-1 self-stretch rounded-full ${rally.winnerSide === 'UPPER' ? 'bg-pa' : 'bg-pb'}`}
                  aria-hidden
                />
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="text-xs text-ink/65 tabular-nums w-10 shrink-0">Pha {rally.rallyNumber}</span>
                    <span className="text-sm font-semibold text-ink truncate">{winnerName} ghi điểm</span>
                  </span>
                  <span className="flex items-baseline gap-2 text-xs text-ink/70">
                    <span className="w-10 shrink-0 tabular-nums">{formatTime(rally.startTime)}</span>
                    <span className="truncate">
                      {rally.totalStrokes} cú
                      {lastStroke && <>, cuối: {strokeLabelLower(lastStroke)}</>}
                    </span>
                  </span>
                </span>
                <span className="font-score text-lg font-semibold tabular-nums text-ink shrink-0" title={scoreTooltip}>
                  {rally.scoreText || `${rally.scoreUpper}-${rally.scoreLower}`}
                </span>
                <Play
                  className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-pitch fill-pitch' : 'text-ink/25 group-hover:text-pitch'}`}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && (
        <p className="text-xs text-ink/70 text-center py-8">Không có pha nào khớp bộ lọc.</p>
      )}
      </div>
    </div>
  );
};
