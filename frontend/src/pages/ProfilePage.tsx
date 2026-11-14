import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Save, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiClient from '../api/client';

const LEVELS = [
  { value: 'BEGINNER', label: 'Mới chơi', hint: 'dưới 1 năm' },
  { value: 'INTERMEDIATE', label: 'Phong trào', hint: 'chơi đều 1–3 năm' },
  { value: 'ADVANCED', label: 'Nâng cao', hint: 'thi đấu giải câu lạc bộ' },
  { value: 'PRO', label: 'Chuyên nghiệp', hint: 'tập luyện bài bản' },
];

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
      setSuccessMsg('Đã lưu hồ sơ.');
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
      setErrorMsg('Ảnh đại diện tối đa 2 MB. Hãy chọn ảnh nhỏ hơn.');
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
      setSuccessMsg('Đã đổi ảnh đại diện.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không tải được ảnh lên. Thử lại với ảnh PNG, JPG hoặc WebP dưới 2 MB.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="font-vn flex flex-col items-center justify-center min-h-[60vh] gap-3 text-ink/70">
        <span className="w-8 h-8 border-2 border-pitch border-t-transparent rounded-full animate-spin" aria-hidden />
        <span className="text-sm" role="status">Đang tải hồ sơ…</span>
      </div>
    );
  }

  const levelLabel = LEVELS.find(l => l.value === (profile?.badmintonLevel || badmintonLevel))?.label ?? 'Chưa đặt';
  const genderLabel = profile?.gender === 'MALE' ? 'Nam' : profile?.gender === 'FEMALE' ? 'Nữ' : 'Khác';
  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(profile.createdAt))
    : null;
  const inputClass =
    'w-full h-11 rounded-md border border-ink/15 bg-sheet px-3 text-sm text-ink placeholder:text-ink/55 focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20';
  const labelClass = 'text-sm font-medium text-ink';

  return (
    <div className="font-vn max-w-3xl mx-auto py-4 space-y-6">
      <h1 className="text-2xl font-bold text-ink">Hồ sơ cá nhân</h1>

      {/* Identity */}
      <section className="rounded-lg bg-sheet border border-ink/10 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-pitch-soft text-pitch-deep flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Ảnh đại diện" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10" aria-hidden />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Đổi ảnh đại diện"
            title="Đổi ảnh đại diện (PNG, JPG, WebP, tối đa 2 MB)"
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-pitch hover:bg-pitch-deep text-white border-2 border-sheet flex items-center justify-center transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 focus-visible:ring-offset-2"
          >
            {uploadingAvatar ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
            ) : (
              <Camera className="w-4 h-4" aria-hidden />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xl font-semibold text-ink break-words">{profile?.fullName || 'Chưa đặt tên'}</p>
          <p className="text-sm text-ink/70 break-all" translate="no">{profile?.email}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink/65">Trình độ</dt>
              <dd className="font-medium text-ink">{levelLabel}</dd>
            </div>
            <div>
              <dt className="text-ink/65">Giới tính</dt>
              <dd className="font-medium text-ink">{genderLabel}</dd>
            </div>
            <div>
              <dt className="text-ink/65">Thành viên từ</dt>
              <dd className="font-medium text-ink">{memberSince ?? '–'}</dd>
            </div>
          </dl>
        </div>
      </section>

      {successMsg && (
        <div role="status" className="flex items-center gap-2.5 rounded-md bg-pitch-soft text-pitch-deep px-4 py-3 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md bg-loss/10 text-loss px-4 py-3 text-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.includes('hết hạn') && (
            <Link to="/login" className="shrink-0 font-semibold underline">
              Đăng nhập lại
            </Link>
          )}
        </div>
      )}

      {/* Edit form */}
      <section className="rounded-lg bg-sheet border border-ink/10 p-6" aria-labelledby="profile-form-title">
        <h2 id="profile-form-title" className="text-lg font-semibold text-ink">Thông tin cá nhân</h2>
        <p className="text-sm text-ink/70 mt-1 mb-6">Tên hiển thị xuất hiện trên các trận bạn tải lên.</p>

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className={labelClass}>Họ và tên</label>
              <input id="profile-name" name="fullName" autoComplete="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-email" className={labelClass}>Email</label>
              <input id="profile-email" name="email" autoComplete="email"
                type="email"
                disabled
                value={profile?.email || ''}
                className={`${inputClass} bg-ground text-ink/70 cursor-not-allowed`}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-age" className={labelClass}>Tuổi</label>
              <input id="profile-age" name="age" autoComplete="off"
                type="number"
                inputMode="numeric"
                min="5"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="22"
                className={`${inputClass} tabular-nums`}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-gender" className={labelClass}>Giới tính</label>
              <select id="profile-gender" name="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputClass}
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="profile-level" className={labelClass}>Trình độ</label>
              <select id="profile-level" name="badmintonLevel"
                value={badmintonLevel}
                onChange={(e) => setBadmintonLevel(e.target.value)}
                className={inputClass}
              >
                {LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}: {l.hint}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-5 border-t border-ink/10 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-pitch hover:bg-pitch-deep text-white text-sm font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 focus-visible:ring-offset-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
              ) : (
                <Save className="w-4 h-4" aria-hidden />
              )}
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
