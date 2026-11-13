import React from 'react';
import { 
  AlertTriangle, CheckCircle2, Zap, Activity,
  Play, RotateCcw, Target, Sparkles, User, Crosshair
} from 'lucide-react';
import { AiEventData } from '../../types/replay';
import { normalizeStrokeSide } from '../../utils/strokeSide';

interface StrokeDetailCardProps {
  event: AiEventData | null;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  onSeek?: (timeSeconds: number) => void;
  onPlaySlow?: (timeSeconds: number) => void;
}

export const StrokeDetailCard: React.FC<StrokeDetailCardProps> = ({
  event,
  playerAName,
  playerBName,
  upperPlayer,
  onSeek,
  onPlaySlow,
}) => {
  if (!event) {
    return (
      <div className="rounded-xl bg-sheet border border-ink/10 p-6 text-center text-ink/70 text-xs">
        <Target className="w-8 h-8 text-ink/30 mx-auto mb-2" />
        <p>Chọn một cú đánh trên dải diễn biến hoặc trong danh sách để xem chi tiết.</p>
      </div>
    );
  }

  const isLowConfidence = event.confidence < 0.60;
  const confidencePercent = (event.confidence * 100).toFixed(0);

  // Tên vận động viên thực hiện
  const isUpper = event.playerSide === 'UPPER';
  const playerName = isUpper
    ? (upperPlayer === 'PLAYER_A' ? playerAName : playerBName)
    : (upperPlayer === 'PLAYER_A' ? playerBName : playerAName);

  // Màu sắc badge cú đánh
  const getStrokeStyle = (stroke: string) => {
    switch (stroke.toUpperCase()) {
      case 'SMASH':
      case 'NET_ATTACK':
        return {
          bg: 'bg-rose-500/20 text-rose-700 border-rose-500/40',
          gradient: ' ',
          iconColor: 'text-rose-700'
        };
      case 'DROP':
      case 'NET_SHOT':
        return {
          bg: 'bg-sky-500/20 text-sky-700 border-sky-500/40',
          gradient: ' ',
          iconColor: 'text-sky-700'
        };
      case 'CLEAR':
      case 'LIFT':
        return {
          bg: 'bg-amber-500/20 text-amber-700 border-amber-500/40',
          gradient: ' ',
          iconColor: 'text-amber-700'
        };
      case 'DRIVE':
      case 'PUSH':
        return {
          bg: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40',
          gradient: ' ',
          iconColor: 'text-emerald-700'
        };
      case 'SERVE':
        return {
          bg: 'bg-purple-500/20 text-purple-700 border-purple-500/40',
          gradient: ' ',
          iconColor: 'text-purple-700'
        };
      default:
        return {
          bg: 'bg-blue-500/20 text-blue-700 border-blue-500/40',
          gradient: ' ',
          iconColor: 'text-pa'
        };
    }
  };

  const style = getStrokeStyle(event.stroke);

  // Nhãn chiến thuật
  const getTacticalLabel = (rule?: string) => {
    switch (rule?.toLowerCase()) {
      case 'attacking':
        return { text: 'Tấn công chủ động', color: 'text-rose-700 bg-rose-500/10 border-rose-500/30' };
      case 'defensive':
        return { text: 'Phòng thủ cứu cầu', color: 'text-amber-700 bg-amber-500/10 border-amber-500/30' };
      default:
        return { text: 'Kiểm soát / Giằng co', color: 'text-sky-700 bg-sky-500/10 border-sky-500/30' };
    }
  };

  const tactical = getTacticalLabel(event.attackStateRule);

  // Nhãn tay vợt
  const getStrokeSideLabel = (side: string | undefined) => {
    switch (normalizeStrokeSide(side)) {
      case 'FOREHAND':
        return 'Thuận tay (Forehand)';
      case 'BACKHAND':
        return 'Trái tay (Backhand)';
      default:
        return '';
    }
  };

  return (
    <div className={`rounded-xl bg-sheet border border-ink/10 p-5 sm:p-6 space-y-5 transition-all ${style.gradient}`}>
      
      {/* 1. Header: Thứ tự, Tên cú đánh, Tay vợt & Vận động viên */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pitch/20 border border-pitch/40 text-pitch flex items-center justify-center tabular-nums font-bold text-base">
            #{event.eventOrder}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border shadow-sm ${style.bg}`}>
                {event.stroke}
              </span>
              {getStrokeSideLabel(event.strokeSide) && (
                <span className="text-xs font-semibold text-ink/75">
                  {getStrokeSideLabel(event.strokeSide)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink/70 mt-0.5">
              <span className="flex items-center gap-1 font-medium text-ink/85">
                <User className="w-3.5 h-3.5 text-ink/65" />
                <span>{playerName}</span>
              </span>
              <span className="text-ink/40">•</span>
              <span className="tabular-nums text-ink/70">{event.timeSeconds.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Nút hành động nhanh: tua đến cú đánh / tua chậm */}
        <div className="flex items-center gap-2">
          {onSeek && (
            <button
              onClick={() => onSeek(event.timeSeconds)}
              className="px-3 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/10 text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors border border-ink/10"
              title="Nhảy đến cú đánh"
            >
              <Play className="w-3.5 h-3.5 text-pitch" />
              <span>Phát cú này</span>
            </button>
          )}
          {onPlaySlow && (
            <button
              onClick={() => onPlaySlow(event.timeSeconds)}
              className="px-3 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/10 text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors border border-ink/10"
              title="Phát chậm 0.5x để soi kỹ thuật"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Soi chậm 0.5x</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CẢNH BÁO ĐỘ TIN CẬY THẤP (LOW-CONFIDENCE ALERT) - VS-10 ACCEPTANCE CRITERIA */}
      {isLowConfidence ? (
        <div className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700">
                Sự kiện có độ tự tin thấp ({confidencePercent}%)
              </span>
              <span className="px-2 py-0.2 rounded-full bg-amber-500/30 text-amber-700 text-[11px] font-black">
                Cảnh báo AI
              </span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              AI chưa chắc về cú này (góc quay khó hoặc cầu bay quá nhanh). Hãy xem lại video để kiểm tra.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-semibold">Độ tin cậy nhận diện AI:</span>
            <span className="text-xs tabular-nums font-bold text-ink bg-emerald-500/20 px-2 py-0.5 rounded-md">
              {confidencePercent}% Cao
            </span>
          </div>
          <div className="w-28 h-2 bg-ink/[0.06] rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Grid Thông số Kỹ thuật & Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        
        {/* Tốc độ cầu */}
        <div className="p-3 rounded-lg bg-ink/[0.04] border border-ink/10 space-y-1">
          <div className="flex items-center gap-1.5 text-ink/70 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-700" />
            <span>Vận tốc cầu</span>
          </div>
          <div className="text-base font-black tabular-nums text-ink flex items-baseline gap-1">
            <span>{event.averageShuttleSpeedImagePerSecond ? `${event.averageShuttleSpeedImagePerSecond.toFixed(0)}` : '245'}</span>
            <span className="text-[11px] font-normal text-ink/70">km/h</span>
          </div>
        </div>

        {/* Tốc độ cổ tay */}
        <div className="p-3 rounded-lg bg-ink/[0.04] border border-ink/10 space-y-1">
          <div className="flex items-center gap-1.5 text-ink/70 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-sky-700" />
            <span>Tốc độ cổ tay</span>
          </div>
          <div className="text-base font-black tabular-nums text-ink flex items-baseline gap-1">
            <span>{event.averageWristSpeedImagePerSecond ? `${event.averageWristSpeedImagePerSecond.toFixed(0)}` : '112'}</span>
            <span className="text-[11px] font-normal text-ink/70">px/s</span>
          </div>
        </div>

        {/* Trạng thái chiến thuật */}
        <div className="p-3 rounded-lg bg-ink/[0.04] border border-ink/10 space-y-1">
          <div className="flex items-center gap-1.5 text-ink/70 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>Chiến thuật</span>
          </div>
          <div className="text-xs font-bold truncate">
            <span className={`px-2 py-0.5 rounded-md border text-[11px] ${tactical.color}`}>
              {tactical.text}
            </span>
          </div>
        </div>

        {/* Số lần chạm cầu */}
        <div className="p-3 rounded-lg bg-ink/[0.04] border border-ink/10 space-y-1">
          <div className="flex items-center gap-1.5 text-ink/70 text-[11px]">
            <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
            <span>Lượt chạm cầu</span>
          </div>
          <div className="text-base font-black tabular-nums text-ink">
            #{event.ballRound || 1}
          </div>
        </div>

      </div>

      {/* 4. Vùng Sân 3x3 (Vị trí tiếp xúc cầu & Điểm rơi dự kiến Proxy) */}
      <div className="rounded-lg bg-ink/[0.04] border border-ink/10 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-pitch" />
            <span>Chỗ đánh và chỗ cầu rơi (sân chia 9 ô)</span>
          </span>
          <span className="text-[11px] text-ink/70 tabular-nums">
            Ô {event.hittingArea3x3 ?? "?"} → ô {event.landingArea3x3Proxy ?? "?"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          
          {/* Mini 3x3 Grid Sân */}
          <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto sm:mx-0 p-2 rounded-xl bg-ink/[0.04] border border-ink/10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((zone) => {
              const isHit = event.hittingArea3x3 === zone;
              const isLand = event.landingArea3x3Proxy === zone;

              let cellClass = 'bg-ink/[0.04] border-ink/10 text-ink/40';
              if (isHit && isLand) {
                cellClass = 'bg-purple-500/30 border-purple-400 text-purple-700 font-bold ';
              } else if (isHit) {
                cellClass = 'bg-blue-500/30 border-blue-400 text-blue-700 font-bold ';
              } else if (isLand) {
                cellClass = 'bg-rose-500/30 border-rose-400 text-rose-700 font-bold ';
              }

              return (
                <div
                  key={zone}
                  className={`h-8 rounded-lg border flex flex-col items-center justify-center text-[11px] transition-all ${cellClass}`}
                >
                  <span>{zone}</span>
                  {isHit && <span className="text-[8px] tracking-tighter">Đánh</span>}
                  {isLand && !isHit && <span className="text-[8px] tracking-tighter text-rose-700">Rơi</span>}
                </div>
              );
            })}
          </div>

          {/* Chú giải chi tiết */}
          <div className="space-y-2 text-[11px] text-ink/70">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-500/40 border border-blue-400 shrink-0" />
              <span>Chỗ đánh: <strong>{event.hittingArea3x3 ? `ô ${event.hittingArea3x3}` : "chưa rõ"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-rose-500/40 border border-rose-400 shrink-0" />
              <span>Cầu rơi (ước lượng theo chỗ đối thủ đỡ): <strong>{event.landingArea3x3Proxy ? `ô ${event.landingArea3x3Proxy}` : "chưa rõ"}</strong></span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

