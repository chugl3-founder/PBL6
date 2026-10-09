import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });
      setSuccess(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn hoặc không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-between px-6 sm:px-12 lg:px-20 py-10 overflow-hidden">
      {/* High-Resolution Badminton Court Background */}
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

      {/* Left Side: Athletic Branding */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center max-w-xl text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold w-fit shadow-md">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <span>CREDENTIAL SECURITY ROTATION</span>
        </div>
        
        <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-md">
          Thiết lập <span className="text-brand">mật khẩu mới</span> bảo vệ tài khoản.
        </h1>
        
        <p className="text-slate-200 text-base leading-relaxed drop-shadow">
          Tạo mật khẩu mạnh mẽ để tiếp tục quản lý các video trận đấu, phân tích pha cầu AI và thống kê hiệu suất cá nhân.
        </p>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <div className="text-brand font-bold text-lg mb-0.5">Tối thiểu 8 ký tự</div>
            <div className="text-slate-300 text-xs">Bao gồm chữ và số để tăng tính bảo mật</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <div className="text-emerald-400 font-bold text-lg mb-0.5">Tự động thu hồi</div>
            <div className="text-slate-300 text-xs">Đăng xuất toàn bộ phiên cũ đang hoạt động</div>
          </div>
        </div>
      </div>

      {/* Right Side: Reset Form Card */}
      <div className="relative z-10 w-full max-w-[460px] mx-auto lg:mx-0 rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">Đặt lại mật khẩu</h2>
          <p className="mt-1 text-sm text-white/60">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {!token && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Thiếu mã Token khôi phục</span>
            </div>
            <p>
              Liên kết không chứa mã xác thực hợp lệ. Vui lòng kiểm tra lại liên kết trong email hoặc gửi lại yêu cầu mới.
            </p>
            <Link
              to="/forgot-password"
              className="mt-1 text-brand font-semibold hover:underline inline-flex items-center gap-1"
            >
              Yêu cầu gửi lại liên kết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

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
              <h3 className="text-base font-bold text-white mb-1">Đổi mật khẩu thành công!</h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Mật khẩu mới đã được cập nhật an toàn. Mọi phiên đăng nhập cũ đã được thu hồi. Bạn có thể đăng nhập ngay bây giờ.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full h-12 rounded-full bg-brand hover:bg-brand-hover text-white font-semibold shadow-glow-blue transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60">
                Mật khẩu mới
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <Lock className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Ít nhất 8 ký tự"
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

            {/* Confirm New Password Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/60">
                Xác nhận mật khẩu mới
              </label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <Lock className="h-4 w-4 text-white/40 shrink-0" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full h-12 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-semibold shadow-glow-blue transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Cập nhật mật khẩu</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/50">
            Nhớ mật khẩu?{' '}
            <Link to="/login" className="text-brand hover:text-brand-hover font-semibold ml-1">
              Đăng nhập lại
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
