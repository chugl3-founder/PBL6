import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Globe, Link2, Loader2, Lock, RefreshCw, Sparkles } from 'lucide-react';
import type { AdminOutletContext } from '../layout/AdminLayout';
import { LoadError, SectionHeader, Sheet } from './adminUi';
import { numberFormat } from './adminFormat';

/**
 * /admin: the state of the system at a glance. An ink scoreboard on top (the same broadcast
 * language as the user pages), then the work waiting for the admin, then how matches and analyses
 * are spread across their states.
 */
export const OverviewSection: React.FC<AdminOutletContext> = ({ metrics, metricsLoading, metricsError, refreshMetrics }) => {
  const m = metrics;
  const breakdown = m?.matchStatusBreakdown ?? {};
  const fmt = (n?: number) => (n === undefined ? '–' : numberFormat.format(n));

  const todo: { to: string; icon: React.FC<{ className?: string }>; tone: string; count: number; text: string; action: string }[] = m
    ? [
        {
          to: '/admin/ai-monitor?status=FAILED',
          icon: AlertTriangle,
          tone: 'text-loss bg-loss/10',
          count: m.failedAiAnalyses,
          text: 'phiên phân tích bị lỗi, người dùng đang chờ kết quả',
          action: 'Xem và chạy lại',
        },
        {
          to: '/admin/matches?status=ANALYZED',
          icon: Globe,
          tone: 'text-pa bg-pa/10',
          count: m.analyzedMatches,
          text: 'trận đã phân tích xong, chưa đưa lên thư viện công khai',
          action: 'Duyệt công khai',
        },
        {
          to: '/admin/ai-monitor?status=PROCESSING',
          icon: Loader2,
          tone: 'text-pb bg-pb/10',
          count: m.processingAiAnalyses,
          text: 'phiên đang chạy hoặc chờ đến lượt',
          action: 'Theo dõi',
        },
        {
          to: '/admin/content',
          icon: Link2,
          tone: 'text-ink/70 bg-ink/[0.06]',
          count: m.sharedReports ?? 0,
          text: 'báo cáo trinh sát đang mở cho bất kỳ ai có link',
          action: 'Kiểm tra',
        },
        {
          to: '/admin/users?status=LOCKED',
          icon: Lock,
          tone: 'text-ink/70 bg-ink/[0.06]',
          count: m.lockedUsers,
          text: 'tài khoản đang bị khóa',
          action: 'Xem danh sách',
        },
      ].filter((t) => t.count > 0)
    : [];

  const matchParts = [
    { key: 'PUBLISHED', label: 'Công khai', value: m?.publishedMatches ?? 0, color: 'bg-pitch' },
    { key: 'ANALYZED', label: 'Đã phân tích', value: m?.analyzedMatches ?? 0, color: 'bg-pa' },
    { key: 'ANALYZING', label: 'AI đang phân tích', value: breakdown.ANALYZING ?? 0, color: 'bg-pb' },
    { key: 'READY', label: 'Chưa phân tích', value: breakdown.READY ?? 0, color: 'bg-ink/35' },
    { key: 'DRAFT', label: 'Chưa có video', value: m?.draftMatches ?? 0, color: 'bg-ink/15' },
  ];

  const aiParts = [
    { key: 'COMPLETED', label: 'Hoàn tất', value: m?.completedAiAnalyses ?? 0, color: 'bg-pitch' },
    { key: 'PROCESSING', label: 'Đang chạy', value: m?.processingAiAnalyses ?? 0, color: 'bg-pb' },
    { key: 'FAILED', label: 'Lỗi', value: m?.failedAiAnalyses ?? 0, color: 'bg-loss' },
    { key: 'CANCELLED', label: 'Đã hủy', value: m?.aiStatusBreakdown?.CANCELLED ?? 0, color: 'bg-ink/15' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tổng quan"
        description="Tình trạng hệ thống và những việc đang chờ bạn xử lý."
        actions={
          <button
            type="button"
            onClick={refreshMetrics}
            disabled={metricsLoading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-ink/15 bg-sheet text-sm font-medium text-ink hover:border-pitch hover:text-pitch-deep disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} aria-hidden />
            Làm mới
          </button>
        }
      />

      {metricsError && <LoadError message={metricsError} onRetry={refreshMetrics} />}

      {/* The scoreboard: four numbers in broadcast type, each opening the page behind it. */}
      <div className="rounded-lg bg-ink text-white overflow-hidden shadow-[inset_0_-3px_0_#6FCF97]">
        <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10">
          <Score to="/admin/users" label="Người dùng" value={fmt(m?.totalUsers)} sub={m ? `${fmt(m.activeUsers)} đang hoạt động` : ''} />
          <Score to="/admin/matches" label="Trận đấu" value={fmt(m?.totalMatches)} sub={m ? `${fmt(m.deletedMatches)} trong thùng rác` : ''} />
          <Score to="/admin/matches?status=PUBLISHED" label="Trên thư viện công khai" value={fmt(m?.publishedMatches)} sub="Khách xem được" />
          <Score
            to="/admin/ai-monitor"
            label="Phân tích AI thành công"
            value={m ? `${m.aiSuccessRate}%` : '–'}
            sub={m ? `${fmt(m.completedAiAnalyses)} / ${fmt(m.completedAiAnalyses + m.failedAiAnalyses)} phiên đã xong` : ''}
          />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <Sheet className="lg:col-span-3">
          <h2 className="px-5 pt-4 pb-3 text-base font-semibold text-ink border-b border-ink/10">Cần xử lý</h2>
          {!m ? (
            <div className="p-5 space-y-3" aria-busy="true">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-10 rounded bg-ink/[0.06] animate-pulse" />
              ))}
            </div>
          ) : todo.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-8 text-sm text-ink/70">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-pitch-soft text-pitch-deep">
                <Sparkles className="w-4 h-4" />
              </span>
              Không có việc gì đang chờ. Các phân tích đều đã xong và mọi trận phân tích xong đã được duyệt.
            </div>
          ) : (
            <ul className="divide-y divide-ink/5">
              {todo.map((t) => {
                const Icon = t.icon;
                return (
                  <li key={t.to}>
                    <Link to={t.to} className="group flex items-center gap-3 px-5 py-3 hover:bg-ground/60 transition-colors">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${t.tone}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-ink/80">
                        <strong className="font-semibold text-ink tabular-nums">{fmt(t.count)}</strong> {t.text}
                      </span>
                      <span className="hidden sm:inline text-sm font-medium text-pitch-deep group-hover:underline whitespace-nowrap">
                        {t.action}
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink/40 group-hover:text-pitch-deep shrink-0" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Sheet>

        <Sheet className="lg:col-span-2 p-5 space-y-6">
          <Distribution title="Trận theo trạng thái" total={m?.totalMatches} parts={matchParts} linkTo={(k) => `/admin/matches?status=${k}`} />
          <Distribution title="Phiên phân tích AI" total={m?.totalAiAnalyses} parts={aiParts} linkTo={(k) => `/admin/ai-monitor?status=${k}`} />
          {m && (
            <p className="text-sm text-ink/70 border-t border-ink/10 pt-4">
              Người dùng đã tạo <strong className="text-ink tabular-nums">{fmt(m.highlightReels ?? 0)}</strong> video highlight và chia sẻ{' '}
              <strong className="text-ink tabular-nums">{fmt(m.sharedReports ?? 0)}</strong> báo cáo trinh sát.{' '}
              <Link to="/admin/content" className="font-medium text-pitch-deep hover:underline">
                Xem
              </Link>
            </p>
          )}
        </Sheet>
      </div>
    </div>
  );
};

const Score: React.FC<{ to: string; label: string; value: string; sub: string }> = ({ to, label, value, sub }) => (
  <Link to={to} className="group block px-5 py-4 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40">
    <dt className="text-sm text-white/70">{label}</dt>
    <dd className="font-score text-5xl font-semibold leading-none mt-2 tabular-nums">{value}</dd>
    <dd className="text-xs text-white/60 mt-2 truncate">{sub}</dd>
  </Link>
);

/** One stacked bar plus its legend; every legend row opens the filtered list. */
const Distribution: React.FC<{
  title: string;
  total?: number;
  parts: { key: string; label: string; value: number; color: string }[];
  linkTo: (key: string) => string;
}> = ({ title, total, parts, linkTo }) => {
  const sum = parts.reduce((acc, p) => acc + p.value, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink/60 tabular-nums">{total !== undefined ? numberFormat.format(total) : ''}</span>
      </div>
      <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-ink/[0.06]" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {sum > 0 &&
          parts.filter((p) => p.value > 0).map((p) => (
            <span key={p.key} className={`${p.color} h-full border-r-2 border-sheet last:border-r-0`} style={{ width: `${(p.value / sum) * 100}%` }} />
          ))}
      </div>
      <ul className="mt-3 space-y-0.5">
        {parts.map((p) => (
          <li key={p.key}>
            <Link to={linkTo(p.key)} className="flex items-center gap-2 rounded px-1 -mx-1 py-1 text-sm hover:bg-ground">
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${p.color}`} aria-hidden />
              <span className="flex-1 text-ink/80">{p.label}</span>
              <span className="tabular-nums font-medium text-ink">{numberFormat.format(p.value)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
