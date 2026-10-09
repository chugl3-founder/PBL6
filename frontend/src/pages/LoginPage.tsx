import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import apiClient from '../api/client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isRegisteredSuccess = queryParams.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-between px-6 sm:px-12 lg:px-20 py-10 overflow-hidden">
      {/* High-Resolution Bright Badminton Arena Background Image (Full Width & Height) */}
      <div 
        className="absolute inset-0 bg-cover bg-center brightness-105 contrast-105 pointer-events-none"
        style={{
          backgroundImage: `url('/images/court-bg.jpg')`
        }}
      />
      {/* Subtle vignette/gradient so the right side is readable and left side displays the stadium brightly */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-slate-950/40 to-slate-950/80 pointer-events-none" />

      {/* Atmospheric blue flare glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-brand/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Left Side: Dramatic Hero Tagline so the background photo shines */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center max-w-xl text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold w-fit shadow-md">
          <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
          <span>OFFICIAL BADMINTON AI PLATFORM</span>
        </div>
        <h2 className="font-heading text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
          Master the Court with <br />
          <span className="text-sky-400">Next-Gen Visual</span> Intelligence.
        </h2>
        <p className="text-slate-200 text-base leading-relaxed max-w-lg drop-shadow">
          Analyze trajectory angles, speed metrics, player court coverage, and automated rally slicing directly from your match footage.
        </p>
      </div>

      {/* Right Side: BadPro+ Auth Modal Card */}
      <div className="relative z-10 w-full max-w-[440px] rounded-3xl bg-[#0f1a2e]/90 border border-white/20 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl ml-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand text-white mb-4 shadow-glow-blue">
            <span className="font-heading font-black text-xl">AI</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
            Welcome to BadmintonAI
          </h1>
          <p className="text-[15px] text-slate-200 mt-1.5 font-medium">
            See your game like never before.
          </p>
        </div>

        {isRegisteredSuccess && (
          <div className="mb-6 p-3.5 bg-brand/10 border border-brand/40 text-brand-hover text-sm rounded-xl flex items-center gap-3 animate-fade-in shadow-glow-subtle">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Tài khoản đã sẵn sàng! Mời bạn đăng nhập.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/60 text-red-300 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field (h-12 border-surface-line) */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white/60">
              Email Address
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Mail className="h-4 w-4 text-white/40 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-white/60">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-brand hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Lock className="h-4 w-4 text-white/40 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button (rounded-full bg-brand) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold shadow-glow-blue transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/50">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand hover:text-brand-hover font-semibold ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
