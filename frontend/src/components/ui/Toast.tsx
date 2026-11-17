import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { NoticeTone } from './Notice';
import { TOAST_EVENT, type ToastItem } from './toastBus';

const SHOW_MS = 4000;

const ICONS: Record<NoticeTone, { icon: React.FC<{ className?: string }>; bar: string; iconClass: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-pitch', iconClass: 'text-pitch' },
  error: { icon: AlertTriangle, bar: 'bg-loss', iconClass: 'text-loss' },
  info: { icon: Info, bar: 'bg-ink/40', iconClass: 'text-ink/60' },
};

let nextId = 1;

/**
 * Where toasts appear: bottom left, clear of the AI Coach bubble on the right. Mounted once in the
 * layout; pages call toast.success(...) without a provider.
 */
export const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { tone, message } = (e as CustomEvent<Omit<ToastItem, 'id'>>).detail;
      const id = nextId++;
      setItems((list) => [...list.slice(-2), { id, tone, message }]);
      window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), SHOW_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-6 z-[70] flex flex-col gap-2 w-[min(360px,calc(100vw-3rem))]" aria-live="polite">
      {items.map((t) => {
        const { icon: Icon, bar, iconClass } = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="relative flex items-start gap-3 overflow-hidden rounded-lg bg-white border border-ink/10 shadow-xl pl-4 pr-2 py-3 text-sm text-ink animate-fade-in"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} aria-hidden />
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
            <p className="flex-1 min-w-0 font-medium">{t.message}</p>
            <button
              type="button"
              onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))}
              className="shrink-0 p-0.5 rounded text-ink/40 hover:text-ink hover:bg-ink/5"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
