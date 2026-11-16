import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { AuthShell, AuthField, AuthChoice, AuthAlert, AuthSubmit, authLinkClass } from '../components/auth/AuthShell';
import { register } from '../api/auth';
import { errorMessage } from '../api/errors';

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
      await register({ email, password, fullName, badmintonLevel, gender });
      navigate('/login?registered=true');
    } catch (err) {
      setError(errorMessage(err, 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Tạo xong là tải được video trận đầu tiên lên để AI phân tích."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className={authLinkClass}>
            Đăng nhập
          </Link>
        </>
      }
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
        <AuthChoice
          name="badmintonLevel" label="Trình độ" value={badmintonLevel} onChange={setBadmintonLevel}
          options={[
            { value: 'BEGINNER', label: 'Mới chơi' },
            { value: 'INTERMEDIATE', label: 'Phong trào' },
            { value: 'ADVANCED', label: 'Nâng cao' },
            { value: 'PRO', label: 'Chuyên nghiệp' },
          ]}
        />
        <AuthChoice
          name="gender" label="Giới tính" value={gender} onChange={setGender}
          options={[
            { value: 'MALE', label: 'Nam' },
            { value: 'FEMALE', label: 'Nữ' },
            { value: 'OTHER', label: 'Khác' },
          ]}
        />
        <div className="pt-1">
          <AuthSubmit loading={loading}>{loading ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}</AuthSubmit>
        </div>
      </form>
    </AuthShell>
  );
};
