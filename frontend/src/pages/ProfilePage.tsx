import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, User as UserIcon, Shield, Trophy, Calendar, AlertCircle, CheckCircle2, Zap, Target, Flame, Activity } from 'lucide-react';
import apiClient from '../api/client';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('MALE');
  const [badmintonLevel, setBadmintonLevel] = useState('INTERMEDIATE');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiClient.get('/users/me');
      const data = res.data;
      setProfile(data);
      setFullName(data.fullName || '');
      setAge(data.age || '');
      setGender(data.gender || 'MALE');
      setBadmintonLevel(data.badmintonLevel || 'INTERMEDIATE');
      setAvatarUrl(data.avatarUrl || null);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      if (err.response?.status === 401) {
        setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setErrorMsg(serverMsg || 'Không thể tải thông tin hồ sơ.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setSaving(true);

    try {
      const res = await apiClient.put('/users/me', {
        fullName,
        age: age ? Number(age) : null,
        gender,
        badmintonLevel,
      });
      setProfile(res.data);
      const currentUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      localStorage.setItem('user_info', JSON.stringify({ ...currentUser, ...res.data }));
      setSuccessMsg('Đã cập nhật hồ sơ thành công!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ảnh đại diện không được vượt quá 2MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.avatarUrl);
      const currentUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      localStorage.setItem('user_info', JSON.stringify({ ...currentUser, avatarUrl: res.data.avatarUrl }));
      setSuccessMsg('Đã cập nhật ảnh đại diện lên MinIO Cloud Storage!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Lỗi khi upload ảnh lên máy chủ MinIO.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin shadow-glow-blue" />
        <span className="text-sm font-semibold text-sky-400 tracking-wide font-heading">
          ĐANG TẢI DỮ LIỆU VẬN ĐỘNG VIÊN...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 animate-fade-in">
      {/* 1. ATHLETIC HERO PASSPORT BANNER (Thẻ Vận Động Viên Pro) */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-[#122340] via-[#0e192c] to-[#0a1220] p-8 sm:p-10 shadow-2xl">
        {/* Court Background Texture */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url('/images/arena-court-blue.jpg')` }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar Pro Hex Frame */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-2 border-brand/60 bg-[#0d1627] flex items-center justify-center shadow-2xl ring-4 ring-brand/10 transition-transform duration-300 group-hover:scale-105">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-white/40">
                  <UserIcon className="w-16 h-16" />
                  <span className="text-[10px] mt-1 font-mono tracking-wider">NO PHOTO</span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-brand hover:bg-brand-hover text-white shadow-glow-blue transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
              title="Cập nhật ảnh đại diện"
            >
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          {/* Player Passport Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-brand text-white uppercase shadow-glow-blue">
                OFFICIAL ATHLETE
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-white/10 text-sky-300 border border-white/15 uppercase">
                {profile?.badmintonLevel || 'INTERMEDIATE'}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {profile?.status || 'ACTIVE'}
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight">
              {profile?.fullName || 'Vận Động Viên Chưa Đặt Tên'}
            </h1>

            <p className="text-slate-300 font-mono text-sm">
              {profile?.email}
            </p>

            {/* Passport Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <Shield className="w-4 h-4 text-brand" />
                <span className="font-semibold text-white">{profile?.role}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Thành viên từ: <strong className="text-white">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'Mới'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Giới tính: <strong className="text-white">{profile?.gender === 'MALE' ? 'Nam' : profile?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ATHLETE TELEMETRY KPI TILES (Bento Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bento-card p-5 space-y-1">
          <div className="text-white/50 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand" />
            <span>Trận Đấu Đã Lưu</span>
          </div>
          <div className="font-heading text-2xl font-black text-white">0</div>
          <div className="text-[11px] text-slate-400">Sẵn sàng phân tích AI</div>
        </div>

        <div className="bento-card p-5 space-y-1">
          <div className="text-white/50 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Tốc Độ Smash Cao Nhất</span>
          </div>
          <div className="font-heading text-2xl font-black text-amber-400">-- km/h</div>
          <div className="text-[11px] text-slate-400">Đo lường bằng AI Vision</div>
        </div>

        <div className="bento-card p-5 space-y-1">
          <div className="text-white/50 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Độ Chính Xác Đặt Cầu</span>
          </div>
          <div className="font-heading text-2xl font-black text-emerald-400">-- %</div>
          <div className="text-[11px] text-slate-400">Heatmap vùng sân</div>
        </div>

        <div className="bento-card p-5 space-y-1">
          <div className="text-white/50 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-sky-400" />
            <span>Cấp Độ Thi Đấu</span>
          </div>
          <div className="font-heading text-xl font-black text-sky-400 truncate">
            {profile?.badmintonLevel || 'INTERMEDIATE'}
          </div>
          <div className="text-[11px] text-slate-400">Hạng mục cá nhân</div>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-2xl flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/50 border border-red-500/50 text-red-200 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
          {errorMsg.includes('hết hạn') && (
            <a
              href="/login"
              className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition"
            >
              Đăng nhập lại
            </a>
          )}
        </div>
      )}

      {/* 3. FORM THÔNG TIN VẬN ĐỘNG VIÊN */}
      <div className="bento-card p-8 sm:p-10 shadow-2xl">
        <div className="border-b border-white/10 pb-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <UserIcon className="w-5 h-5 text-brand" />
              <span>Cập Nhật Thông Tin Vận Động Viên</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Dữ liệu này được mô hình AI sử dụng để phân tích tương quan thể lực và phân loại lối đánh.
            </p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow-blue hidden sm:block" />
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Họ và tên */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Họ và tên hiển thị
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Lê Quang Liêm"
                className="w-full h-12 rounded-xl bg-[#0f172a] border border-white/15 px-4 text-sm text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Địa chỉ Email tài khoản
              </label>
              <input
                type="text"
                disabled
                value={profile?.email || ''}
                className="w-full h-12 rounded-xl bg-[#0b1320] border border-white/10 px-4 text-sm text-white/50 cursor-not-allowed font-mono"
              />
            </div>

            {/* Tuổi */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tuổi vận động viên
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="22"
                className="w-full h-12 rounded-xl bg-[#0f172a] border border-white/15 px-4 text-sm text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              />
            </div>

            {/* Giới tính */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Giới tính thi đấu
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-12 rounded-xl bg-[#0f172a] border border-white/15 px-4 text-sm text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              >
                <option value="MALE">Nam (Male)</option>
                <option value="FEMALE">Nữ (Female)</option>
                <option value="OTHER">Khác (Other)</option>
              </select>
            </div>

            {/* Trình độ Cầu Lông */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Trình độ thi đấu cầu lông</span>
              </label>
              <select
                value={badmintonLevel}
                onChange={(e) => setBadmintonLevel(e.target.value)}
                className="w-full h-12 rounded-xl bg-[#0f172a] border border-white/15 px-4 text-sm text-white focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              >
                <option value="BEGINNER">🟢 Người mới tập chơi (Beginner) - Dưới 1 năm kinh nghiệm</option>
                <option value="INTERMEDIATE">🔵 Phong trào trung bình (Intermediate) - Đánh sân thường xuyên 1-3 năm</option>
                <option value="ADVANCED">🟣 Phong trào nâng cao (Advanced) - Thi đấu giao lưu giải câu lạc bộ</option>
                <option value="PRO">🔴 Vận động viên chuyên nghiệp (Pro / Semi-pro) - Huấn luyện bài bản</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 h-12 rounded-full bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-glow-blue flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>LƯU THÔNG TIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
