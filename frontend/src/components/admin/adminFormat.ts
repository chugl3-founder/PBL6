import { errorMessage, errorStatus, isNetworkError } from '../../api/errors';

/** Plain helpers shared by the admin sections. */

export type Feedback = (type: 'success' | 'error', text: string) => void;

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
      return level || 'Phong trào';
  }
};
