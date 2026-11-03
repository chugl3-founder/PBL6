import React, { useState } from 'react';
import { Target, Play } from 'lucide-react';

interface TacticInterval {
  start_ball_round: number;
  end_ball_round: number;
  start_time_seconds?: number | null;
  end_time_seconds?: number | null;
}

interface TacticRally {
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

const TACTIC_META: Record<string, { label: string; color: string }> = {
  full_court_pressure: { label: 'Ép toàn sân (Full-Court Pressure)', color: '#ef4444' },
  defensive_counterattack: { label: 'Phòng thủ phản công (Defensive Counterattack)', color: '#a855f7' },
  four_corner: { label: 'Điều cầu 4 góc (Four-Corner)', color: '#06b6d4' },
  no_tactic: { label: 'Không rõ chiến thuật', color: '#6b7280' }
};

// Left/right follow the camera view: player handedness is unknown.
const SUBTACTIC_LABELS: Record<string, string> = {
  left_side_lock: 'Khóa cánh trái (theo camera)',
  right_side_lock: 'Khóa cánh phải (theo camera)',
  front_court_lock: 'Khóa sân trước',
  back_court_lock: 'Khóa sân sau',
  four_corner_clear_drop: 'Phông - bỏ 4 góc'
};

const formatClock = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Start a little before the tactic's first shot so the viewer sees the build-up.
const TACTIC_SEEK_LEAD_SECONDS = 1.5;

const tacticSeekTime = (rally: TacticRally): number | null => {
  const shownTactic =
    rally.primary_tactic === 'four_corner' && rally.four_corner_subtactic
      ? rally.four_corner_subtactic
      : rally.primary_tactic;
  const primary = rally.detected_tactics?.find((t) => t.type === shownTactic);
  const start = primary?.intervals?.[0]?.start_time_seconds ?? rally.rally_start_time_seconds;
  return start == null ? null : Math.max(0, start - TACTIC_SEEK_LEAD_SECONDS);
};

const shortLabel = (code: string) => TACTIC_META[code]?.label.split(' (')[0] ?? code;

export const TacticsBreakdown: React.FC<TacticsBreakdownProps> = ({
  tactics,
  playerAName,
  playerBName,
  upperPlayer = 'PLAYER_A',
  compact = false,
  onSeekTime
}) => {
  const [tacticFilter, setTacticFilter] = useState<string>('full_court_pressure');

  const nameBySide = (side: string) =>
    (side === 'upper') === (upperPlayer === 'PLAYER_A') ? playerAName : playerBName;

  const players = (['upper', 'lower'] as const)
    .map((side) => {
      const counts = tactics?.usage_by_player?.[side] || {};
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      return {
        side,
        counts,
        total,
        effectiveness: tactics?.effectiveness_by_player?.[side] || {},
        subtactics: tactics?.four_corner_subtactic_usage?.[side] || {}
      };
    })
    .filter((p) => p.total > 0);

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-white/50 space-y-2">
        <Target className="w-10 h-10 text-white/20 mb-1" />
        <p className="text-xs font-semibold">Trận này chưa có dữ liệu chiến thuật</p>
        <p className="text-[11px] text-white/40">Chạy lại phân tích AI để nhận diện chiến thuật CoachAI+.</p>
      </div>
    );
  }

  const tacticRallies = (tactics?.rallies || []).filter((r) => r.primary_tactic === tacticFilter);

  // Danh sách pha cầu theo chiến thuật, bấm để tua video
  const rallyList = (
    <div>
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px] flex-wrap mb-2.5">
        {Object.keys(TACTIC_META).filter((code) => code !== 'no_tactic').map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setTacticFilter(code)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              tacticFilter === code ? 'bg-white/10 text-white border border-white/15' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {shortLabel(code)}
          </button>
        ))}
      </div>

      {tacticRallies.length === 0 ? (
        <p className="text-[11px] text-white/40 px-1">Không có pha cầu nào dùng chiến thuật này.</p>
      ) : (
        <div className={`space-y-1.5 overflow-y-auto pr-1 scrollbar-thin ${compact ? 'max-h-56' : 'max-h-64'}`}>
          {tacticRallies.map((rally) => {
            const seekAt = tacticSeekTime(rally);
            return (
              <div
                key={`${rally.rally_id}-${rally.player}`}
                className="flex items-center gap-2 p-2 px-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] min-w-0"
              >
                <span className="font-mono font-bold text-white/70 shrink-0">#{rally.rally_id}</span>
                <span className={`font-bold truncate ${rally.player === 'upper' ? 'text-sky-300' : 'text-amber-300'}`}>
                  {nameBySide(rally.player)}
                </span>
                {!compact && rally.four_corner_subtactic && rally.primary_tactic === 'four_corner' && (
                  <span className="text-cyan-300/70 truncate hidden sm:inline">
                    {SUBTACTIC_LABELS[rally.four_corner_subtactic]}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2 shrink-0">
                  {rally.won != null && (
                    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${
                      rally.won
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {rally.won ? 'Thắng' : 'Thua'}
                    </span>
                  )}
                  {onSeekTime && seekAt != null && (
                    <button
                      type="button"
                      onClick={() => onSeekTime(seekAt, `Pha #${rally.rally_id}: ${shortLabel(rally.primary_tactic)}`)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand/15 border border-brand/30 text-sky-300 font-bold hover:bg-brand/25 transition-colors"
                      title="Tua video tới đoạn chiến thuật"
                    >
                      <Play className="w-3 h-3" />
                      {formatClock(seekAt)}
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const playerCards = (
    <div className={`grid ${compact ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
      {players.map(({ side, counts, total, effectiveness, subtactics }) => {
        const topSubtactic = Object.entries(subtactics).sort((a, b) => b[1] - a[1])[0];
        return (
          <div key={side} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 min-w-0">
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <span className={`text-xs font-bold truncate ${side === 'upper' ? 'text-sky-300' : 'text-amber-300'}`}>
                {nameBySide(side)}
              </span>
              <span className="text-[10px] text-white/50 shrink-0">{total} rally</span>
            </div>
            <div className="space-y-2.5">
              {Object.keys(TACTIC_META).map((code) => {
                const count = counts[code] || 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                const { label, color } = TACTIC_META[code];
                const eff = effectiveness[code];
                return (
                  <div key={code}>
                    <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                      <span className="text-white/80 truncate">{compact ? shortLabel(code) : label}</span>
                      <span className="font-mono text-white/70 shrink-0">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    {eff && eff.uses > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-white/50 mt-1 gap-2">
                        <span>
                          Thắng{' '}
                          <span className={`font-mono font-bold ${
                            eff.win_rate == null ? 'text-white/50'
                              : eff.win_rate >= 0.5 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {eff.win_rate == null ? '—' : `${Math.round(eff.win_rate * 100)}%`}
                          </span>
                          {eff.decided_rallies > 0 && ` (${eff.wins}/${eff.decided_rallies})`}
                        </span>
                        <span>TB {eff.avg_rally_length.toFixed(1)} cú/rally</span>
                      </div>
                    )}
                    {code === 'four_corner' && topSubtactic && (
                      <div className="text-[10px] text-cyan-300/80 mt-0.5">
                        Chủ yếu: {SUBTACTIC_LABELS[topSubtactic[0]] || topSubtactic[0]} ({topSubtactic[1]} rally)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`${compact ? 'p-3' : 'p-5'} rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
      <div className="flex items-center gap-2 mb-3.5">
        <Target className="w-4 h-4 text-rose-400 shrink-0" />
        <h3 className="font-bold text-xs lg:text-sm text-white">
          Chiến thuật chủ đạo & hiệu quả (CoachAI+)
        </h3>
      </div>

      {(compact ? [rallyList, playerCards] : [playerCards, rallyList]).map((block, idx) => (
        <div key={idx} className={idx === 0 ? 'mb-4' : ''}>{block}</div>
      ))}

      <p className="mt-3 text-[10px] text-white/40 leading-relaxed">
        Ước lượng theo luật CoachAI+; điểm rơi cầu là xấp xỉ từ video 2-D, chưa phải nhãn chuyên gia.
        Tỉ lệ thắng chỉ tính các pha đã xác định được người thắng.
      </p>
    </div>
  );
};
