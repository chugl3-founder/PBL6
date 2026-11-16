import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, ArrowUpRight, Crosshair, Flame, History, Lightbulb, Map as MapIcon,
  PlayCircle, Radar as RadarIcon, ShieldAlert, Swords, Timer, TrendingUp, Users, Zap,
} from 'lucide-react';
import { fetchPlayerProfile, playerPath, replayPath, type PlayerProfile } from '../api/players';
import { PlayerMonogram } from '../components/player/PlayerMonogram';
import { PlayerRadarChart } from '../components/player/PlayerRadarChart';
import { PlayerZoneCourt } from '../components/player/PlayerZoneCourt';
import { PlayerFormChart } from '../components/player/PlayerFormChart';
import {
  RALLY_BUCKETS, buildInsights, formatDate, hasRadar, playstyleLabel, playstyleTone, winRate,
  type Insight,
} from '../utils/playerProfile';
import { strokeLabel } from '../utils/strokeLabels';
import { isSignedIn } from '../auth/session';

const PITCH = '#2E7D5B';
const COMPARE = '#C9701F';

/* ------------------------------------------------------------------ layout pieces */

const Section: React.FC<{
  icon: React.FC<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, action, className = '', children }) => (
  <section className={`rounded-xl bg-sheet border border-ink/10 p-5 sm:p-6 ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-8 h-8 rounded-lg bg-pitch-soft text-pitch-deep flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-ink/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
    {children}
  </section>
);

const WinGauge: React.FC<{ rate: number | null }> = ({ rate }) => {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const shown = rate ?? 0;
  return (
    <div className="relative w-36 h-36 shrink-0" role="img" aria-label={rate == null ? 'Chưa có tỉ lệ thắng điểm' : `Thắng ${rate}% số điểm`}>
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={shown >= 50 ? '#4ADE80' : '#FF7A6B'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-score text-4xl font-bold tabular-nums leading-none">{rate == null ? '–' : `${rate}%`}</span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-white/55 mt-1">thắng điểm</span>
      </div>
    </div>
  );
};

const HeroStat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="px-5 py-4">
    <div className="text-[11px] uppercase tracking-[0.12em] text-white/50">{label}</div>
    <div className="font-score text-3xl font-bold tabular-nums leading-tight mt-1">{value}</div>
    {hint && <div className="text-[11px] text-white/45">{hint}</div>}
  </div>
);

const INSIGHT_STYLE: Record<Insight['tone'], { icon: React.FC<{ className?: string }>; chip: string; label: string }> = {
  strength: { icon: Zap, chip: 'bg-pitch-soft text-pitch-deep', label: 'Điểm mạnh' },
  weakness: { icon: ShieldAlert, chip: 'bg-loss/10 text-loss', label: 'Cần lưu ý' },
  info: { icon: Lightbulb, chip: 'bg-pa/10 text-pa', label: 'Xu hướng' },
};

const SplitBar: React.FC<{ won: number; lost: number; height?: string }> = ({ won, lost, height = 'h-2' }) => {
  const total = won + lost;
  const wonPct = total ? (won / total) * 100 : 0;
  return (
    <div className={`flex ${height} rounded-full overflow-hidden bg-ink/[0.06]`}>
      {total > 0 && (
        <>
          <div className="bg-pitch transition-all duration-700" style={{ width: `${wonPct}%` }} />
          <div className="bg-loss/80 transition-all duration-700" style={{ width: `${100 - wonPct}%` }} />
        </>
      )}
    </div>
  );
};

type Tab = 'OVERVIEW' | 'STROKES' | 'COURT' | 'MATCHES';

const TABS: Array<{ key: Tab; label: string; hint: string; icon: React.FC<{ className?: string }> }> = [
  { key: 'OVERVIEW', label: 'Tổng quan', hint: 'Lối chơi và nhận định chính', icon: Lightbulb },
  { key: 'STROKES', label: 'Cú đánh', hint: 'Dùng cú gì, ghi điểm bằng gì', icon: Swords },
  { key: 'COURT', label: 'Vị trí trên sân', hint: 'Đứng đâu, đánh vào đâu', icon: MapIcon },
  { key: 'MATCHES', label: 'Trận đấu', hint: 'Phong độ, đối thủ, lịch sử', icon: History },
];

/** Strengths first, then what to watch, then trends: at most four, so the overview stays readable. */
const keyInsights = (all: Insight[]) => {
  const pick = (tone: Insight['tone'], n: number) => all.filter(i => i.tone === tone).slice(0, n);
  const chosen = [...pick('strength', 2), ...pick('weakness', 2)];
  return [...chosen, ...pick('info', 4 - chosen.length)];
};

/* ------------------------------------------------------------------ page */

export const PlayerProfilePage: React.FC = () => {
  const { name = '' } = useParams();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<'NOT_FOUND' | 'FAILED' | null>(null);
  const [compareId, setCompareId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('OVERVIEW');

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);
    setCompareId(null);
    setTab('OVERVIEW');
    fetchPlayerProfile(name)
      .then(data => {
        if (!cancelled) setProfile(data);
      })
      .catch(err => {
        if (cancelled) return;
        setError(axios.isAxiosError(err) && err.response?.status === 404 ? 'NOT_FOUND' : 'FAILED');
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  useEffect(() => {
    if (profile) document.title = `${profile.name} · Hồ sơ vận động viên`;
  }, [profile]);

  const insights = useMemo(() => (profile ? keyInsights(buildInsights(profile)) : []), [profile]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center font-vn space-y-4">
        <span className="mx-auto w-14 h-14 rounded-xl bg-ink/[0.06] flex items-center justify-center text-ink/40">
          <Users className="w-6 h-6" />
        </span>
        <h1 className="text-xl font-bold text-ink">
          {error === 'NOT_FOUND' ? `Không tìm thấy “${name}”` : 'Không tải được hồ sơ'}
        </h1>
        <p className="text-sm text-ink/70">
          {error === 'NOT_FOUND'
            ? 'Vận động viên này không có trong trận công khai nào hoặc trận của bạn.'
            : 'Đã có lỗi khi tải dữ liệu. Thử tải lại trang.'}
        </p>
        <Link to="/players" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pitch hover:text-pitch-deep">
          <ArrowLeft className="w-4 h-4" /> Danh sách vận động viên
        </Link>
      </div>
    );
  }

  if (!profile) return <ProfileSkeleton />;

  const { totals } = profile;
  const rate = winRate(totals.ralliesWon, totals.ralliesLost);
  const mainStyle = profile.playstyles[0]?.label ?? null;
  const analyzed = profile.matches.filter(m => m.analyzed);
  const recent = analyzed.filter(m => m.ralliesWon + m.ralliesLost > 0).slice(0, 8).reverse();
  const radarMatches = analyzed.filter(m => hasRadar(m.radar));
  const compare = radarMatches.find(m => m.matchId === compareId) ?? null;
  const strokeTotal = profile.strokes.reduce((sum, s) => sum + s.total, 0);
  const maxStroke = Math.max(1, ...profile.strokes.map(s => s.total));
  const hands = profile.handSides;
  const handParts = [
    { key: 'FOREHAND', label: 'Thuận tay', value: hands.FOREHAND ?? 0, color: PITCH },
    { key: 'AROUNDHEAD', label: 'Qua đầu', value: hands.AROUNDHEAD ?? 0, color: '#7FB89A' },
    { key: 'BACKHAND', label: 'Trái tay', value: hands.BACKHAND ?? 0, color: COMPARE },
  ];
  const handTotal = handParts.reduce((sum, p) => sum + p.value, 0);
  const concededTotal = profile.concededBy.reduce((sum, c) => sum + c.count, 0);
  const noAnalysis = profile.analyzedMatchCount === 0;
  const isLoggedIn = isSignedIn();

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16 font-vn">
      <Link to="/players" className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink">
        <ArrowLeft className="w-4 h-4" /> Vận động viên
      </Link>

      {/* ---------------- HERO: a broadcast scoreboard for one player ---------------- */}
      <section className="relative overflow-hidden rounded-2xl bg-ink text-white">
        <svg
          viewBox="0 0 600 320"
          className="absolute -right-24 -top-10 w-[680px] opacity-[0.07] pointer-events-none"
          aria-hidden
        >
          <rect x="20" y="20" width="560" height="280" fill="none" stroke="#fff" strokeWidth="3" />
          <line x1="20" y1="42" x2="580" y2="42" stroke="#fff" strokeWidth="2" />
          <line x1="20" y1="278" x2="580" y2="278" stroke="#fff" strokeWidth="2" />
          <line x1="50" y1="20" x2="50" y2="300" stroke="#fff" strokeWidth="2" />
          <line x1="550" y1="20" x2="550" y2="300" stroke="#fff" strokeWidth="2" />
          <line x1="230" y1="20" x2="230" y2="300" stroke="#fff" strokeWidth="2" />
          <line x1="370" y1="20" x2="370" y2="300" stroke="#fff" strokeWidth="2" />
          <line x1="20" y1="160" x2="230" y2="160" stroke="#fff" strokeWidth="2" />
          <line x1="370" y1="160" x2="580" y2="160" stroke="#fff" strokeWidth="2" />
          <line x1="300" y1="10" x2="300" y2="310" stroke="#fff" strokeWidth="5" />
        </svg>
        <div className="absolute inset-y-0 left-0 w-1.5 bg-pitch" aria-hidden />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6 p-6 sm:p-8">
          <PlayerMonogram name={profile.name} size="lg" className="ring-4 ring-white/10 shadow-xl" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold">Hồ sơ vận động viên</p>
            <h1 className="font-score font-bold uppercase tracking-wide text-4xl sm:text-5xl leading-none mt-1.5 break-words">
              {profile.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              {mainStyle && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 font-semibold">
                  <Flame className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-amber-300" />
                  {playstyleLabel(mainStyle)}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                {profile.matchCount} trận · {profile.analyzedMatchCount} đã phân tích
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 tabular-nums">
                {formatDate(profile.firstMatchDate)} – {formatDate(profile.lastMatchDate)}
              </span>
            </div>

            {recent.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/45 mb-1.5">Phong độ gần đây</p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map(m => {
                    const r = winRate(m.ralliesWon, m.ralliesLost) ?? 0;
                    return (
                      <Link
                        key={m.matchId}
                        to={replayPath(m)}
                        title={`gặp ${m.opponent} · ${m.ralliesWon}–${m.ralliesLost} điểm`}
                        className={`h-8 min-w-[44px] px-2 rounded-md flex items-center justify-center font-score text-sm font-bold tabular-nums transition-transform hover:-translate-y-0.5 ${
                          r >= 50 ? 'bg-pitch text-white' : 'bg-loss/85 text-white'
                        }`}
                      >
                        {r}%
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <WinGauge rate={rate} />
            {isLoggedIn && (
              <Link
                to={`/scouting?opponent=${encodeURIComponent(profile.name)}`}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white text-ink text-sm font-semibold hover:bg-pitch-soft transition-colors"
              >
                <Crosshair className="w-4 h-4" /> Lập báo cáo trinh sát
              </Link>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10 border-t border-white/10 bg-white/[0.03]">
          <HeroStat
            label="Điểm thắng – thua"
            value={
              <>
                <span className="text-emerald-300">{totals.ralliesWon}</span>
                <span className="text-white/30 mx-1">–</span>
                <span className="text-rose-300">{totals.ralliesLost}</span>
              </>
            }
            hint="pha cầu xác định được người thắng"
          />
          <HeroStat label="Cú đánh" value={totals.shots.toLocaleString('vi-VN')} hint="AI ghi nhận qua mọi trận" />
          <HeroStat
            label="Cú mỗi trận"
            value={profile.analyzedMatchCount ? Math.round(totals.shots / profile.analyzedMatchCount) : '–'}
            hint="trung bình"
          />
          <HeroStat
            label="Di chuyển mỗi pha"
            value={totals.avgDistanceMeters != null ? `${totals.avgDistanceMeters.toLocaleString('vi-VN')} m` : '–'}
            hint="quãng đường tối thiểu, ước lượng"
          />
        </div>
      </section>

      {!noAnalysis && (
        <nav className="sticky top-12 z-30 -mx-1 px-1 py-2 bg-ground/95 backdrop-blur" aria-label="Các phần của hồ sơ">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-xl bg-sheet border border-ink/10" role="tablist">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    active ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/[0.04] hover:text-ink'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-300' : 'text-ink/40'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{t.label}</span>
                    <span className={`hidden md:block text-[11px] truncate ${active ? 'text-white/55' : 'text-ink/65'}`}>{t.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {noAnalysis ? (
        <div className="rounded-xl bg-sheet border border-ink/10 px-6 py-12 text-center text-sm text-ink/70">
          Chưa có trận nào của {profile.name} được AI phân tích xong. Số liệu sẽ xuất hiện khi có ít nhất một trận hoàn tất.
        </div>
      ) : (
        <>
          {/* ---------------- STYLE + INSIGHTS ---------------- */}
          {tab === 'OVERVIEW' && (
          <div className="grid lg:grid-cols-12 gap-5">
            <Section
              icon={RadarIcon}
              title="Hồ sơ lối chơi"
              subtitle="Trung bình 6 chỉ số phong cách qua các trận"
              className="lg:col-span-5"
              action={
                radarMatches.length > 1 && (
                  <select
                    value={compareId ?? ''}
                    onChange={e => setCompareId(e.target.value ? Number(e.target.value) : null)}
                    aria-label="So sánh với một trận"
                    className="h-8 max-w-[180px] rounded-lg border border-ink/15 bg-sheet px-2 text-xs font-semibold text-ink"
                  >
                    <option value="">So với một trận…</option>
                    {radarMatches.map(m => (
                      <option key={m.matchId} value={m.matchId}>
                        {formatDate(m.matchDate)} · gặp {m.opponent}
                      </option>
                    ))}
                  </select>
                )
              }
            >
              {hasRadar(profile.radar) ? (
                <>
                  <div className="flex justify-center">
                    <PlayerRadarChart
                      size={320}
                      series={[
                        { radar: profile.radar, color: PITCH, label: 'Trung bình' },
                        ...(compare ? [{ radar: compare.radar, color: COMPARE, dashed: true, label: 'Trận' }] : []),
                      ]}
                    />
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-ink/70 mt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm" style={{ background: PITCH }} /> Trung bình mọi trận
                    </span>
                    {compare && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: COMPARE }} />
                        Trận gặp {compare.opponent}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink/65 text-center mt-3">
                    Điểm mô tả cách chơi trong đoạn video được phân tích, không phải xếp hạng năng lực.
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink/70 py-10 text-center">Các trận của VĐV này chưa có chỉ số lối chơi.</p>
              )}
            </Section>

            <Section icon={Lightbulb} title="Nhận định chính" subtitle="Những điều đáng chú ý nhất, rút ra tự động từ số liệu" className="lg:col-span-7">
              {insights.length === 0 ? (
                <p className="text-sm text-ink/70 py-10 text-center">Chưa đủ dữ liệu để rút ra nhận định.</p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {insights.map(insight => {
                    const style = INSIGHT_STYLE[insight.tone];
                    const Icon = style.icon;
                    return (
                      <li key={insight.title} className="rounded-lg border border-ink/10 bg-ground/50 p-3.5 hover:border-ink/20 transition-colors">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${style.chip}`}>
                          <Icon className="w-3 h-3" />
                          {style.label}
                        </span>
                        <p className="text-sm font-semibold text-ink mt-2 leading-snug">{insight.title}</p>
                        <p className="text-xs text-ink/70 mt-1 leading-relaxed">{insight.detail}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          )}

          {/* ---------------- STROKES ---------------- */}
          {tab === 'STROKES' && (
          <div className="grid lg:grid-cols-12 gap-5">
            <Section
              icon={Swords}
              title="Kho vũ khí"
              subtitle={`${strokeTotal.toLocaleString('vi-VN')} cú đánh, theo loại cú`}
              className="lg:col-span-8"
            >
              <div className="grid grid-cols-[minmax(84px,120px)_1fr_auto_auto] items-center gap-x-3 gap-y-2.5 text-sm">
                <span className="text-[11px] uppercase tracking-wide text-ink/65">Loại cú</span>
                <span className="text-[11px] uppercase tracking-wide text-ink/65">Tỉ lệ sử dụng</span>
                <span className="text-[11px] uppercase tracking-wide text-ink/65 text-center w-14" title="Pha cầu kết thúc có lợi bằng cú này">
                  Ghi điểm
                </span>
                <span className="text-[11px] uppercase tracking-wide text-ink/65 text-center w-14" title="Pha cầu kết thúc bất lợi ngay sau cú này">
                  Mất điểm
                </span>
                {profile.strokes.map(s => {
                  const share = strokeTotal ? Math.round((s.total / strokeTotal) * 100) : 0;
                  return (
                    <React.Fragment key={s.stroke}>
                      <span className="font-semibold text-ink truncate">{strokeLabel(s.stroke)}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-2.5 rounded-full bg-ink/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-pitch transition-all duration-700"
                            style={{ width: `${(s.total / maxStroke) * 100}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-xs tabular-nums text-ink/70">
                          <span className="font-semibold text-ink">{share}%</span> · {s.total}
                        </span>
                      </div>
                      <span
                        className={`w-14 text-center font-score text-lg font-bold tabular-nums ${s.winners ? 'text-pitch-deep' : 'text-ink/20'}`}
                      >
                        {s.winners}
                      </span>
                      <span className={`w-14 text-center font-score text-lg font-bold tabular-nums ${s.errors ? 'text-loss' : 'text-ink/20'}`}>
                        {s.errors}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </Section>

            <div className="lg:col-span-4 space-y-5">
              <Section icon={Crosshair} title="Thuận tay / trái tay">
                {handTotal === 0 ? (
                  <p className="text-sm text-ink/70">Chưa xác định được tay đánh.</p>
                ) : (
                  <>
                    <div className="flex h-4 rounded-full overflow-hidden">
                      {handParts.map(p => (
                        <div key={p.key} style={{ width: `${(p.value / handTotal) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
                      ))}
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {handParts.map(p => (
                        <li key={p.key} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                          <span className="text-ink/75">{p.label}</span>
                          <span className="ml-auto tabular-nums text-ink/65 text-xs">{p.value}</span>
                          <span className="w-10 text-right font-semibold tabular-nums">{Math.round((p.value / handTotal) * 100)}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Section>

              <Section icon={ShieldAlert} title="Bị ghi điểm bằng" subtitle="Cú kết thúc của đối thủ khi VĐV mất điểm">
                {profile.concededBy.length === 0 ? (
                  <p className="text-sm text-ink/70">Chưa có dữ liệu.</p>
                ) : (
                  <ul className="space-y-2">
                    {profile.concededBy.slice(0, 5).map(c => (
                      <li key={c.label} className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-ink/80">{strokeLabel(c.label)}</span>
                          <span className="font-semibold tabular-nums">{c.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink/[0.06] mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-loss/80" style={{ width: `${(c.count / Math.max(1, concededTotal)) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>

          )}

          {/* ---------------- COURT ---------------- */}
          {tab === 'COURT' && (
          <Section icon={MapIcon} title="Bản đồ sân" subtitle="Gộp mọi trận đã phân tích, chia ô khoảng 1 m">
            <PlayerZoneCourt profile={profile} />
          </Section>
          )}

          {/* ---------------- FORM + RALLY LENGTH ---------------- */}
          {tab === 'MATCHES' && (
          <div className="grid lg:grid-cols-12 gap-5">
            <Section icon={TrendingUp} title="Phong độ qua các trận" subtitle="Tỉ lệ điểm thắng mỗi trận; bấm một điểm để xem lại" className="lg:col-span-7">
              <PlayerFormChart matches={profile.matches} />
            </Section>
            <Section icon={Timer} title="Theo độ dài pha cầu" subtitle="Thắng – thua theo số cú trong pha" className="lg:col-span-5">
              <div className="space-y-4">
                {(['SHORT', 'MEDIUM', 'LONG'] as const).map(bucket => {
                  const row = profile.rallyLength.find(r => r.bucket === bucket) ?? { won: 0, lost: 0 };
                  const r = winRate(row.won, row.lost);
                  return (
                    <div key={bucket}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-sm font-semibold text-ink">
                          {RALLY_BUCKETS[bucket].label}
                          <span className="font-normal text-ink/65 text-xs ml-1.5">{RALLY_BUCKETS[bucket].range}</span>
                        </span>
                        <span className="text-xs tabular-nums text-ink/70">
                          {row.won}–{row.lost}
                          <span className={`ml-2 font-score text-lg font-bold ${r == null ? 'text-ink/30' : r >= 50 ? 'text-pitch-deep' : 'text-loss'}`}>
                            {r == null ? '–' : `${r}%`}
                          </span>
                        </span>
                      </div>
                      <SplitBar won={row.won} lost={row.lost} height="h-3" />
                    </div>
                  );
                })}
                <div className="flex gap-4 text-[11px] text-ink/70 pt-1">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-pitch" /> Thắng</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-loss/80" /> Thua</span>
                </div>
              </div>
            </Section>
          </div>
          )}
        </>
      )}

      {/* ---------------- OPPONENTS ---------------- */}
      {(noAnalysis || tab === 'MATCHES') && profile.opponents.length > 0 && (
        <Section icon={Users} title="Đối thủ" subtitle="Thành tích điểm số khi gặp từng người">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.opponents.map(o => {
              const r = winRate(o.ralliesWon, o.ralliesLost);
              return (
                <Link
                  key={o.name}
                  to={playerPath(o.name)}
                  className="group rounded-lg border border-ink/10 p-4 hover:border-pitch/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <PlayerMonogram name={o.name} size="sm" className="!bg-ink" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate group-hover:text-pitch-deep">{o.name}</p>
                      <p className="text-xs text-ink/70">{o.matches} trận</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-ink/30 group-hover:text-pitch" />
                  </div>
                  <div className="flex items-baseline justify-between mt-3 mb-1.5 text-xs">
                    <span className="tabular-nums text-ink/70">
                      Điểm <span className="font-semibold text-ink">{o.ralliesWon}–{o.ralliesLost}</span>
                    </span>
                    <span className={`font-score text-lg font-bold ${r == null ? 'text-ink/30' : r >= 50 ? 'text-pitch-deep' : 'text-loss'}`}>
                      {r == null ? '–' : `${r}%`}
                    </span>
                  </div>
                  <SplitBar won={o.ralliesWon} lost={o.ralliesLost} />
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---------------- MATCH HISTORY ---------------- */}
      {(noAnalysis || tab === 'MATCHES') && (
      <Section icon={History} title="Lịch sử trận đấu" subtitle={`${profile.matchCount} trận bạn được xem`}>
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink/65 border-b border-ink/10">
                <th className="font-semibold py-2 pl-5 sm:pl-6">Ngày</th>
                <th className="font-semibold py-2">Đối thủ</th>
                <th className="font-semibold py-2">Lối chơi</th>
                <th className="font-semibold py-2 w-44">Điểm thắng – thua</th>
                <th className="font-semibold py-2 text-right">Cú đánh</th>
                <th className="py-2 pr-5 sm:pr-6" />
              </tr>
            </thead>
            <tbody>
              {profile.matches.map(m => {
                const r = winRate(m.ralliesWon, m.ralliesLost);
                return (
                  <tr key={m.matchId} className="border-b border-ink/[0.06] last:border-0 hover:bg-ground/60 transition-colors">
                    <td className="py-3 pl-5 sm:pl-6 tabular-nums text-ink/70 whitespace-nowrap">{formatDate(m.matchDate)}</td>
                    <td className="py-3">
                      <Link to={playerPath(m.opponent)} className="font-semibold text-ink hover:text-pitch-deep">
                        {m.opponent}
                      </Link>
                      {m.title && <p className="text-xs text-ink/65 truncate max-w-[260px]">{m.title}</p>}
                    </td>
                    <td className="py-3">
                      {m.playstyle ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${playstyleTone(m.playstyle)}`}>
                          {playstyleLabel(m.playstyle)}
                        </span>
                      ) : (
                        <span className="text-xs text-ink/35">{m.analyzed ? '—' : 'Chưa phân tích'}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {m.analyzed && m.ralliesWon + m.ralliesLost > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs w-12">
                            {m.ralliesWon}–{m.ralliesLost}
                          </span>
                          <div className="flex-1">
                            <SplitBar won={m.ralliesWon} lost={m.ralliesLost} />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums w-9 text-right ${r != null && r >= 50 ? 'text-pitch-deep' : 'text-loss'}`}>
                            {r}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink/35">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">{m.analyzed ? m.shots : '—'}</td>
                    <td className="py-3 pr-5 sm:pr-6 text-right">
                      <Link
                        to={replayPath(m)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-pitch/30 text-xs font-semibold text-pitch hover:bg-pitch-soft transition-colors whitespace-nowrap"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Xem lại
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      )}
    </div>
  );
};

const ProfileSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto space-y-5 pb-16" aria-busy="true" aria-label="Đang tải hồ sơ">
    <div className="h-5 w-32 rounded bg-ink/[0.06] animate-pulse" />
    <div className="h-72 rounded-2xl bg-ink/90 animate-pulse" />
    <div className="grid lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 h-96 rounded-xl bg-sheet border border-ink/10 animate-pulse" />
      <div className="lg:col-span-7 h-96 rounded-xl bg-sheet border border-ink/10 animate-pulse" />
    </div>
    <div className="h-80 rounded-xl bg-sheet border border-ink/10 animate-pulse" />
  </div>
);
