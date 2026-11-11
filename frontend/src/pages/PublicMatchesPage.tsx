import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { PublicMatchCard, PublicMatchItem } from '../components/match/PublicMatchCard';

export const PublicMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<PublicMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMatches = async (keyword: string) => {
    try {
      setLoading(true);
      const url = keyword.trim()
        ? `/public-matches?page=0&size=24&search=${encodeURIComponent(keyword.trim())}`
        : `/public-matches?page=0&size=24`;
      const res = await apiClient.get(url);
      setMatches(res.data.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách trận đấu công khai:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 pt-2 font-vn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Thư viện trận đấu</h1>
          <p className="text-sm text-ink/60 mt-1">
            Trận giải quốc tế đã được AI phân tích. Bấm vào một trận để xem lại.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm vận động viên, giải đấu"
            aria-label="Tìm trận đấu"
            className="w-full h-10 pl-9 pr-9 rounded-md bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pitch"
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

      {!isLoggedIn && (
        <p className="text-sm text-ink/65 rounded-md bg-sheet border border-ink/10 px-4 py-3">
          Bạn đang xem với tư cách khách: mỗi trận xem được 5 phút đầu.{' '}
          <Link to="/login" className="font-semibold text-pitch hover:text-pitch-deep">
            Đăng nhập
          </Link>{' '}
          để xem hết.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-lg bg-sheet border border-ink/10 h-72 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-lg bg-sheet border border-ink/10 px-6 py-14 text-center space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            {search ? `Không có trận nào khớp với "${search}"` : 'Thư viện chưa có trận nào'}
          </h2>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-sm font-semibold text-pitch hover:text-pitch-deep"
            >
              Xem tất cả trận
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-ink/55">{matches.length} trận</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((item) => (
              <PublicMatchCard key={item.id} match={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
