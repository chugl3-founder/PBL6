import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Minus, PlayCircle, Swords, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchTrainingFocus, replayPath, type TrainingFocus, type TrainingFocusData, type TrainingTrend } from '../../api/players';
import { isSignedIn } from '../../auth/session';
import { askCoach, exploitWeaknessPrompt } from '../../utils/coachEvents';
import { Notice } from '../ui/Notice';
import { formatDate } from '../../utils/playerProfile';
import { strokeLabelLower } from '../../utils/strokeLabels';

const TREND: Record<TrainingTrend, { label: string; className: string; icon: React.FC<{ className?: string }> }> = {
  // Fewer points lost this way in the latest match: the weakness is closing, so the arrow points down.
  IMPROVING: { label: 'Đang khắc phục', className: 'bg-pitch-soft text-pitch-deep', icon: TrendingDown },
  WORSENING: { label: 'Lộ rõ hơn', className: 'bg-loss/10 text-loss', icon: TrendingUp },
  STABLE: { label: 'Ổn định', className: 'bg-ink/[0.06] text-ink/70', icon: Minus },
  NOT_ENOUGH_DATA: { label: 'Chưa đủ trận', className: 'bg-ink/[0.04] text-ink/55', icon: Minus },
};

const focusTitle = (f: TrainingFocus) =>
  f.kind === 'ERROR'
    ? `Mất điểm sau cú ${strokeLabelLower(f.stroke)} của mình`
    : `Bị đối thủ ghi điểm bằng cú ${strokeLabelLower(f.stroke)}`;

const focusHint = (f: TrainingFocus) =>
  f.kind === 'ERROR'
    ? 'Cú cuối pha là của VĐV mà vẫn mất điểm: thường là cầu ra ngoài hoặc chạm lưới, nên hãy ép VĐV phải đánh cú này'
    : 'Cú dứt điểm của đối thủ: VĐV khó chống đỡ cú này, nên hãy tạo cơ hội để tung ra nó';

/** Share of each match's lost points that went this way, oldest match first. */
const RateBars: React.FC<{ focus: TrainingFocus }> = ({ focus }) => {
  const points = focus.matches;
  if (points.length === 0) return null;
  const W = 220;
  const H = 56;
  const gap = 4;
  const barW = Math.max(6, Math.min(28, (W - gap * (points.length - 1)) / points.length));
  const max = Math.max(50, ...points.map(p => p.rate ?? 0));
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full max-w-[260px] h-auto" role="img"
      aria-label={`Tỉ lệ điểm mất theo từng trận: ${points.map(p => (p.rate == null ? 'chưa đủ' : `${p.rate}%`)).join(', ')}`}>
      {points.map((p, i) => {
        const x = i * (barW + gap);
        const h = p.rate == null ? 2 : Math.max(2, (H * p.rate) / max);
        const last = i === points.length - 1;
        return (
          <g key={p.matchId}>
            <title>{`${formatDate(p.matchDate)} gặp ${p.opponent}: ${p.count}/${p.lost} điểm mất${p.rate == null ? '' : ` (${p.rate}%)`}`}</title>
            <rect x={x} y={H - h} width={barW} height={h} rx={2}
              fill={p.rate == null ? '#16201B' : last ? '#C2413A' : '#16201B'}
              fillOpacity={p.rate == null ? 0.12 : last ? 0.85 : 0.28} />
            {p.rate != null && (
              <text x={x + barW / 2} y={H + 11} textAnchor="middle" fontSize={9} fill="#16201B" fillOpacity={last ? 0.85 : 0.5}>
                {p.rate}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/**
 * "Điểm yếu": the player's main ways of losing points across their matches and how each moved, read by
 * someone preparing to face them (or following their form); the matches are broadcast pro matches.
 */
export const TrainingFocusPanel: React.FC<{ name: string }> = ({ name }) => {
  const [data, setData] = useState<TrainingFocusData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    fetchTrainingFocus(name)
      .then(d => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (failed) {
    return (
      <Notice tone="error" action={{ label: 'Tải lại', onClick: () => window.location.reload() }}>
        Không tải được dữ liệu điểm yếu.
      </Notice>
    );
  }
  if (!data) return <div className="h-40 rounded-lg bg-ink/[0.04] animate-pulse" />;

  if (data.focuses.length === 0) {
    return (
      <p className="text-sm text-ink/70 py-6 text-center">
        Chưa đủ pha mất điểm đã xác định để rút ra điểm yếu của {data.player}.
      </p>
    );
  }

  const covered = data.focuses.reduce((n, f) => n + f.count, 0);
  const signedIn = isSignedIn();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink/[0.03] border border-ink/10 px-4 py-3">
        <p className="text-sm text-ink/80">
          {data.player} mất <b className="text-ink">{data.pointsLost}</b> điểm trong {data.matchesAnalyzed} trận.{' '}
          {data.focuses.length} điểm yếu dưới đây chiếm{' '}
          <b className="text-loss">{Math.round((100 * covered) / Math.max(1, data.pointsLost))}%</b> số điểm mất.
        </p>
        {signedIn ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => askCoach(exploitWeaknessPrompt(data.player))}
              className="h-9 px-4 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-ink/90 flex items-center gap-1.5 transition-colors"
            >
              <Swords className="w-4 h-4" />
              Hỏi HLV AI cách khai thác
            </button>
            <Link
              to={`/scouting?opponent=${encodeURIComponent(data.player)}`}
              className="h-9 px-4 rounded-lg border border-ink/15 text-ink text-xs font-semibold hover:border-pitch hover:text-pitch-deep flex items-center gap-1.5 transition-colors"
            >
              <Crosshair className="w-4 h-4" />
              Lập báo cáo trinh sát
            </Link>
          </div>
        ) : (
          <Link to="/login" className="text-xs font-semibold text-pitch hover:text-pitch-deep">
            Đăng nhập để hỏi HLV AI cách khai thác
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {data.focuses.map((f, idx) => {
          const trend = TREND[f.trend];
          const TrendIcon = trend.icon;
          return (
            <article key={f.key} className="rounded-xl border border-ink/10 bg-sheet p-4 flex flex-col gap-3">
              <header className="flex items-start gap-3">
                <span className="font-score text-3xl font-bold text-loss leading-none tabular-nums shrink-0">{f.share}%</span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-ink/50 font-semibold">Ưu tiên {idx + 1}</p>
                  <h3 className="text-sm font-bold text-ink leading-snug">{focusTitle(f)}</h3>
                </div>
              </header>
              <p className="text-xs text-ink/65 leading-relaxed">{focusHint(f)}. {f.count} điểm mất.</p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend.className}`}>
                  <TrendIcon className="w-3 h-3" />
                  {trend.label}
                </span>
                {f.baselineRate != null && f.latestRate != null && (
                  <span className="text-[11px] text-ink/65 tabular-nums">
                    các trận trước {f.baselineRate}% → trận gần nhất {f.latestRate}%
                  </span>
                )}
              </div>

              <RateBars focus={f} />

              {f.clips.length > 0 && (
                <div className="mt-auto pt-2 border-t border-ink/10">
                  <p className="text-[11px] text-ink/55 mb-1.5">Xem lại vài pha tiêu biểu</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.clips.map(c => (
                      <Link
                        key={`${c.matchId}-${c.seconds}`}
                        to={`${replayPath(c)}?t=${Math.max(0, Math.floor(c.seconds) - 2)}`}
                        title={`Trận gặp ${c.opponent}`}
                        className="inline-flex items-center gap-1 rounded-md border border-pitch/30 px-1.5 py-0.5 text-[11px] text-pitch hover:bg-pitch-soft tabular-nums"
                      >
                        <PlayCircle className="w-3 h-3" />
                        #{c.matchId} · {Math.floor(c.seconds / 60)}:{String(Math.floor(c.seconds % 60)).padStart(2, '0')}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="text-xs text-ink/60 leading-relaxed">
        Mỗi cột là một trận (cũ → mới, cột đỏ là trận gần nhất): phần trăm điểm mất theo cách này. Cột cao dần là điểm yếu đang lộ rõ hơn.
        AI gom nhóm theo cú cuối của pha cầu và đôi khi sót cú hỏng, nên hãy xem clip để xác nhận.
      </p>
    </div>
  );
};
