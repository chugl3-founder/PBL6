import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicMatchCard } from '../components/match/PublicMatchCard';
import { RallyRibbon } from '../components/home/RallyRibbon';
import { RallyCourt } from '../components/home/RallyCourt';
import { listPublicMatches } from '../api/matches';
import { isSignedIn } from '../auth/session';
import type { Match } from '../types/match';

/** What a coach does, in order. */
const STEPS = [
  { title: 'Tải video lên', text: 'Một file video trận đấu, cho biết ai đứng sân xa camera.' },
  { title: 'AI phân tích', text: 'Tách từng pha cầu, nhận ra từng cú đánh, đếm điểm. Đang phân tích vẫn xem được.' },
  { title: 'Xem lại đúng chỗ', text: 'Biết vì sao mất điểm, mở đúng pha đó, tải về video highlight.' },
];

const FEATURES = [
  {
    title: 'Biết vì sao mất điểm',
    text: 'Các điểm mất được gom theo cách pha cầu kết thúc: tự đánh hỏng ở lưới, hay bị đối thủ đập ăn điểm ngay sau một cú nâng cầu. Bấm vào một nhóm là xem liền các pha đó.',
    image: '/landing/points.webp',
    alt: 'Mục Vì sao mất điểm: Chou Tien Chen mất 20 điểm, 6 điểm kết thúc bằng cú kéo lưới của chính anh',
    width: 720,
    height: 1176,
    panel: 'bg-pitch-soft',
    narrow: true,
  },
  {
    title: 'Cầu rơi ở đâu, đứng ở đâu',
    text: 'Bản đồ nhiệt trên sân cho từng người: chỗ cầu của họ hay rơi, hoặc chỗ họ đứng khi đánh. Lọc theo loại cú, bấm một ô để xem các cú ở đó.',
    image: '/landing/heatmap.webp',
    alt: 'Bản đồ nhiệt chỗ cầu rơi của Chou Tien Chen trên sân của Kento Momota',
    width: 1100,
    height: 588,
    panel: 'bg-mat',
    narrow: false,
  },
  {
    title: 'Video highlight dựng sẵn',
    text: 'AI chọn trước những pha đáng xem: pha dài, cứu điểm game, điểm kết thúc ván. Bỏ bớt hay thêm pha, rồi nhận một file MP4 có bảng tỉ số để gửi cho học trò.',
    image: '/landing/highlight.webp',
    alt: 'Danh sách pha cầu AI gợi ý cho video highlight, kèm tỉ số và độ dài từng pha',
    width: 1000,
    height: 640,
    panel: 'bg-pitch-soft',
    narrow: false,
  },
];

/** Breaks out of the layout's centred column to span the whole window. */
const BLEED = 'relative w-screen ml-[calc(50%-50vw)]';

const primaryCta =
  'inline-flex items-center justify-center rounded-md bg-[#6FCF97] hover:bg-[#8BDBAC] px-6 h-12 text-[15px] font-semibold text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-mat';
const secondaryCta =
  'inline-flex items-center justify-center rounded-md border border-white/30 hover:border-white/70 hover:bg-white/5 px-6 h-12 text-[15px] font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

export const HomePage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = isSignedIn();
  const startLink = isLoggedIn ? '/matches/create' : '/register';

  useEffect(() => {
    listPublicMatches({ page: 0, size: 12 })
      .then((page) => setMatches(page.data || []))
      .catch((err) => console.error('Lỗi khi tải trận đấu tiêu biểu:', err))
      .finally(() => setLoading(false));
  }, []);

  // The match with the most analysed rallies makes the fullest picture.
  const showcase = matches.reduce<Match | null>(
    (best, m) => ((m.totalRallies ?? 0) > (best?.totalRallies ?? 0) ? m : best),
    null,
  );

  return (
    <div className="font-vn -mt-6 -mb-6">
      {/* Hero: the mat, the lines, one rally that ends in a lost point */}
      <section className={`${BLEED} bg-mat text-white overflow-hidden`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center pt-14 pb-16 lg:pt-20 lg:pb-24">
            <div className="lg:col-span-5">
              <h1 className="font-score font-semibold text-[3.4rem] sm:text-[4.5rem] lg:text-[5.1rem] leading-[0.92] tracking-[-0.01em] text-balance">
                Xem lại trận cầu, biết rõ vì sao mất điểm.
              </h1>
              <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-md">
                Tải video một trận lên. AI chia trận thành từng pha cầu, ghi lại từng cú đánh và chỉ ra những điểm bị
                mất, để huấn luyện viên và vận động viên xem lại đúng chỗ cần xem.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={startLink} className={primaryCta}>
                  Phân tích trận của bạn
                </Link>
                <Link to="/public-matches" className={secondaryCta}>
                  Xem thư viện trận
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/50">Thư viện trận xem được ngay, không cần tài khoản.</p>
            </div>
            <div className="lg:col-span-7">
              <RallyCourt />
            </div>
          </div>
        </div>
        {/* The bottom of the hero is a court line */}
        <div className="h-[3px] bg-[#F4F7F4]/90" aria-hidden />
      </section>

      <div className="max-w-6xl mx-auto">
        {/* How it works: a real sequence, so it is numbered */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/10 rounded-b-xl overflow-hidden" aria-label="Cách dùng">
          {STEPS.map((step, index) => (
            <li key={step.title} className="bg-sheet px-6 py-7 flex gap-4">
              <span className="font-score text-5xl font-semibold text-pitch leading-[0.8] tabular-nums">{index + 1}</span>
              <div>
                <h2 className="text-base font-semibold text-ink">{step.title}</h2>
                <p className="mt-1 text-sm text-ink/70 leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Real data: every rally of an analysed match from the library */}
        {showcase && (
          <section className="mt-24" aria-label="Một trận thật trong thư viện">
            <div className="max-w-2xl mb-6">
              <h2 className="font-score text-4xl sm:text-5xl font-semibold text-ink leading-none">Cả trận, từng pha một</h2>
              <p className="mt-3 text-base text-ink/70 leading-relaxed">
                Một trận thật trong thư viện. Mỗi vạch là một pha cầu: vạch lên trên là điểm của người này, xuống dưới là
                điểm của người kia, vạch càng cao pha càng dài.
              </p>
            </div>
            <RallyRibbon matchId={showcase.id} />
          </section>
        )}

        <section id="features" className="mt-28 space-y-24 scroll-mt-20" aria-label="Tính năng">
          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
              <div className={`lg:col-span-5 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <h2 className="font-score text-4xl sm:text-5xl font-semibold text-ink leading-[0.95] text-balance">
                  {feature.title}
                </h2>
                <p className="mt-4 text-base text-ink/75 leading-relaxed max-w-md">{feature.text}</p>
                {showcase && (
                  <Link
                    to={`/public-matches/${showcase.id}/replay`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-pitch hover:text-pitch-deep group"
                  >
                    <span className="w-6 h-[2px] bg-pitch transition-all group-hover:w-9" aria-hidden />
                    Xem trên trận {showcase.playerAName} gặp {showcase.playerBName}
                  </Link>
                )}
              </div>
              <div className={`lg:col-span-7 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div
                  className={`relative rounded-2xl ${feature.panel} p-5 sm:p-10 ${
                    feature.narrow ? 'flex justify-center max-h-[34rem] overflow-hidden' : ''
                  }`}
                >
                  {/* A tall screenshot is cut at the panel's foot: fade it out instead of a hard edge */}
                  {feature.narrow && (
                    <span
                      className="absolute inset-x-0 bottom-0 h-28 z-10 bg-gradient-to-t from-pitch-soft via-pitch-soft/80 to-transparent pointer-events-none"
                      aria-hidden
                    />
                  )}
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    width={feature.width}
                    height={feature.height}
                    loading="lazy"
                    className={`rounded-lg shadow-[0_30px_60px_-30px_rgba(10,42,29,0.55)] ring-1 ring-black/5 ${
                      feature.narrow ? 'w-full max-w-[20rem] self-start' : 'w-full'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-28 space-y-6" aria-labelledby="sample-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="sample-title" className="font-score text-4xl sm:text-5xl font-semibold text-ink leading-none">
                Trận trong thư viện
              </h2>
              <p className="text-base text-ink/70 mt-3">Trận giải quốc tế đã phân tích, xem thử không cần tài khoản.</p>
            </div>
            <Link
              to="/public-matches"
              className="shrink-0 text-sm font-semibold text-pitch hover:text-pitch-deep hover:underline underline-offset-4"
            >
              Xem cả thư viện
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-lg bg-sheet border border-ink/10 h-72 animate-pulse" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <p className="text-sm text-ink/70">
              Thư viện chưa có trận nào.{' '}
              <Link to={startLink} className="font-semibold text-pitch hover:underline underline-offset-4">
                Phân tích trận đầu tiên
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {matches.slice(0, 3).map((item) => (
                <PublicMatchCard key={item.id} match={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Closing: back on the mat, half a court drawn behind the words */}
      <section className={`${BLEED} mt-28 bg-mat text-white overflow-hidden`}>
        <div className="h-[3px] bg-[#F4F7F4]/90" aria-hidden />
        <svg
          viewBox="0 0 335 305"
          className="hidden md:block absolute right-[-6rem] top-1/2 -translate-y-1/2 h-[135%] w-auto text-white/[0.13]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <rect x="1" y="1" width="333" height="303" />
          <path d="M1 23H334M1 282H334M38 1V304M236 1V304M38 152.5H236" />
        </svg>
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto py-20 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="font-score text-5xl sm:text-[4.25rem] font-semibold leading-[0.92] text-balance">
                Trận tới, xem lại trong vài phút thay vì cả buổi tối.
              </h2>
              <p className="mt-5 text-lg text-white/70 max-w-lg">
                Tải một video lên, các pha cầu hiện ra ngay khi AI phân tích xong từng đoạn.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={startLink} className={primaryCta}>
                  Phân tích trận của bạn
                </Link>
                <Link to="/public-matches" className={secondaryCta}>
                  Xem thư viện trận
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
