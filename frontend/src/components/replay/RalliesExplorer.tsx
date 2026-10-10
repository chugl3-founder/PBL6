import React, { useRef, useEffect } from 'react';
import { Play, Trophy, Clock, Zap, Target, Award } from 'lucide-react';

export interface RallyData {
  id: number;
  rallyNumber: number;
  startEventId: number;
  endEventId: number;
  startTime: number;
  endTime: number;
  duration: number;
  totalStrokes: number;
  boundaryType: string;
  serverSide: string; // UPPER, LOWER
  winnerSide: string; // UPPER, LOWER
  winReason: string;
  scoreUpper: number;
  scoreLower: number;
  scoreText: string;
  strokeSequence: string[];
  isComplete: boolean;
}

interface RalliesExplorerProps {
  rallies: RallyData[];
  currentTimeSeconds: number;
  selectedRallyId?: number;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  onPlayRally: (rally: RallyData) => void;
}

export const RalliesExplorer: React.FC<RalliesExplorerProps> = ({
  rallies,
  currentTimeSeconds,
  selectedRallyId,
  playerAName,
  playerBName,
  upperPlayer,
  onPlayRally,
}) => {
  const activeRallyRef = useRef<HTMLDivElement>(null);

  // Tìm rally đang diễn ra theo thời gian thực của video
  const activeRally = rallies.find(
    (r) => currentTimeSeconds >= r.startTime && currentTimeSeconds <= r.endTime
  );

  // Tự động cuộn theo rally đang phát
  useEffect(() => {
    if (activeRally && activeRallyRef.current) {
      activeRallyRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeRally?.id]);

  const getPlayerNameBySide = (side: string) => {
    if (side === 'UPPER') {
      return upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
    }
    return upperPlayer === 'PLAYER_A' ? playerBName : playerAName;
  };

  const formatWinReason = (reason?: string) => {
    if (!reason) return 'Ghi điểm';
    switch (reason.toLowerCase()) {
      case 'winner_smash':
        return 'Đập cầu ghi điểm (Smash Winner)';
      case 'winner_net_shot':
        return 'Bỏ nhỏ lưới hiểm hóc (Net Winner)';
      case 'opponent_unforced_error':
        return 'Đối thủ tự đánh hỏng (Unforced Error)';
      case 'opponent_forced_error':
        return 'Ép đối thủ đánh hỏng (Forced Error)';
      default:
        return reason.replace(/_/g, ' ');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!rallies || rallies.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/50 space-y-2">
        <Target className="w-10 h-10 text-white/20 mb-2" />
        <p className="text-xs font-semibold">Chưa có dữ liệu đợt cầu (Rallies)</p>
        <p className="text-[11px] text-white/40">Dữ liệu phân tích đang được cập nhật...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
      {rallies.map((rally) => {
        const isCurrentTimeInRally = activeRally?.id === rally.id;
        const isSelected = selectedRallyId === rally.id;
        const isActive = isCurrentTimeInRally || isSelected;

        const winnerName = getPlayerNameBySide(rally.winnerSide);
        const serverName = getPlayerNameBySide(rally.serverSide);
        const isUpperWinner = rally.winnerSide === 'UPPER';

        return (
          <div
            key={rally.id}
            ref={isCurrentTimeInRally ? activeRallyRef : null}
            onClick={() => onPlayRally(rally)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
              isActive
                ? 'bg-brand/20 border-brand shadow-glow-blue ring-1 ring-brand/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {/* Header: Số thứ tự pha, Tỷ số thời điểm & Trạng thái phát */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                    isActive ? 'bg-brand text-white shadow-glow-blue' : 'bg-white/10 text-white/70'
                  }`}
                >
                  #{rally.rallyNumber}
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  Pha cầu {rally.rallyNumber}
                </span>
                {isCurrentTimeInRally && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold animate-pulse border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Đang phát
                  </span>
                )}
              </div>

              {/* Tỷ số thời điểm */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/50">Tỷ số:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-white font-mono font-bold text-xs">
                  {rally.scoreText || `${rally.scoreUpper} - ${rally.scoreLower}`}
                </span>
              </div>
            </div>

            {/* Thông tin Bên thắng & Nguyên nhân ghi điểm */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-white/60 text-[11px]">Bên ghi điểm:</span>
                  <span className={`font-bold ${isUpperWinner ? 'text-blue-400' : 'text-amber-400'}`}>
                    {winnerName}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-white/40">
                  {formatTime(rally.startTime)} - {formatTime(rally.endTime)}
                </span>
              </div>

              {/* Lý do kết thúc pha cầu */}
              <div className="flex items-center gap-1.5 text-[11px] text-white/70 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/5">
                <Award className="w-3 h-3 text-brand shrink-0" />
                <span className="truncate">{formatWinReason(rally.winReason)}</span>
              </div>

              {/* Thông số pha cầu: Số cú đánh & Thời lượng */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/60">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{rally.totalStrokes} cú đánh</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60 justify-end">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>{rally.duration.toFixed(1)} giây</span>
                </div>
              </div>

              {/* Chuỗi cú đánh tóm tắt (Stroke sequence) */}
              {rally.strokeSequence && rally.strokeSequence.length > 0 && (
                <div className="pt-1.5 border-t border-white/10">
                  <div className="text-[10px] text-white/40 mb-1">Chuỗi cú đánh:</div>
                  <div className="flex flex-wrap items-center gap-1">
                    {rally.strokeSequence.slice(0, 6).map((stroke, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono uppercase text-white/80">
                          {stroke}
                        </span>
                        {idx < Math.min(rally.strokeSequence.length - 1, 5) && (
                          <span className="text-white/20 text-[9px]">→</span>
                        )}
                      </React.Fragment>
                    ))}
                    {rally.strokeSequence.length > 6 && (
                      <span className="text-white/40 text-[9px]">+{rally.strokeSequence.length - 6}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nút hành động nhanh: Phát pha này */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-white/40 text-[10px]">Người giao cầu: {serverName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayRally(rally);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-brand text-white shadow-glow-blue'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Play className="w-3 h-3 ml-0.5" />
                <span>Phát pha này</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

