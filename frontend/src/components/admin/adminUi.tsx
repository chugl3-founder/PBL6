import React from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { PAGE_SIZE } from './adminFormat';

/** Building blocks shared by the admin sections: paging, load errors and status badges. */

/** Shown instead of an empty table when a list failed to load, so "no data" is never faked. */
export const LoadError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="my-6 mx-auto max-w-2xl rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between gap-3">
    <span className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
      {message}
    </span>
    <button
      type="button"
      onClick={onRetry}
      className="shrink-0 rounded-lg border border-rose-400/40 px-3 py-1 font-semibold hover:bg-rose-500/20 flex items-center gap-1.5"
    >
      <RefreshCw className="w-3.5 h-3.5" aria-hidden />
      Thử lại
    </button>
  </div>
);

export const LoadMore: React.FC<{ shown: number; total: number; loading: boolean; onClick: () => void }> = ({ shown, total, loading, onClick }) => (
  <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-400">
    <span>
      Đang hiện {shown}/{total}
    </span>
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-white/90 hover:bg-white/10 disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
      Tải thêm {Math.min(PAGE_SIZE, total - shown)}
    </button>
  </div>
);

/** Publication state of a match in the admin list. */
export const MatchStatusBadge: React.FC<{ status: string; deletedAt?: string | null }> = ({ status, deletedAt }) => {
  if (deletedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold whitespace-nowrap">
        <span>ĐÃ XÓA MỀM</span>
      </span>
    );
  }
  switch (status) {
    case 'PUBLISHED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Đang công khai</span>
        </span>
      );
    case 'ANALYZED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold whitespace-nowrap">
          <span>Đã phân tích AI</span>
        </span>
      );
    case 'READY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold whitespace-nowrap">
          <span>Sẵn sàng video</span>
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold whitespace-nowrap">
          <span>Bản nháp</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/50 border border-white/10 text-slate-300 whitespace-nowrap">
          <span>{status}</span>
        </span>
      );
  }
};

/** State of an AI analysis in the monitor. */
export const AiStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Hoàn tất (COMPLETED)</span>
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Đang xử lý (PROCESSING)</span>
        </span>
      );
    case 'QUEUED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Trong hàng đợi (QUEUED)</span>
        </span>
      );
    case 'FAILED':
    case 'UNSUPPORTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Thất bại ({status})</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold whitespace-nowrap">
          <span>Đã hủy (CANCELLED)</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 whitespace-nowrap">
          <span>{status}</span>
        </span>
      );
  }
};
