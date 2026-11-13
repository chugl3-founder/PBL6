import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReplayRallies } from '../../api/analysis';
import { getPublicMatch } from '../../api/matches';
import type { Match } from '../../types/match';
import type { RallyData } from '../../types/replay';
import { eventLabel, matchEvent } from '../../utils/matchLabels';

/** Bars reach full height at this many strokes; the longest rallies of a final run past 60. */
const FULL_STROKES = 60;

const minuteOf = (seconds: number) => Math.floor(seconds / 60);

/**
 * The opening of the home page: every rally of a real analysed match, as bars. A rally won by one player rises
 * above the line, one won by the other drops below; the taller the bar, the longer the rally. Clicking a bar
 * opens the replay at that rally. Renders nothing until the data is there (or if it never comes).
 */
export const RallyRibbon: React.FC<{ matchId: number }> = ({ matchId }) => {
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [rallies, setRallies] = useState<RallyData[]>([]);
  const [hovered, setHovered] = useState<RallyData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublicMatch(matchId), getReplayRallies(matchId, true)])
      .then(([m, r]) => {
        if (cancelled) return;
        setMatch(m);
        setRallies(r.filter((x) => !x.afterMatch && (x.winnerPlayer === 'PLAYER_A' || x.winnerPlayer === 'PLAYER_B')));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const counts = useMemo(
    () => ({
      a: rallies.filter((r) => r.winnerPlayer === 'PLAYER_A').length,
      b: rallies.filter((r) => r.winnerPlayer === 'PLAYER_B').length,
      longest: rallies.reduce<RallyData | null>((best, r) => (!best || r.totalStrokes > best.totalStrokes ? r : best), null),
    }),
    [rallies],
  );

  if (!match || rallies.length === 0) return null;

  const colorA = match.upperPlayer === 'PLAYER_B' ? 'bg-pb' : 'bg-pa';
  const colorB = match.upperPlayer === 'PLAYER_B' ? 'bg-pa' : 'bg-pb';
  const event = eventLabel(matchEvent(match));
  const nameOf = (r: RallyData) => (r.winnerPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName);
  const describe = (r: RallyData) =>
    `Pha ${r.rallyNumber}, phút ${minuteOf(r.startTime)}: ${r.totalStrokes} cú, ${nameOf(r)} ghi điểm`;
  const shown = hovered ?? counts.longest;

  return (
    <section className="rounded-2xl bg-mat text-white p-5 sm:p-8" aria-labelledby="ribbon-title">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          {event && <p className="text-sm text-white/60">{event}</p>}
          <h2 id="ribbon-title" className="font-score text-3xl sm:text-4xl font-semibold leading-tight">
            <span className="whitespace-nowrap">
              <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle ${colorA}`} aria-hidden />
              {match.playerAName}
            </span>{' '}
            <span className="text-white/40 font-normal">gặp</span>{' '}
            <span className="whitespace-nowrap">
              <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle ${colorB}`} aria-hidden />
              {match.playerBName}
            </span>
          </h2>
        </div>
        <p className="text-sm text-white/65 max-w-xs">
          {rallies.length} pha cầu AI đã tách từ video. Bấm một pha để xem lại đúng đoạn đó.
        </p>
      </div>

      {/* Above the line: rallies won by player A; below: by player B. */}
      <div className="relative mt-6 h-44 sm:h-52" role="group" aria-label="Diễn biến từng pha cầu">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" aria-hidden />
        <div className="relative flex h-full gap-[3px]">
          {rallies.map((r, i) => {
            const aWon = r.winnerPlayer === 'PLAYER_A';
            const height = Math.max(8, Math.min(100, (r.totalStrokes / FULL_STROKES) * 100));
            const newGame = i > 0 && (r.gameNumber ?? 1) !== (rallies[i - 1].gameNumber ?? 1);
            return (
              <React.Fragment key={r.id}>
                {newGame && <span className="w-px mx-1 h-full bg-white/20" aria-hidden />}
                <button
                  type="button"
                  aria-label={describe(r)}
                  onMouseEnter={() => setHovered(r)}
                  onFocus={() => setHovered(r)}
                  onMouseLeave={() => setHovered(null)}
                  onBlur={() => setHovered(null)}
                  onClick={() => navigate(`/public-matches/${match.id}/replay?t=${Math.max(0, Math.floor(r.startTime - 1))}`)}
                  className="group relative flex-1 min-w-[4px] h-full focus-visible:outline-none"
                >
                  <span
                    className={`absolute inset-x-0 rounded-[2px] ${aWon ? colorA : colorB} ${
                      shown?.id === r.id ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'
                    } group-focus-visible:ring-2 group-focus-visible:ring-white motion-safe:animate-ribbon-grow`}
                    style={{
                      height: `${height / 2}%`,
                      ...(aWon ? { bottom: '50%', transformOrigin: 'bottom' } : { top: '50%', transformOrigin: 'top' }),
                      animationDelay: `${i * 18}ms`,
                    }}
                  />
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
        <p className="text-white/80 min-h-[1.25rem]" aria-live="polite">
          {shown && (hovered ? describe(shown) : `Pha dài nhất: ${shown.totalStrokes} cú, ${nameOf(shown)} ghi điểm`)}
        </p>
        <p className="text-white/60">
          {match.playerAName} thắng {counts.a} pha, {match.playerBName} thắng {counts.b} pha
        </p>
      </div>
    </section>
  );
};
