export interface MatchData {
  id: number;
  title: string | null;
  playerAName: string;
  playerBName: string;
  upperPlayer: 'PLAYER_A' | 'PLAYER_B' | string;
  lowerPlayer: 'PLAYER_A' | 'PLAYER_B' | string;
  matchDate: string;
  status: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  courtName?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  totalRallies?: number;
  totalStrokes?: number;
  visibility?: 'PUBLIC' | 'PRIVATE' | string;
  createdAt?: string;
}

export interface VideoData {
  id: number;
  matchId: number;
  fileName: string;
  storagePath: string;
  videoUrl: string;
  videoSourceType?: 'UPLOAD' | 'YOUTUBE' | string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  durationSeconds?: number;
}

export interface CreateMatchRequest {
  title: string;
  playerAName: string;
  playerBName: string;
  matchDate: string;
  courtName?: string;
  isPublic?: boolean;
}

