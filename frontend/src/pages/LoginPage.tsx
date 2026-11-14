import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { AuthShell, AuthField, AuthAlert, AuthSubmit, authLinkClass } from '../components/auth/AuthShell';
import apiClient from '../api/client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isRegisteredSuccess = queryParams.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_info', JSON.stringify(user));

      if (user.role === 'ROLE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/my-matches');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Xem lại các trận đã tải lên và tiếp tục phân tích."
      footer={<>Chưa có tài khoản? <Link to="/register" className={authLinkClass}>Đăng ký</Link></>}
    >
      {isRegisteredSuccess && <AuthAlert tone="success">Tài khoản đã sẵn sàng. Mời bạn đăng nhập.</AuthAlert>}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="login-email" name="email" autoComplete="email" spellCheck={false}
          label="Email" icon={Mail} type="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="vandongvien@example.com"
        />
        <AuthField
          id="login-password" name="password" autoComplete="current-password"
          label="Mật khẩu" icon={Lock} type="password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          aside={<Link to="/forgot-password" className={`text-sm ${authLinkClass}`}>Quên mật khẩu?</Link>}
        />
        <div className="pt-1">
          <AuthSubmit loading={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</AuthSubmit>
        </div>
      </form>
    </AuthShell>
  );
};
