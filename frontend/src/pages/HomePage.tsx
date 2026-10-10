import React, { useState, useEffect } from 'react';
import { Play, Search, Video, ArrowRight, BarChart3, Crosshair, TrendingUp, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export const HomePage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (window.location.hash === '#public-library') {
      setTimeout(() => {
        document.getElementById('public-library')?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, []);

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
        ? `/public-matches?page=0&size=12&search=${encodeURIComponent(keyword.trim())}`
        : `/public-matches?page=0&size=12`;
      const res = await apiClient.get(url);
      setMatches(res.data.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách trận đấu công khai:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '45:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-20 pb-20 pt-6">
      {/* 1. HERO SECTION - Brighter Stadium Court Lighting Atmosphere */}
      <section className="relative min-h-[660px] rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-br from-[#122340] via-[#0f1d35] to-[#0c1626] flex flex-col justify-between p-8 sm:p-14 lg:p-16 shadow-2xl">
        {/* Real Badminton Court Arena Background Image (Sáng, Tươi tắn & Sống động) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-screen pointer-events-none brightness-110 contrast-105"
          style={{
            backgroundImage: `url('/images/arena-court-blue.jpg')`
          }}
        />
        
        {/* Ambient Stadium Lighting Rays */}
        <div className="absolute -top-32 right-10 w-[750px] h-[750px] bg-brand/30 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-sky-400/25 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6 pt-4">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
            <span>AI COMPUTER VISION FOR BADMINTON</span>
          </div>

          {/* Heading - BadPro+ Style with Highlight Line */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
            Next-Level performance <br />
            analytics for the world of <br />
            <span className="tech-highlight-line mt-1.5 shadow-glow-blue">badminton.</span>
          </h1>

          <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
            The digital foundation for badminton. Powering every court, player, coach, and tournament with the most precise visual intelligence and shot-by-shot telemetry.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/my-matches"
              className="rounded-full bg-brand hover:bg-brand-hover text-white font-semibold px-7 py-3.5 text-sm shadow-glow-blue transition-all duration-200 flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              <span>Start Match Analysis</span>
            </Link>
            <a
              href="#public-library"
              className="rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3.5 text-sm border border-white/20 backdrop-blur-md transition-all duration-200 flex items-center gap-2"
            >
              <span>Explore Public Library</span>
              <ArrowRight className="h-4 w-4 text-white/70" />
            </a>
          </div>
        </div>

        {/* Hero Bottom Telemetry Strip */}
        <div className="relative z-10 pt-10 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-white tracking-tight">100%</div>
            <div className="text-slate-300 text-xs mt-0.5">Automated Rally Slicing</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-sky-400 tracking-tight">&lt; 200ms</div>
            <div className="text-slate-300 text-xs mt-0.5">API Dispatch Speed</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-white tracking-tight">3D Hawk-Eye</div>
            <div className="text-slate-300 text-xs mt-0.5">Trajectory & Landing Map</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-sky-400 tracking-tight">S3 Direct</div>
            <div className="text-slate-300 text-xs mt-0.5">Presigned Multi-GB Upload</div>
          </div>
        </div>
      </section>

      {/* 2. FEATURE SPOTLIGHT - Card Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Designed for Elite Players & Enthusiasts
          </h2>
          <p className="text-slate-300 text-sm">
            Everything you need to turn raw match videos into structured, actionable badminton intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="card-light-blue p-8 space-y-4 flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-300">
                <Crosshair className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Shot-by-Shot Telemetry</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Automatically detects smashes, drop shots, clears, net plays, and calculates strike speed and angle distributions.
              </p>
            </div>
            <div className="pt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>View telemetry sample</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="card-light-blue p-8 space-y-4 flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Court Coverage & Landing</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Interactive 2D & 3D heatmaps illustrating landing clusters, defensive vulnerabilities, and forced errors.
              </p>
            </div>
            <div className="pt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Inspect court heatmaps</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="card-light-blue p-8 space-y-4 flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-300">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Rally Navigation & Highlights</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Jump straight to key rallies without scrubbing through dead time between serves and timeouts.
              </p>
            </div>
            <div className="pt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Test rally timeline</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. PUBLIC MATCH LIBRARY */}
      <section id="public-library" className="space-y-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Featured Match Analyses</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Explore analyzed tournament matches, stroke metrics, and full rally breakdowns
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players, tournament..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#14233c] border border-white/15 rounded-full text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-2.5 text-white/40 hover:text-white text-base leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <span className="text-sm text-slate-300">Đang tải danh sách trận đấu công khai...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && matches.length === 0 && (
          <div className="py-16 text-center border border-white/10 rounded-2xl bg-[#0f1d35]/60 p-8 space-y-3">
            <Video className="w-10 h-10 text-white/30 mx-auto" />
            <h3 className="text-base font-semibold text-white">Không tìm thấy trận đấu nào</h3>
            <p className="text-xs text-slate-400">
              {search ? `Không có kết quả khớp với "${search}". Vui lòng thử từ khóa khác.` : 'Hiện chưa có trận đấu nào được xuất bản trong thư viện.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-sky-400 hover:underline pt-2"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        )}

        {/* Match Cards Grid */}
        {!loading && matches.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((item) => (
              <div 
                key={item.id} 
                className="card-light-blue overflow-hidden flex flex-col group transition-all duration-300 shadow-xl hover:border-sky-400/40"
              >
                {/* Thumbnail Container */}
                <div className="aspect-video bg-[#0b1424] flex items-center justify-center relative overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.title || 'Badminton Match'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Video className="h-10 w-10 text-white/30 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  
                  {/* Court / Source Tag */}
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{item.courtName || 'Tournament'}</span>
                  </div>

                  {/* Duration */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm font-mono text-xs text-white">
                    {formatDuration(item.durationSeconds)}
                  </div>

                  {/* Play Action Hover */}
                  <Link
                    to={`/public-matches/${item.id}/replay`}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand text-white shadow-glow-blue flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-5 w-5 fill-white translate-x-0.5" />
                    </div>
                  </Link>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <Link to={`/public-matches/${item.id}/replay`}>
                      <h3 className="font-heading font-bold text-white text-base group-hover:text-sky-400 transition-colors line-clamp-2">
                        {item.title || `${item.playerAName} vs ${item.playerBName}`}
                      </h3>
                    </Link>
                    <div className="text-xs text-sky-400 font-medium mt-1">
                      {item.playerAName} <span className="text-white/40 font-normal">vs</span> {item.playerBName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 pt-2 border-t border-white/10">
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Rallies Analyzed</span>
                      <span className="font-heading font-bold text-white text-sm">{item.totalRallies || 0}</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Strokes Tracked</span>
                      <span className="font-heading font-bold text-sky-400 text-sm">{item.totalStrokes || 0}</span>
                    </div>
                  </div>

                  <Link
                    to={`/public-matches/${item.id}/replay`}
                    className="w-full py-2.5 rounded-full bg-white/10 hover:bg-brand text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                  >
                    <span>Open Match Analysis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
