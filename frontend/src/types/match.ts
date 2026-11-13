/** Shapes returned by the backend for matches and their video (MatchResponse, VideoResponse). */

export type MatchStatus = 'DRAFT' | 'READY' | 'ANALYZING' | 'ANALYZED' | 'PUBLISHED';
export type PlayerSlot = 'PLAYER_A' | 'PLAYER_B';

export interface Match {
  id: number;
  ownerId: number;
  ownerEmail?: string;
  playerAName: string;
  playerBName: string;
  /** Who stands on the upper half of the court when the video starts. */
  upperPlayer: PlayerSlot | string;
  lowerPlayer: PlayerSlot | string;
  matchDate: string;
  /** Game and per-player score when the video starts, for clips that start mid-game. */
  startGame?: number;
  startScoreA?: number;
  startScoreB?: number;
  title: string | null;
  description?: string | null;
  source?: string;
  status: MatchStatus | string;
  thumbnailUrl?: string | null;
  youtubeVideoId?: string | null;
  durationSeconds?: number | null;
  totalStrokes?: number | null;
  totalRallies?: number | null;
  /** Per-player game scores seen in the video, and the winner once a player has won two games. */
  result?: MatchResult | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface GameScore {
  scoreA: number;
  scoreB: number;
  /** False for the game the video stops in. */
  finished: boolean;
}

export interface MatchResult {
  games: GameScore[];
  winner: PlayerSlot | null;
}

export interface MatchVideo {
  id: number;
  matchId: number;
  fileName: string;
  storagePath: string;
  videoUrl: string;
  videoSourceType?: 'UPLOAD' | 'YOUTUBE' | string;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  mimeType?: string;
  fileSize?: number | null;
  durationSeconds?: number | null;
  status?: string;
}

export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  pagination: PaginationMeta;
}
