/** Shapes of the admin APIs (AdminDashboardResponse, UserResponse, AdminAnalysisResponse). */

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalMatches: number;
  publishedMatches: number;
  analyzedMatches: number;
  draftMatches: number;
  deletedMatches: number;
  totalAiAnalyses: number;
  completedAiAnalyses: number;
  failedAiAnalyses: number;
  processingAiAnalyses: number;
  aiSuccessRate: number;
  matchStatusBreakdown?: Record<string, number>;
  aiStatusBreakdown?: Record<string, number>;
  /** Scouting reports open to anyone with the link. */
  sharedReports?: number;
  highlightReels?: number;
}

/** A scouting report anyone with its link can open (AdminSharedReportResponse). */
export interface AdminSharedReport {
  id: number;
  title: string;
  opponentName: string;
  ownPlayerName: string | null;
  ownerEmail: string;
  ownerName: string | null;
  shareToken: string;
  updatedAt: string;
}

/** A highlight reel of any user (HighlightReelResponse plus ownerEmail). */
export interface AdminHighlight {
  id: number;
  matchId: number;
  playerAName: string;
  playerBName: string;
  title: string;
  status: 'QUEUED' | 'RENDERING' | 'COMPLETED' | 'FAILED' | string;
  progressPercent: number;
  clipCount: number;
  durationSeconds: number | null;
  fileSize: number | null;
  errorMessage: string | null;
  videoUrl: string | null;
  ownerEmail: string;
  createdAt: string;
  completedAt: string | null;
}

export interface UserAccount {
  id: number;
  email: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | string;
  fullName: string;
  avatarUrl?: string | null;
  age?: number | null;
  gender?: string | null;
  badmintonLevel?: string | null;
  status: 'ACTIVE' | 'LOCKED' | string;
  createdAt: string;
}

export interface AdminAnalysis {
  id: number;
  matchId: number | null;
  matchTitle: string | null;
  playerAName: string | null;
  playerBName: string | null;
  ownerEmail: string | null;
  videoId: number | null;
  status: string;
  modelName: string | null;
  modelVersion: string | null;
  progressPercent: number;
  currentStage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  isCurrent: boolean;
  createdAt: string;
}
