import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle, ArrowRight, Trophy, Eye, EyeOff } from 'lucide-react';
import apiClient from '../api/client';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-between px-6 sm:px-12 lg:px-20 py-10 overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center brightness-105 contrast-105 pointer-events-none"
        style={{
          backgroundImage: `url('/images/court-bg.jpg')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-slate-950/40 to-slate-950/80 pointer-events-none" />

      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[650px] h-[650px] bg-brand/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Left Side */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center max-w-xl text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold w-fit shadow-md">
          <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
          <span>THAM GIA CỘNG ĐỒNG BADMINTON AI</span>
        </div>
        <h2 className="font-heading text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
          Biến video trận đấu thành <br />
          <span className="text-sky-400">Dữ liệu chiến thuật</span> chuyên sâu.
        </h2>
        <p className="text-slate-200 text-base leading-relaxed max-w-lg drop-shadow">
          Tạo tài khoản miễn phí để tải lên video trận đấu cá nhân, khám phá sơ đồ sân 2D tương tác và xem trọn vẹn các trận đấu trong thư viện công khai.
        </p>
      </div>

      {/* Right Side: Registration Modal Card */}
      <div className="relative z-10 w-full max-w-[480px] rounded-3xl bg-[#0f1a2e]/90 border border-white/20 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl ml-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand text-white mb-4 shadow-glow-blue">
            <span className="font-heading font-black text-xl">AI</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
            Tạo tài khoản mới
          </h1>
          <p className="text-[15px] text-slate-200 mt-1.5 font-medium">
            Bắt đầu phân tích video cầu lông chỉ trong vài giây.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/60 text-red-300 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white/60">
              Họ và tên
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <User className="h-4 w-4 text-white/40 shrink-0" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nguyễn Văn A"
                className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white/60">
              Địa chỉ Email
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Mail className="h-4 w-4 text-white/40 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vandongvien@badminton.vn"
                className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white/60">
              Mật khẩu
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Lock className="h-4 w-4 text-white/40 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white transition-colors"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Level & Gender */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-brand" />
                <span>Trình độ thi đấu</span>
              </label>
              <select
                value={badmintonLevel}
                onChange={(e) => setBadmintonLevel(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border border-white/10 bg-[#0f172a] text-sm text-white focus:outline-none focus:border-brand transition"
              >
                <option value="BEGINNER">Mới chơi (Beginner)</option>
                <option value="INTERMEDIATE">Phong trào (Intermediate)</option>
                <option value="ADVANCED">Nâng cao (Advanced)</option>
                <option value="PRO">Chuyên nghiệp (Pro)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border border-white/10 bg-[#0f172a] text-sm text-white focus:outline-none focus:border-brand transition"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold shadow-glow-blue transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng ký tài khoản</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/50">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-brand hover:text-brand-hover font-semibold ml-1">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
