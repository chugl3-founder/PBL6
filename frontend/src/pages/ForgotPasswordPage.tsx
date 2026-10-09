import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import apiClient from '../api/client';

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
      await apiClient.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra lại email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-between px-6 sm:px-12 lg:px-20 py-10 overflow-hidden">
      {/* High-Resolution Bright Badminton Arena Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center brightness-105 contrast-105 pointer-events-none"
        style={{
          backgroundImage: `url('/images/court-bg.jpg')`
        }}
      />
      {/* Subtle vignette/gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 via-slate-950/40 to-slate-950/80 pointer-events-none" />

      {/* Atmospheric blue flare glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-brand/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Left Side: Athletic Pro Tagline */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center max-w-xl text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold w-fit shadow-md">
          <KeyRound className="w-4 h-4 text-brand" />
          <span>ACCOUNT SECURITY RECOVERY</span>
        </div>
        
        <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-md">
          Khôi phục quyền truy cập vào <span className="text-brand">sân đấu của bạn</span>.
        </h1>
        
        <p className="text-slate-200 text-base leading-relaxed drop-shadow">
          Chỉ cần nhập email tài khoản của bạn, chúng tôi sẽ cấp một liên kết khôi phục an toàn (Magic Reset Link) có hiệu lực trong 15 phút.
        </p>

        <div className="flex items-center gap-6 pt-2">
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mã hóa SHA-256 an toàn</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <span>Thời hạn 15 phút</span>
          </div>
        </div>
      </div>

      {/* Right Side: Recovery Form Card */}
      <div className="relative z-10 w-full max-w-[460px] mx-auto lg:mx-0 rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
        <div className="mb-6">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại Đăng nhập</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-white">Quên mật khẩu?</h2>
          <p className="mt-1 text-sm text-white/60">
            Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Đã gửi yêu cầu thành công</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Nếu email <span className="font-semibold text-white">{email}</span> tồn tại trong hệ thống, bạn sẽ nhận được một liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (hoặc log server đối với môi trường dev).
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full h-12 rounded-full bg-brand hover:bg-brand-hover text-white font-semibold shadow-glow-blue transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <span>Quay lại Đăng nhập</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60">
                Email tài khoản
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <Mail className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="athlete@example.com"
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
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
                    <span>Gửi liên kết khôi phục</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/50">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-brand hover:text-brand-hover font-semibold ml-1">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

