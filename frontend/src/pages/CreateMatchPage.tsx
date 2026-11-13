import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, AlertCircle } from 'lucide-react';
import { CameraCourt } from '../components/court/CameraCourt';
import { StepIndicator } from '../components/match/StepIndicator';
import { createMatch } from '../api/matches';
import { errorMessage } from '../api/errors';

const inputClass =
  'w-full h-11 px-3 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder:text-ink/55 focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20';

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
      const created = await createMatch({
        playerAName: upper,
        playerBName: lower,
        upperPlayer: 'PLAYER_A',
        lowerPlayer: 'PLAYER_B',
        matchDate,
        title: title.trim() || `${upper} gặp ${lower}`,
        description: description.trim(),
      });
      navigate(`/matches/${created.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Không tạo được trận. Hãy kiểm tra lại thông tin.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 pt-2 font-vn space-y-6">
      <header className="space-y-3">
        <Link to="/my-matches" className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Trận của tôi
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">Trận mới</h1>
          <StepIndicator current={1} />
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-loss/10 text-loss text-sm" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <form onSubmit={handleSubmit} className="rounded-lg bg-sheet border border-ink/10 p-6 space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-ink">Hai vận động viên</legend>
            <p className="text-sm text-ink/70 -mt-2">Nhập theo vị trí trong video. Sân bên cạnh cập nhật ngay khi bạn gõ.</p>

            <div className="space-y-1.5">
              <label htmlFor="upper-name" className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className="w-2.5 h-2.5 rounded-full bg-pa" aria-hidden />
                Nửa sân trên, xa camera
              </label>
              <input
                id="upper-name"
                name="upperName"
                autoComplete="off"
                type="text"
                required
                value={upperName}
                onChange={(e) => setUpperName(e.target.value)}
                placeholder="VD: Nguyễn Tiến Minh"
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-ink/10" aria-hidden />
              <button
                type="button"
                onClick={swapSides}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-sheet px-3 h-8 text-sm font-medium text-ink hover:border-pitch hover:text-pitch-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40"
              >
                <ArrowUpDown className="w-4 h-4" aria-hidden />
                Đổi sân hai người
              </button>
              <span className="h-px flex-1 bg-ink/10" aria-hidden />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lower-name" className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className="w-2.5 h-2.5 rounded-full bg-pb" aria-hidden />
                Nửa sân dưới, gần camera
              </label>
              <input
                id="lower-name"
                name="lowerName"
                autoComplete="off"
                type="text"
                required
                value={lowerName}
                onChange={(e) => setLowerName(e.target.value)}
                placeholder="VD: Lee Chong Wei"
                className={inputClass}
              />
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-ink/10">
            <legend className="sr-only">Thông tin trận</legend>
            <div className="space-y-1.5">
              <label htmlFor="match-date" className="block text-sm font-medium text-ink">Ngày thi đấu</label>
              <input id="match-date" name="matchDate" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="match-title" className="block text-sm font-medium text-ink">
                Tên trận <span className="font-normal text-ink/65">(không bắt buộc)</span>
              </label>
              <input
                id="match-title"
                name="title"
                autoComplete="off"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={upperName.trim() && lowerName.trim() ? upperName.trim() + ' gặp ' + lowerName.trim() : 'VD: Chung kết giao hữu 2026'}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="match-note" className="block text-sm font-medium text-ink">
                Ghi chú <span className="font-normal text-ink/65">(không bắt buộc)</span>
              </label>
              <textarea
                id="match-note"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Trận 1 set 21 điểm, quay từ phía sau sân"
                className="w-full px-3 py-2.5 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder:text-ink/55 focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20 resize-none"
              />
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-ink/10">
            <Link to="/my-matches" className="px-4 h-11 inline-flex items-center text-sm font-medium text-ink/70 hover:text-ink">
              Hủy
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-pitch hover:bg-pitch-deep disabled:opacity-60 px-5 h-11 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 focus-visible:ring-offset-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />}
              {loading ? 'Đang tạo trận…' : 'Tiếp tục: tải video'}
            </button>
          </div>
        </form>

        {/* The court as the camera sees it, so "upper / lower" needs no explaining */}
        <aside className="lg:sticky lg:top-16 rounded-lg bg-sheet border border-ink/10 p-5 space-y-4" aria-label="Sân nhìn từ camera">
          <div>
            <h2 className="text-lg font-semibold text-ink">Như trong video</h2>
            <p className="text-sm text-ink/70 mt-1">AI dựa vào vị trí này để biết cú nào của ai.</p>
          </div>
          <CameraCourt upperName={upperName} lowerName={lowerName} />
        </aside>
      </div>
    </div>
  );
};
