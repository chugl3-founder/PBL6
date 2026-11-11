import React from 'react';
import { initials } from '../../utils/playerProfile';

const SIZES = {
  sm: 'w-9 h-9 text-base rounded-lg',
  md: 'w-12 h-12 text-xl rounded-lg',
  lg: 'w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl rounded-xl',
};

/** A player's initials on a court-green tile, in scoreboard type. */
export const PlayerMonogram: React.FC<{ name: string; size?: keyof typeof SIZES; className?: string }> = ({
  name,
  size = 'md',
  className = '',
}) => (
  <span
    className={`relative shrink-0 inline-flex items-center justify-center overflow-hidden bg-pitch text-white font-score font-bold tracking-wide ${SIZES[size]} ${className}`}
    aria-hidden
  >
    {/* A court's service lines, faintly, behind the letters */}
    <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
    <span className="absolute inset-x-0 top-[30%] h-px bg-white/10" />
    <span className="absolute inset-x-0 bottom-[30%] h-px bg-white/10" />
    <span className="relative">{initials(name)}</span>
  </span>
);
