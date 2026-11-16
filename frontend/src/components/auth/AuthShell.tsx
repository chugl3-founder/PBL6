import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { RallyCourt } from './RallyCourt';

/**
 * Account pages (login, register, password recovery): the form on a white sheet beside the court mat,
 * where one rally plays out the way the AI reads it from a broadcast.
 */
export const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  top?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, top, footer, children }) => (
  <div className="font-vn max-w-6xl mx-auto lg:py-4">
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] rounded-lg overflow-hidden border border-ink/10 bg-sheet lg:min-h-[640px]">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
        <div className="w-full max-w-[400px]">
          {top}
          <h1 className="font-score text-[2.75rem] leading-none font-semibold text-ink">{title}</h1>
          <p className="mt-3 mb-8 text-[15px] leading-relaxed text-ink/65">{subtitle}</p>
          {children}
          {footer && <div className="mt-8 text-sm text-ink/65">{footer}</div>}
        </div>
      </div>

      <section className="hidden lg:flex flex-col bg-mat text-white" aria-label="Cách AI đọc một pha cầu">
        <div className="flex items-center gap-6 px-10 pt-9 font-score text-lg tracking-wide text-white/85">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-pa" aria-hidden />A, sân trên
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-pb" aria-hidden />B, sân dưới
          </span>
        </div>
        <RallyCourt className="w-full flex-1 min-h-0 px-4" />
        <div className="px-10 pb-10">
          <p className="font-score text-[2rem] leading-tight font-semibold">Từng cú đánh, đúng chỗ cầu rơi.</p>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/70">
            Tải video trận lên, AI tách từng pha cầu, gọi tên từng cú và chỉ ra pha mất điểm bắt đầu từ đâu.
          </p>
        </div>
      </section>
    </div>
  </div>
);

const boxClass =
  'group flex h-12 items-center gap-3 rounded-md border border-ink/15 bg-sheet px-3.5 transition-colors hover:border-ink/30 focus-within:border-pitch focus-within:ring-2 focus-within:ring-pitch/20';

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
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <div className={boxClass}>
        <Icon className="h-4 w-4 shrink-0 text-ink/35 transition-colors group-focus-within:text-pitch" aria-hidden />
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="-mr-1 rounded p-1 text-ink/40 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink/55">
          {hint}
        </p>
      )}
    </div>
  );
};

/** A short list of options picked with one click, shown side by side. */
export const AuthChoice: React.FC<{
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ name, label, value, onChange, options }) => (
  <fieldset className="space-y-1.5">
    <legend className="text-sm font-medium text-ink mb-1.5">{label}</legend>
    <div className="flex rounded-md bg-ground p-1 border border-ink/10">
      {options.map((o) => (
        <label key={o.value} className="flex-1 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="block whitespace-nowrap rounded px-1 py-2 text-center text-[13px] text-ink/60 transition-colors hover:text-ink peer-checked:bg-sheet peer-checked:font-semibold peer-checked:text-ink peer-checked:shadow-[0_1px_2px_rgba(22,32,27,0.12)] peer-focus-visible:ring-2 peer-focus-visible:ring-pitch/40">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

export const AuthAlert: React.FC<{ tone: 'error' | 'success'; children: React.ReactNode }> = ({ tone, children }) => {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-6 flex items-start gap-3 rounded-md border-l-[3px] px-4 py-3 text-sm animate-fade-in ${
        tone === 'error' ? 'border-loss bg-loss/[0.07] text-loss' : 'border-pitch bg-pitch-soft text-pitch-deep'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="leading-snug">{children}</div>
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
    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-pitch text-[15px] font-semibold text-white transition-colors hover:bg-pitch-deep disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch focus-visible:ring-offset-2"
  >
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />}
    {children}
  </button>
);

export const authLinkClass = 'font-semibold text-pitch underline-offset-4 hover:text-pitch-deep hover:underline';
