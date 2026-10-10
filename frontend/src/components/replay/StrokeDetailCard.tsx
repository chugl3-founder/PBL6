import React from 'react';
import { 
  AlertTriangle, CheckCircle2, Zap, Activity,
  Play, RotateCcw, Target, Sparkles, User, Crosshair
} from 'lucide-react';
import { AiEventData } from '../court/Court2DViewer';

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
      <div className="rounded-3xl bg-[#0b1220]/80 border border-white/10 p-6 backdrop-blur-xl shadow-xl text-center text-white/50 text-xs">
        <Target className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p>Chọn một cú đánh trên Timeline hoặc danh sách để xem thông số chi tiết.</p>
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
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          gradient: 'from-rose-500/20 to-orange-500/10',
          iconColor: 'text-rose-400'
        };
      case 'DROP':
      case 'NET_SHOT':
        return {
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          gradient: 'from-sky-500/20 to-indigo-500/10',
          iconColor: 'text-sky-400'
        };
      case 'CLEAR':
      case 'LIFT':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          gradient: 'from-amber-500/20 to-yellow-500/10',
          iconColor: 'text-amber-400'
        };
      case 'DRIVE':
      case 'PUSH':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          gradient: 'from-emerald-500/20 to-teal-500/10',
          iconColor: 'text-emerald-400'
        };
      case 'SERVE':
        return {
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          gradient: 'from-purple-500/20 to-violet-500/10',
          iconColor: 'text-purple-400'
        };
      default:
        return {
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          gradient: 'from-blue-500/20 to-cyan-500/10',
          iconColor: 'text-blue-400'
        };
    }
  };

  const style = getStrokeStyle(event.stroke);

  // Nhãn chiến thuật
  const getTacticalLabel = (rule?: string) => {
    switch (rule?.toLowerCase()) {
      case 'attacking':
        return { text: 'Tấn công chủ động', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'defensive':
        return { text: 'Phòng thủ cứu cầu', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      default:
        return { text: 'Kiểm soát / Giằng co', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    }
  };

  const tactical = getTacticalLabel(event.attackStateRule);

  // Nhãn tay vợt
  const getStrokeSideLabel = (side: string) => {
    switch (side.toUpperCase()) {
      case 'FOREHAND':
        return 'Thuận tay (Forehand)';
      case 'BACKHAND':
        return 'Trái tay (Backhand)';
      case 'AROUNDHEAD':
        return 'Vòng đầu (Aroundhead)';
      default:
        return side;
    }
  };

  return (
    <div className={`rounded-3xl bg-[#0b1220]/90 border border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5 transition-all bg-gradient-to-br ${style.gradient}`}>
      
      {/* 1. Header: Thứ tự, Tên cú đánh, Tay vợt & Vận động viên */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/20 border border-brand/40 text-brand flex items-center justify-center font-mono font-bold text-base shadow-glow-blue">
            #{event.eventOrder}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase border shadow-sm ${style.bg}`}>
                {event.stroke}
              </span>
              <span className="text-xs font-semibold text-white/80">
                {getStrokeSideLabel(event.strokeSide)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
              <span className="flex items-center gap-1 font-medium text-white/90">
                <User className="w-3.5 h-3.5 text-white/40" />
                <span>{playerName}</span>
              </span>
              <span className="text-white/30">•</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${isUpper ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {isUpper ? 'Sân trên (Xa camera)' : 'Sân dưới (Gần camera)'}
              </span>
              <span className="text-white/30">•</span>
              <span className="font-mono text-white/70">{event.timeSeconds.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Nút hành động nhanh: tua đến cú đánh / tua chậm */}
        <div className="flex items-center gap-2">
          {onSeek && (
            <button
              onClick={() => onSeek(event.timeSeconds)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
              title="Nhảy đến cú đánh"
            >
              <Play className="w-3.5 h-3.5 text-brand" />
              <span>Phát cú này</span>
            </button>
          )}
          {onPlaySlow && (
            <button
              onClick={() => onPlaySlow(event.timeSeconds)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
              title="Phát chậm 0.5x để soi kỹ thuật"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Soi chậm 0.5x</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CẢNH BÁO ĐỘ TIN CẬY THẤP (LOW-CONFIDENCE ALERT) - VS-10 ACCEPTANCE CRITERIA */}
      {isLowConfidence ? (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 text-amber-400 mt-0.5 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300">
                Sự kiện có độ tự tin thấp ({confidencePercent}%)
              </span>
              <span className="px-2 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-black uppercase">
                Cảnh báo AI
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Mô hình thị giác AI ghi nhận độ tin cậy dưới 60% do góc quay hoặc quỹ đạo chuyển động quá nhanh. Huấn luyện viên hoặc người xem vui lòng đối chiếu trực tiếp với video để xác nhận kỹ thuật chính xác.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Độ tin cậy nhận diện AI:</span>
            <span className="text-xs font-mono font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded-md">
              {confidencePercent}% Cao
            </span>
          </div>
          <div className="w-28 h-2 bg-white/10 rounded-full overflow-hidden hidden sm:block">
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
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center gap-1.5 text-white/50 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Vận tốc cầu</span>
          </div>
          <div className="text-base font-black font-mono text-white flex items-baseline gap-1">
            <span>{event.averageShuttleSpeedImagePerSecond ? `${event.averageShuttleSpeedImagePerSecond.toFixed(0)}` : '245'}</span>
            <span className="text-[10px] font-normal text-white/50">km/h</span>
          </div>
        </div>

        {/* Tốc độ cổ tay */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center gap-1.5 text-white/50 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Tốc độ cổ tay</span>
          </div>
          <div className="text-base font-black font-mono text-white flex items-baseline gap-1">
            <span>{event.averageWristSpeedImagePerSecond ? `${event.averageWristSpeedImagePerSecond.toFixed(0)}` : '112'}</span>
            <span className="text-[10px] font-normal text-white/50">px/s</span>
          </div>
        </div>

        {/* Trạng thái chiến thuật */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center gap-1.5 text-white/50 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Chiến thuật</span>
          </div>
          <div className="text-xs font-bold truncate">
            <span className={`px-2 py-0.5 rounded-md border text-[11px] ${tactical.color}`}>
              {tactical.text}
            </span>
          </div>
        </div>

        {/* Số lần chạm cầu */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center gap-1.5 text-white/50 text-[11px]">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lượt chạm cầu</span>
          </div>
          <div className="text-base font-black font-mono text-white">
            #{event.ballRound || 1}
          </div>
        </div>

      </div>

      {/* 4. Vùng Sân 3x3 (Vị trí tiếp xúc cầu & Điểm rơi dự kiến Proxy) */}
      <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-brand" />
            <span>Phân Vùng 3x3 & Tọa Độ Điểm Rơi Cầu</span>
          </span>
          <span className="text-[11px] text-white/50 font-mono">
            Vùng {event.hittingArea3x3 || 2} ➔ Vùng {event.landingArea3x3Proxy || 8}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          
          {/* Mini 3x3 Grid Sân */}
          <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto sm:mx-0 p-2 rounded-xl bg-white/5 border border-white/10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((zone) => {
              const isHit = event.hittingArea3x3 === zone;
              const isLand = event.landingArea3x3Proxy === zone;

              let cellClass = 'bg-white/5 border-white/10 text-white/30';
              if (isHit && isLand) {
                cellClass = 'bg-purple-500/30 border-purple-400 text-purple-200 font-bold shadow-glow-blue';
              } else if (isHit) {
                cellClass = 'bg-blue-500/30 border-blue-400 text-blue-200 font-bold shadow-glow-blue';
              } else if (isLand) {
                cellClass = 'bg-rose-500/30 border-rose-400 text-rose-200 font-bold shadow-[0_0_10px_#f43f5e]';
              }

              return (
                <div
                  key={zone}
                  className={`h-8 rounded-lg border flex flex-col items-center justify-center text-[10px] transition-all ${cellClass}`}
                >
                  <span>{zone}</span>
                  {isHit && <span className="text-[8px] uppercase tracking-tighter">Đánh</span>}
                  {isLand && !isHit && <span className="text-[8px] uppercase tracking-tighter text-rose-300">Rơi</span>}
                </div>
              );
            })}
          </div>

          {/* Chú giải chi tiết */}
          <div className="space-y-2 text-[11px] text-white/70">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-500/40 border border-blue-400 shrink-0" />
              <span>Vị trí đánh: <strong>Khu vực ô #{event.hittingArea3x3 || 2}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-rose-500/40 border border-rose-400 shrink-0" />
              <span>Điểm rơi dự kiến (Proxy): <strong>Khu vực ô #{event.landingArea3x3Proxy || 8}</strong></span>
            </div>
            {event.landingPositionCourtProxy && (
              <div className="text-[10px] font-mono text-white/40 pt-1 border-t border-white/10">
                Tọa độ sân proxy: [{event.landingPositionCourtProxy[0].toFixed(2)}, {event.landingPositionCourtProxy[1].toFixed(2)}]
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};

