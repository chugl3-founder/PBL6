import type { AiEventData, RallyData } from '../types/replay';

/**
 * The AI records sides by court half (UPPER/LOWER), but players change ends after every game and at 11 in
 * game 3. The backend follows them and sends, per rally, who was on the upper half (upperPlayer). These helpers
 * turn the data back into "the side the player was on when the video starts", so the whole-match views
 * (Đáng chú ý, Vì sao mất điểm, heatmap, tỉ số) can keep naming a side by match.upperPlayer.
 */

type Side = 'UPPER' | 'LOWER';

const flip = <T extends string>(side: T): T =>
  (side === 'UPPER' ? 'LOWER' : side === 'LOWER' ? 'UPPER' : side) as T;

/** Same spot as seen from the other end: both axes reversed, so the player's own left and right stay. */
const mirror = (p?: [number, number]): [number, number] | undefined =>
  p && p.length === 2 ? [1 - p[0], 1 - p[1]] : p;

/** Who was on the upper half at a given time: the rally in play, else the last rally before it. */
export const upperPlayerLookup = (rallies: RallyData[], startingUpper: string) => {
  const ordered = rallies
    .filter((r) => r.upperPlayer)
    .sort((a, b) => a.startTime - b.startTime);
  return (timeSeconds: number): string => {
    let found: string | undefined;
    for (const r of ordered) {
      if (r.startTime - 0.05 > timeSeconds) break;
      found = r.upperPlayer;
    }
    return found ?? ordered[0]?.upperPlayer ?? startingUpper;
  };
};

/** True when the data covers more than one end, i.e. per-side numbers would mix the two players. */
export const changesEnds = (rallies: RallyData[]) =>
  new Set(rallies.map((r) => r.upperPlayer).filter(Boolean)).size > 1;

/** Rallies with winnerSide and serverSide re-expressed as the side each player started on. */
export const ralliesFromStartingEnds = (rallies: RallyData[], startingUpper: string): RallyData[] =>
  rallies.map((r) =>
    r.upperPlayer && r.upperPlayer !== startingUpper
      ? { ...r, winnerSide: flip(r.winnerSide), serverSide: flip(r.serverSide) }
      : r
  );

/** Events with playerSide and court positions re-expressed as the side each player started on. */
export const eventsFromStartingEnds = (
  events: AiEventData[],
  rallies: RallyData[],
  startingUpper: string
): AiEventData[] => {
  if (!changesEnds(rallies)) return events;
  const upperAt = upperPlayerLookup(rallies, startingUpper);
  return events.map((e) =>
    upperAt(e.timeSeconds) === startingUpper
      ? e
      : {
          ...e,
          playerSide: flip<Side>(e.playerSide),
          playerPositionCourt: mirror(e.playerPositionCourt),
          opponentPositionCourt: mirror(e.opponentPositionCourt),
          contactShuttleProjectionCourt: mirror(e.contactShuttleProjectionCourt),
          landingPositionCourtProxy: mirror(e.landingPositionCourtProxy),
        }
  );
};

/** Start of the first rally played after the match was already won, or null. */
export const matchEndTime = (rallies: RallyData[]): number | null => {
  const after = rallies.filter((r) => r.afterMatch).map((r) => r.startTime);
  return after.length ? Math.min(...after) : null;
};
