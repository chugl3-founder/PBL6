import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, CornerDownLeft, Film, Loader2, Search, User, X } from 'lucide-react';
import { fetchPlayers, playerPath, type PlayerSummary } from '../../api/players';
import { listMyMatches, listPublicMatches } from '../../api/matches';
import { listReports, type ScoutingReport } from '../../api/scouting';
import { isSignedIn } from '../../auth/session';
import type { Match } from '../../types/match';

type Result = {
  key: string;
  group: 'Vận động viên' | 'Thư viện' | 'Trận của tôi' | 'Báo cáo trinh sát';
  title: string;
  detail: string;
  to: string;
  icon: React.FC<{ className?: string }>;
};

const PER_GROUP = 5;

/** Lower case without Vietnamese marks, so "nguyen tien minh" finds "Nguyễn Tiến Minh". */
const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const matchTitle = (m: Match) => m.title || `${m.playerAName} gặp ${m.playerBName}`;
const matchDetail = (m: Match) =>
  [`${m.playerAName} – ${m.playerBName}`, m.matchDate ? new Date(m.matchDate).toLocaleDateString('vi-VN') : '']
    .filter(Boolean)
    .join(' · ');

/**
 * One search box for the whole site (header button, Ctrl+K or "/"): players, library matches, the
 * user's own matches and scouting reports. Players and the library are searched by the server; the
 * user's matches and reports are read once when the box opens and filtered here.
 */
export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [library, setLibrary] = useState<Match[]>([]);
  const [mine, setMine] = useState<Match[] | null>(null);
  const [reports, setReports] = useState<ScoutingReport[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const signedIn = isSignedIn();

  // Ctrl/Cmd+K anywhere, or "/" when not typing, opens the box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    // The user's own lists are small: read them once per opening.
    if (signedIn) {
      listMyMatches({ page: 0, size: 100 }).then((r) => setMine(r.data ?? [])).catch(() => setMine([]));
      listReports().then(setReports).catch(() => setReports([]));
    }
  }, [open, signedIn]);

  // Server searches, debounced.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setPlayers([]);
      setLibrary([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      Promise.allSettled([fetchPlayers(q), listPublicMatches({ page: 0, size: PER_GROUP, search: q })]).then(
        ([p, m]) => {
          if (cancelled) return;
          setPlayers(p.status === 'fulfilled' ? p.value : []);
          setLibrary(m.status === 'fulfilled' ? m.value.data ?? [] : []);
          setLoading(false);
        }
      );
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const results = useMemo<Result[]>(() => {
    const q = fold(query.trim());
    if (q.length < 2) return [];
    const has = (...texts: (string | null | undefined)[]) => texts.some((t) => t && fold(t).includes(q));
    const out: Result[] = [];
    players.slice(0, PER_GROUP).forEach((p) =>
      out.push({
        key: `p-${p.name}`,
        group: 'Vận động viên',
        title: p.name,
        detail: `${p.matchCount} trận${p.analyzedMatchCount ? ` · ${p.analyzedMatchCount} đã phân tích` : ''}`,
        to: playerPath(p.name),
        icon: User,
      })
    );
    library.slice(0, PER_GROUP).forEach((m) =>
      out.push({ key: `l-${m.id}`, group: 'Thư viện', title: matchTitle(m), detail: matchDetail(m), to: `/public-matches/${m.id}/replay`, icon: Film })
    );
    (mine ?? [])
      .filter((m) => has(m.title, m.playerAName, m.playerBName))
      .slice(0, PER_GROUP)
      .forEach((m) =>
        out.push({ key: `m-${m.id}`, group: 'Trận của tôi', title: matchTitle(m), detail: matchDetail(m), to: `/matches/${m.id}`, icon: Film })
      );
    (reports ?? [])
      .filter((r) => has(r.title, r.opponentName, r.ownPlayerName))
      .slice(0, PER_GROUP)
      .forEach((r) =>
        out.push({ key: `r-${r.id}`, group: 'Báo cáo trinh sát', title: r.title, detail: `Đối thủ: ${r.opponentName}`, to: `/scouting/${r.id}`, icon: ClipboardList })
      );
    return out;
  }, [query, players, library, mine, reports]);

  useEffect(() => setActive(0), [results.length]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    navigate(r.to);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const short = query.trim().length < 2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 rounded-md bg-white/10 hover:bg-white/15 px-2.5 lg:pr-2 text-sm text-white/75 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label="Tìm kiếm (Ctrl+K)"
        title="Tìm vận động viên, trận đấu, báo cáo (Ctrl+K)"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden lg:inline">Tìm kiếm</span>
        <kbd className="hidden lg:inline rounded border border-white/20 px-1.5 text-[11px] font-sans text-white/60">Ctrl K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/50 backdrop-blur-sm px-4 pt-[12vh]"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl border border-ink/10 font-vn">
            <div className="flex items-center gap-3 border-b border-ink/10 px-4">
              {loading ? <Loader2 className="w-5 h-5 text-pitch animate-spin" /> : <Search className="w-5 h-5 text-ink/40" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Tìm vận động viên, giải đấu, trận, báo cáo…"
                className="flex-1 h-14 bg-transparent text-base text-ink placeholder:text-ink/40"
                // The whole bar is the field: no focus outline of its own (the court theme adds one to everything).
                style={{ outline: 'none' }}
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="global-search-results"
              />
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded text-ink/40 hover:text-ink" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="global-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
              {short ? (
                <p className="px-4 py-6 text-sm text-ink/60 text-center">
                  Gõ ít nhất 2 ký tự. Ví dụ: <span className="text-ink">Axelsen</span>, <span className="text-ink">All England</span>, <span className="text-ink">chung kết</span>.
                </p>
              ) : results.length === 0 && !loading ? (
                <p className="px-4 py-6 text-sm text-ink/60 text-center">Không tìm thấy kết quả cho “{query.trim()}”.</p>
              ) : (
                results.map((r, i) => {
                  const first = i === 0 || results[i - 1].group !== r.group;
                  const Icon = r.icon;
                  return (
                    <React.Fragment key={r.key}>
                      {first && <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/50">{r.group}</p>}
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-pitch-soft' : ''}`}
                      >
                        <span className="flex items-center justify-center w-8 h-8 rounded-md bg-ink/[0.05] text-ink/60 shrink-0">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-ink truncate">{r.title}</span>
                          <span className="block text-xs text-ink/60 truncate">{r.detail}</span>
                        </span>
                        {i === active && <CornerDownLeft className="w-4 h-4 text-pitch shrink-0" aria-hidden />}
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-ink/10 bg-ink/[0.02] px-4 py-2 text-[11px] text-ink/50">
              <span><kbd className="font-sans">↑ ↓</kbd> chọn</span>
              <span><kbd className="font-sans">Enter</kbd> mở</span>
              <span><kbd className="font-sans">Esc</kbd> đóng</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
