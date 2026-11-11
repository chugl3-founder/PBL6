import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';

interface TacticInterval {
  start_ball_round: number;
  end_ball_round: number;
  start_time_seconds?: number | null;
  end_time_seconds?: number | null;
}

export interface TacticRally {
  rally_id: number;
  player: 'upper' | 'lower';
  primary_tactic: string;
  primary_tactic_label: string;
  detected_tactics?: Array<{ type: string; intervals?: TacticInterval[] }>;
  four_corner_subtactic?: string | null;
  rally_length?: number;
  rally_start_time_seconds?: number | null;
  won?: boolean | null;
}

interface TacticEffectiveness {
  uses: number;
  decided_rallies: number;
  wins: number;
  win_rate: number | null;
  avg_rally_length: number;
}

export interface StructuredTacticsData {
  rallies?: TacticRally[];
  usage_by_player?: Record<string, Record<string, number>>;
  effectiveness_by_player?: Record<string, Record<string, TacticEffectiveness>>;
  four_corner_subtactic_usage?: Record<string, Record<string, number>>;
  limitations?: string[];
}

interface TacticsBreakdownProps {
  tactics?: StructuredTacticsData | null;
  playerAName: string;
  playerBName: string;
  /** Which player stands on the upper half of the video ('PLAYER_A' | 'PLAYER_B'). */
  upperPlayer?: string;
  compact?: boolean;
  /** Seek the replay video; enables "watch" buttons on tactic rallies. */
  onSeekTime?: (seconds: number, label: string) => void;
}

/**
 * Plain names and one-line meanings. Four-Corner rallies are shown by their
 * sub-pattern (back-court lock, ...), which says more than "four corners".
 * Left/right follow the camera view: player handedness is unknown.
 */
const TACTICS: Record<string, { label: string; hint: string; color: string }> = {
  full_court_pressure: { label: 'Ép toàn sân', hint: 'Liên tục đập, chặn lưới, bỏ nhỏ để dồn đối thủ', color: '#C2413A' },
  defensive_counterattack: { label: 'Phòng thủ phản công', hint: 'Đỡ được cú đập rồi đánh trả tấn công', color: '#7A4FB5' },
  net_control: { label: 'Khống chế lưới', hint: 'Giữ cầu ngắn sát lưới, buộc đối thủ nâng cầu', color: '#2E7D5B' },
  early_attack: { label: 'Tấn công ngay đầu pha', hint: 'Đập hoặc chặn lưới ngay cú trả giao cầu hay cú thứ ba', color: '#B5475F' },
  back_court_lock: { label: 'Dồn về cuối sân', hint: 'Đưa cầu sâu liên tục về cuối sân đối thủ', color: '#2B59C3' },
  front_court_lock: { label: 'Dồn lên lưới', hint: 'Đưa cầu rơi liên tục ở nửa sân trước', color: '#3A8FA3' },
  left_side_lock: { label: 'Dồn một cánh (trái)', hint: 'Đánh liên tục vào cánh trái, nhìn theo camera', color: '#5B6FB0' },
  right_side_lock: { label: 'Dồn một cánh (phải)', hint: 'Đánh liên tục vào cánh phải, nhìn theo camera', color: '#5B6FB0' },
  four_corner_clear_drop: { label: 'Điều cầu 4 góc', hint: 'Đổi góc liên tục: phông sâu rồi bỏ ngắn', color: '#2F8F8A' },
  absorb_pressure: { label: 'Chịu đòn chờ sai', hint: 'Đỡ liền nhiều cú đập, chặn mà không vội phản công, chờ đối thủ sai', color: '#6B7F3A' },
  run_opponent: { label: 'Kéo đối thủ chạy', hint: 'Buộc đối thủ chạy trên 3 m giữa các cú, nhiều lần liền', color: '#8A4F7D' },
  four_corner: { label: 'Điều cầu 4 góc', hint: 'Đổi góc liên tục', color: '#2F8F8A' },
  short_rally: { label: 'Pha ngắn', hint: 'Đánh 1–2 cú, chưa đủ để có chiến thuật', color: '#9AA59F' },
  no_tactic: { label: 'Giằng co, chưa rõ ý đồ', hint: 'Không khớp kiểu chiến thuật nào', color: '#9AA59F' },
};

/** Tactics without a pattern sink to the end of every list. */
const NEUTRAL = new Set(['short_rally', 'no_tactic']);

export const tacticLabel = (code: string) => TACTICS[code]?.label ?? code;

/**
 * Every tactic a player used in a rally (a rally can hold several). The umbrella
 * "four corners" is left out because its sub-patterns are listed themselves; a
 * rally with nothing detected keeps its neutral label (short rally / no pattern).
 */
export const tacticsOf = (rally: TacticRally): string[] => {
  const used = [...new Set((rally.detected_tactics || []).map((t) => t.type))].filter(
    (code) => code !== 'four_corner'
  );
  if (used.length > 0) return used;
  return [rally.primary_tactic === 'four_corner' && rally.four_corner_subtactic
    ? rally.four_corner_subtactic
    : rally.primary_tactic];
};

const formatClock = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Start a little before the tactic's first shot so the viewer sees the build-up.
const TACTIC_SEEK_LEAD_SECONDS = 1.5;

const tacticSeekTime = (rally: TacticRally, code: string): number | null => {
  const detected = rally.detected_tactics?.find((t) => t.type === code);
  const start = detected?.intervals?.[0]?.start_time_seconds ?? rally.rally_start_time_seconds;
  return start == null ? null : Math.max(0, start - TACTIC_SEEK_LEAD_SECONDS);
};

interface TacticSummary {
  code: string;
  uses: number;
  decided: number;
  wins: number;
}

/** Usage and wins per shown tactic, most used first, neutral labels last. */
const summarise = (rallies: TacticRally[]): TacticSummary[] => {
  const byCode = new Map<string, TacticSummary>();
  for (const rally of rallies) {
    for (const code of tacticsOf(rally)) {
      const row = byCode.get(code) ?? { code, uses: 0, decided: 0, wins: 0 };
      row.uses += 1;
      if (rally.won != null) {
        row.decided += 1;
        row.wins += rally.won ? 1 : 0;
      }
      byCode.set(code, row);
    }
  }
  return [...byCode.values()].sort(
    (a, b) => Number(NEUTRAL.has(a.code)) - Number(NEUTRAL.has(b.code)) || b.uses - a.uses
  );
};

export const TacticsBreakdown: React.FC<TacticsBreakdownProps> = ({
  tactics,
  playerAName,
  playerBName,
  upperPlayer = 'PLAYER_A',
  compact = false,
  onSeekTime
}) => {
  const rallies = tactics?.rallies || [];
  const overall = useMemo(() => summarise(rallies), [rallies]);
  const patterned = overall.filter((row) => !NEUTRAL.has(row.code));
  const [chosen, setChosen] = useState<string | null>(null);
  const [showAllChips, setShowAllChips] = useState(false);
  const filter = chosen ?? patterned[0]?.code ?? overall[0]?.code ?? null;

  const nameBySide = (side: string) =>
    (side === 'upper') === (upperPlayer === 'PLAYER_A') ? playerAName : playerBName;

  if (rallies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-ink/55 space-y-1">
        <p className="text-sm font-medium">Trận này chưa có dữ liệu chiến thuật</p>
        <p className="text-xs text-ink/50">Phân tích lại trận để AI nhận diện chiến thuật.</p>
      </div>
    );
  }

  const players = (['upper', 'lower'] as const)
    .map((side) => {
      const own = rallies.filter((r) => r.player === side);
      return { side, rallyCount: own.length, rows: summarise(own) };
    })
    .filter((p) => p.rows.length > 0);

  const filteredRallies = rallies.filter((r) => filter != null && tacticsOf(r).includes(filter));

  // Only the most used tactics get a chip; the rest sit behind "Thêm". A chosen tactic
  // from the hidden part stays visible after collapsing.
  const MAX_CHIPS = 6;
  const visibleChips = showAllChips
    ? overall
    : overall.filter((row, index) => index < MAX_CHIPS || row.code === filter);
  const hiddenChipCount = showAllChips ? overall.length - MAX_CHIPS : overall.length - visibleChips.length;

  const playerCards = (
    <div className={`grid ${compact ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
      {players.map(({ side, rallyCount, rows }) => {
        const total = rallyCount;
        return (
          <div key={side} className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1 h-4 rounded-full ${side === 'upper' ? 'bg-pa' : 'bg-pb'}`} aria-hidden />
              <span className="text-sm font-semibold text-ink truncate">{nameBySide(side)}</span>
              <span className="text-xs text-ink/50 shrink-0 ml-auto">{total} pha</span>
            </div>
            <ul className="space-y-2">
              {rows.map((row) => {
                const pct = (row.uses / total) * 100;
                const meta = TACTICS[row.code];
                return (
                  <li key={row.code} title={meta?.hint}>
                    <div className="flex items-baseline justify-between text-xs gap-2 mb-1">
                      <span className={NEUTRAL.has(row.code) ? 'text-ink/50 truncate' : 'text-ink/80 truncate'}>
                        {tacticLabel(row.code)}
                      </span>
                      <span className="tabular-nums text-ink/60 shrink-0">
                        {row.uses} pha
                        {row.decided > 0 && !NEUTRAL.has(row.code) && (
                          <span className="text-ink/45">, thắng {row.wins}/{row.decided}</span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta?.color ?? '#9AA59F' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  const rallyList = (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2.5" role="tablist" aria-label="Chọn chiến thuật">
        {visibleChips.map((row) => (
          <button
            key={row.code}
            type="button"
            role="tab"
            aria-selected={filter === row.code}
            onClick={() => setChosen(row.code)}
            title={TACTICS[row.code]?.hint}
            className={`px-2.5 h-7 rounded-md border text-xs transition-colors ${
              filter === row.code
                ? 'bg-pitch text-white border-pitch'
                : 'bg-sheet text-ink/70 border-ink/15 hover:border-ink/30'
            }`}
          >
            {tacticLabel(row.code)} <span className="tabular-nums opacity-70">{row.uses}</span>
          </button>
        ))}
        {hiddenChipCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllChips((v) => !v)}
            aria-expanded={showAllChips}
            className="px-2.5 h-7 rounded-md text-xs font-medium text-pitch-deep hover:bg-pitch-soft transition-colors"
          >
            {showAllChips ? 'Thu gọn' : `Thêm ${hiddenChipCount}`}
          </button>
        )}
      </div>

      {filter && TACTICS[filter] && (
        <p className="text-xs text-ink/55 mb-2">
          {TACTICS[filter].hint}.
        </p>
      )}

      <ul className={`divide-y divide-ink/10 overflow-y-auto pr-1 scrollbar-thin ${compact ? 'max-h-56' : 'max-h-64'}`}>
        {filteredRallies.map((rally) => {
          const seekAt = filter ? tacticSeekTime(rally, filter) : null;
          return (
            <li key={`${rally.rally_id}-${rally.player}`} className="flex items-center gap-2 py-2 text-xs min-w-0">
              <span className={`w-1 h-4 rounded-full shrink-0 ${rally.player === 'upper' ? 'bg-pa' : 'bg-pb'}`} aria-hidden />
              <span className="text-ink/50 tabular-nums shrink-0">Pha {rally.rally_id}</span>
              <span className="font-medium text-ink truncate">{nameBySide(rally.player)}</span>
              <span className="ml-auto flex items-center gap-2 shrink-0">
                {rally.won != null && (
                  <span className={rally.won ? 'text-pitch font-medium' : 'text-loss font-medium'}>
                    {rally.won ? 'Thắng' : 'Thua'}
                  </span>
                )}
                {onSeekTime && seekAt != null && (
                  <button
                    type="button"
                    onClick={() => onSeekTime(seekAt, `Pha ${rally.rally_id}: ${tacticLabel(filter ?? '')}`)}
                    className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-pitch-deep hover:bg-pitch-soft transition-colors tabular-nums"
                    title="Tua video tới đoạn này"
                  >
                    <Play className="w-3 h-3" />
                    {formatClock(seekAt)}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className={`${compact ? 'p-3' : 'p-5'} rounded-lg bg-sheet border border-ink/10`}>
      <h3 className="font-semibold text-sm text-ink mb-3">Chiến thuật của từng người</h3>

      {(compact ? [rallyList, playerCards] : [playerCards, rallyList]).map((block, idx) => (
        <div key={idx} className={idx === 0 ? 'mb-5' : ''}>{block}</div>
      ))}

      <p className="mt-4 text-[11px] text-ink/50 leading-relaxed">
        Một pha có thể dùng nhiều chiến thuật nên tổng có thể vượt số pha. AI ước lượng từ chuỗi cú đánh, nhịp cầu, vị trí người chơi và điểm rơi cầu, chưa phải nhận định của chuyên gia. Thắng/thua chỉ tính các pha xác định được người thắng.
      </p>
    </div>
  );
};
