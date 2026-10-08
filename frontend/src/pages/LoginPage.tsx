import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Activity, AlertCircle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
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
    <div className="relative min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Badminton Court Atmosphere Graphic */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none rounded-3xl"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background rounded-3xl pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-court/10 border border-court/30 text-court mb-4 shadow-neon-court">
            <Activity className="h-7 w-7 text-court" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Đăng Nhập Hệ Thống
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Truy cập nền tảng phân tích kỹ thuật số & video replay
          </p>
        </div>

        {isRegisteredSuccess && (
          <div className="mb-6 p-4 bg-court/10 border border-court/40 text-court text-sm rounded-xl flex items-center gap-3 animate-fade-in shadow-neon-court">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800/80 text-red-200 text-sm rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email đăng nhập
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mật khẩu
              </label>
              <Link to="/forgot-password" className="text-xs text-court hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court focus:ring-1 focus:ring-court transition"
              />
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
                  <Zap className="h-4 w-4 fill-slate-950" />
                  <span>Đăng Nhập</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-sm text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-court hover:underline font-semibold ml-1">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
