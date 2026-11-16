import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, type LucideIcon } from 'lucide-react';

/**
 * Account pages (login, register, password recovery): one white card on the light page, the form on the left
 * and the arena photo filling the right half, marked the way the AI reads a match.
 */
export const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  top?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, top, footer, children }) => (
  <div className="font-vn mx-auto max-w-5xl py-2 lg:py-6">
    <div className="grid overflow-hidden rounded-lg border border-ink/10 bg-sheet shadow-[0_12px_40px_-24px_rgba(22,32,27,0.35)] lg:grid-cols-2 lg:min-h-[600px]">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-[400px] mx-auto lg:mx-0">
          {top}
          <h1 className="font-score text-[2.6rem] leading-none font-semibold text-ink">{title}</h1>
          <p className="mt-3 mb-7 text-[15px] leading-relaxed text-ink/65">{subtitle}</p>
          {children}
          {footer && <div className="mt-7 border-t border-ink/10 pt-5 text-sm text-ink/65">{footer}</div>}
        </div>
      </div>
      <figure className="relative hidden lg:block">
        <img
          src="/images/auth-player.jpg"
          alt="Vận động viên bật nhảy đập cầu, được khung lại và gắn nhãn cú đánh như trên màn hình phân tích"
          width={PHOTO_W}
          height={PHOTO_H}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <PlayerTag />
        {/* On the floor strip under the player's feet, below the tracking box. */}
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-8 pb-6 pt-12 text-white">
          <p className="font-score text-[1.75rem] leading-tight font-semibold">Từng cú đánh, đúng chỗ cầu rơi.</p>
          <p className="mt-1 text-sm text-white/75">AI gọi tên từng cú và chỉ ra pha mất điểm trong video trận đấu.</p>
        </figcaption>
      </figure>
    </div>
  </div>
);

/**
 * /images/auth-player.jpg is the arena photo cropped to a portrait around the player, so a narrow or tall column
 * never cuts him off. The overlay uses its pixel coordinates so the box stays on him.
 */
const PHOTO_W = 1100;
const PHOTO_H = 1380;
const BOX = { x: 300, y: 215, w: 500, h: 950 };
const CORNER = 70;

/**
 * Tracking corners around the player with the stroke the AI named, as on the analysis screens.
 * Same scaling as the photo (object-cover, centred), so it lines up at any column size.
 */
const PlayerTag: React.FC = () => {
  const { x, y, w, h } = BOX;
  const r = x + w;
  const b = y + h;
  const corners = [
    `M${x} ${y + CORNER}V${y}H${x + CORNER}`,
    `M${r - CORNER} ${y}H${r}V${y + CORNER}`,
    `M${x} ${b - CORNER}V${b}H${x + CORNER}`,
    `M${r - CORNER} ${b}H${r}V${b - CORNER}`,
  ].join('');
  return (
    <svg
      viewBox={`0 0 ${PHOTO_W} ${PHOTO_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <path d={corners} fill="none" stroke="#6FCF97" strokeWidth={7} strokeLinecap="square" />
      <rect x={x} y={y - 92} width={250} height={70} rx={10} fill="#2E7D5B" />
      <text x={x + 125} y={y - 45} textAnchor="middle" fontSize={40} fontWeight={700} fill="#fff" fontFamily="'Be Vietnam Pro', sans-serif">
        Đập cầu
      </text>
    </svg>
  );
};

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
