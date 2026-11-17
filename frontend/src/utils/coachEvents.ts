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

/** The question behind "Nhờ HLV AI lập giáo án": the coach looks the player up across their matches. */
export const trainingPlanPrompt = (player: string, matchId?: number) =>
  `Lập giáo án tập luyện 1 tuần cho ${player} dựa trên điểm yếu qua các trận đã phân tích`
  + (matchId ? ` (đang xem trận #${matchId})` : '')
  + '. Cho biết điểm yếu nào đã tiến bộ hay sa sút, và đặt chỉ số cần đạt ở trận tới.';
