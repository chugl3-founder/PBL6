import React from 'react';

/**
 * The landing hero's picture: a badminton court drawn to scale from above (13.4 m x 6.1 m, 50 units per
 * metre) and one rally playing out on it, stroke by stroke, until the shuttle lands in your court and the
 * point goes to the opponent. It is the product's promise in one moment: every stroke named, and the reason
 * a point was lost. The only automatic motion on the page; with reduced motion it shows the finished rally.
 */

type Side = 'me' | 'opp';
interface Hit {
  from: [number, number];
  to: [number, number];
  by: Side;
  name: string;
}

// You play on the left half, the opponent on the right. The last smash lands inside your court.
const HITS: Hit[] = [
  { from: [250, 118], to: [462, 196], by: 'me', name: 'Phát cầu' },
  { from: [462, 196], to: [72, 250], by: 'opp', name: 'Nâng cầu' },
  { from: [72, 250], to: [610, 60], by: 'me', name: 'Phông cầu' },
  { from: [610, 60], to: [276, 78], by: 'opp', name: 'Bỏ nhỏ' },
  { from: [276, 78], to: [612, 236], by: 'me', name: 'Nâng cầu' },
  { from: [612, 236], to: [160, 196], by: 'opp', name: 'Đập cầu' },
];

const COLOR: Record<Side, string> = { me: '#8DB0FF', opp: '#F3AE66' };
const START = 0.7; // seconds before the serve
const STEP = 0.6; // one stroke
const END = START + HITS.length * STEP; // the shuttle lands

/** A flight curve between two points, bent a little to one side so the path reads as a shot, not a line. */
const arc = ({ from: [x1, y1], to: [x2, y2] }: Hit, i: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const bend = (i % 2 === 0 ? 1 : -1) * len * 0.08;
  const cx = (x1 + x2) / 2 + (-dy / len) * bend;
  const cy = (y1 + y2) / 2 + (dx / len) * bend;
  return `M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
};

const delay = (s: number): React.CSSProperties => ({ animationDelay: `${s}s` });

export const RallyCourt: React.FC = () => {
  const [lx, ly] = HITS[HITS.length - 1].to;
  return (
    <figure className="relative" aria-label="Minh họa một pha cầu: sáu cú đánh, pha kết thúc bằng cú đập cầu của đối thủ rơi trong sân của bạn">
      {/* Scoreboard over the court, as on a broadcast */}
      <div className="flex items-stretch justify-between gap-4 mb-4">
        <div className="inline-flex items-stretch rounded-md overflow-hidden bg-[#0A2A1D] ring-1 ring-white/10 font-score text-white">
          <span className="px-3 flex items-center whitespace-nowrap text-sm text-white/60 border-r border-white/10">Ván 2</span>
          <div className="divide-y divide-white/10">
            <div className="flex items-center gap-2.5 pl-3 pr-2 h-8">
              <span className="w-1 h-4 rounded-full" style={{ background: COLOR.me }} aria-hidden />
              <span className="text-lg w-20">Bạn</span>
              <span className="text-xl font-semibold tabular-nums w-7 text-right">18</span>
            </div>
            <div className="flex items-center gap-2.5 pl-3 pr-2 h-8">
              <span className="w-1 h-4 rounded-full" style={{ background: COLOR.opp }} aria-hidden />
              <span className="text-lg w-20">Đối thủ</span>
              <span className="relative text-xl font-semibold tabular-nums w-7 text-right">
                <span className="absolute inset-0 rally-score-out" style={delay(END + 0.3)}>19</span>
                <span className="rally-score-in" style={delay(END + 0.3)}>20</span>
              </span>
            </div>
          </div>
        </div>
        <p className="hidden sm:block self-end text-sm text-white/55 text-right max-w-[13rem] leading-snug">
          Pha 37, AI nhận ra 6 cú đánh
        </p>
      </div>

      <svg viewBox="-24 -24 718 353" className="w-full h-auto" role="img" aria-hidden>
        <defs>
          <radialGradient id="mat-light" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#1F6E4C" />
            <stop offset="100%" stopColor="#14563A" />
          </radialGradient>
        </defs>
        <rect x="-24" y="-24" width="718" height="353" rx="10" fill="url(#mat-light)" />

        {/* Court lines: doubles boundary, singles sidelines, long service lines, short service lines, centre lines */}
        <g stroke="#F4F7F4" strokeWidth="3" fill="none" opacity="0.92">
          <rect x="0" y="0" width="670" height="305" />
          <path d="M0 23H670M0 282H670" />
          <path d="M38 0V305M632 0V305" />
          <path d="M236 0V305M434 0V305" />
          <path d="M0 152.5H236M434 152.5H670" />
        </g>
        {/* The net */}
        <line x1="335" y1="-14" x2="335" y2="319" stroke="#F4F7F4" strokeWidth="5" strokeDasharray="6 5" />
        <circle cx="335" cy="-14" r="5" fill="#F4F7F4" />
        <circle cx="335" cy="319" r="5" fill="#F4F7F4" />

        {/* The rally */}
        {HITS.map((hit, i) => (
          <g key={i}>
            <path
              d={arc(hit, i)}
              pathLength={1}
              fill="none"
              stroke={COLOR[hit.by]}
              strokeWidth="3.5"
              strokeLinecap="round"
              className="rally-draw"
              style={delay(START + i * STEP)}
            />
            <g className="rally-pop" style={{ ...delay(START + i * STEP - 0.05), transformOrigin: `${hit.from[0]}px ${hit.from[1]}px` }}>
              <circle cx={hit.from[0]} cy={hit.from[1]} r="11" fill="#0A2A1D" stroke={COLOR[hit.by]} strokeWidth="3" />
              <text
                x={hit.from[0]}
                y={hit.from[1] + 5}
                textAnchor="middle"
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="700"
                fontSize="15"
                fill="#FFFFFF"
              >
                {i + 1}
              </text>
            </g>
          </g>
        ))}

        {/* Where the point was lost */}
        <g className="rally-pop" style={{ ...delay(END), transformOrigin: `${lx}px ${ly}px` }}>
          <circle cx={lx} cy={ly} r="9" fill="#E5534B" />
          <circle cx={lx} cy={ly} r="9" fill="none" stroke="#E5534B" strokeWidth="3" className="rally-ring" style={{ ...delay(END + 0.1), transformOrigin: `${lx}px ${ly}px` }} />
        </g>
      </svg>

      {/* The strokes, named, lighting up as they are played */}
      <ol className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-1.5" aria-label="Các cú đánh trong pha">
        {HITS.map((hit, i) => (
          <li
            key={i}
            className="rally-chip flex items-center gap-1.5 rounded-md bg-white/[0.07] px-2 h-9 text-[13px] xl:text-sm text-white"
            style={delay(START + i * STEP)}
          >
            <span className="font-score font-semibold text-base" style={{ color: COLOR[hit.by] }}>{i + 1}</span>
            <span className="truncate">{hit.name}</span>
          </li>
        ))}
      </ol>
      <figcaption className="rally-fade mt-4 flex items-start gap-2.5 text-[15px] text-white" style={delay(END + 0.4)}>
        <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-[#E5534B] shrink-0" aria-hidden />
        <span>
          Mất điểm: đối thủ đập ăn điểm ngay sau cú nâng cầu của bạn.{' '}
          <span className="text-white/60">Pha này được xếp vào nhóm “bị đập sau nâng cầu”.</span>
        </span>
      </figcaption>
    </figure>
  );
};
