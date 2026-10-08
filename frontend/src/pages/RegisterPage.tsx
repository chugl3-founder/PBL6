import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Activity, AlertCircle, ArrowRight, Trophy, Sparkles } from 'lucide-react';
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
      // Đăng ký thành công -> chuyển sang login với thông báo
      navigate('/login?registered=true');
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Badminton Court Atmosphere Graphic */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none rounded-3xl"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background rounded-3xl pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-xl glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-court/10 border border-court/30 text-court mb-4 shadow-neon-court">
            <Activity className="h-7 w-7 text-court" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tạo Tài Khoản BadmintonAI
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Tham gia nền tảng phân tích pha cầu thông minh bằng thị giác máy tính
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800/80 text-red-200 text-sm rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Họ và tên
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court focus:ring-1 focus:ring-court transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="athlete@badminton.vn"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court focus:ring-1 focus:ring-court transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Mật khẩu bảo mật
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court focus:ring-1 focus:ring-court transition"
              />
            </div>
          </div>

          {/* Trình độ cầu lông & Giới tính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-court" />
                <span>Trình độ chơi cầu</span>
              </label>
              <select
                value={badmintonLevel}
                onChange={(e) => setBadmintonLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-court transition"
              >
                <option value="BEGINNER">Mới chơi (Beginner)</option>
                <option value="INTERMEDIATE">Phong trào (Intermediate)</option>
                <option value="ADVANCED">Bán chuyên (Advanced)</option>
                <option value="PRO">Chuyên nghiệp (Pro)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-court transition"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-court hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-neon-court transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-slate-950" />
                  <span>Hoàn tất Đăng Ký</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-sm text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-court hover:underline font-semibold ml-1">
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
