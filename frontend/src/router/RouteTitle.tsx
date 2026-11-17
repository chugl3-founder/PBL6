import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'BadmintonAI';

/** First match wins; pages with a name of their own (a player, a report) set it once their data loads. */
const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, 'Phân tích trận cầu lông bằng AI'],
  [/^\/public-matches\/\d+\/replay/, 'Xem lại trận'],
  [/^\/public-matches/, 'Thư viện trận đấu'],
  [/^\/players\/.+/, 'Hồ sơ vận động viên'],
  [/^\/players/, 'Vận động viên'],
  [/^\/scouting\/.+/, 'Báo cáo trinh sát'],
  [/^\/scouting/, 'Trinh sát đối thủ'],
  [/^\/highlights/, 'Video highlight'],
  [/^\/my-matches/, 'Trận của tôi'],
  [/^\/matches\/create/, 'Thêm trận'],
  [/^\/matches\/\d+\/replay/, 'Xem lại trận'],
  [/^\/matches\/\d+/, 'Thông tin trận'],
  [/^\/profile/, 'Hồ sơ của tôi'],
  [/^\/login/, 'Đăng nhập'],
  [/^\/register/, 'Đăng ký'],
  [/^\/forgot-password/, 'Quên mật khẩu'],
  [/^\/reset-password/, 'Đặt lại mật khẩu'],
  [/^\/admin\/matches/, 'Quản trị · Trận đấu'],
  [/^\/admin\/users/, 'Quản trị · Người dùng'],
  [/^\/admin\/ai-monitor/, 'Quản trị · Giám sát AI'],
  [/^\/admin\/content/, 'Quản trị · Nội dung'],
  [/^\/admin/, 'Quản trị · Tổng quan'],
];

/**
 * Keeps the browser tab title in step with the route. Rendered before the routes, so its effect runs first
 * and a page that names itself (PlayersPage, ScoutingReportPage...) still has the last word.
 */
export const RouteTitle: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const title = TITLES.find(([pattern]) => pattern.test(pathname))?.[1];
    document.title = title ? `${title} · ${SITE}` : SITE;
  }, [pathname]);
  return null;
};
