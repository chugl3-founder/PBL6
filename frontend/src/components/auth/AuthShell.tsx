import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, type LucideIcon } from 'lucide-react';

/**
 * Account pages (login, register, password recovery) in the court identity:
 * a white sheet with the form beside the arena photo used on the landing page.
 */
export const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  top?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, top, footer, children }) => (
  <div className="font-vn max-w-5xl mx-auto py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
    <div className="w-full max-w-md mx-auto lg:mx-0 rounded-lg bg-sheet border border-ink/10 p-6 sm:p-8">
      {top}
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="text-sm text-ink/70 mt-1 mb-6">{subtitle}</p>
      {children}
      {footer && <div className="mt-6 pt-5 border-t border-ink/10 text-sm text-ink/70">{footer}</div>}
    </div>
    <figure className="hidden lg:block">
      <img
        src="/images/arena-court-blue.jpg"
        alt=""
        width={2070}
        height={1380}
        className="w-full aspect-[4/3] object-cover rounded-lg border border-ink/10"
      />
      <figcaption className="mt-3 text-sm text-ink/70">
        Tải video một trận lên, AI chia thành từng pha cầu và chỉ ra vì sao mất điểm.
      </figcaption>
    </figure>
  </div>
);

const boxClass =
  'flex h-11 items-center gap-2.5 rounded-md border border-ink/15 bg-sheet px-3 transition-colors focus-within:border-pitch focus-within:ring-2 focus-within:ring-pitch/20';

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  id: string;
  label: React.ReactNode;
  icon: LucideIcon;
  aside?: React.ReactNode;
  hint?: string;
};

/** Labelled text input with a leading icon; password fields get a show/hide toggle. */
export const AuthField: React.FC<FieldProps> = ({ id, label, icon: Icon, aside, hint, type, ...input }) => {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {aside}
      </div>
      <div className={boxClass}>
        <Icon className="h-4 w-4 text-ink/40 shrink-0" aria-hidden />
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/55 focus:outline-none"
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            aria-label={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="p-1 -mr-1 rounded text-ink/55 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-ink/65">{hint}</p>}
    </div>
  );
};

export const AuthSelect: React.FC<
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & { id: string; label: string }
> = ({ id, label, children, ...select }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
    <select
      id={id}
      className="w-full h-11 px-3 rounded-md border border-ink/15 bg-sheet text-sm text-ink focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
      {...select}
    >
      {children}
    </select>
  </div>
);

export const AuthAlert: React.FC<{ tone: 'error' | 'success'; children: React.ReactNode }> = ({ tone, children }) => {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-5 flex items-start gap-2.5 rounded-md px-3.5 py-3 text-sm animate-fade-in ${
        tone === 'error' ? 'bg-loss/10 text-loss' : 'bg-pitch-soft text-pitch-deep'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <div>{children}</div>
    </div>
  );
};

export const AuthSubmit: React.FC<{ loading: boolean; disabled?: boolean; children: React.ReactNode }> = ({
  loading,
  disabled,
  children,
}) => (
  <button
    type="submit"
    disabled={loading || disabled}
    className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 focus-visible:ring-offset-2"
  >
    {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />}
    {children}
  </button>
);

export const authLinkClass = 'font-semibold text-pitch hover:text-pitch-deep hover:underline';
