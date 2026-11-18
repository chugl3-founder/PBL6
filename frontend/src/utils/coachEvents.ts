/**
 * Window events between the page and the AI Coach widget, which lives outside the page's React tree.
 * - ask-coach: the page opens the chat and sends a question in the user's name.
 * - play-rallies: the chat asks the Replay page to play the rallies an answer named, one after another.
 */
export const ASK_COACH_EVENT = 'badminton:ask-coach';
export const PLAY_RALLIES_EVENT = 'badminton:play-rallies';

export interface AskCoachDetail {
  message: string;
}

/** seconds: the start the answer gave, so a link to a rally of another match is not played here. */
export interface PlayRalliesDetail {
  rallies: Array<{ rallyNumber: number; seconds: number }>;
  title: string;
}

export const askCoach = (message: string) => {
  window.dispatchEvent(new CustomEvent<AskCoachDetail>(ASK_COACH_EVENT, { detail: { message } }));
};

export const playRallies = (rallies: PlayRalliesDetail['rallies'], title: string) => {
  window.dispatchEvent(new CustomEvent<PlayRalliesDetail>(PLAY_RALLIES_EVENT, { detail: { rallies, title } }));
};

/**
 * The question behind "Hỏi HLV AI cách khai thác": the coach looks the player up across their matches and
 * answers how an opponent should play against those weaknesses (the matches are broadcast pro matches).
 */
export const exploitWeaknessPrompt = (player: string, matchId?: number) =>
  `Phân tích điểm yếu của ${player} qua các trận đã phân tích`
  + (matchId ? ` (đang xem trận #${matchId})` : '')
  + `, điểm yếu nào đang lộ rõ hơn ở trận gần đây, và đối thủ nên đánh thế nào để khai thác chúng.`;

/** A rally named in a coach answer, to be played in a list. */
export interface PlaylistRally {
  rallyNumber: number;
  seconds: number;
}

/**
 * The Replay of a match that, once open, plays these rallies one after another ("?playlist=12@340,3@62").
 * The coach uses it for rallies of a match other than the one on screen.
 */
export const replayPlaylistUrl = (matchId: number | string, rallies: PlaylistRally[], title: string) => {
  const params = new URLSearchParams({
    playlist: rallies.map(r => `${r.rallyNumber}@${Math.floor(r.seconds)}`).join(','),
    title,
  });
  return `/public-matches/${matchId}/replay?${params.toString()}`;
};

/** The rallies of a "?playlist=" parameter; empty when there is none or it is malformed. */
export const parsePlaylistParam = (value: string | null): PlaylistRally[] =>
  (value ?? '')
    .split(',')
    .map(item => item.match(/^(\d+)@(\d+)$/))
    .filter((m): m is RegExpMatchArray => m != null)
    .map(m => ({ rallyNumber: Number(m[1]), seconds: Number(m[2]) }));
