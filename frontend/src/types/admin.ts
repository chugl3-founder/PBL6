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
