import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Notice } from '../ui/Notice';
import { PAGE_SIZE } from './adminFormat';

/**
 * Building blocks shared by the admin sections, in the same "court" language as the user pages:
 * ink text on white sheets over the pale ground, court green for the main action, orange for work
 * in progress, red only for what failed or is destructive.
 */

/** Page title, one plain line on what the page is for, and the page-wide actions on the right. */
export const SectionHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <header className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-ink">{title}</h1>
      {description && <p className="text-sm text-ink/70 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </header>
);

export interface FilterTab {
  key: string;
  label: string;
  count?: number;
}

/** The same underline tabs as "Trận của tôi"; a count after the label when it is known. */
export const FilterTabs: React.FC<{
  tabs: FilterTab[];
  value: string;
  onChange: (key: string) => void;
  label: string;
  /** False when the parent row already draws the bottom line (tabs with a search box beside them). */
  bordered?: boolean;
}> = ({ tabs, value, onChange, label, bordered = true }) => (
  <div className={`flex gap-1 overflow-x-auto ${bordered ? 'border-b border-ink/10' : ''}`} role="tablist" aria-label={label}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        role="tab"
        aria-selected={value === tab.key}
        onClick={() => onChange(tab.key)}
        className={`relative px-3 h-10 text-sm whitespace-nowrap transition-colors ${
          value === tab.key
            ? 'text-ink font-medium after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-pitch'
            : 'text-ink/70 hover:text-ink'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && tab.count > 0 && (
          <span className="ml-1.5 text-xs tabular-nums text-ink/60">{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);

/** Shown instead of an empty table when a list failed to load, so "no data" is never faked. */
export const LoadError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <Notice tone="error" action={{ label: 'Thử lại', onClick: onRetry }}>
    {message}
  </Notice>
);

export const LoadMore: React.FC<{ shown: number; total: number; loading: boolean; onClick: () => void }> = ({
  shown,
  total,
  loading,
  onClick,
}) => (
  <div className="flex items-center justify-center gap-3 border-t border-ink/10 px-4 py-3 text-sm text-ink/70">
    <span className="tabular-nums">
      Đang hiện {shown}/{total}
    </span>
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-ink/15 bg-sheet text-ink font-medium hover:border-pitch hover:text-pitch-deep disabled:opacity-60 transition-colors"
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
      Tải thêm {Math.min(PAGE_SIZE, total - shown)}
    </button>
  </div>
);

/** The white sheet a list sits on. */
export const Sheet: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`rounded-lg border border-ink/10 bg-sheet ${className}`}>{children}</section>
);

/** Table classes shared by every admin list. */
export const tableClass = 'w-full text-left text-sm';
export const theadClass = 'border-b border-ink/10 text-xs font-medium text-ink/60';
export const thClass = 'px-4 py-2.5 font-medium whitespace-nowrap';
export const rowClass = 'border-b border-ink/5 last:border-0 hover:bg-ground/60 transition-colors';
export const tdClass = 'px-4 py-3 align-middle';

/** Placeholder rows while a list loads: the table keeps its shape instead of jumping. */
export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="divide-y divide-ink/5" aria-busy="true" aria-label="Đang tải">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-4">
        <div className="h-4 w-1/3 rounded bg-ink/[0.06] animate-pulse" />
        <div className="h-4 w-1/5 rounded bg-ink/[0.06] animate-pulse" />
        <div className="ml-auto h-7 w-24 rounded bg-ink/[0.06] animate-pulse" />
      </div>
    ))}
  </div>
);

type PillTone = 'pitch' | 'progress' | 'loss' | 'neutral' | 'info';

const PILL: Record<PillTone, string> = {
  pitch: 'bg-pitch-soft text-pitch-deep',
  progress: 'bg-pb/10 text-pb',
  loss: 'bg-loss/10 text-loss',
  neutral: 'bg-ink/[0.06] text-ink/70',
  info: 'bg-pa/10 text-pa',
};

export const Pill: React.FC<{ tone: PillTone; live?: boolean; children: React.ReactNode }> = ({ tone, live, children }) => (
  <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${PILL[tone]}`}>
    {live && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden />}
    {children}
  </span>
);

/** Match states, in the words "Trận của tôi" uses, plus the two only the admin sees. */
const MATCH_STATUS: Record<string, { label: string; tone: PillTone }> = {
  PUBLISHED: { label: 'Công khai', tone: 'pitch' },
  ANALYZED: { label: 'Đã phân tích', tone: 'info' },
  ANALYZING: { label: 'AI đang phân tích', tone: 'progress' },
  READY: { label: 'Chưa phân tích', tone: 'neutral' },
  DRAFT: { label: 'Chưa có video', tone: 'neutral' },
};

export const MatchStatusBadge: React.FC<{ status: string; deletedAt?: string | null }> = ({ status, deletedAt }) => {
  if (deletedAt) return <Pill tone="loss">Trong thùng rác</Pill>;
  const s = MATCH_STATUS[status] ?? { label: status, tone: 'neutral' as PillTone };
  return (
    <Pill tone={s.tone} live={status === 'ANALYZING'}>
      {s.label}
    </Pill>
  );
};

const AI_STATUS: Record<string, { label: string; tone: PillTone }> = {
  COMPLETED: { label: 'Hoàn tất', tone: 'pitch' },
  PROCESSING: { label: 'Đang chạy', tone: 'progress' },
  QUEUED: { label: 'Chờ đến lượt', tone: 'progress' },
  FAILED: { label: 'Lỗi', tone: 'loss' },
  UNSUPPORTED: { label: 'Video không hỗ trợ', tone: 'loss' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const AiStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = AI_STATUS[status] ?? { label: status, tone: 'neutral' as PillTone };
  return (
    <Pill tone={s.tone} live={status === 'PROCESSING'}>
      {s.label}
    </Pill>
  );
};

/** Small square icon button for row actions; the label is the tooltip and the accessible name. */
export const IconAction: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }
> = ({ label, danger, className = '', children, ...rest }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      danger ? 'text-ink/55 hover:text-loss hover:bg-loss/10' : 'text-ink/60 hover:text-ink hover:bg-ink/[0.06]'
    } ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/** A labelled row action: outline by default, filled court green for the main one. */
export const TextAction: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; busy?: boolean }
> = ({ primary, busy, className = '', children, disabled, ...rest }) => (
  <button
    type="button"
    disabled={disabled || busy}
    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      primary
        ? 'bg-pitch hover:bg-pitch-deep text-white'
        : 'border border-ink/15 bg-sheet text-ink hover:border-pitch hover:text-pitch-deep'
    } ${className}`}
    {...rest}
  >
    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
    {children}
  </button>
);

interface ConfirmDialogProps {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busyLabel: string;
  danger?: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before anything a user would notice: hiding their match, locking them out, turning a link off. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  children,
  confirmLabel,
  busyLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !busy && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 font-vn" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-sheet p-6 shadow-xl space-y-4 animate-fade-in"
      >
        <h2 id="admin-confirm-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <div className="text-sm text-ink/70 leading-relaxed">{children}</div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 h-9 rounded-md text-sm font-medium text-ink border border-ink/15 hover:border-ink/30"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={`px-4 h-9 rounded-md text-sm font-medium text-white disabled:opacity-60 ${
              danger ? 'bg-loss hover:bg-loss/90' : 'bg-pitch hover:bg-pitch-deep'
            }`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
