import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  PublicMatches: undefined;
  MyMatches: undefined;
  CreateMatchTab: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;
  MatchReplay: {
    matchId: number;
    isPublic?: boolean;
    title?: string;
  };
  MatchStatistics: {
    matchId: number;
    isPublic?: boolean;
    title?: string;
    playerAName?: string;
    playerBName?: string;
  };
  CreateMatch: undefined;
};

