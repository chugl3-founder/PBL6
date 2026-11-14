import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { AuthShell, AuthField, AuthSelect, AuthAlert, AuthSubmit, authLinkClass } from '../components/auth/AuthShell';
import apiClient from '../api/client';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [badmintonLevel, setBadmintonLevel] = useState('INTERMEDIATE');
  const [gender, setGender] = useState('MALE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/auth/register', { 
        email, 
        password, 
        fullName,
        badmintonLevel,
        gender
      });
      navigate('/login?registered=true');
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Miễn phí. Tải video trận của bạn lên và xem trọn các trận trong thư viện."
      footer={<>Đã có tài khoản? <Link to="/login" className={authLinkClass}>Đăng nhập</Link></>}
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="reg-name" name="fullName" autoComplete="name"
          label="Họ và tên" icon={User} type="text" required
          value={fullName} onChange={(e) => setFullName(e.target.value)}
          placeholder="Nguyễn Văn A"
        />
        <AuthField
          id="reg-email" name="email" autoComplete="email" spellCheck={false}
          label="Email" icon={Mail} type="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="vandongvien@example.com"
        />
        <AuthField
          id="reg-password" name="password" autoComplete="new-password"
          label="Mật khẩu" icon={Lock} type="password" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)}
          hint="Tối thiểu 6 ký tự."
        />
        <div className="grid grid-cols-2 gap-3">
          <AuthSelect id="reg-level" name="badmintonLevel" label="Trình độ" value={badmintonLevel} onChange={(e) => setBadmintonLevel(e.target.value)}>
            <option value="BEGINNER">Mới chơi</option>
            <option value="INTERMEDIATE">Phong trào</option>
            <option value="ADVANCED">Nâng cao</option>
            <option value="PRO">Chuyên nghiệp</option>
          </AuthSelect>
          <AuthSelect id="reg-gender" name="gender" label="Giới tính" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </AuthSelect>
        </div>
        <div className="pt-1">
          <AuthSubmit loading={loading}>{loading ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}</AuthSubmit>
        </div>
      </form>
    </AuthShell>
  );
};
