import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthShell, AuthField, AuthAlert, AuthSubmit, authLinkClass } from '../components/auth/AuthShell';
import { requestPasswordReset } from '../api/auth';
import { errorMessage } from '../api/errors';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(errorMessage(err, 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra lại email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      top={
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Quay lại đăng nhập
        </Link>
      }
      title="Quên mật khẩu"
      subtitle="Nhập email tài khoản, chúng tôi gửi liên kết đặt lại mật khẩu (hiệu lực 15 phút)."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className={authLinkClass}>
            Tạo tài khoản
          </Link>
        </>
      }
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {success ? (
        <AuthAlert tone="success">
          <p className="font-semibold">Đã gửi yêu cầu</p>
          <p className="mt-1">
            Nếu <span className="font-semibold">{email}</span> có trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu. Kiểm tra hộp thư, kể cả mục spam.
          </p>
        </AuthAlert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="forgot-email" name="email" autoComplete="email" spellCheck={false}
            label="Email" icon={Mail} type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="vandongvien@example.com"
          />
          <div className="pt-1">
            <AuthSubmit loading={loading}>{loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}</AuthSubmit>
          </div>
        </form>
      )}
    </AuthShell>
  );
};
