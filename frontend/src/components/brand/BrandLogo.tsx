import React from 'react';

/**
 * BadmintonAI brand: a shuttlecock in flight (green cork leading, white skirt) beside the
 * name. `tone` picks the skirt and text colour for dark or light backgrounds.
 */
export const LogoMark: React.FC<{ tone?: 'dark' | 'light'; className?: string }> = ({ tone = 'dark', className = 'w-[30px] h-[30px]' }) => {
  const skirt = tone === 'dark' ? '#FFFFFF' : '#16201B';
  const gap = tone === 'dark' ? '#16201B' : '#FFFFFF';
  return (
    <svg viewBox="0 0 32 32" className={`${className} shrink-0`} aria-hidden>
      <g transform="rotate(-40 16 16)">
        <circle cx="16" cy="23" r="5.6" fill="#6FCF97" />
        <path d="M10.4 21.5 L5.2 5.6 Q16 2.6 26.8 5.6 L21.6 21.5 Z" fill={skirt} />
        <path d="M14.1 21.5 L12.4 4.4 M17.9 21.5 L19.6 4.4" stroke={gap} strokeWidth="1.3" />
      </g>
    </svg>
  );
};

export const BrandLogo: React.FC<{ tone?: 'dark' | 'light' }> = ({ tone = 'dark' }) => (
  <span className="flex items-center gap-2">
    <LogoMark tone={tone} />
    <span className={`text-[19px] font-bold tracking-tight leading-none ${tone === 'dark' ? 'text-white' : 'text-ink'}`}>
      Badminton<span className={`font-extrabold ${tone === 'dark' ? 'text-[#6FCF97]' : 'text-pitch'}`}>AI</span>
    </span>
  </span>
);
