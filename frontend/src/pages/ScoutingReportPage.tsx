import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle, ArrowLeft, Check, Copy, Crosshair, Gauge, Link2, Link2Off, Loader2, NotebookPen,
  PlayCircle, Printer, RefreshCw, ShieldAlert, Swords, Target, Timer, Trash2, Wand2,
} from 'lucide-react';
import {
  clipPath, deleteReport, getReport, getSharedReport, regenerateReport, shareReport, sharedReportUrl,
  unshareReport, updateReport, type KeyCategory, type ScoutingReport,
} from '../api/scouting';
import { playerPath } from '../api/players';
import { PlayerMonogram } from '../components/player/PlayerMonogram';
import { PlayerRadarChart } from '../components/player/PlayerRadarChart';
import { ScoutingCourt } from '../components/player/ScoutingCourt';
import { RALLY_BUCKETS, formatDate, hasRadar, playstyleLabel, winRate } from '../utils/playerProfile';
import { strokeLabel } from '../utils/strokeLabels';

const OPP = '#C9701F';
const OWN = '#2E7D5B';

const CATEGORY: Record<KeyCategory, { label: string; icon: React.FC<{ className?: string }>; tone: string; bar: string }> = {
  TARGET: { label: 'Đánh vào', icon: Target, tone: 'bg-pitch-soft text-pitch-deep', bar: 'bg-pitch' },
  EXPLOIT: { label: 'Khai thác', icon: Wand2, tone: 'bg-pitch-soft text-pitch-deep', bar: 'bg-pitch' },
  THREAT: { label: 'Phòng bị', icon: ShieldAlert, tone: 'bg-loss/10 text-loss', bar: 'bg-loss' },
  TEMPO: { label: 'Nhịp độ', icon: Timer, tone: 'bg-pa/10 text-pa', bar: 'bg-pa' },
  STYLE: { label: 'Lối chơi', icon: Gauge, tone: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
};

const QUALITY = {
  HIGH: { label: 'Dữ liệu tốt', tone: 'bg-emerald-400/15 text-emerald-300 border-emerald-300/30' },
  MEDIUM: { label: 'Dữ liệu vừa đủ', tone: 'bg-amber-300/15 text-amber-200 border-amber-200/30' },
  LOW: { label: 'Ít dữ liệu', tone: 'bg-rose-400/15 text-rose-200 border-rose-200/30' },
};

const Card: React.FC<{ icon: React.FC<{ className?: string }>; title: string; subtitle?: string; className?: string; children: React.ReactNode }> = ({
  icon: Icon, title, subtitle, className = '', children,
}) => (
  <section className={`rounded-xl bg-sheet border border-ink/10 p-5 sm:p-6 break-inside-avoid ${className}`}>
    <header className="flex items-start gap-3 mb-4">
      <span className="mt-0.5 w-8 h-8 rounded-lg bg-pitch-soft text-pitch-deep flex items-center justify-center shrink-0 print:hidden">
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <h2 className="text-base font-bold text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-ink/70 mt-0.5">{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
);

export const ScoutingReportPage: React.FC = () => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'regen' | 'share' | 'delete' | null>(null);
  const [notes, setNotes] = useState('');
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [copied, setCopied] = useState(false);
  const savedNotes = useRef('');

  useEffect(() => {
    let cancelled = false;
    (token ? getSharedReport(token) : getReport(id!))
      .then(r => {
        if (cancelled) return;
        setReport(r);
        setNotes(r.coachNotes ?? '');
        savedNotes.current = r.coachNotes ?? '';
      })
      .catch(err => {
        if (!cancelled) setError(axios.isAxiosError(err) && err.response?.status === 404 ? 'Không tìm thấy báo cáo, hoặc link chia sẻ đã bị tắt.' : 'Không tải được báo cáo.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  useEffect(() => {
    if (report) document.title = `${report.title} · Trinh sát`;
  }, [report]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center font-vn space-y-4">
        <AlertTriangle className="w-8 h-8 mx-auto text-ink/30" />
        <p className="text-ink/70">{error}</p>
        {!token && (
          <Link to="/scouting" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pitch">
            <ArrowLeft className="w-4 h-4" /> Danh sách báo cáo
          </Link>
        )}
      </div>
    );
  }
  if (!report?.plan) {
    return (
      <div className="max-w-5xl mx-auto space-y-5" aria-busy="true">
        <div className="h-56 rounded-2xl bg-ink/90 animate-pulse" />
        <div className="h-96 rounded-xl bg-sheet border border-ink/10 animate-pulse" />
      </div>
    );
  }

  const { plan } = report;
  const opp = plan.opponent;
  const own = plan.ownPlayer;
  const isOwner = report.owner;
  const quality = QUALITY[plan.quality.level];
  const oppRate = winRate(opp.ralliesWon, opp.ralliesLost);

  const run = async (kind: 'regen' | 'share', action: () => Promise<ScoutingReport>) => {
    setBusy(kind);
    try {
      const updated = await action();
      setReport(updated);
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async () => {
    if (!isOwner || notes === savedNotes.current) return;
    setNotesState('saving');
    try {
      await updateReport(report.id, { coachNotes: notes });
      savedNotes.current = notes;
      setNotesState('saved');
      setTimeout(() => setNotesState('idle'), 2000);
    } catch {
      setNotesState('idle');
    }
  };

  const copyLink = async () => {
    if (!report.shareToken) return;
    await navigator.clipboard.writeText(sharedReportUrl(report.shareToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remove = async () => {
    if (!window.confirm('Xoá báo cáo này? Link chia sẻ (nếu có) cũng ngừng hoạt động.')) return;
    setBusy('delete');
    await deleteReport(report.id);
    navigate('/scouting');
  };

  const btn = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50';

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16 font-vn print:max-w-none print:pb-0">
      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/scouting" className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink">
            <ArrowLeft className="w-4 h-4" /> Báo cáo trinh sát
          </Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy != null} onClick={() => run('regen', () => regenerateReport(report.id))}
              className={`${btn} border border-ink/15 bg-sheet text-ink hover:border-ink/30`} title="Lập lại kế hoạch từ dữ liệu mới nhất; ghi chú được giữ nguyên">
              <RefreshCw className={`w-4 h-4 ${busy === 'regen' ? 'animate-spin' : ''}`} /> Cập nhật số liệu
            </button>
            <button type="button" onClick={() => window.print()} className={`${btn} border border-ink/15 bg-sheet text-ink hover:border-ink/30`}>
              <Printer className="w-4 h-4" /> In / PDF
            </button>
            {report.shareToken ? (
              <button type="button" disabled={busy != null} onClick={() => run('share', () => unshareReport(report.id))}
                className={`${btn} border border-ink/15 bg-sheet text-ink hover:border-loss/40 hover:text-loss`}>
                <Link2Off className="w-4 h-4" /> Tắt chia sẻ
              </button>
            ) : (
              <button type="button" disabled={busy != null} onClick={() => run('share', () => shareReport(report.id))}
                className={`${btn} bg-pitch text-white hover:bg-pitch-deep`}>
                {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Chia sẻ
              </button>
            )}
            <button type="button" disabled={busy != null} onClick={remove} className={`${btn} text-ink/65 hover:text-loss hover:bg-loss/5`} aria-label="Xoá báo cáo">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isOwner && report.shareToken && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-pa/25 bg-pa/5 px-3 py-2 print:hidden">
          <Link2 className="w-4 h-4 text-pa" />
          <span className="text-sm text-ink/70">Ai có link đều xem được (không cần đăng nhập, video trận riêng tư bị ẩn):</span>
          <code className="flex-1 min-w-0 truncate text-xs bg-sheet border border-ink/10 rounded px-2 py-1">{sharedReportUrl(report.shareToken)}</code>
          <button type="button" onClick={copyLink} className={`${btn} h-8 bg-pa text-white hover:opacity-90`}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Đã chép' : 'Chép link'}
          </button>
        </div>
      )}

      {/* ---------------- COVER ---------------- */}
      <section className="relative overflow-hidden rounded-2xl bg-ink text-white print:rounded-none">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-pitch" aria-hidden />
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-pitch/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/55">Báo cáo trinh sát</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${quality.tone}`}>{quality.label}</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">{report.title}</h1>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <Link to={playerPath(opp.name)} className="flex items-center gap-3 min-w-0 group">
              <PlayerMonogram name={opp.name} size="md" className="!bg-[#C9701F] shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Đối thủ</p>
                <p className="font-score text-xl sm:text-2xl font-bold uppercase leading-tight truncate group-hover:underline">{opp.name}</p>
                <p className="text-xs text-white/55">
                  {opp.analyzedMatchCount} trận phân tích · thắng {oppRate ?? '–'}% điểm
                </p>
              </div>
            </Link>
            <span className="hidden sm:block font-score text-2xl font-bold text-white/30">VS</span>
            {own ? (
              <Link to={playerPath(own.name)} className="flex flex-row-reverse sm:flex-row items-center gap-3 min-w-0 justify-end sm:text-right group">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Bên ta</p>
                  <p className="font-score text-xl sm:text-2xl font-bold uppercase leading-tight truncate group-hover:underline">{own.name}</p>
                  <p className="text-xs text-white/55">{own.analyzedMatchCount} trận phân tích</p>
                </div>
                <PlayerMonogram name={own.name} size="md" className="shrink-0" />
              </Link>
            ) : (
              <p className="sm:text-right text-xs text-white/45">{report.ownPlayerName ?? 'Bên ta: chưa chọn'}</p>
            )}
          </div>

          {plan.headToHead && plan.headToHead.matches > 0 && (
            <div className="mt-6 rounded-lg bg-white/5 border border-white/10 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/50">Đối đầu trước đây</span>
              <span className="font-score text-2xl font-bold tabular-nums">
                <span className="text-emerald-300">{plan.headToHead.ownWon}</span>
                <span className="text-white/30 mx-1">–</span>
                <span className="text-rose-300">{plan.headToHead.ownLost}</span>
              </span>
              <span className="text-xs text-white/55">điểm qua {plan.headToHead.matches} trận (bên ta trước)</span>
            </div>
          )}
          <p className="mt-5 text-[11px] text-white/40">
            Lập lúc {new Date(report.generatedAt).toLocaleString('vi-VN')} · từ {plan.quality.decidedRallies} pha cầu có người thắng. {plan.quality.note}
          </p>
        </div>
      </section>

      {/* ---------------- GAME PLAN ---------------- */}
      <Card icon={Crosshair} title="Kế hoạch thi đấu" subtitle="Mỗi điểm đều có số liệu và video minh chứng bên dưới">
        {plan.keys.length === 0 ? (
          <p className="text-sm text-ink/70 py-6 text-center">Chưa đủ dữ liệu để rút ra kế hoạch. Phân tích thêm trận của {opp.name}.</p>
        ) : (
          <ol className="space-y-3">
            {plan.keys.map((k, i) => {
              const cat = CATEGORY[k.category];
              const Icon = cat.icon;
              return (
                <li key={`${k.category}-${i}`} className="relative flex gap-4 rounded-lg border border-ink/10 p-4 pl-5 overflow-hidden break-inside-avoid">
                  <span className={`absolute inset-y-0 left-0 w-1 ${cat.bar}`} aria-hidden />
                  <span className="font-score text-3xl font-bold text-ink/15 leading-none w-7 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${cat.tone}`}>
                          <Icon className="w-3 h-3" /> {cat.label}
                        </span>
                        <h3 className="text-base font-bold text-ink mt-1.5 first-letter:uppercase">{k.title}</h3>
                      </div>
                      <span className="font-score text-lg font-bold text-ink/70 tabular-nums whitespace-nowrap">{k.evidence}</span>
                    </div>
                    <p className="text-sm text-ink/65 mt-1 leading-relaxed">{k.detail}</p>
                    {k.clips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 print:hidden">
                        {k.clips.map((c, j) => (
                          <Link key={j} to={clipPath(c)} target="_blank"
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-ink/15 text-xs text-ink/70 hover:border-pitch hover:text-pitch-deep hover:bg-pitch-soft/50 transition-colors">
                            <PlayCircle className="w-3.5 h-3.5" /> {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {/* ---------------- COURT ---------------- */}
      <Card icon={Target} title="Bản đồ chiến thuật" subtitle="Đánh vào đâu và chờ cầu ở đâu">
        <ScoutingCourt target={plan.targetZones} threat={plan.threatZones} opponentName={opp.name} />
      </Card>

      {/* ---------------- STYLE + STROKES ---------------- */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card icon={Gauge} title="So sánh lối chơi" subtitle={own ? `${opp.name} và ${own.name}` : `Chỉ số lối chơi của ${opp.name}`}>
          {hasRadar(opp.radar) ? (
            <>
              <div className="flex justify-center">
                <PlayerRadarChart
                  size={300}
                  series={[
                    { radar: opp.radar, color: OPP },
                    ...(own && hasRadar(own.radar) ? [{ radar: own.radar, color: OWN, dashed: true }] : []),
                  ]}
                />
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-ink/70">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: OPP }} /> {opp.name}{opp.playstyle && ` · ${playstyleLabel(opp.playstyle)}`}</span>
                {own && hasRadar(own.radar) && (
                  <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed" style={{ borderColor: OWN }} /> {own.name}</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/70 py-8 text-center">Đối thủ chưa có chỉ số lối chơi.</p>
          )}
        </Card>

        <div className="space-y-5">
          <Card icon={Swords} title="Vũ khí ghi điểm của đối thủ">
            {plan.threats.length === 0 ? <p className="text-sm text-ink/70">Chưa có dữ liệu.</p> : (
              <ul className="space-y-2">
                {plan.threats.slice(0, 5).map(t => (
                  <li key={t.stroke} className="text-sm">
                    <div className="flex justify-between"><span>{strokeLabel(t.stroke)}</span><span className="font-semibold tabular-nums">{t.count} điểm</span></div>
                    <div className="h-1.5 rounded-full bg-ink/[0.06] mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-loss/80" style={{ width: `${(t.count / plan.threats[0].count) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card icon={Wand2} title="Đối thủ hay mất điểm sau cú">
            {plan.weaknesses.length === 0 ? <p className="text-sm text-ink/70">Chưa có dữ liệu.</p> : (
              <ul className="space-y-2">
                {plan.weaknesses.slice(0, 5).map(t => (
                  <li key={t.stroke} className="text-sm">
                    <div className="flex justify-between"><span>{strokeLabel(t.stroke)}</span><span className="font-semibold tabular-nums">{t.count} lần</span></div>
                    <div className="h-1.5 rounded-full bg-ink/[0.06] mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-pitch" style={{ width: `${(t.count / plan.weaknesses[0].count) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* ---------------- RALLY LENGTH ---------------- */}
      <Card icon={Timer} title="Đối thủ theo độ dài pha cầu" subtitle="Tỉ lệ thắng điểm của đối thủ">
        <div className="grid sm:grid-cols-3 gap-3">
          {(['SHORT', 'MEDIUM', 'LONG'] as const).map(b => {
            const row = plan.rallyLength.find(r => r.bucket === b) ?? { won: 0, lost: 0 };
            const r = winRate(row.won, row.lost);
            return (
              <div key={b} className="rounded-lg border border-ink/10 p-3 text-center">
                <p className="text-sm font-semibold text-ink">{RALLY_BUCKETS[b].label}</p>
                <p className="text-[11px] text-ink/65">{RALLY_BUCKETS[b].range}</p>
                <p className={`font-score text-3xl font-bold mt-1 ${r == null ? 'text-ink/25' : r >= 50 ? 'text-loss' : 'text-pitch-deep'}`}>{r == null ? '–' : `${r}%`}</p>
                <p className="text-[11px] text-ink/65 tabular-nums">{row.won}–{row.lost}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-ink/65 mt-3">Màu đỏ: đối thủ mạnh ở loại pha này; màu xanh: cơ hội cho bạn.</p>
      </Card>

      {/* ---------------- NOTES ---------------- */}
      {(isOwner || report.coachNotes) && (
        <Card icon={NotebookPen} title="Ghi chú của huấn luyện viên">
          {isOwner ? (
            <>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={saveNotes}
                maxLength={5000}
                rows={5}
                placeholder="Bổ sung nhận định riêng, bài tập chuẩn bị, phương án dự phòng…"
                className="w-full rounded-lg border border-ink/15 bg-ground/40 p-3 text-sm text-ink placeholder-ink/55 focus:outline-none focus:border-pitch print:hidden"
              />
              <p className="hidden print:block whitespace-pre-wrap text-sm text-ink/80">{notes || '—'}</p>
              <p className="text-[11px] text-ink/65 mt-1 print:hidden">
                {notesState === 'saving' ? 'Đang lưu…' : notesState === 'saved' ? 'Đã lưu' : 'Tự lưu khi bạn bấm ra ngoài ô ghi chú.'}
              </p>
            </>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-ink/80">{report.coachNotes}</p>
          )}
        </Card>
      )}

      {plan.headToHead && plan.headToHead.list.length > 0 && (
        <Card icon={Swords} title="Các trận đối đầu">
          <ul className="divide-y divide-ink/[0.06]">
            {plan.headToHead.list.map(m => (
              <li key={m.matchId} className="flex items-center gap-3 py-2 text-sm">
                <span className="tabular-nums text-ink/70 w-24">{formatDate(m.matchDate)}</span>
                <span className="font-score text-lg font-bold tabular-nums">
                  <span className="text-pitch-deep">{m.ownWon}</span>–<span className="text-loss">{m.ownLost}</span>
                </span>
                {(m.published || isOwner) && (
                  <Link to={clipPath({ matchId: m.matchId, published: m.published, seconds: 0, label: '' })} className="ml-auto text-xs font-semibold text-pitch hover:text-pitch-deep print:hidden">
                    Xem lại
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-center text-[11px] text-ink/65">
        Báo cáo do BadmintonAI lập tự động từ dữ liệu phân tích video. Các nhận định là xu hướng thống kê, không phải kết luận chắc chắn.
      </p>
    </div>
  );
};
