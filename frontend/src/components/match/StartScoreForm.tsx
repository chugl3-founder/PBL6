import React, { useEffect, useState } from 'react';
import { updateMatch } from '../../api/matches';
import { errorMessage } from '../../api/errors';
import type { Match } from '../../types/match';

interface StartScoreFormProps {
  matchId: number | string;
  playerAName: string;
  playerBName: string;
  startGame?: number;
  startScoreA?: number;
  startScoreB?: number;
  onSaved: (match: Match) => void;
}

const clampScore = (v: string) => Math.max(0, Math.min(29, Number.parseInt(v, 10) || 0));

/**
 * The game and score when the video starts. When the AI cannot read the broadcast scoreboard it counts
 * from 0-0, so a clip that starts mid-game shows the wrong score until the owner gives the real one.
 * Scores are computed when they are read, so a change applies at once, without a new analysis.
 */
export const StartScoreForm: React.FC<StartScoreFormProps> = ({
  matchId,
  playerAName,
  playerBName,
  startGame = 1,
  startScoreA = 0,
  startScoreB = 0,
  onSaved,
}) => {
  const [game, setGame] = useState(startGame);
  const [a, setA] = useState(startScoreA);
  const [b, setB] = useState(startScoreB);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setGame(startGame);
    setA(startScoreA);
    setB(startScoreB);
  }, [startGame, startScoreA, startScoreB]);

  const dirty = game !== startGame || a !== startScoreA || b !== startScoreB;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      onSaved(await updateMatch(matchId, { startGame: game, startScoreA: a, startScoreB: b }));
      setMessage({ ok: true, text: 'Đã lưu. Tỉ số trên trang xem lại và video highlight mới sẽ tính từ mốc này.' });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err, 'Chưa lưu được. Hãy thử lại.') });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'h-9 w-14 rounded-md border border-ink/15 bg-sheet px-2 text-center text-sm tabular-nums text-ink focus:border-pitch focus:outline-none focus:ring-2 focus:ring-pitch/30';

  return (
    <form onSubmit={save} className="border-t border-ink/10 pt-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Tỉ số lúc video bắt đầu</h3>
        <p className="text-xs text-ink/70 mt-0.5">
          Chỉ cần sửa khi video bắt đầu giữa trận và AI không đọc được bảng điểm. Mặc định: ván 1, 0–0.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink/70 space-y-1">
          <span className="block">Ván</span>
          <select
            value={game}
            onChange={(e) => setGame(Number(e.target.value))}
            className="h-9 rounded-md border border-ink/15 bg-sheet px-2 text-sm text-ink focus:border-pitch focus:outline-none focus:ring-2 focus:ring-pitch/30"
          >
            {[1, 2, 3].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink/70 space-y-1 min-w-0">
          <span className="block truncate max-w-[8rem]" title={playerAName}>{playerAName}</span>
          <input type="number" min={0} max={29} value={a} onChange={(e) => setA(clampScore(e.target.value))} className={inputClass} />
        </label>
        <span className="pb-2 text-ink/50">–</span>
        <label className="text-xs text-ink/70 space-y-1 min-w-0">
          <span className="block truncate max-w-[8rem]" title={playerBName}>{playerBName}</span>
          <input type="number" min={0} max={29} value={b} onChange={(e) => setB(clampScore(e.target.value))} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={!dirty || saving}
          className="h-9 rounded-md bg-pitch px-4 text-sm font-semibold text-white hover:bg-pitch-deep disabled:opacity-40 transition-colors"
        >
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message.ok ? 'text-emerald-700' : 'text-loss'}`} role={message.ok ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}
    </form>
  );
};
