import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, ChevronLeft, Layers, ShieldAlert } from 'lucide-react';

export const MatchReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>({
    id: 101,
    stroke: 'SMASH',
    strokeSide: 'FOREHAND',
    playerSide: 'UPPER',
    player: 'Nguyễn Tiến Minh',
    timeSeconds: 45.2,
    confidence: 0.945,
    hitFrame: 1356,
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link to="/my-matches" className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Trận đấu #{id}: Nguyễn Tiến Minh (Sân trên) VS Lee Chong Wei (Sân dưới)
            </h1>
            <p className="text-xs text-slate-500">Video Replay & Trực quan hóa dòng sự kiện AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
            Status: ANALYZED
          </span>
          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">1080p • 30fps</span>
        </div>
      </div>

      {/* Main Workspace Grid (7 : 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player & Multi-tier Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Video Player Box */}
          <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center relative shadow-sm text-white">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-emerald-400">
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400">Trình phát Video.js Stream (Mock Mode)</p>
            </div>

            {/* Custom Control Bar Overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between text-xs">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1 hover:text-emerald-400 transition"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="font-mono text-slate-300">00:45 / 23:15</span>
            </div>
          </div>

          {/* Interactive Multi-tier Timeline */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>DÒNG THỜI GIAN SỰ KIỆN CÚ ĐÁNH (TIMELINE MARKERS)</span>
              <span>Thời điểm: 00:45.200</span>
            </div>

            {/* Rally Intervals Tier */}
            <div className="h-3 w-full bg-slate-100 rounded flex overflow-hidden">
              <div className="w-1/4 bg-emerald-200 border-r border-white text-[9px] text-emerald-800 text-center font-bold">Rally 1</div>
              <div className="w-1/3 bg-emerald-400 text-[9px] text-emerald-900 text-center font-bold">Rally 2 (Active)</div>
              <div className="w-1/6 bg-emerald-200 border-l border-white text-[9px] text-emerald-800 text-center font-bold">R3</div>
            </div>

            {/* Video Progress Seeker */}
            <div className="h-1.5 w-full bg-slate-200 rounded-full relative cursor-pointer">
              <div className="h-full bg-emerald-500 rounded-full w-[45%]" />
              <div className="absolute top-1/2 left-[45%] -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white shadow" />
            </div>

            {/* Stroke Markers Pins */}
            <div className="relative h-6 flex items-center">
              {[
                { time: '12%', color: 'bg-rose-500', type: 'Smash' },
                { time: '25%', color: 'bg-blue-500', type: 'Clear' },
                { time: '38%', color: 'bg-emerald-500', type: 'Drop' },
                { time: '45%', color: 'bg-rose-600 ring-2 ring-rose-300 scale-125', type: 'Smash' },
                { time: '60%', color: 'bg-amber-500', type: 'Net' },
                { time: '82%', color: 'bg-blue-500', type: 'Clear' },
              ].map((pin, i) => (
                <button
                  key={i}
                  style={{ left: pin.time }}
                  className={`absolute -translate-x-1/2 w-2.5 h-2.5 rounded-full ${pin.color} transition hover:scale-150`}
                  title={`${pin.type} tại ${pin.time}`}
                  onClick={() => setSelectedEvent({ ...selectedEvent, stroke: pin.type })}
                />
              ))}
            </div>

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Smash</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Clear</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Drop</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Net Shot</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Event Inspector & Rallies Navigator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Event Card */}
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase">Chi tiết cú đánh đang chọn</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700">
                {selectedEvent.stroke}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Vận động viên:</span>
                <span className="font-semibold text-slate-800">{selectedEvent.player}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Kiểu đánh:</span>
                <span className="font-semibold text-slate-800">{selectedEvent.strokeSide}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Thời điểm video:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedEvent.timeSeconds}s (Frame {selectedEvent.hitFrame})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Độ tự tin AI:</span>
                <span className="font-semibold text-emerald-600">{(selectedEvent.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            {selectedEvent.confidence < 0.6 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center space-x-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Sự kiện có độ tự tin thấp. Kết quả phân loại có thể có sai số.</span>
              </div>
            )}
          </div>

          {/* Rallies List Explorer */}
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase flex items-center space-x-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Danh sách Pha cầu (Rallies)</span>
              </span>
              <span className="text-xs font-semibold text-slate-500">6 Pha cầu</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[
                { number: 1, duration: '14.5s', strokes: 8, time: '00:05 - 00:19', active: false },
                { number: 2, duration: '32.0s', strokes: 16, time: '00:35 - 01:07', active: true },
                { number: 3, duration: '12.0s', strokes: 6, time: '01:25 - 01:37', active: false },
              ].map((rally) => (
                <div
                  key={rally.number}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer ${
                    rally.active
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800">
                      Pha cầu #{rally.number} {rally.active && <span className="text-[10px] text-emerald-700 font-normal">(Đang phát)</span>}
                    </div>
                    <div className="text-slate-500">{rally.time} • {rally.strokes} Cú đánh</div>
                  </div>
                  <button className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 text-emerald-700 font-medium rounded shadow-2xs">
                    Xem pha
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

