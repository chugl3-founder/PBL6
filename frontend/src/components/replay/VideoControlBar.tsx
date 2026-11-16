import React from 'react';
import { Play, Pause, Volume2, Volume1, VolumeX, RotateCcw, RotateCw, SkipBack, SkipForward, Gauge, Maximize, Keyboard } from 'lucide-react';
import { PLAYBACK_RATES } from './playback';

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface VideoControlBarProps {
  isPlaying: boolean;
  /** Hidden while playing until the mouse moves over the player. */
  isControlsVisible: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  showSpeedMenu: boolean;
  setShowSpeedMenu: (open: boolean) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  handleSkip: (seconds: number) => void;
  handleJumpStroke: (direction: 'prev' | 'next') => void;
  handleSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVolumeChange: (volume: number) => void;
  handleChangeSpeed: (rate: number) => void;
  handleToggleFullscreen: () => void;
  onShowShortcuts: () => void;
}

/** The player's own controls, drawn over the video for both the MP4 and the YouTube player. */
export const VideoControlBar: React.FC<VideoControlBarProps> = ({
  isPlaying,
  isControlsVisible,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  showSpeedMenu,
  setShowSpeedMenu,
  togglePlay,
  toggleMute,
  handleSkip,
  handleJumpStroke,
  handleSliderChange,
  handleVolumeChange,
  handleChangeSpeed,
  handleToggleFullscreen,
  onShowShortcuts,
}) => (
    <div 
      className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-3 px-4 space-y-2.5 transition-all duration-300 ${
        isControlsVisible || !isPlaying
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >

      {/* Thanh trượt điều hướng Seeker Bar */}
      <div className="relative flex items-center group/slider">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime}
          onChange={handleSliderChange}
          aria-label="Tua video"
          className="video-seek w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #5FB88A ${(currentTime / (duration || 100)) * 100}%, rgba(255,255,255,0.25) ${(currentTime / (duration || 100)) * 100}%)`,
          }}
        />
      </div>

      {/* Hàng nút chức năng điều hướng & Tốc độ phát */}
      <div className="flex items-center justify-between text-white text-xs">

        {/* Cụm nút Play / Pause / Tua 5s / Cú đánh trước & sau */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cú đánh trước */}
          <button
            type="button"
            onClick={() => handleJumpStroke('prev')}
            title="Cú đánh trước đó ([)"
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Tua lùi 5 giây */}
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            title="Tua lùi 5 giây (← hoặc J)"
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center gap-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-[11px] font-mono hidden sm:inline">5s</span>
          </button>

          {/* Nút Play / Pause chính */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? "Tạm dừng (Space / K)" : "Phát (Space / K)"}
            className="w-9 h-9 rounded-full bg-pitch hover:bg-pitch-deep text-white flex items-center justify-center transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Tua tới 5 giây */}
          <button
            type="button"
            onClick={() => handleSkip(5)}
            title="Tua tới 5 giây (→ hoặc L)"
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors flex items-center gap-0.5"
          >
            <RotateCw className="w-4 h-4" />
            <span className="text-[11px] font-mono hidden sm:inline">5s</span>
          </button>

          {/* Cú đánh tiếp theo */}
          <button
            type="button"
            onClick={() => handleJumpStroke('next')}
            title="Cú đánh kế tiếp (])"
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Cụm điều chỉnh Âm lượng với thanh trượt mượt mà (Volume Slider) */}
          <div className="flex items-center group/vol ml-1 bg-white/5 hover:bg-white/10 px-1 py-0.5 rounded-xl border border-white/10 transition-colors">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted || volume === 0 ? "Bật tiếng (M)" : "Tắt tiếng (M)"}
              className="p-1 rounded-full text-white/80 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
            {/* Thanh slider âm lượng mở rộng khi hover */}
            <div className="flex items-center gap-1.5 w-0 opacity-0 group-hover/vol:w-24 group-hover/vol:opacity-100 transition-all duration-300 overflow-hidden px-0 group-hover/vol:px-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-white/30 accent-[#5FB88A] rounded-full appearance-none cursor-pointer"
                title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}% (↑ / ↓)`}
              />
              <span className="text-[11px] font-mono text-white/70 select-none">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {/* Bộ đếm thời gian */}
          <div className="text-[11px] font-mono text-white/80 ml-1.5">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span className="text-white/40"> / {formatTime(duration)}</span>
          </div>
        </div>

        {/* Cụm nút Tốc độ phát (Speed), Hướng dẫn phím tắt & Toàn màn hình */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative">

          {/* Menu Tốc độ phát (0.25x -> 2.0x) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              title="Tốc độ phát (< hoặc >)"
              className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition-colors border border-white/10"
            >
              <Gauge className="w-3.5 h-3.5 text-pitch" />
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-9 right-0 bg-[#0f172a] border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 w-24">
                <div className="text-[11px] text-white/40 font-bold px-2 py-0.5 uppercase">Tốc độ</div>
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleChangeSpeed(rate)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono text-left transition-colors flex items-center justify-between ${
                      playbackRate === rate
                        ? 'bg-pitch text-white font-bold'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{rate}x</span>
                    {playbackRate === rate && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nút hiển thị bảng hướng dẫn phím tắt */}
          <button
            type="button"
            onClick={onShowShortcuts}
            title="Bảng phím tắt điều khiển (?)"
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Toàn màn hình Fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Toàn màn hình (F)"
            className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>

        </div>

      </div>

    </div>
);
