import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ClipboardList, Link2, Loader2, Sparkles, Target } from 'lucide-react';
import { createReport, listReports, type ScoutingReport } from '../api/scouting';
import { PlayerPicker } from '../components/player/PlayerPicker';
import { PlayerMonogram } from '../components/player/PlayerMonogram';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const ScoutingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [reports, setReports] = useState<ScoutingReport[] | null>(null);
  const [opponent, setOpponent] = useState<string | null>(params.get('opponent'));
  const [ownPlayer, setOwnPlayer] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Trinh sát đối thủ · BadmintonAI';
    listReports().then(setReports).catch(() => setReports([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent) return;
    setCreating(true);
    setError(null);
    try {
      const report = await createReport({ opponentName: opponent, ownPlayerName: ownPlayer ?? undefined, title: title.trim() || undefined });
      navigate(`/scouting/${report.id}`);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message ?? 'Không tạo được báo cáo' : 'Không tạo được báo cáo');
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 pt-2 font-vn">
      <header>
        <h1 className="text-2xl font-bold text-ink">Trinh sát đối thủ</h1>
        <p className="text-sm text-ink/70 mt-1">
          Chọn đối thủ sắp gặp: hệ thống đọc mọi trận của họ và lập kế hoạch thi đấu, kèm video minh chứng cho từng nhận định.
        </p>
      </header>

      <form onSubmit={submit} className="relative rounded-2xl bg-ink text-white p-6 sm:p-8">
        {/* The glow is clipped in its own layer so the player dropdowns can spill past the card. */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden>
          <div className="absolute -right-16 -bottom-20 w-72 h-72 rounded-full bg-pitch/25 blur-3xl" />
        </div>
        <div className="relative z-10 grid lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6 items-end">
          <div className="space-y-2">
            <label htmlFor="scout-opponent" className="text-sm font-semibold text-white/75">
              Đối thủ <span className="text-rose-300">*</span>
            </label>
            <div className="text-ink">
              <PlayerPicker id="scout-opponent" value={opponent} onChange={setOpponent} exclude={ownPlayer} placeholder="Tìm đối thủ sắp gặp…" />
            </div>
          </div>
          <span className="hidden lg:flex h-12 items-center font-score text-2xl font-bold text-white/40">VS</span>
          <div className="space-y-2">
            <label htmlFor="scout-own" className="text-sm font-semibold text-white/75">
              Vận động viên của bạn <span className="font-normal text-white/45">(không bắt buộc, để so sánh)</span>
            </label>
            <div className="text-ink">
              <PlayerPicker id="scout-own" value={ownPlayer} onChange={setOwnPlayer} exclude={opponent} placeholder="Tìm vận động viên của bạn…" />
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Tiêu đề (tuỳ chọn), ví dụ: Chung kết giải CLB tháng 12"
            aria-label="Tiêu đề báo cáo"
            className="flex-1 h-11 px-3 rounded-lg bg-white/10 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!opponent || creating}
            className="h-11 px-5 rounded-lg bg-pitch hover:bg-pitch-deep disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {creating ? 'Đang phân tích…' : 'Lập báo cáo'}
          </button>
        </div>
        {error && <p className="relative mt-3 text-sm text-rose-300">{error}</p>}
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Báo cáo của bạn</h2>
        {reports == null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(n => <div key={n} className="h-36 rounded-xl bg-sheet border border-ink/10 animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl bg-sheet border border-dashed border-ink/20 px-6 py-12 text-center">
            <ClipboardList className="w-8 h-8 mx-auto text-ink/20" />
            <p className="mt-3 text-sm text-ink/70">Chưa có báo cáo nào. Chọn một đối thủ ở trên để bắt đầu.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(r => (
              <Link
                key={r.id}
                to={`/scouting/${r.id}`}
                className="group rounded-xl bg-sheet border border-ink/10 p-4 hover:border-pitch/50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(22,32,27,0.35)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <PlayerMonogram name={r.opponentName} size="sm" className="!bg-ink" />
                  <Target className="w-3.5 h-3.5 text-ink/30" />
                  {r.ownPlayerName && <PlayerMonogram name={r.ownPlayerName} size="sm" />}
                  {r.shareToken && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-pa bg-pa/10 px-2 py-0.5 rounded-full">
                      <Link2 className="w-3 h-3" /> Đang chia sẻ
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-ink leading-snug group-hover:text-pitch-deep line-clamp-2">{r.title}</h3>
                <p className="text-xs text-ink/70 mt-1">
                  Đối thủ: <span className="font-medium text-ink/75">{r.opponentName}</span>
                </p>
                <div className="flex items-center justify-between mt-3 text-xs text-ink/65">
                  <span>Cập nhật {formatDateTime(r.updatedAt)}</span>
                  <ArrowRight className="w-4 h-4 text-ink/25 group-hover:text-pitch group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
