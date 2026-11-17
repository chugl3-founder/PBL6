import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { MatchStatisticsScreen } from '../src/screens/stats/MatchStatisticsScreen';
import { replayApi } from '../src/api/replayApi';

// Mock API replayApi
jest.mock('../src/api/replayApi', () => ({
  replayApi: {
    getStatistics: jest.fn(),
  },
}));

// Mock navigation hooks
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      matchId: 14,
      isPublic: true,
      title: 'Fuzhou Open 2019: Kento Momota vs Chou Tien Chen',
      playerAName: 'Kento Momota',
      playerBName: 'Chou Tien Chen',
    },
  }),
}));

const mockStatsData = {
  id: 1,
  matchId: 14,
  analysisId: 1,
  totalStrokes: 1643,
  totalRallies: 39,
  avgStrokesPerRally: 42.1,
  avgRallyDuration: 32.5,
  playerAStrokes: 850,
  playerBStrokes: 793,
  forehandCount: 920,
  backhandCount: 510,
  aroundheadCount: 213,
  unknownSideCount: 0,
  avgConfidence: 0.945,
  strokeDistribution: {
    SMASH: 340,
    DROP: 280,
    CLEAR: 410,
    DRIVE: 195,
    SERVE: 78,
    NET_SHOT: 340,
  },
  radarChart: {
    axes: ['attack', 'defense', 'net_play', 'consistency', 'variation'],
    upper: [85, 92, 88, 90, 84],
    lower: [82, 86, 79, 85, 80],
  },
  coachInsights: {
    insights: [
      {
        target: 'upper',
        category: 'Tấn công',
        insight: 'Kento Momota kiểm soát tốt các cú smash chéo sân đạt tỷ lệ ăn điểm cao.',
      },
    ],
  },
  tacticalPatterns: {
    top_transitions_2gram: [
      { from: 'SERVE', to: 'SMASH', count: 24 },
      { from: 'DROP', to: 'NET_SHOT', count: 18 },
    ],
  },
};

describe('Function H — Kiểm thử xem Thống kê và Biểu đồ trên điện thoại (Mobile Statistics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (replayApi.getStatistics as jest.Mock).mockResolvedValue(mockStatsData);
  });

  test('MT-05: Mở Dashboard thống kê và kiểm tra Tab Tổng quan', async () => {
    await render(<MatchStatisticsScreen />);

    // Chờ tải dữ liệu hoàn tất
    await waitFor(() => {
      expect(screen.getByText('Tương Quan Khối Lượng Cú Đánh')).toBeTruthy();
    });

    // Kiểm tra 4 thẻ chỉ số cốt lõi
    expect(screen.getByText('1643')).toBeTruthy(); // Tổng cú đánh
    expect(screen.getByText('39')).toBeTruthy();   // Tổng pha cầu
    expect(screen.getByText('42.1')).toBeTruthy(); // Chạm / pha TB
    expect(screen.getByText('32.5s')).toBeTruthy(); // Thời lượng TB

    // Kiểm tra tương quan khối lượng 2 tuyển thủ
    expect(screen.getByText('Kento Momota')).toBeTruthy();
    expect(screen.getByText('Chou Tien Chen')).toBeTruthy();

    // Kiểm tra kỹ thuật cầm vợt
    expect(screen.getByText('Thuận tay (Forehand)')).toBeTruthy();
    expect(screen.getByText('Trái tay (Backhand)')).toBeTruthy();
  });

  test('MT-06: Chuyển sang Tab Biểu đồ cú đánh (Donut & Column Chart)', async () => {
    await render(<MatchStatisticsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tương Quan Khối Lượng Cú Đánh')).toBeTruthy();
    });

    // Chuyển sang Tab Biểu đồ cú đánh
    const chartTab = screen.getByText('Biểu đồ cú đánh');
    fireEvent.press(chartTab);

    // Kiểm tra biểu đồ tròn Donut & bảng định lượng hiển thị
    await waitFor(() => {
      expect(screen.getByText('Biểu Đồ Tròn Phân Bố Cú Đánh')).toBeTruthy();
    });
    expect(screen.getByText('Biểu Đồ Cột Tần Suất Kỹ Thuật')).toBeTruthy();
    expect(screen.getByText('Bảng Thống Kê Định Lượng Chi Tiết')).toBeTruthy();

    // Kiểm tra chi tiết kỹ thuật
    expect(screen.getAllByText('Đập cầu (Smash)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bỏ nhỏ (Drop)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phông cầu (Clear)').length).toBeGreaterThan(0);
  });

  test('MT-07: Chuyển sang Tab Chiến thuật AI (Radar 5 trục & 2-Gram)', async () => {
    await render(<MatchStatisticsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tương Quan Khối Lượng Cú Đánh')).toBeTruthy();
    });

    // Chuyển sang Tab Chiến thuật AI
    const tacticsTab = screen.getByText('Chiến thuật AI');
    fireEvent.press(tacticsTab);

    // Kiểm tra biểu đồ Radar và chuỗi phối hợp
    await waitFor(() => {
      expect(screen.getByText('Biểu Đồ Radar 5 Trục Năng Lực')).toBeTruthy();
    });
    expect(screen.getAllByText('Tấn công').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phòng thủ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kiểm soát lưới').length).toBeGreaterThan(0);

    // Kiểm tra chuỗi phối hợp 2-gram
    expect(screen.getByText('Chuỗi Phối Hợp Chiến Thuật Phổ Biến')).toBeTruthy();
    expect(screen.getByText('SERVE')).toBeTruthy();
    expect(screen.getByText('24 lần')).toBeTruthy();

    // Kiểm tra nhận định HLV AI
    expect(screen.getByText('Nhận Xét Chiến Thuật Huấn Luyện Viên AI')).toBeTruthy();
  });
});
