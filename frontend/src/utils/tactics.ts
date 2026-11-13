/** The AI's tactic detection per rally (structured_tactics) and plain names for each tactic. */

export interface TacticInterval {
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

export interface TacticEffectiveness {
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

/**
 * Plain names and one-line meanings. Four-Corner rallies are shown by their
 * sub-pattern (back-court lock, ...), which says more than "four corners".
 * Left/right follow the camera view: player handedness is unknown.
 */
export const TACTICS: Record<string, { label: string; hint: string; color: string }> = {
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
export const NEUTRAL = new Set(['short_rally', 'no_tactic']);

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
