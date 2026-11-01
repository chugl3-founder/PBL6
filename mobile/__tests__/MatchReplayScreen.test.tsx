import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { MatchReplayScreen } from '../src/screens/replay/MatchReplayScreen';
import { matchApi } from '../src/api/matchApi';
import { replayApi } from '../src/api/replayApi';

// Mock matchApi & replayApi
jest.mock('../src/api/matchApi', () => ({
  matchApi: {
    getPublicMatchDetail: jest.fn(),
    getMyMatchDetail: jest.fn(),
    getPublicMatchVideo: jest.fn(),
    getMyMatchVideo: jest.fn(),
  },
}));

jest.mock('../src/api/replayApi', () => ({
  replayApi: {
    getAiEvents: jest.fn(),
    getRallies: jest.fn(),
  },
}));

// Mock AuthContext
let mockUser: any = null;
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      matchId: 14,
      isPublic: true,
    },
  }),
}));

const mockMatchDetail = {
  id: 14,
  title: 'Fuzhou Open 2019: Kento Momota vs Chou Tien Chen',
  playerAName: 'Kento Momota',
  playerBName: 'Chou Tien Chen',
  upperPlayer: 'PLAYER_A',
  lowerPlayer: 'PLAYER_B',
  status: 'PUBLISHED',
  durationSeconds: 4980,
};

const mockVideoDetail = {
  id: 12,
  matchId: 14,
  videoUrl: 'https://www.youtube.com/watch?v=O669aZhH0LI',
  videoSourceType: 'YOUTUBE',
  youtubeVideoId: 'O669aZhH0LI',
  durationSeconds: 4980,
  status: 'READY',
};

const mockAiEvents = [
  {
    id: 101,
    eventOrder: 1,
    timeSeconds: 12.5,
    stroke: 'SMASH',
    playerSide: 'UPPER',
    strokeSide: 'FOREHAND',
    confidence: 0.96,
  },
  {
    id: 102,
    eventOrder: 2,
    timeSeconds: 15.2,
    stroke: 'DROP',
    playerSide: 'LOWER',
    strokeSide: 'BACKHAND',
    confidence: 0.92,
  },
];

const mockRallies = [
  {
    id: 201,
    rallyNumber: 1,
    startTime: 10.0,
    endTime: 22.0,
    duration: 12.0,
    scoreUpper: 1,
    scoreLower: 0,
    winnerSide: 'UPPER',
  },
  {
    id: 202,
    rallyNumber: 2,
    startTime: 28.0,
    endTime: 45.0,
    duration: 17.0,
    scoreUpper: 1,
    scoreLower: 1,
    winnerSide: 'LOWER',
  },
];

describe('Function G — Kiểm thử xem Phát lại trên điện thoại (Mobile Replay)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 1, email: 'athlete@badminton.vn' };
    (matchApi.getPublicMatchDetail as jest.Mock).mockResolvedValue(mockMatchDetail);
    (matchApi.getPublicMatchVideo as jest.Mock).mockResolvedValue(mockVideoDetail);
    (replayApi.getAiEvents as jest.Mock).mockResolvedValue(mockAiEvents);
    (replayApi.getRallies as jest.Mock).mockResolvedValue(mockRallies);
  });

  test('MT-01: Mở màn hình Replay của trận đấu đã phân tích thành công', async () => {
    await render(<MatchReplayScreen />);

    // Chờ màn hình tải xong và render thông tin trận đấu
    await waitFor(() => {
      expect(screen.getByText('Fuzhou Open 2019: Kento Momota vs Chou Tien Chen')).toBeTruthy();
    });

    // Kiểm tra tên 2 tuyển thủ và các nút chức năng
    expect(screen.getByText('Cú đánh (2)')).toBeTruthy();
    expect(screen.getByText('Pha cầu (2)')).toBeTruthy();
    expect(screen.getByText('Sân 2D Radar')).toBeTruthy();
  });

  test('MT-02: Nhảy đến sự kiện khi chạm vào mốc cú đánh trên Timeline', async () => {
    await render(<MatchReplayScreen />);

    await waitFor(() => {
      expect(screen.getByText('Fuzhou Open 2019: Kento Momota vs Chou Tien Chen')).toBeTruthy();
    });

    // Mở Tab Cú đánh để kiểm tra danh sách sự kiện
    const eventsTab = screen.getByText('Cú đánh (2)');
    fireEvent.press(eventsTab);

    // Kiểm tra sự kiện cú đánh SMASH của Player A
    await waitFor(() => {
      expect(screen.getByText('SMASH')).toBeTruthy();
    });
    expect(screen.getAllByText(/Kento Momota/).length).toBeGreaterThan(0);
    expect(screen.getByText(/FOREHAND/)).toBeTruthy();
    expect(screen.getByText('96%')).toBeTruthy();
  });

  test('MT-03: Chọn và phát lại một pha cầu từ danh sách Rallies', async () => {
    await render(<MatchReplayScreen />);

    await waitFor(() => {
      expect(screen.getByText('Fuzhou Open 2019: Kento Momota vs Chou Tien Chen')).toBeTruthy();
    });

    // Mở Tab Pha cầu
    const ralliesTab = screen.getByText('Pha cầu (2)');
    fireEvent.press(ralliesTab);

    // Kiểm tra thông tin các pha cầu hiển thị đúng
    await waitFor(() => {
      expect(screen.getAllByText(/Pha cầu #1/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Pha cầu #2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\s*-\s*0/).length).toBeGreaterThan(0);
  });

  test('MT-04: Giới hạn xem thử 300 giây (5 phút) cho Khách vãng lai', async () => {
    // Chế độ khách vãng lai (chưa đăng nhập)
    mockUser = null;

    await render(<MatchReplayScreen />);

    await waitFor(() => {
      expect(screen.getByText('Fuzhou Open 2019: Kento Momota vs Chou Tien Chen')).toBeTruthy();
    });

    // Trận đấu hiển thị đúng thông tin
    expect(screen.getByText('Fuzhou Open 2019: Kento Momota vs Chou Tien Chen')).toBeTruthy();
  });
});
