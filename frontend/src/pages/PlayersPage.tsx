import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search, Users, X } from 'lucide-react';
import { fetchPlayers, playerPath, type PlayerSummary } from '../api/players';
import { PlayerMonogram } from '../components/player/PlayerMonogram';
import { PlayerRadarChart } from '../components/player/PlayerRadarChart';
import { formatDate, hasRadar, playstyleLabel, playstyleTone, winRate } from '../utils/playerProfile';
import { isSignedIn } from '../auth/session';

const PlayerCard: React.FC<{ player: PlayerSummary }> = ({ player }) => {
  const rate = winRate(player.ralliesWon, player.ralliesLost);
  const analyzed = player.analyzedMatchCount > 0;
  return (
    <Link
      to={playerPath(player.name)}
      className="group relative flex flex-col rounded-xl bg-sheet border border-ink/10 overflow-hidden hover:border-pitch/50 hover:shadow-[0_8px_24px_-12px_rgba(22,32,27,0.35)] hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start gap-3 p-4 pb-0">
        <PlayerMonogram name={player.name} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink leading-snug truncate group-hover:text-pitch-deep transition-colors">
            {player.name}
          </h3>
          {player.playstyle ? (
            <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${playstyleTone(player.playstyle)}`}>
              {playstyleLabel(player.playstyle)}
            </span>
          ) : (
            <span className="inline-block mt-1 text-[11px] text-ink/65">
              {analyzed ? 'Chưa có chỉ số lối chơi' : 'Chưa có trận phân tích xong'}
            </span>
          )}
        </div>
        <ArrowUpRight className="w-4 h-4 text-ink/25 group-hover:text-pitch transition-colors" aria-hidden />
      </div>

      <div className="flex items-center justify-center h-[132px]">
        {hasRadar(player.radar) ? (
          <PlayerRadarChart series={[{ radar: player.radar, color: '#2E7D5B' }]} size={124} showLabels={false} />
        ) : (
          <Users className="w-10 h-10 text-ink/10" aria-hidden />
        )}
      </div>

      <dl className="grid grid-cols-3 border-t border-ink/10 divide-x divide-ink/10 mt-auto">
        <div className="px-2 py-2.5 text-center">
          <dt className="text-[11px] uppercase tracking-wide text-ink/65 whitespace-nowrap">Trận</dt>
          <dd className="font-score text-xl font-bold tabular-nums text-ink">{player.matchCount}</dd>
        </div>
        <div className="px-2 py-2.5 text-center">
          <dt className="text-[11px] uppercase tracking-wide text-ink/65 whitespace-nowrap">Thắng điểm</dt>
          <dd className={`font-score text-xl font-bold tabular-nums ${rate == null ? 'text-ink/30' : rate >= 50 ? 'text-pitch-deep' : 'text-loss'}`}>
            {rate == null ? '–' : `${rate}%`}
          </dd>
        </div>
        <div className="px-2 py-2.5 text-center">
          <dt className="text-[11px] uppercase tracking-wide text-ink/65 whitespace-nowrap">Cú đánh</dt>
          <dd className="font-score text-xl font-bold tabular-nums text-ink">{player.totalShots.toLocaleString('vi-VN')}</dd>
        </div>
      </dl>
      <p className="px-4 py-2 text-[11px] text-ink/65 bg-ground/60 border-t border-ink/[0.06]">
        Trận gần nhất {formatDate(player.lastMatchDate)}
      </p>
    </Link>
  );
};

export const PlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const isLoggedIn = isSignedIn();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchPlayers(search)
        .then(data => {
          if (cancelled) return;
          setPlayers(data);
          setFailed(false);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    document.title = 'Vận động viên · BadmintonAI';
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 pt-2 font-vn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Vận động viên</h1>
          <p className="text-sm text-ink/70 mt-1">
            Hồ sơ gộp từ mọi trận {isLoggedIn ? 'công khai và trận của bạn' : 'công khai'}: lối chơi, cú ghi điểm, vùng sân và phong độ.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm vận động viên"
            aria-label="Tìm vận động viên"
            className="w-full h-10 pl-9 pr-9 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/55 focus:outline-none focus:border-pitch"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink/40 hover:text-ink"
              aria-label="Xóa từ khóa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {loading && players.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, n) => (
            <div key={n} className="rounded-xl bg-sheet border border-ink/10 h-[292px] animate-pulse" />
          ))}
        </div>
      ) : failed ? (
        <div className="rounded-lg bg-sheet border border-ink/10 px-6 py-14 text-center text-sm text-ink/70">
          Không tải được danh sách vận động viên. Thử tải lại trang.
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-lg bg-sheet border border-ink/10 px-6 py-14 text-center space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            {search ? `Không có vận động viên nào khớp với "${search}"` : 'Chưa có vận động viên nào'}
          </h2>
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-sm font-semibold text-pitch hover:text-pitch-deep">
              Xem tất cả
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-ink/70">{players.length} vận động viên</p>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {players.map(player => (
              <PlayerCard key={player.name} player={player} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
