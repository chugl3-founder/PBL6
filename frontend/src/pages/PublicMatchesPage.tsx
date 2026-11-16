import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Play, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listPublicMatches } from '../api/matches';
import { isSignedIn } from '../auth/session';
import { PublicMatchCard, ScoreRows } from '../components/match/PublicMatchCard';
import { formatDuration, eventLabel, matchEvent } from '../utils/matchLabels';
import type { Match } from '../types/match';

/** The match opened first: the one with the most analysed rallies. */
const pickFeatured = (matches: Match[]) =>
  matches.reduce<Match | null>((best, m) => ((m.totalRallies ?? 0) > (best?.totalRallies ?? 0) ? m : best), null);

/** Every player in the library, most matches first, for the filter. */
const playersOf = (matches: Match[]) => {
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const name of [m.playerAName, m.playerBName]) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'));
};

const FeaturedMatch: React.FC<{ match: Match }> = ({ match }) => {
  const event = eventLabel(matchEvent(match));
  const duration = formatDuration(match.durationSeconds);
  const to = `/public-matches/${match.id}/replay`;
  return (
    <article className="grid grid-cols-1 lg:grid-cols-12 rounded-xl bg-sheet border border-ink/10 overflow-hidden" aria-labelledby="featured-title">
      <Link to={to} className="group relative lg:col-span-7 aspect-video bg-ink flex items-center justify-center" tabIndex={-1} aria-hidden>
        {match.thumbnailUrl ? (
          <img src={match.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Video className="h-10 w-10 text-white/25" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/20 group-hover:bg-ink/35 transition-colors">
          <span className="w-14 h-14 rounded-full bg-pitch text-white flex items-center justify-center">
            <Play className="h-6 w-6 fill-white translate-x-0.5" />
          </span>
        </span>
      </Link>
      <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col gap-5">
        <div className="space-y-1">
          <h2 id="featured-title" className="text-sm font-semibold text-pitch">Trận nhiều pha cầu nhất</h2>
          {event && <p className="text-sm text-ink/65">{event}</p>}
        </div>
        <ScoreRows match={match} size="feature" />
        <dl className="grid grid-cols-3 gap-3 text-ink">
          {[
            ['Pha cầu', match.totalRallies ?? 0],
            ['Cú đánh', match.totalStrokes ?? 0],
            ['Thời lượng', duration ?? '–'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-ink/60">{label}</dt>
              <dd className="font-score text-2xl font-semibold tabular-nums leading-tight">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          to={to}
          className="mt-auto inline-flex items-center justify-center gap-2 h-11 rounded-md bg-pitch hover:bg-pitch-deep text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50"
        >
          <Play className="h-4 w-4 fill-white" aria-hidden />
          Xem lại trận
        </Link>
      </div>
    </article>
  );
};

export const PublicMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [player, setPlayer] = useState<string | null>(null);
  const isLoggedIn = isSignedIn();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      listPublicMatches({ page: 0, size: 48, search: search.trim() || undefined })
        .then((page) => setMatches(page.data || []))
        .catch((err) => console.error('Lỗi khi tải danh sách trận đấu công khai:', err))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const players = useMemo(() => playersOf(matches), [matches]);
  const shown = player ? matches.filter((m) => m.playerAName === player || m.playerBName === player) : matches;
  // Browsing everything: open with one match up front. Filtering or searching: a plain list.
  const featured = !search && !player && matches.length > 1 ? pickFeatured(matches) : null;
  const rest = featured ? shown.filter((m) => m.id !== featured.id) : shown;
  const filtering = Boolean(search || player);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-4 font-vn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-ink tracking-tight">Thư viện trận đấu</h1>
          <p className="text-sm text-ink/70">
            Trận giải quốc tế AI đã phân tích.
            {!isLoggedIn && (
              <>
                {' '}Khách xem được 5 phút đầu mỗi trận,{' '}
                <Link to="/login" className="font-semibold text-pitch hover:text-pitch-deep hover:underline underline-offset-4">
                  đăng nhập
                </Link>{' '}
                để xem hết.
              </>
            )}
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPlayer(null);
            }}
            placeholder="Tìm vận động viên, giải đấu"
            aria-label="Tìm trận đấu"
            className="w-full h-10 pl-9 pr-9 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/55 focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
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

      {loading ? (
        <div className="space-y-5">
          <div className="rounded-xl bg-sheet border border-ink/10 h-80 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-lg bg-sheet border border-ink/10 h-72 animate-pulse" />
            ))}
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-lg bg-sheet border border-ink/10 px-6 py-14 text-center space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            {search ? `Không có trận nào khớp với "${search}"` : 'Thư viện chưa có trận nào'}
          </h2>
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-sm font-semibold text-pitch hover:text-pitch-deep">
              Xem tất cả trận
            </button>
          )}
        </div>
      ) : (
        <>
          {featured && <FeaturedMatch match={featured} />}

          {players.length > 2 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo vận động viên">
              <span className="text-sm text-ink/65 mr-1">Vận động viên</span>
              {[[null, matches.length] as [string | null, number], ...players].map(([name, count]) => {
                const active = player === name;
                return (
                  <button
                    key={name ?? 'all'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPlayer(name)}
                    className={`h-8 px-3 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 ${
                      active ? 'bg-ink text-white' : 'bg-sheet border border-ink/15 text-ink/80 hover:border-ink/30 hover:text-ink'
                    }`}
                  >
                    {name ?? 'Tất cả'} <span className={active ? 'text-white/60' : 'text-ink/45'}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {filtering && <p className="text-sm text-ink/70">{shown.length} trận</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((item) => (
              <PublicMatchCard key={item.id} match={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
