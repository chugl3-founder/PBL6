import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthShell, AuthField, AuthAlert, AuthSubmit, authLinkClass } from '../components/auth/AuthShell';
import { resetPassword } from '../api/auth';
import { errorMessage } from '../api/errors';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Mã khôi phục không tồn tại. Vui lòng bấm vào liên kết trong email hoặc gửi lại yêu cầu.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(errorMessage(err, 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc không hợp lệ.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      subtitle="Mật khẩu mới có hiệu lực ngay; các phiên đăng nhập cũ sẽ bị đăng xuất."
      footer={<>Nhớ mật khẩu? <Link to="/login" className={authLinkClass}>Đăng nhập</Link></>}
    >
      {!token && (
        <AuthAlert tone="error">
          Liên kết thiếu mã khôi phục. Mở lại liên kết trong email, hoặc{' '}
          <Link to="/forgot-password" className="font-semibold underline">gửi yêu cầu mới</Link>.
        </AuthAlert>
      )}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {success ? (
        <>
          <AuthAlert tone="success">Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.</AuthAlert>
          <Link
            to="/login"
            className="w-full h-11 rounded-md bg-pitch hover:bg-pitch-deep text-white text-sm font-semibold transition-colors flex items-center justify-center"
          >
            Đăng nhập
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="reset-password" name="newPassword" autoComplete="new-password"
            label="Mật khẩu mới" icon={Lock} type="password" required minLength={8}
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            hint="Tối thiểu 8 ký tự."
          />
          <AuthField
            id="reset-confirm" name="confirmPassword" autoComplete="new-password"
            label="Nhập lại mật khẩu mới" icon={Lock} type="password" required
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="pt-1">
            <AuthSubmit loading={loading} disabled={!token}>{loading ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</AuthSubmit>
          </div>
        </form>
      )}
    </AuthShell>
  );
};
