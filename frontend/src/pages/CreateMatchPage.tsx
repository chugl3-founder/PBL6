import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, AlertCircle, Video } from 'lucide-react';
import apiClient from '../api/client';

const inputClass =
  'w-full h-11 px-3 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/35 focus:outline-none focus:border-pitch';

export const CreateMatchPage: React.FC = () => {
  const navigate = useNavigate();

  // Asked by court side, which is what the coach sees in the video: the upper player is far from the camera.
  const [upperName, setUpperName] = useState('');
  const [lowerName, setLowerName] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const swapSides = () => {
    setUpperName(lowerName);
    setLowerName(upperName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const upper = upperName.trim();
    const lower = lowerName.trim();
    if (!upper || !lower) {
      setError('Hãy nhập tên cả hai vận động viên.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/matches', {
        playerAName: upper,
        playerBName: lower,
        upperPlayer: 'PLAYER_A',
        lowerPlayer: 'PLAYER_B',
        matchDate,
        title: title.trim() || `${upper} gặp ${lower}`,
        description: description.trim(),
      });
      navigate(`/matches/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không tạo được trận. Hãy kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 pt-2 font-vn space-y-6">
      <header className="space-y-3">
        <Link to="/my-matches" className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="w-4 h-4" />
          Trận của tôi
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Trận mới</h1>
        <ol className="flex flex-wrap items-center gap-2 text-xs text-ink/55" aria-label="Các bước">
          {['Thông tin trận', 'Tải video', 'AI phân tích'].map((label, index) => (
            <li key={label} className="flex items-center gap-2" aria-current={index === 0 ? 'step' : undefined}>
              {index > 0 && <span className="w-6 h-px bg-ink/15" />}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  index === 0 ? 'bg-ink text-white' : 'bg-ink/10 text-ink/50'
                }`}
              >
                {index + 1}
              </span>
              <span className={index === 0 ? 'text-ink font-medium' : ''}>{label}</span>
            </li>
          ))}
        </ol>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-loss/10 text-loss text-sm" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg bg-sheet border border-ink/10 p-5 sm:p-6 space-y-6">
        <fieldset className="space-y-3">
          <legend className="font-semibold text-ink">Hai vận động viên</legend>
          <p className="text-sm text-ink/60">
            Nhìn vào video: ai đứng ở nửa sân xa camera thì nhập vào ô trên. AI dựa vào đó để biết cú nào của ai.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
            <div className="space-y-3">
              <label className="flex items-stretch gap-3">
                <span className="w-1 rounded-full bg-pa shrink-0" aria-hidden />
                <span className="flex-1 space-y-1">
                  <span className="block text-sm text-ink/70">Sân trên, xa camera</span>
                  <input
                    type="text"
                    required
                    value={upperName}
                    onChange={(e) => setUpperName(e.target.value)}
                    placeholder="VD: Nguyễn Tiến Minh"
                    className={inputClass}
                  />
                </span>
              </label>
              <label className="flex items-stretch gap-3">
                <span className="w-1 rounded-full bg-pb shrink-0" aria-hidden />
                <span className="flex-1 space-y-1">
                  <span className="block text-sm text-ink/70">Sân dưới, gần camera</span>
                  <input
                    type="text"
                    required
                    value={lowerName}
                    onChange={(e) => setLowerName(e.target.value)}
                    placeholder="VD: Lee Chong Wei"
                    className={inputClass}
                  />
                </span>
              </label>
            </div>

            {/* Small court seen from the camera, so "upper / lower" is unambiguous */}
            <div className="hidden sm:flex flex-col items-center gap-1.5 pl-3">
              <div className="relative w-24 h-36 rounded-sm bg-pitch border-2 border-white/80 outline outline-1 outline-ink/10 flex flex-col">
                <div className="flex-1 flex items-center justify-center px-1">
                  <span className="text-[10px] font-semibold text-white text-center leading-tight line-clamp-2">
                    {upperName || 'Sân trên'}
                  </span>
                </div>
                <div className="h-0.5 bg-white" aria-hidden />
                <div className="flex-1 flex items-center justify-center px-1">
                  <span className="text-[10px] font-semibold text-white text-center leading-tight line-clamp-2">
                    {lowerName || 'Sân dưới'}
                  </span>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-ink/50">
                <Video className="w-3.5 h-3.5" aria-hidden />
                Camera
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={swapSides}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-pitch hover:text-pitch-deep"
          >
            <ArrowUpDown className="w-4 h-4" />
            Đổi sân hai người
          </button>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-ink/10">
          <label className="space-y-1">
            <span className="block text-sm text-ink/70">Ngày thi đấu</span>
            <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="block text-sm text-ink/70">
              Tên trận <span className="text-ink/45">(không bắt buộc)</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Chung kết giao hữu 2026"
              className={inputClass}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="block text-sm text-ink/70">
              Ghi chú <span className="text-ink/45">(không bắt buộc)</span>
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Trận 1 set 21 điểm, quay từ phía sau sân"
              className="w-full px-3 py-2.5 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/35 focus:outline-none focus:border-pitch resize-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 border-t border-ink/10">
          <Link to="/my-matches" className="px-4 h-10 inline-flex items-center text-sm font-medium text-ink/60 hover:text-ink">
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-60 px-5 h-10 text-sm font-semibold text-white transition-colors"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Tiếp tục: tải video
          </button>
        </div>
      </form>
    </div>
  );
};
