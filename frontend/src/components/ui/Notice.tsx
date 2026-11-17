import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type NoticeTone = 'success' | 'error' | 'info';

const TONES: Record<NoticeTone, { box: string; icon: React.FC<{ className?: string }>; iconClass: string }> = {
  success: { box: 'border-pitch/30 bg-pitch-soft', icon: CheckCircle2, iconClass: 'text-pitch-deep' },
  error: { box: 'border-loss/30 bg-loss/5', icon: AlertTriangle, iconClass: 'text-loss' },
  info: { box: 'border-ink/15 bg-sheet', icon: Info, iconClass: 'text-ink/60' },
};

interface NoticeProps {
  tone: NoticeTone;
  children: React.ReactNode;
  /** A second line under the message, e.g. what to do next. */
  hint?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
}

/** A message that belongs to the page: an error to act on, a result to keep in view. */
export const Notice: React.FC<NoticeProps> = ({ tone, children, hint, action, onClose }) => {
  const { box, icon: Icon, iconClass } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-ink animate-fade-in ${box}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{children}</p>
        {hint && <p className="mt-0.5 text-ink/70">{hint}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 h-7 px-3 rounded-md border border-ink/15 bg-sheet text-xs font-semibold hover:border-pitch hover:text-pitch-deep transition-colors"
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-0.5 rounded text-ink/50 hover:text-ink hover:bg-ink/5"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
