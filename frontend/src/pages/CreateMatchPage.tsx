import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, ArrowLeft, Trophy, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export const CreateMatchPage: React.FC = () => {
  const navigate = useNavigate();

  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [upperPlayer, setUpperPlayer] = useState<'PLAYER_A' | 'PLAYER_B'>('PLAYER_A');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lower player is always the opposite of upper player
  const lowerPlayer = upperPlayer === 'PLAYER_A' ? 'PLAYER_B' : 'PLAYER_A';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!playerAName.trim() || !playerBName.trim()) {
      setError('Vui lòng nhập họ tên của cả 2 vận động viên.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        playerAName: playerAName.trim(),
        playerBName: playerBName.trim(),
        upperPlayer,
        lowerPlayer,
        matchDate,
        title: title.trim() || `Trận đấu: ${playerAName} vs ${playerBName}`,
        description: description.trim()
      };

      const res = await apiClient.post('/matches', payload);
      const createdMatch = res.data;
      navigate(`/matches/${createdMatch.id}`);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Không thể tạo trận đấu. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Background Court Ambient */}
      <div 
        className="fixed inset-0 bg-cover bg-center brightness-[0.25] pointer-events-none -z-10"
        style={{ backgroundImage: `url('/images/court-bg.jpg')` }}
      />
      <div className="fixed inset-0 bg-slate-950/80 -z-10" />

      {/* Header Navigation */}
      <div className="mb-8">
        <Link 
          to="/my-matches" 
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors mb-4 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại Danh sách trận đấu</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>BƯỚC 1 / 2: KHỞI TẠO DỮ LIỆU</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Tạo Trận Đấu Mới</h1>
            <p className="text-white/60 text-sm mt-1">
              Nhập thông tin người chơi và vị trí đứng trên camera trước khi tải lên video phân tích.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Player Names & Match Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <User className="w-5 h-5 text-brand" />
                <span>Thông tin hai vận động viên</span>
              </h2>

              {/* Player A */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 flex items-center justify-between">
                  <span>Vận động viên A (Player A) <span className="text-rose-400">*</span></span>
                  <span className="text-[11px] text-brand font-medium">Bên xanh</span>
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <User className="h-4 w-4 text-brand shrink-0" />
                  <input
                    type="text"
                    required
                    value={playerAName}
                    onChange={(e) => setPlayerAName(e.target.value)}
                    placeholder="VD: Nguyễn Tiến Minh"
                    className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Player B */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 flex items-center justify-between">
                  <span>Vận động viên B (Player B) <span className="text-rose-400">*</span></span>
                  <span className="text-[11px] text-amber-400 font-medium">Bên cam</span>
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <User className="h-4 w-4 text-amber-400 shrink-0" />
                  <input
                    type="text"
                    required
                    value={playerBName}
                    onChange={(e) => setPlayerBName(e.target.value)}
                    placeholder="VD: Lee Chong Wei"
                    className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">
                    Ngày thi đấu
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand">
                    <Calendar className="h-4 w-4 text-white/40 shrink-0" />
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full bg-transparent text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">
                    Tiêu đề trận đấu (tùy chọn)
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-3.5 transition-colors focus-within:border-brand">
                    <Trophy className="h-4 w-4 text-white/40 shrink-0" />
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Chung kết giao hữu 2026"
                      className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">
                  Ghi chú trận đấu
                </label>
                <div className="flex rounded-xl border border-white/10 bg-[#0f172a] p-3 transition-colors focus-within:border-brand">
                  <FileText className="h-4 w-4 text-white/40 shrink-0 mt-0.5 mr-2" />
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="VD: Trận 1 set 21 điểm, quay bằng tripod góc cố định phía sau sân..."
                    className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Court Geometry Alignment Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">Góc Máy & Vị Trí Sân</h2>
                <p className="text-xs text-white/50 mt-1">
                  Chọn người chơi đứng ở nửa sân trên (xa camera) để thuật toán thị giác AI nhận diện chuẩn xác.
                </p>
              </div>

              {/* Radio Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUpperPlayer('PLAYER_A')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    upperPlayer === 'PLAYER_A'
                      ? 'bg-brand/20 border-brand text-white shadow-glow-blue'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="text-[11px] font-bold text-brand uppercase tracking-wider">Sân trên (Xa)</div>
                  <div className="text-sm font-semibold truncate mt-1">
                    {playerAName || 'Player A'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUpperPlayer('PLAYER_B')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    upperPlayer === 'PLAYER_B'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-glow-blue'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Sân trên (Xa)</div>
                  <div className="text-sm font-semibold truncate mt-1">
                    {playerBName || 'Player B'}
                  </div>
                </button>
              </div>

              {/* Graphic Court Simulator */}
              <div className="relative w-full aspect-[4/3] rounded-2xl border-2 border-white/20 bg-[#063018]/60 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                {/* Court Boundary Lines */}
                <div className="absolute inset-2 border-2 border-white/40 pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/70 -translate-y-1/2 pointer-events-none shadow-md flex items-center justify-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-white/90 bg-[#063018] px-2 rounded-full border border-white/40">
                    LƯỚI (NET)
                  </span>
                </div>

                {/* Upper Court Half */}
                <div className="relative z-10 flex flex-col items-center justify-center h-2/5 rounded-xl bg-white/5 border border-dashed border-white/20">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">SÂN TRÊN (XA CAMERA)</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${upperPlayer === 'PLAYER_A' ? 'bg-brand' : 'bg-amber-400'}`} />
                    <span className="text-xs font-bold text-white">
                      {upperPlayer === 'PLAYER_A' ? (playerAName || 'Player A') : (playerBName || 'Player B')}
                    </span>
                  </div>
                </div>

                {/* Lower Court Half */}
                <div className="relative z-10 flex flex-col items-center justify-center h-2/5 rounded-xl bg-white/5 border border-dashed border-white/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${lowerPlayer === 'PLAYER_A' ? 'bg-brand' : 'bg-amber-400'}`} />
                    <span className="text-xs font-bold text-white">
                      {lowerPlayer === 'PLAYER_A' ? (playerAName || 'Player A') : (playerBName || 'Player B')}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                    SÂN DƯỚI (GẦN CAMERA 📹)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/50">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                <span>Hệ thống tự động liên kết tọa độ camera để phân tích cú đánh (smash, drop, lift).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
          <Link
            to="/my-matches"
            className="px-6 py-3 rounded-full text-sm font-semibold text-white/60 hover:text-white transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-bold shadow-glow-blue transition-all duration-200 flex items-center gap-2 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Tạo Trận Đấu & Tiếp Tục</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

