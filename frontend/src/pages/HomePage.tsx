import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { PublicMatchCard, PublicMatchItem } from '../components/match/PublicMatchCard';

const STEPS = [
  {
    title: 'Tải video trận lên',
    text: 'Nhập tên hai người chơi, cho biết ai đứng sân xa camera, rồi tải video lên.',
  },
  {
    title: 'AI xem trận thay bạn',
    text: 'AI tách từng pha cầu, nhận ra từng cú đánh và đếm điểm. Đang phân tích vẫn xem được.',
  },
  {
    title: 'Xem lại và biết vì sao mất điểm',
    text: 'Mỗi điểm mất có lời giải thích ngắn. Bấm vào là video tua tới đúng pha đó.',
  },
];

export const HomePage: React.FC = () => {
  const [featuredMatches, setFeaturedMatches] = useState<PublicMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/public-matches?page=0&size=3');
        setFeaturedMatches(res.data.data || []);
      } catch (err) {
        console.error('Lỗi khi tải trận đấu tiêu biểu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-16 pt-4 font-vn">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-6 space-y-5">
          <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.15]">
            Xem lại trận cầu lông, biết rõ vì sao mất điểm.
          </h1>
          <p className="text-base sm:text-lg text-ink/65 leading-relaxed max-w-xl">
            Tải video một trận lên. AI chia trận thành từng pha cầu, ghi lại từng cú đánh và chỉ ra những điểm bị mất, để huấn luyện viên và vận động viên xem lại đúng chỗ cần xem.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={isLoggedIn ? '/matches/create' : '/register'}
              className="inline-flex items-center gap-2 rounded-md bg-pitch hover:bg-pitch-deep px-5 h-11 text-sm font-semibold text-white transition-colors"
            >
              Phân tích trận của bạn
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/public-matches"
              className="inline-flex items-center rounded-md border border-ink/15 hover:border-ink/30 bg-sheet px-5 h-11 text-sm font-semibold text-ink transition-colors"
            >
              Xem trận mẫu
            </Link>
          </div>
        </div>
        <div className="lg:col-span-6">
          <img
            src="/images/arena-court-blue.jpg"
            alt="Sân cầu lông thi đấu"
            className="w-full aspect-[4/3] object-cover rounded-lg border border-ink/10"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6" aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold text-ink">Cách hoạt động</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-lg bg-sheet border border-ink/10 p-5 space-y-2">
              <span className="font-score text-3xl font-semibold text-pitch leading-none">{index + 1}</span>
              <h3 className="font-semibold text-ink">{step.title}</h3>
              <p className="text-sm text-ink/60 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Sample matches */}
      <section className="space-y-6" aria-labelledby="sample-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="sample-title" className="text-2xl font-bold text-ink">Trận mẫu đã phân tích</h2>
            <p className="text-sm text-ink/60 mt-1">Trận giải quốc tế, xem thử không cần tài khoản.</p>
          </div>
          <Link
            to="/public-matches"
            className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-pitch hover:text-pitch-deep"
          >
            Xem tất cả
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-lg bg-sheet border border-ink/10 h-72 animate-pulse" />
            ))}
          </div>
        ) : featuredMatches.length === 0 ? (
          <p className="text-sm text-ink/55">Chưa có trận mẫu nào.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredMatches.map((item) => (
              <PublicMatchCard key={item.id} match={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
