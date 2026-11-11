import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchPlayers, type PlayerSummary } from '../../api/players';
import { PlayerMonogram } from './PlayerMonogram';
import { playstyleLabel, winRate } from '../../utils/playerProfile';

interface PlayerPickerProps {
  value: string | null;
  onChange: (name: string | null) => void;
  placeholder: string;
  /** Names that cannot be picked (e.g. the other side of the report). */
  exclude?: string | null;
  id?: string;
}

/** Search-as-you-type choice of one player from the directory. */
export const PlayerPicker: React.FC<PlayerPickerProps> = ({ value, onChange, placeholder, exclude, id }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchPlayers(query)
        .then(list => {
          if (cancelled) return;
          setResults(list.filter(p => !exclude || p.name.toLowerCase() !== exclude.toLowerCase()).slice(0, 8));
          setActive(0);
        })
        .catch(() => !cancelled && setResults([]));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, exclude]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (name: string) => {
    onChange(name);
    setQuery('');
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 h-12 px-2 rounded-lg border border-pitch/40 bg-pitch-soft/40">
        <PlayerMonogram name={value} size="sm" />
        <span className="flex-1 font-semibold text-ink truncate">{value}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1.5 rounded-md text-ink/50 hover:text-ink hover:bg-ink/[0.06]"
          aria-label={`Bỏ chọn ${value}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" aria-hidden />
      <input
        id={id}
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(a => Math.min(results.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(a => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            pick(results[active].name);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="w-full h-12 pl-9 pr-3 rounded-lg bg-sheet border border-ink/15 text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-pitch"
      />
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-80 overflow-auto rounded-lg bg-sheet border border-ink/15 shadow-lg py-1" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-ink/50">Không có vận động viên phù hợp</li>
          ) : (
            results.map((p, i) => {
              const rate = winRate(p.ralliesWon, p.ralliesLost);
              return (
                <li
                  key={p.name}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={e => {
                    e.preventDefault();
                    pick(p.name);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${i === active ? 'bg-ground' : ''}`}
                >
                  <PlayerMonogram name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                    <p className="text-xs text-ink/50">
                      {p.analyzedMatchCount}/{p.matchCount} trận đã phân tích
                      {p.playstyle && ` · ${playstyleLabel(p.playstyle)}`}
                    </p>
                  </div>
                  {rate != null && <span className="text-xs tabular-nums text-ink/60">{rate}% điểm</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
