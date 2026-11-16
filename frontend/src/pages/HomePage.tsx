import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Cpu,
  Film,
  ArrowRight,
  Play,
  Sparkles,
  CheckCircle2,
  Target,
  Activity,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import { PublicMatchCard } from '../components/match/PublicMatchCard';
import { RallyRibbon } from '../components/home/RallyRibbon';
import { RallyCourt } from '../components/home/RallyCourt';
import { listPublicMatches } from '../api/matches';
import { isSignedIn } from '../auth/session';
import type { Match } from '../types/match';

/** What a coach/player does, step by step */
const STEPS = [
  {
    icon: UploadCloud,
    step: '01',
    title: 'Tải video trận đấu lên',
    text: 'Tải video MP4 trận đấu từ máy tính hoặc điện thoại. Hệ thống hỗ trợ xử lý video dung lượng lớn qua S3 Presigned URL bảo mật, an toàn.',
    badge: 'Tải lên trực tiếp',
  },
  {
    icon: Cpu,
    step: '02',
    title: 'AI tự động bóc tách',
    text: 'Thị giác máy tính nhận diện tuyển thủ, tự động tách riêng từng pha cầu (rallies), định danh 20+ kỹ thuật đánh và cập nhật tỉ số theo thời gian thực.',
    badge: 'Xử lý bất đồng bộ',
  },
  {
    icon: Film,
    step: '03',
    title: 'Xem chiến thuật & Tải Highlight',
    text: 'Khám phá chính xác nguyên nhân mất điểm, tra cứu bản đồ nhiệt tiếp đất của cầu và tải về video highlight hoàn chỉnh có bảng điểm sắc nét.',
    badge: 'Xuất file MP4 chất lượng cao',
  },
];

const FEATURES = [
  {
    badge: 'Phân tích điểm thua',
    badgeIcon: Target,
    title: 'Biết chính xác vì sao mất điểm',
    text: 'Các điểm mất được hệ thống tự động gom nhóm thông minh: tự đánh hỏng ở lưới, hay bị đối thủ đập ăn điểm ngay sau một cú nâng cầu non. Bấm vào từng nhóm để xem ngay các pha tương ứng mà không phải tua video.',
    image: '/landing/points.webp',
    alt: 'Mục Vì sao mất điểm: Chou Tien Chen mất 20 điểm, 6 điểm kết thúc bằng cú kéo lưới của chính anh',
    width: 720,
    height: 1176,
    narrow: true,
  },
  {
    badge: 'Bản đồ nhiệt 2D',
    badgeIcon: Activity,
    title: 'Cầu rơi ở đâu, di chuyển ở đâu',
    text: 'Bản đồ nhiệt trực quan trên sân 2D cho từng vận động viên: khu vực cầu hay tiếp đất, hoặc vị trí đứng khi ra đòn. Dễ dàng lọc theo loại kỹ thuật (Smash, Drop, Net) và nhấp vào từng ô sân để xem lại các cú đánh đó.',
    image: '/landing/heatmap.webp',
    alt: 'Bản đồ nhiệt chỗ cầu rơi của Chou Tien Chen trên sân của Kento Momota',
    width: 1100,
    height: 588,
    narrow: false,
  },
  {
    badge: 'Smart Highlights',
    badgeIcon: Film,
    title: 'Video highlight dựng sẵn tức thì',
    text: 'Mô hình AI tự động phát hiện và chọn lọc những pha cầu đỉnh cao: pha bền sức (long rallies), cứu điểm game kịch tính, hoặc điểm kết thúc ván. Tuỳ chỉnh thêm bớt pha cầu và xuất video MP4 kèm scoreboard chuyên nghiệp.',
    image: '/landing/highlight.webp',
    alt: 'Danh sách pha cầu AI gợi ý cho video highlight, kèm tỉ số và độ dài từng pha',
    width: 1000,
    height: 640,
    narrow: false,
  },
];

/** Breaks out of the layout's centred column to span the whole window */
const BLEED = 'relative w-screen ml-[calc(50%-50vw)]';

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

  // The match with the most analysed rallies makes the fullest picture
  const showcase = matches.reduce<Match | null>(
    (best, m) => ((m.totalRallies ?? 0) > (best?.totalRallies ?? 0) ? m : best),
    null,
  );

  return (
    <div className="font-vn -mt-6 -mb-6 bg-slate-50 text-slate-800">
      {/* Hero Section: Bright, energetic, clean athletic theme */}
      <section className={`${BLEED} relative bg-gradient-to-b from-emerald-50/70 via-slate-50/50 to-slate-50 overflow-hidden border-b border-slate-200/80`}>
        {/* Subtle background ambient blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[420px] pointer-events-none opacity-40 blur-3xl overflow-hidden" aria-hidden>
          <div className="absolute top-4 left-1/4 w-96 h-96 rounded-full bg-emerald-200/50" />
          <div className="absolute top-12 right-1/4 w-96 h-96 rounded-full bg-teal-200/40" />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center pt-12 pb-16 lg:pt-16 lg:pb-24">
            
            {/* Left Column: Heading & Value Proposition */}
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-200/80 shadow-xs mb-6 text-xs sm:text-sm font-semibold text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Nền tảng Phân Tích Cầu Lông AI Thế Hệ Mới</span>
              </div>

              <h1 className="font-vn font-bold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.12] tracking-tight text-slate-900 text-balance">
                Phân tích từng pha cầu, thấu hiểu{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                  vì sao mất điểm
                </span>{' '}
                với AI.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Tải lên video trận đấu. Thị giác máy tính tự động tách riêng từng pha cầu (rallies), định danh 20+ kỹ thuật đánh, vẽ bản đồ nhiệt và trích xuất highlight tức thì — giúp huấn luyện viên và vận động viên tiết kiệm hàng giờ xem lại.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to={startLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-6 h-12 text-[15px] font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <UploadCloud className="w-5 h-5" />
                  <span>Phân tích trận của bạn</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Link>
                <Link
                  to="/public-matches"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 px-6 h-12 text-[15px] font-semibold text-slate-700 shadow-xs transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <Play className="w-4 h-4 fill-slate-700" />
                  <span>Xem thư viện trận</span>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Xử lý bất đồng bộ, xem ngay khi tải
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Thư viện trận xem ngay không cần tài khoản
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Court Simulation Frame */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl bg-white/95 backdrop-blur-md p-4 sm:p-6 border border-slate-200 shadow-xl shadow-emerald-950/5 ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 ml-1">Mô phỏng quỹ đạo pha cầu thực tế</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE AI TRACKING
                  </span>
                </div>
                <RallyCourt />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <div className="max-w-6xl mx-auto -mt-6 sm:-mt-8 relative z-20 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-5 sm:p-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="text-center p-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-vn tracking-tight">10,000+</div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Pha cầu đã phân tích</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-vn tracking-tight">20+</div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Kỹ thuật đánh nhận diện</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-vn tracking-tight">&lt; 200ms</div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Phản hồi API điều phối AI</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-600 font-vn tracking-tight">100%</div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Tự động hoá thống kê</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* How it works: 3 clear steps */}
        <section className="mt-20 sm:mt-28" aria-label="Quy trình sử dụng">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
              Quy trình tối ưu
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-vn">
              3 bước đơn giản từ video đến insight chiến thuật
            </h2>
            <p className="mt-3 text-slate-600 text-base">
              Không cần cài đặt phức tạp. Hệ thống xử lý toàn diện mọi công đoạn bóc tách dữ liệu video.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="group relative rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs hover:shadow-lg hover:border-emerald-300 transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-score text-3xl font-bold text-slate-300 group-hover:text-emerald-500 transition-colors">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      {step.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Real data showcase from library */}
        {showcase && (
          <section className="mt-24 sm:mt-32" aria-label="Một trận thật trong thư viện">
            <div className="max-w-2xl mb-6">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
                Trực quan hoá nhịp độ
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-vn">
                Toàn bộ diễn biến trận, từng pha một
              </h2>
              <p className="mt-2 text-base text-slate-600 leading-relaxed">
                Dữ liệu thực tế từ thư viện. Mỗi vạch đại diện cho một pha cầu: vạch hướng lên là điểm của tuyển thủ thứ nhất, hướng xuống là của tuyển thủ thứ hai, vạch càng cao pha cầu càng kéo dài.
              </p>
            </div>
            <RallyRibbon matchId={showcase.id} />
          </section>
        )}

        {/* Core Features: Bento / Modern App Window Mockups */}
        <section id="features" className="mt-24 sm:mt-32 space-y-24 scroll-mt-20" aria-label="Tính năng nổi bật">
          {FEATURES.map((feature, index) => {
            const BadgeIcon = feature.badgeIcon;
            return (
              <div key={feature.title} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                <div className={`lg:col-span-5 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-4">
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{feature.badge}</span>
                  </div>
                  <h2 className="font-vn text-3xl sm:text-4xl font-bold text-slate-900 leading-snug text-balance">
                    {feature.title}
                  </h2>
                  <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-md">
                    {feature.text}
                  </p>
                  {showcase && (
                    <Link
                      to={`/public-matches/${showcase.id}/replay`}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 group"
                    >
                      <span className="w-6 h-[2px] bg-emerald-600 transition-all group-hover:w-9" aria-hidden />
                      <span>Xem thử trên trận {showcase.playerAName} gặp {showcase.playerBName}</span>
                      <ChevronRight className="w-4 h-4 -ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>

                <div className={`lg:col-span-7 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5">
                    {/* Browser header bar */}
                    <div className="h-9 bg-slate-100/90 border-b border-slate-200 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="ml-2 text-xs text-slate-400 font-mono hidden sm:inline">badminton-analyzer // {feature.badge.toLowerCase()}</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">AI PRO MODULE</span>
                    </div>

                    <div
                      className={`relative p-4 sm:p-8 bg-slate-50/60 ${
                        feature.narrow ? 'flex justify-center max-h-[32rem] overflow-hidden' : ''
                      }`}
                    >
                      {feature.narrow && (
                        <span
                          className="absolute inset-x-0 bottom-0 h-28 z-10 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none"
                          aria-hidden
                        />
                      )}
                      <img
                        src={feature.image}
                        alt={feature.alt}
                        width={feature.width}
                        height={feature.height}
                        loading="lazy"
                        className={`rounded-xl shadow-md border border-slate-200/80 ${
                          feature.narrow ? 'w-full max-w-[20rem] self-start' : 'w-full'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Comparison: Traditional vs BadmintonAI */}
        <section className="mt-24 sm:mt-32" aria-label="So sánh hiệu quả">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
              Giá trị vượt trội
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-vn">
              Tại sao nên chuyển sang phân tích cùng AI?
            </h2>
            <p className="mt-3 text-slate-600 text-base">
              So sánh cách thức ghi nhận truyền thống với giải pháp ứng dụng Trí tuệ Nhân tạo hiện đại.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Traditional Method */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                  ✕
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Cách xem truyền thống</h3>
                  <p className="text-xs text-slate-500">Xem video thủ công & ghi chép giấy</p>
                </div>
              </div>
              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>Mất cả buổi tối (60 - 90 phút) để tua đi tua lại tìm pha cầu quan trọng.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>Khó thống kê chính xác vận động viên thường hỏng ở kỹ thuật nào.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>Không trực quan hoá được vị trí cầu rơi và vùng điểm mù trên sân.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>Tốn nhiều công sức cắt ghép thủ công video highlight để gửi cho học trò.</span>
                </li>
              </ul>
            </div>

            {/* AI Badminton Platform */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border-2 border-emerald-500/70 p-6 sm:p-8 shadow-md relative">
              <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                Khuyên dùng
              </span>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">BadmintonAI Platform</h3>
                  <p className="text-xs text-emerald-700 font-semibold">Tự động hoá phân tích toàn diện</p>
                </div>
              </div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Tiết kiệm 80% thời gian:</strong> AI tách tự động 50-80 pha cầu chỉ sau vài phút tải lên.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Gom nhóm lỗi thông minh:</strong> Bấm vào một nhóm là xem liền các pha đánh hỏng.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Bản đồ nhiệt 2D:</strong> Định vị chính xác từng vị trí tiếp đất và thế đứng của tuyển thủ.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Xuất Highlight 1-chạm:</strong> Tự động dựng video kèm tỉ số ván đấu để chia sẻ ngay.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Public matches sample */}
        <section className="mt-24 sm:mt-32 space-y-6" aria-labelledby="sample-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
                Thư viện mở
              </span>
              <h2 id="sample-title" className="mt-3 font-vn text-3xl sm:text-4xl font-bold text-slate-900 leading-none">
                Trận đấu tiêu biểu trong thư viện
              </h2>
              <p className="text-base text-slate-600 mt-2">Các trận đấu quốc tế đỉnh cao đã phân tích, xem thử miễn phí không cần tài khoản.</p>
            </div>
            <Link
              to="/public-matches"
              className="inline-flex items-center gap-1.5 shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline underline-offset-4"
            >
              <span>Xem cả thư viện</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl bg-white border border-slate-200 h-72 animate-pulse" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <p className="text-sm text-slate-500">
              Thư viện chưa có trận nào.{' '}
              <Link to={startLink} className="font-semibold text-emerald-700 hover:underline underline-offset-4">
                Phân tích trận đầu tiên ngay
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

      {/* Closing CTA Banner: Vibrant sports green gradient */}
      <section className={`${BLEED} mt-24 sm:mt-32 bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 text-white overflow-hidden relative`}>
        {/* Subtle decorative court pattern */}
        <svg
          viewBox="0 0 335 305"
          className="hidden md:block absolute right-[-4rem] top-1/2 -translate-y-1/2 h-[140%] w-auto text-white/[0.08]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <rect x="1" y="1" width="333" height="303" />
          <path d="M1 23H334M1 282H334M38 1V304M236 1V304M38 152.5H236" />
        </svg>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto py-16 sm:py-24">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-4 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Bắt đầu ngay hôm nay
              </span>
              <h2 className="font-vn text-3xl sm:text-5xl font-bold leading-tight text-balance">
                Trận tới, xem lại trong vài phút thay vì cả buổi tối.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-emerald-100/80 max-w-lg leading-relaxed">
                Tải một video lên, các pha cầu sẽ hiện ra tức thì ngay khi AI phân tích xong từng đoạn.
              </p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  to={startLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 font-bold px-6 h-12 text-[15px] shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <UploadCloud className="w-5 h-5 text-emerald-700" />
                  <span>Phân tích trận của bạn</span>
                </Link>
                <Link
                  to="/public-matches"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 hover:border-white/70 hover:bg-white/10 text-white font-semibold px-6 h-12 text-[15px] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Xem thư viện trận</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
