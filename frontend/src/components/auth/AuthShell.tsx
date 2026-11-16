import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, type LucideIcon } from 'lucide-react';

/**
 * Account pages (login, register, password recovery): the white form card over the arena photo, where the
 * player's smash is traced from the racket to where the shuttle lands, the way the AI follows it in a match.
 */

/** Size of /images/court-bg.jpg; the overlay shares its coordinates so the trace stays on the racket. */
const PHOTO_W = 2070;
const PHOTO_H = 1380;
const RACKET = { x: 1404, y: 292 };
/** The shuttle leaves the racket forward, over the player's head, before it dives; a straight line would cut through him. */
const BEND = { x: 1130, y: 170 };
const LANDING = { x: 820, y: 1180 };

const SmashTrace: React.FC = () => (
  <svg
    viewBox={`0 0 ${PHOTO_W} ${PHOTO_H}`}
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 h-full w-full pointer-events-none"
    aria-hidden
  >
    <path
      d={`M${RACKET.x} ${RACKET.y}Q${BEND.x} ${BEND.y} ${LANDING.x} ${LANDING.y}`}
      pathLength={1}
      fill="none"
      stroke="#6FCF97"
      strokeWidth={6}
      strokeLinecap="round"
      strokeDasharray="1"
      className="motion-safe:animate-trace"
      style={{ animationDelay: '500ms', animationDuration: '700ms' }}
    />
    <g
      className="motion-safe:animate-pop"
      style={{ animationDelay: '1150ms', transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <ellipse cx={LANDING.x} cy={LANDING.y} rx={46} ry={16} fill="none" stroke="#6FCF97" strokeWidth={5} />
      <circle cx={LANDING.x} cy={LANDING.y} r={8} fill="#6FCF97" />
    </g>
  </svg>
);

export const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  top?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, top, footer, children }) => (
  <div className="font-vn relative overflow-hidden rounded-lg bg-[#0B1310] min-h-[calc(100vh-7.5rem)] flex items-center">
    <img
      src="/images/court-bg.jpg"
      alt=""
      width={PHOTO_W}
      height={PHOTO_H}
      className="absolute inset-0 h-full w-full object-cover"
    />
    <SmashTrace />

    <div className="relative z-10 w-full px-4 py-8 sm:px-10 lg:px-16">
      <div className="w-full max-w-[420px] rounded-lg bg-sheet p-7 text-ink shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)] sm:p-9">
        {top}
        <h1 className="font-score text-[2.6rem] leading-none font-semibold">{title}</h1>
        <p className="mt-3 mb-7 text-[15px] leading-relaxed text-ink/65">{subtitle}</p>
        {children}
        {footer && <div className="mt-7 border-t border-ink/10 pt-5 text-sm text-ink/65">{footer}</div>}
      </div>
    </div>

    {/* On the dark curtain above the player, clear of the chat button in the bottom corner. */}
    <div className="absolute top-9 right-10 z-10 hidden max-w-[22rem] text-right text-white min-[1380px]:block">
      <p className="font-score text-[1.9rem] leading-tight font-semibold">Từng cú đánh, đúng chỗ cầu rơi.</p>
      <p className="mt-1.5 text-sm leading-relaxed text-white/70">
        AI tách từng pha cầu trong video, gọi tên từng cú và chỉ ra pha mất điểm bắt đầu từ đâu.
      </p>
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
  <fieldset>
    <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
    <div className="flex rounded-md border border-ink/10 bg-ground p-1">
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
