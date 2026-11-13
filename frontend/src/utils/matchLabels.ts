import type { Match } from '../types/match';

/**
 * Library titles look like "All England Open 2020 (Quarter-finals): Viktor Axelsen vs Shi Yuqi". Cards show the
 * event on its own line, in plain Vietnamese, without repeating the players.
 */
export interface MatchEvent {
  name: string;
  round: string | null;
}

const ROUNDS: Record<string, string> = {
  final: 'Chung kết',
  finals: 'Chung kết',
  'semi-finals': 'Bán kết',
  'semi-final': 'Bán kết',
  semifinals: 'Bán kết',
  'quarter-finals': 'Tứ kết',
  'quarter-final': 'Tứ kết',
  quarterfinals: 'Tứ kết',
};

/** Organisers and sponsors that stay in capitals when an all-caps title is put in title case. */
const ACRONYMS = new Set(['BWF', 'HSBC', 'YONEX', 'VICTOR', 'LI-NING', 'PBL6']);

/** "HSBC BWF WORLD TOUR FINALS 2020" -> "HSBC BWF World Tour Finals 2020". */
const tidyCase = (text: string) =>
  text === text.toUpperCase()
    ? text
        .split(' ')
        .map((w) => (ACRONYMS.has(w) || w.length <= 2 || /\d/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
        .join(' ')
    : text;

export const matchEvent = (match: Pick<Match, 'title' | 'playerAName' | 'playerBName'>): MatchEvent | null => {
  const title = match.title?.trim();
  if (!title) return null;
  const event = title.includes(':') ? title.slice(0, title.indexOf(':')).trim() : title;
  // A title that only names the players says nothing new.
  if (!event || event.includes(' vs ') || (event.includes(match.playerAName) && event.includes(match.playerBName))) {
    return null;
  }
  const round = event.match(/\(([^)]+)\)\s*$/);
  const name = round ? event.slice(0, round.index).trim() : event;
  const roundText = round ? ROUNDS[round[1].trim().toLowerCase()] ?? round[1].trim() : null;
  // A title like "Chung kết" is a round on its own.
  const asRound = ROUNDS[name.toLowerCase()];
  if (asRound) return { name: asRound, round: null };
  return { name: tidyCase(name), round: roundText };
};

export const eventLabel = (event: MatchEvent | null) =>
  event ? (event.round ? `${event.name}, ${event.round.toLowerCase()}` : event.name) : null;

/** Games each player won, counting only games that finished in the video. */
export const gamesWon = (match: Pick<Match, 'result'>) => {
  const games = match.result?.games ?? [];
  return {
    a: games.filter((g) => g.finished && g.scoreA > g.scoreB).length,
    b: games.filter((g) => g.finished && g.scoreB > g.scoreA).length,
    finished: games.filter((g) => g.finished),
  };
};

export const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
};
