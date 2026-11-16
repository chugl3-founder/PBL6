import { useMemo } from 'react';
import type { MatchStatisticsData } from '../components/replay/StatisticsDashboard';
import type { Match } from '../types/match';
import type { AiEventData, RallyData } from '../types/replay';
import {
  changesEnds,
  eventsFromStartingEnds,
  matchEndTime,
  ralliesFromStartingEnds,
  upperPlayerLookup,
} from '../utils/courtEnds';

/**
 * Players change ends between games. Whole-match views name a side by match.upperPlayer, so they get the data
 * re-expressed as the side each player started on; live views (court diagram, stroke card) keep the real
 * halves and use who was on top at that moment. Rallies after the match was won are left out of whole-match
 * views.
 */
export const usePlayerSides = (
  match: Match | null,
  rallies: RallyData[],
  events: AiEventData[],
  shownEvents: AiEventData[],
  statistics: MatchStatisticsData | null,
  selectedEvent: AiEventData | null,
) => {
  const startingUpper = match?.upperPlayer ?? 'PLAYER_A';
  const upperAt = useMemo(() => upperPlayerLookup(rallies, startingUpper), [rallies, startingUpper]);
  const inMatchRallies = useMemo(() => rallies.filter(r => !r.afterMatch), [rallies]);
  const ralliesFromStart = useMemo(() => ralliesFromStartingEnds(rallies, startingUpper), [rallies, startingUpper]);
  const playerRallies = useMemo(() => ralliesFromStart.filter(r => !r.afterMatch), [ralliesFromStart]);
  const playerEvents = useMemo(() => {
    const end = matchEndTime(rallies);
    const inMatch = end == null ? events : events.filter(e => e.timeSeconds < end - 0.05);
    return eventsFromStartingEnds(inMatch, rallies, startingUpper);
  }, [events, rallies, startingUpper]);
  const timelineEvents = useMemo(
    () => eventsFromStartingEnds(shownEvents, rallies, startingUpper),
    [shownEvents, rallies, startingUpper]
  );
  // match_statistics counts strokes per court half; recount per player once the players have changed ends.
  const playerStatistics = useMemo(() => {
    if (!statistics || !changesEnds(rallies)) return statistics;
    const startingUpperSide = playerEvents.filter(e => e.playerSide === 'UPPER').length;
    const startingLowerSide = playerEvents.length - startingUpperSide;
    const aOnTop = startingUpper === 'PLAYER_A';
    return {
      ...statistics,
      playerAStrokes: aOnTop ? startingUpperSide : startingLowerSide,
      playerBStrokes: aOnTop ? startingLowerSide : startingUpperSide,
    };
  }, [statistics, rallies, playerEvents, startingUpper]);
  const liveUpperPlayer = selectedEvent ? upperAt(selectedEvent.timeSeconds) : startingUpper;

  // Names and colours follow the player who started on each half, everywhere on the page.
  const upperName = match ? (match.upperPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName) : '';
  const lowerName = match ? (match.upperPlayer === 'PLAYER_A' ? match.playerBName : match.playerAName) : '';
  const playerAColor = match?.upperPlayer === 'PLAYER_B' ? 'text-pb' : 'text-pa';
  const playerBColor = match?.upperPlayer === 'PLAYER_B' ? 'text-pa' : 'text-pb';

  /** True when the hitter of this event is the player who started on the upper half. */
  const hitByStartingUpper = (e: AiEventData) => (e.playerSide === 'UPPER') === (upperAt(e.timeSeconds) === startingUpper);

  return {
    startingUpper,
    inMatchRallies,
    ralliesFromStart,
    playerRallies,
    playerEvents,
    timelineEvents,
    playerStatistics,
    liveUpperPlayer,
    upperName,
    lowerName,
    playerAColor,
    playerBColor,
    hitByStartingUpper,
  };
};
