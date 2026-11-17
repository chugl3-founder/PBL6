import { errorMessage, errorStatus, isNetworkError } from '../../api/errors';

/** Plain helpers shared by the admin sections. */

/** Rows fetched per request; "Tải thêm" asks for the next batch. */
export const PAGE_SIZE = 50;

/** The server's message when there is one, otherwise what went wrong in plain words. */
export const loadErrorText = (err: unknown, what: string) =>
  errorMessage(
    err,
    isNetworkError(err)
      ? `Không kết nối được máy chủ nên chưa tải được ${what}.`
      : `Không tải được ${what} (lỗi ${errorStatus(err)}).`,
  );

export const numberFormat = new Intl.NumberFormat('vi-VN');

export const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

export const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

/** "5 phút trước", for things that just happened; older ones get the date. */
export const timeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return formatDate(iso);
};

export const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '';
  const total = Math.round(Number(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};

export const getLevelLabel = (level?: string | null) => {
  switch (level) {
    case 'BEGINNER':
      return 'Mới chơi';
    case 'INTERMEDIATE':
      return 'Phong trào';
    case 'ADVANCED':
      return 'Nâng cao';
    case 'PRO':
      return 'Chuyên nghiệp';
    default:
      return level || 'Chưa khai báo';
  }
};
