import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Video } from 'lucide-react';
import type { Match } from '../../types/match';
import { eventLabel, gamesWon, matchEvent, formatDuration } from '../../utils/matchLabels';

/** Player colours follow the side each player starts on, as on the Replay page. */
const playerColors = (match: Match) =>
  match.upperPlayer === 'PLAYER_B' ? { a: 'bg-pb', b: 'bg-pa' } : { a: 'bg-pa', b: 'bg-pb' };

interface ScoreRowsProps {
  match: Match;
  size?: 'card' | 'feature';
}

/**
 * The two players as a scoreboard: a colour bar each, the winner in bold, and the score of every game that
 * finished in the video. Analyses that cover part of a match have no finished game, so no score is shown.
 */
export const ScoreRows: React.FC<ScoreRowsProps> = ({ match, size = 'card' }) => {
  const { finished } = gamesWon(match);
  const colors = playerColors(match);
  const winner = match.result?.winner ?? null;
  const name = size === 'feature' ? 'text-xl sm:text-2xl' : 'text-base';
  const score = size === 'feature' ? 'text-2xl w-9' : 'text-lg w-7';
  const rows = [
    { slot: 'PLAYER_A', name: match.playerAName, bar: colors.a, scores: finished.map((g) => [g.scoreA, g.scoreB]) },
    { slot: 'PLAYER_B', name: match.playerBName, bar: colors.b, scores: finished.map((g) => [g.scoreB, g.scoreA]) },
  ];
  return (
    <div className="divide-y divide-ink/10" aria-label={`${match.playerAName} gặp ${match.playerBName}`}>
      {rows.map((row) => {
        const won = winner === row.slot;
        return (
          <div key={row.slot} className="flex items-center gap-2.5 py-1.5">
            <span className={`w-1 self-stretch rounded-full ${row.bar}`} aria-hidden />
            <span className={`flex-1 min-w-0 truncate ${name} ${won || !winner ? 'font-semibold text-ink' : 'text-ink/65'}`}>
              {row.name}
            </span>
            {row.scores.map(([own, other], i) => (
              <span
                key={i}
                className={`font-score ${score} text-right tabular-nums ${own > other ? 'font-semibold text-ink' : 'text-ink/50'}`}
              >
                {own}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/** One analysed public match: the whole card opens its replay. */
export const PublicMatchCard: React.FC<{ match: Match }> = ({ match }) => {
  const event = eventLabel(matchEvent(match));
  const duration = formatDuration(match.durationSeconds);
  const { finished } = gamesWon(match);

  return (
    <Link
      to={`/public-matches/${match.id}/replay`}
      className="group flex flex-col rounded-lg bg-sheet border border-ink/10 overflow-hidden hover:border-pitch/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 transition-colors"
    >
      <div className="relative aspect-video bg-ink flex items-center justify-center overflow-hidden">
        {match.thumbnailUrl ? (
          <img src={match.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Video className="h-9 w-9 text-white/25" aria-hidden />
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
      <div className="flex-1 flex flex-col p-4 gap-2">
        {event && <p className="text-sm text-ink/65 truncate">{event}</p>}
        <ScoreRows match={match} />
        <p className="mt-auto pt-1 text-xs text-ink/60">
          {finished.length === 0 && match.totalRallies ? `${match.totalRallies} pha cầu đã phân tích` : null}
          {finished.length > 0 && match.totalRallies ? `${match.totalRallies} pha cầu` : null}
          {duration && <span className="float-right tabular-nums">{duration}</span>}
        </p>
      </div>
    </Link>
  );
};
