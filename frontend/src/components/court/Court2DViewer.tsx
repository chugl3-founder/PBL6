import React from 'react';
import { Target, Zap, Wind, ArrowRight } from 'lucide-react';
import { strokeSideLabel } from '../../utils/strokeSide';

export interface AiEventData {
  id: number;
  eventOrder: number;
  timeSeconds: number;
  playerSide: 'UPPER' | 'LOWER';
  stroke: string;
  strokeSide: string;
  confidence: number;
  playerPositionCourt?: [number, number]; // [x, y] 0..1 (x: 0..1 ngang sân, y: 0..1 dọc sân)
  opponentPositionCourt?: [number, number]; // [x, y] 0..1
  contactShuttleProjectionCourt?: [number, number];
  landingPositionCourtProxy?: [number, number];
  hittingArea3x3?: number;
  landingArea3x3Proxy?: number;
  averageShuttleSpeedImagePerSecond?: number;
  averageWristSpeedImagePerSecond?: number;
  attackStateRule?: string;
  ballRound?: number;
  top2?: string[] | null;
  flightTimeToNextHitSeconds?: number;
}

interface Court2DViewerProps {
  currentEvent: AiEventData | null;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  /** Narrow side panel: court and player key only; the shot details are shown elsewhere. */
  compact?: boolean;
}

export const Court2DViewer: React.FC<Court2DViewerProps> = ({
  currentEvent,
  playerAName,
  playerBName,
  upperPlayer,
  compact = false,
}) => {
  // Tên người chơi
  const upperPlayerName = upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
  const lowerPlayerName = upperPlayer === 'PLAYER_A' ? playerBName : playerAName;

  // SÂN NẰM NGANG:
  // Kích thước viewBox: rộng 600, cao 320
  // Sân cầu lông: Chiều dài theo trục X (20..580 -> width = 560)
  // Chiều rộng theo trục Y (20..300 -> height = 280)
  // Lưới nằm thẳng đứng ở chính giữa X = 300
  // Sân bên trái (X < 300): Upper player (Sân trên xa camera)
  // Sân bên phải (X > 300): Lower player (Sân dưới gần camera)
  const courtWidth = 560; // Trục X (chiều dài sân)
  const courtHeight = 280; // Trục Y (chiều rộng sân)
  const offsetX = 20;
  const offsetY = 20;

  // Chuyển đổi tọa độ chuẩn hóa (x: 0..1 là bề ngang sân, y: 0..1 là từ sân trên xuống sân dưới)
  // Trong sân nằm ngang:
  // Trục dài của sân (Y norm) -> trở thành trục X của SVG: offsetX + normY * courtWidth
  // Trục rộng của sân (X norm) -> trở thành trục Y của SVG: offsetY + normX * courtHeight
  const toSvgX = (normY?: number) => {
    const val = normY !== undefined ? normY : 0.5;
    return offsetX + val * courtWidth;
  };

  const toSvgY = (normX?: number) => {
    const val = normX !== undefined ? normX : 0.5;
    return offsetY + val * courtHeight;
  };

  // Xác định vị trí người đánh (Hitter) và đối thủ (Opponent)
  const hitterSide = currentEvent?.playerSide || 'UPPER';

  // Hitter: Y norm là trục dài (0..1), X norm là trục rộng (0..1)
  const hitterSvgX = toSvgX(currentEvent?.playerPositionCourt?.[1] ?? (hitterSide === 'UPPER' ? 0.2 : 0.8));
  const hitterSvgY = toSvgY(currentEvent?.playerPositionCourt?.[0] ?? (hitterSide === 'UPPER' ? 0.45 : 0.55));

  const oppSvgX = toSvgX(currentEvent?.opponentPositionCourt?.[1] ?? (hitterSide === 'UPPER' ? 0.8 : 0.2));
  const oppSvgY = toSvgY(currentEvent?.opponentPositionCourt?.[0] ?? (hitterSide === 'UPPER' ? 0.55 : 0.45));

  // Tọa độ điểm rơi cầu (Landing proxy)
  const landingSvgX = toSvgX(currentEvent?.landingPositionCourtProxy?.[1] ?? (hitterSide === 'UPPER' ? 0.75 : 0.25));
  const landingSvgY = toSvgY(currentEvent?.landingPositionCourtProxy?.[0] ?? (hitterSide === 'UPPER' ? 0.6 : 0.4));

  // Màu sắc theo loại cú đánh
  const getStrokeColor = (stroke?: string) => {
    switch (stroke?.toUpperCase()) {
      case 'SMASH':
      case 'NET_ATTACK':
        return '#f43f5e'; // Rose
      case 'DROP':
      case 'NET_SHOT':
        return '#38bdf8'; // Sky
      case 'CLEAR':
      case 'LIFT':
        return '#facc15'; // Amber
      case 'DRIVE':
      case 'PUSH':
        return '#10b981'; // Emerald
      case 'SERVE':
        return '#c084fc'; // Purple
      default:
        return '#3b82f6'; // Blue
    }
  };

  const strokeColor = getStrokeColor(currentEvent?.stroke);

  // Tính góc xoay của mũi tên quỹ đạo cầu
  const deltaX = landingSvgX - hitterSvgX;
  const deltaY = landingSvgY - hitterSvgY;
  const trajectoryAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return (
    <div className={compact ? 'flex flex-col space-y-2' : 'rounded-xl bg-sheet border border-ink/10 p-5 flex flex-col space-y-4'}>
      {!compact && (
        <div className="border-b border-ink/10 pb-3">
          <span className="text-sm font-semibold text-ink">Sơ đồ sân nhìn từ trên xuống</span>
        </div>
      )}

      {/* SVG SÂN NẰM NGANG (HORIZONTAL VIEW) */}
      <div className="relative w-full aspect-[600/320] bg-sheet rounded-lg border-2 border-ink/15 shadow-inner overflow-hidden p-2">
        <svg
          viewBox="0 0 600 320"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradient thảm sân xanh */}
            <linearGradient id="courtFloor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#083e20" />
              <stop offset="100%" stopColor="#0b4d29" />
            </linearGradient>

            {/* Marker mũi tên đầu đường bay */}
            <marker
              id="shuttleArrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={strokeColor} />
            </marker>
          </defs>

          {/* 1. Mặt sàn sân thi đấu */}
          <rect x="20" y="20" width="560" height="280" fill="url(#courtFloor)" stroke="#ffffff" strokeWidth="2.5" />

          {/* 2. Đường biên trong đánh đơn (Singles Sidelines: trên & dưới) */}
          <line x1="20" y1="42" x2="580" y2="42" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
          <line x1="20" y1="278" x2="580" y2="278" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />

          {/* 3. Đường giao cầu dài đánh đôi (Doubles Long Service Line: trái & phải) */}
          <line x1="50" y1="20" x2="50" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
          <line x1="550" y1="20" x2="550" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />

          {/* 4. Đường giao cầu ngắn (Short Service Line) */}
          <line x1="230" y1="20" x2="230" y2="300" stroke="#ffffff" strokeWidth="1.8" />
          <line x1="370" y1="20" x2="370" y2="300" stroke="#ffffff" strokeWidth="1.8" />

          {/* 5. Đường trung tâm chia 2 ô giao cầu (Center Line) */}
          <line x1="20" y1="160" x2="230" y2="160" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="370" y1="160" x2="580" y2="160" stroke="#ffffff" strokeWidth="1.5" />

          {/* 6. LƯỚI THI ĐẤU DỌC Ở CHÍNH GIỮA X = 300 (NET) */}
          <line x1="300" y1="15" x2="300" y2="305" stroke="#f8fafc" strokeWidth="4" strokeDasharray="5 3" />
          <rect x="285" y="140" width="30" height="40" rx="6" fill="#022c22" stroke="#ffffff" strokeWidth="1.5" />
          <text
            x="300"
            y="164"
            fill="#ffffff"
            fontSize="8"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="1"
            transform="rotate(90, 300, 160)"
          >
            LƯỚI
          </text>

          {/* 7. QUỸ ĐẠO CẦU (TRAJECTORY) VỚI SMOOTH TRANSITION */}
          {currentEvent && (
            <g>
              {/* Vệt bay của cầu có animation mượt mà */}
              <line
                x1={hitterSvgX}
                y1={hitterSvgY}
                x2={landingSvgX}
                y2={landingSvgY}
                stroke={strokeColor}
                strokeWidth="3"
                strokeDasharray="6 4"
                markerEnd="url(#shuttleArrow)"
                style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />

              {/* Vòng lan tỏa va chạm tại điểm rơi (Landing Target Wave) */}
              <circle
                cx={landingSvgX}
                cy={landingSvgY}
                r="16"
                fill={strokeColor}
                fillOpacity="0.25"
                style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <animate attributeName="r" values="8;20;8" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle
                cx={landingSvgX}
                cy={landingSvgY}
                r="5"
                fill={strokeColor}
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />

              {/* Icon quả cầu nhỏ bay theo quỹ đạo */}
              <g
                transform={`translate(${(hitterSvgX + landingSvgX) / 2}, ${(hitterSvgY + landingSvgY) / 2}) rotate(${trajectoryAngle})`}
                style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <circle r="4" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
              </g>
            </g>
          )}

          {/* 8. AVATAR NGƯỜI CHƠI (UPPER & LOWER) VỚI CHUYỂN ĐỘNG MƯỢT (CSS TRANSITION) */}
          {/* Đấu thủ Sân Trái (Upper Player) */}
          <g
            transform={`translate(${hitterSide === 'UPPER' ? hitterSvgX : oppSvgX}, ${hitterSide === 'UPPER' ? hitterSvgY : oppSvgY})`}
            style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {/* Vòng sáng viền khi là người đánh cú hiện tại */}
            {hitterSide === 'UPPER' && (
              <circle r="18" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 3">
                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="13" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" className="" />
            <text y="4" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
              {upperPlayerName.substring(0, 1).toUpperCase()}
            </text>
          </g>

          {/* Đấu thủ Sân Phải (Lower Player) */}
          <g
            transform={`translate(${hitterSide === 'LOWER' ? hitterSvgX : oppSvgX}, ${hitterSide === 'LOWER' ? hitterSvgY : oppSvgY})`}
            style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {/* Vòng sáng viền khi là người đánh cú hiện tại */}
            {hitterSide === 'LOWER' && (
              <circle r="18" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3">
                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="13" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" className="" />
            <text y="4" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
              {lowerPlayerName.substring(0, 1).toUpperCase()}
            </text>
          </g>
        </svg>

        {/* Legend nhãn bên sân */}
        {!compact && (<>
        <div className="absolute top-3 left-4 bg-ink/[0.04] px-3 py-1.5 rounded-xl border border-blue-500/30 text-xs text-blue-700 font-bold flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-pa" />
          <span>{upperPlayerName} (xa camera)</span>
        </div>

        <div className="absolute top-3 right-4 bg-ink/[0.04] px-3 py-1.5 rounded-xl border border-amber-500/30 text-xs text-amber-700 font-bold flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>{lowerPlayerName} (gần camera)</span>
        </div>
        </>)}
      </div>

      {compact && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink/70">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-pa shrink-0" />
            <span className="truncate">{upperPlayerName} · trái</span>
          </span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="truncate">{lowerPlayerName} · phải</span>
          </span>
        </div>
      )}

      {/* THẺ TRỰC QUAN HÓA CÚ ĐÁNH HIỆN TẠI (STROKE VISUAL CARD) */}
      {compact ? null : currentEvent ? (
        <div className="p-4 rounded-lg bg-ink/[0.04] border border-ink/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink/55 tabular-nums">Cú đánh #{currentEvent.eventOrder}</span>
              <span className="text-ink/40">•</span>
              <span className="text-xs font-semibold text-ink/75">Thời điểm: {currentEvent.timeSeconds.toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-black text-ink flex items-center gap-1.5"
                style={{ backgroundColor: strokeColor }}
              >
                <span>{currentEvent.stroke}</span>
              </span>
              {strokeSideLabel(currentEvent.strokeSide) && (
                <span className="px-2.5 py-1 rounded-full bg-ink/[0.06] text-ink/75 text-[11px] font-semibold border border-ink/10">
                  {strokeSideLabel(currentEvent.strokeSide)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 space-y-0.5">
              <span className="text-ink/50 text-[11px]">Người vung vợt:</span>
              <div className="font-bold text-ink truncate flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${currentEvent.playerSide === 'UPPER' ? 'bg-pa' : 'bg-amber-400'}`} />
                <span>{currentEvent.playerSide === 'UPPER' ? upperPlayerName : lowerPlayerName}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 space-y-0.5">
              <span className="text-ink/50 text-[11px]">Vận tốc cầu:</span>
              <div className="tabular-nums font-bold text-amber-700 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                <span>{currentEvent.averageShuttleSpeedImagePerSecond ? `${currentEvent.averageShuttleSpeedImagePerSecond.toFixed(1)} px/s` : 'N/A'}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 space-y-0.5">
              <span className="text-ink/50 text-[11px]">Độ tin cậy AI:</span>
              <div className="tabular-nums font-bold text-emerald-700 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-700" />
                <span>{(currentEvent.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 space-y-0.5">
              <span className="text-ink/50 text-[11px]">Trạng thái:</span>
              <div className="font-semibold text-sky-700 flex items-center gap-1 capitalize">
                <Wind className="w-3.5 h-3.5 text-sky-700" />
                <span>{currentEvent.attackStateRule || 'Rallying'}</span>
              </div>
            </div>
          </div>

          {/* Vùng tiếp xúc -> Vùng rơi */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-pitch/10 border border-pitch/20 text-xs text-ink/75">
            <div className="flex items-center gap-1.5">
              <span className="text-ink/55">Khu vực đánh:</span>
              <span className="font-bold text-ink bg-ink/[0.06] px-2 py-0.5 rounded-md">Ô {currentEvent.hittingArea3x3 ?? "?"}/9</span>
            </div>
            <ArrowRight className="w-4 h-4 text-pitch" />
            <div className="flex items-center gap-1.5">
              <span className="text-ink/55">Cầu rơi (ước lượng):</span>
              <span className="font-bold text-emerald-700 bg-emerald-500/20 px-2 py-0.5 rounded-md">Ô {currentEvent.landingArea3x3Proxy ?? "?"}/9</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-ink/[0.04] border border-ink/10 text-center text-xs text-ink/50">
          Chưa chọn cú đánh nào trên timeline
        </div>
      )}
    </div>
  );
};
