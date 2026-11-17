import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ClipboardList, Clock, CornerDownLeft, Crosshair, Film, Library, Plus, Search, SearchX, Users, X,
} from 'lucide-react';
import { fetchPlayers, playerPath, type PlayerSummary } from '../../api/players';
import { listMyMatches, listPublicMatches } from '../../api/matches';
import { listReports, type ScoutingReport } from '../../api/scouting';
import { isSignedIn } from '../../auth/session';
import { playstyleLabel } from '../../utils/playerProfile';
import { PlayerMonogram } from '../player/PlayerMonogram';
import type { Match } from '../../types/match';

type Kind = 'player' | 'match' | 'mine' | 'report' | 'page' | 'more';

interface Item {
  key: string;
  kind: Kind;
  title: string;
  detail?: string;
  to: string;
  thumb?: string | null;
  icon?: React.FC<{ className?: string }>;
}

interface Section {
  title: string;
  items: Item[];
  action?: { label: string; onClick: () => void };
}

const PER_GROUP = 5;
const RECENT_KEY = 'badminton_search_recent';
const RECENT_MAX = 5;

/** Lower case without Vietnamese marks, so "nguyen tien minh" finds "Nguyễn Tiến Minh". */
const foldChar = (c: string) =>
  c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const fold = (text: string) => [...text].map(foldChar).join('');

/** The text with the part matching the query in bold; marks are ignored, so the original letters stay. */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = fold(query.trim());
  if (q.length < 2) return <>{text}</>;
  // Fold character by character so positions in the folded text map back to the original.
  const chars = [...text];
  const folded = chars.map(foldChar);
  const at = folded.join('').indexOf(q);
  if (at < 0) return <>{text}</>;
  let pos = 0;
  let start = -1;
  let end = -1;
  folded.forEach((f, i) => {
    if (start < 0 && pos + f.length > at) start = i;
    if (end < 0 && pos + f.length >= at + q.length) end = i + 1;
    pos += f.length;
  });
  return (
    <>
      {chars.slice(0, start).join('')}
      <mark className="bg-transparent text-pitch-deep font-bold">{chars.slice(start, end).join('')}</mark>
      {chars.slice(end).join('')}
    </>
  );
};

const matchTitle = (m: Match) => m.title || `${m.playerAName} gặp ${m.playerBName}`;
const matchDetail = (m: Match) =>
  [`${m.playerAName} – ${m.playerBName}`, m.matchDate ? new Date(m.matchDate).toLocaleDateString('vi-VN') : '']
    .filter(Boolean)
    .join(' · ');
const matchThumb = (m: Match) =>
  m.thumbnailUrl || (m.youtubeVideoId ? `https://img.youtube.com/vi/${m.youtubeVideoId}/mqdefault.jpg` : null);

type StoredItem = Omit<Item, 'icon'>;

const readRecent = (): StoredItem[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveRecent = (item: Item) => {
  try {
    const plain: StoredItem = { key: item.key, kind: item.kind, title: item.title, detail: item.detail, to: item.to, thumb: item.thumb };
    const list = [plain, ...readRecent().filter((r) => r.to !== item.to)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private window): recent searches are a convenience only.
  }
};

const KIND_ICON: Record<Kind, React.FC<{ className?: string }>> = {
  player: Users, match: Film, mine: Film, report: ClipboardList, page: ArrowRight, more: ArrowRight,
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center rounded border border-ink/15 bg-white px-1.5 h-5 font-sans">{children}</kbd>
);

/**
 * One search box for the whole site (header button, Ctrl+K or "/"). Before typing it offers recent
 * picks, featured players and shortcuts; while typing it lists players, library matches, the user's
 * matches and scouting reports. Players and the library are searched by the server; the user's matches
 * and reports are read once when the box opens and filtered here.
 */
export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [library, setLibrary] = useState<Match[]>([]);
  const [featured, setFeatured] = useState<PlayerSummary[]>([]);
  const [mine, setMine] = useState<Match[] | null>(null);
  const [reports, setReports] = useState<ScoutingReport[] | null>(null);
  const [recent, setRecent] = useState<StoredItem[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  // The page behind does not scroll while the box is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setRecent(readRecent());
    window.setTimeout(() => inputRef.current?.focus(), 0);
    // Everything searchable is small (players, library, the user's matches and reports): read it once
    // when the box opens and match here, so results follow each keystroke and marks are optional everywhere.
    setLoading(true);
    Promise.allSettled([
      fetchPlayers(''),
      listPublicMatches({ page: 0, size: 100 }),
      signedIn ? listMyMatches({ page: 0, size: 100 }) : Promise.resolve(null),
      signedIn ? listReports() : Promise.resolve(null),
    ]).then(([p, l, m, r]) => {
      const all = p.status === 'fulfilled' ? p.value : [];
      setPlayers(all);
      setFeatured([...all].sort((a, b) => b.analyzedMatchCount - a.analyzedMatchCount).slice(0, 4));
      setLibrary(l.status === 'fulfilled' ? l.value.data ?? [] : []);
      setMine(m.status === 'fulfilled' && m.value ? m.value.data ?? [] : []);
      setReports(r.status === 'fulfilled' && r.value ? r.value : []);
      setLoading(false);
    });
  }, [open, signedIn]);

  const q = query.trim();
  const typing = q.length >= 2;

  const sections = useMemo<Section[]>(() => {
    if (!typing) {
      const out: Section[] = [];
      if (recent.length) {
        out.push({
          title: 'Tìm gần đây',
          items: recent.map((r) => ({ ...r, key: `recent-${r.to}`, icon: Clock })),
          action: {
            label: 'Xóa',
            onClick: () => {
              try {
                localStorage.removeItem(RECENT_KEY);
              } catch {
                // ignored
              }
              setRecent([]);
            },
          },
        });
      }
      if (featured.length) {
        out.push({
          title: 'Vận động viên nổi bật',
          items: featured.map((p) => ({
            key: `f-${p.name}`,
            kind: 'player',
            title: p.name,
            to: playerPath(p.name),
            detail: [`${p.matchCount} trận`, playstyleLabel(p.playstyle)].filter(Boolean).join(' · '),
          })),
        });
      }
      const pages: Item[] = [
        { key: 'go-library', kind: 'page', title: 'Thư viện trận đấu', detail: 'Các trận đã phân tích, xem không cần tài khoản', to: '/public-matches', icon: Library },
        { key: 'go-players', kind: 'page', title: 'Vận động viên', detail: 'Hồ sơ, lối chơi và điểm yếu', to: '/players', icon: Users },
      ];
      if (signedIn) {
        pages.push(
          { key: 'go-scouting', kind: 'page', title: 'Lập báo cáo trinh sát', detail: 'Chuẩn bị gặp một đối thủ', to: '/scouting', icon: Crosshair },
          { key: 'go-create', kind: 'page', title: 'Phân tích trận mới', detail: 'Tải video hoặc dán link YouTube', to: '/matches/create', icon: Plus },
        );
      }
      out.push({ title: 'Đi nhanh', items: pages });
      return out;
    }

    const fq = fold(q);
    const has = (...texts: (string | null | undefined)[]) => texts.some((t) => t && fold(t).includes(fq));
    const out: Section[] = [];
    const playerHits = players.filter((p) => has(p.name));
    if (playerHits.length) {
      const items: Item[] = playerHits.slice(0, PER_GROUP).map((p) => ({
        key: `p-${p.name}`,
        kind: 'player',
        title: p.name,
        to: playerPath(p.name),
        detail: [`${p.matchCount} trận`, p.analyzedMatchCount ? `${p.analyzedMatchCount} đã phân tích` : '', playstyleLabel(p.playstyle)]
          .filter(Boolean)
          .join(' · '),
      }));
      if (playerHits.length > PER_GROUP) {
        items.push({ key: 'more-players', kind: 'more', title: `Xem tất cả ${playerHits.length} vận động viên`, to: `/players?q=${encodeURIComponent(q)}` });
      }
      out.push({ title: 'Vận động viên', items });
    }
    const libraryHits = library.filter((m) => has(m.title, m.playerAName, m.playerBName));
    if (libraryHits.length) {
      const items: Item[] = libraryHits.slice(0, PER_GROUP).map((m) => ({
        key: `l-${m.id}`, kind: 'match', title: matchTitle(m), detail: matchDetail(m), to: `/public-matches/${m.id}/replay`, thumb: matchThumb(m),
      }));
      if (libraryHits.length > PER_GROUP) {
        items.push({ key: 'more-library', kind: 'more', title: `Xem tất cả ${libraryHits.length} trận trong Thư viện`, to: `/public-matches?q=${encodeURIComponent(q)}` });
      }
      out.push({ title: 'Thư viện', items });
    }
    const myHits = (mine ?? []).filter((m) => has(m.title, m.playerAName, m.playerBName)).slice(0, PER_GROUP);
    if (myHits.length) {
      out.push({
        title: 'Trận của tôi',
        items: myHits.map((m) => ({ key: `m-${m.id}`, kind: 'mine', title: matchTitle(m), detail: matchDetail(m), to: `/matches/${m.id}`, thumb: matchThumb(m) })),
      });
    }
    const reportHits = (reports ?? []).filter((r) => has(r.title, r.opponentName, r.ownPlayerName)).slice(0, PER_GROUP);
    if (reportHits.length) {
      out.push({
        title: 'Báo cáo trinh sát',
        items: reportHits.map((r) => ({ key: `r-${r.id}`, kind: 'report', title: r.title, detail: `Đối thủ: ${r.opponentName}`, to: `/scouting/${r.id}` })),
      });
    }
    return out;
  }, [typing, q, recent, featured, signedIn, players, library, mine, reports]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => setActive(0), [q, flat.length]);

  // Keep the highlighted row in view while moving with the arrow keys.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    if (item.kind !== 'more' && item.kind !== 'page') saveRecent(item);
    setOpen(false);
    navigate(item.to);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showSkeleton = typing && loading && flat.length === 0;
  const showEmpty = typing && !loading && flat.length === 0;
  let index = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 rounded-md bg-white/10 hover:bg-white/15 px-2.5 text-sm text-white/75 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label="Tìm kiếm (Ctrl+K)"
        title="Tìm vận động viên, trận đấu, báo cáo (Ctrl+K)"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden xl:inline whitespace-nowrap">Tìm kiếm</span>
        <kbd className="hidden 2xl:inline whitespace-nowrap rounded border border-white/20 px-1.5 text-[11px] font-sans text-white/60">Ctrl K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/30 backdrop-blur-[2px] px-4 pt-[10vh] animate-fade-in"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(22,32,27,0.35)] border border-ink/10 font-vn">
            <div className="flex items-center gap-3 border-b border-ink/10 px-5">
              <Search className={`w-5 h-5 shrink-0 ${loading ? 'text-pitch animate-pulse' : 'text-ink/40'}`} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Tìm vận động viên, giải đấu, trận, báo cáo…"
                className="flex-1 min-w-0 h-16 bg-transparent text-[17px] text-ink placeholder:text-ink/40"
                // The whole bar is the field: no focus outline of its own (the court theme adds one to everything).
                style={{ outline: 'none' }}
                role="combobox"
                aria-expanded={flat.length > 0}
                aria-controls="global-search-results"
                aria-activedescendant={flat[active] ? `gs-${active}` : undefined}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs font-medium text-ink/50 hover:text-ink px-2 py-1 rounded hover:bg-ink/5"
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="hidden sm:inline-flex items-center rounded border border-ink/15 px-1.5 h-6 text-[11px] font-medium text-ink/50 hover:text-ink hover:border-ink/30"
                aria-label="Đóng"
              >
                Esc
              </button>
              <button type="button" onClick={() => setOpen(false)} className="sm:hidden p-1 text-ink/40" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={listRef} id="global-search-results" role="listbox" className="max-h-[min(62vh,560px)] overflow-y-auto py-2">
              {showSkeleton &&
                [0, 1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-10 h-10 rounded-lg bg-ink/[0.06] animate-pulse" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-3.5 w-2/3 rounded bg-ink/[0.07] animate-pulse" />
                      <span className="block h-3 w-1/3 rounded bg-ink/[0.05] animate-pulse" />
                    </span>
                  </div>
                ))}

              {showEmpty && (
                <div className="flex flex-col items-center text-center px-6 py-10">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-ink/[0.05] text-ink/40">
                    <SearchX className="w-6 h-6" />
                  </span>
                  <p className="mt-3 font-semibold text-ink">Không có kết quả cho “{q}”</p>
                  <p className="mt-1 text-sm text-ink/60 max-w-sm">
                    Thử họ hoặc tên riêng của vận động viên, hoặc tên giải như “All England”, “chung kết”. Không cần gõ dấu.
                  </p>
                </div>
              )}

              {sections.map((section) => (
                <div key={section.title} className="pb-1">
                  <div className="flex items-center justify-between px-5 pt-3 pb-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{section.title}</p>
                    {section.action && (
                      <button type="button" onClick={section.action.onClick} className="text-[11px] font-medium text-ink/45 hover:text-ink">
                        {section.action.label}
                      </button>
                    )}
                  </div>
                  {section.items.map((item) => {
                    index += 1;
                    const i = index;
                    const selected = i === active;
                    const Icon = item.icon ?? KIND_ICON[item.kind];
                    const isMatch = item.kind === 'match' || item.kind === 'mine';
                    return (
                      <button
                        key={item.key}
                        id={`gs-${i}`}
                        data-index={i}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => active !== i && setActive(i)}
                        onClick={() => go(item)}
                        className={`relative w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${selected ? 'bg-pitch-soft' : ''}`}
                      >
                        {selected && <span className="absolute left-0 inset-y-1.5 w-[3px] rounded-r bg-pitch" aria-hidden />}
                        {item.kind === 'more' ? (
                          <span className="w-10 flex justify-center text-pitch">
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        ) : item.kind === 'player' && !item.icon ? (
                          <PlayerMonogram name={item.title} size="sm" className="!w-10 !h-10 rounded-lg" />
                        ) : isMatch && item.thumb ? (
                          <img src={item.thumb} alt="" loading="lazy" className="w-16 h-9 rounded-md object-cover bg-ink shrink-0" />
                        ) : (
                          <span
                            className={`flex items-center justify-center shrink-0 rounded-lg ${
                              isMatch && !item.icon ? 'w-16 h-9 bg-ink text-white/70' : 'w-10 h-10 bg-ink/[0.05] text-ink/60'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className={`block truncate text-sm font-semibold ${item.kind === 'more' ? 'text-pitch-deep' : 'text-ink'}`}>
                            {typing && item.kind !== 'more' ? <Highlight text={item.title} query={q} /> : item.title}
                          </span>
                          {item.detail && <span className="block truncate text-xs text-ink/55 mt-0.5">{item.detail}</span>}
                        </span>
                        {selected && <CornerDownLeft className="w-4 h-4 text-pitch shrink-0" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-ink/10 bg-ink/[0.02] px-5 py-2.5 text-[11px] text-ink/50">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                chọn
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Enter</Kbd>
                mở
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Esc</Kbd>
                đóng
              </span>
              <span className="ml-auto hidden sm:inline">Gõ không dấu cũng được</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
