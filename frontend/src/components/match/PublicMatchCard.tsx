import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Video } from 'lucide-react';

export interface PublicMatchItem {
  id: number;
  title?: string | null;
  courtName?: string | null;
  playerAName: string;
  playerBName: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  totalRallies?: number | null;
  totalStrokes?: number | null;
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** One analysed public match: the whole card opens its replay. */
export const PublicMatchCard: React.FC<{ match: PublicMatchItem }> = ({ match }) => {
  const players = `${match.playerAName} gặp ${match.playerBName}`;
  const event = [match.title, match.courtName].find((text) => text && text !== players && !text.includes(' vs '));
  const duration = formatDuration(match.durationSeconds);

  return (
    <Link
      to={`/public-matches/${match.id}/replay`}
      className="group flex flex-col rounded-lg bg-sheet border border-ink/10 overflow-hidden hover:border-pitch/50 transition-colors"
    >
      <div className="relative aspect-video bg-ink/[0.06] flex items-center justify-center overflow-hidden">
        {match.thumbnailUrl ? (
          <img src={match.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Video className="h-9 w-9 text-ink/20" aria-hidden />
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-ink/80 text-white text-xs tabular-nums">
            {duration}
          </span>
        )}
        <span
          className="absolute inset-0 flex items-center justify-center bg-ink/30 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden
        >
          <span className="w-11 h-11 rounded-full bg-pitch text-white flex items-center justify-center">
            <Play className="h-5 w-5 fill-white translate-x-0.5" />
          </span>
        </span>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-ink leading-snug group-hover:text-pitch-deep transition-colors line-clamp-2">
          {match.playerAName} <span className="font-normal text-ink/65">gặp</span> {match.playerBName}
        </h3>
        {event && <p className="text-sm text-ink/70 truncate">{event}</p>}
        <p className="text-xs text-ink/65 pt-1">
          {match.totalRallies || 0} pha cầu · {match.totalStrokes || 0} cú đánh
        </p>
      </div>
    </Link>
  );
};
