import React from 'react';

/**
 * One rally drawn on a doubles court seen from the broadcast camera, the view the AI reads every match from.
 * The shuttle's path traces itself once on load, stroke by stroke, and ends where the shuttle lands.
 * Court positions are in metres: x across the court (0 to 6.1), y from the far baseline (0 to 13.4).
 */

const VIEW_W = 660;
const VIEW_H = 520;
const CENTER_X = 330;
const FAR_Y = 92;
const NEAR_Y = 488;
const NEAR_WIDTH = 560;
/** How much nearer the near baseline is than the far one; sets the perspective. */
const DEPTH_RATIO = 1.75;

const scaleAt = (y: number) => 1 / (DEPTH_RATIO + (1 - DEPTH_RATIO) * (y / 13.4));
const B = (NEAR_Y - FAR_Y) / (1 - 1 / DEPTH_RATIO);
const A = FAR_Y - B / DEPTH_RATIO;

const project = (x: number, y: number): [number, number] => {
  const s = scaleAt(y);
  return [CENTER_X + (x / 6.1 - 0.5) * NEAR_WIDTH * s, A + B * s];
};
/** Pixels per metre at a given depth, used to lift the shuttle and the net off the floor. */
const pxPerMetre = (y: number) => (NEAR_WIDTH / 6.1) * scaleAt(y);

const line = (x1: number, y1: number, x2: number, y2: number) => {
  const [a, b] = project(x1, y1);
  const [c, d] = project(x2, y2);
  return `M${a.toFixed(1)} ${b.toFixed(1)}L${c.toFixed(1)} ${d.toFixed(1)}`;
};

const COURT_LINES = [
  line(0, 0, 6.1, 0), line(0, 13.4, 6.1, 13.4), line(0, 0, 0, 13.4), line(6.1, 0, 6.1, 13.4),
  line(0.46, 0, 0.46, 13.4), line(5.64, 0, 5.64, 13.4),
  line(0, 0.76, 6.1, 0.76), line(0, 12.64, 6.1, 12.64),
  line(0, 4.72, 6.1, 4.72), line(0, 8.68, 6.1, 8.68),
  line(3.05, 0, 3.05, 4.72), line(3.05, 8.68, 3.05, 13.4),
].join('');

type Player = 'A' | 'B';
type Hit = { by: Player; x: number; y: number; shot: string; arc: number; labelLeft?: boolean };

/** A plays on the far side, B on the near side, as on the match pages. `arc` is how high the shuttle flies, in metres. */
const RALLY: Hit[] = [
  { by: 'B', x: 3.7, y: 9.1, shot: 'Phát cầu', arc: 0.9 },
  { by: 'A', x: 1.5, y: 4.3, shot: 'Đẩy cầu', arc: 0.9, labelLeft: true },
  { by: 'B', x: 0.9, y: 12.2, shot: 'Lốp cầu', arc: 2.6, labelLeft: true },
  { by: 'A', x: 5.0, y: 1.1, shot: 'Đập cầu', arc: 0.3 },
];
/** The smash goes to the side B just left open. */
const LANDING = { x: 4.7, y: 10.4 };
/** The camera sits high, so heights look much shorter than widths. */
const HEIGHT_SCALE = 0.5;

const STEP_MS = 560;
const START_MS = 350;

const flights = RALLY.map((hit, i) => {
  const to = RALLY[i + 1] ?? LANDING;
  const [x1, y1] = project(hit.x, hit.y);
  const [x2, y2] = project(to.x, to.y);
  // A quadratic curve peaks halfway to its control point, so the control sits twice the flight height up.
  const lift = 2 * hit.arc * HEIGHT_SCALE * pxPerMetre((hit.y + to.y) / 2);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - lift;
  return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, by: hit.by };
});

const COLOR: Record<Player, string> = { A: '#2B59C3', B: '#C9701F' };
const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });
const popStyle = (ms: number): React.CSSProperties => ({ ...delay(ms), transformBox: 'fill-box', transformOrigin: 'center' });

export const RallyCourt: React.FC<{ className?: string }> = ({ className }) => {
  const [lx, ly] = project(LANDING.x, LANDING.y);
  const netLeft = project(-0.15, 6.7);
  const netRight = project(6.25, 6.7);
  const netRise = 1.55 * HEIGHT_SCALE * pxPerMetre(6.7);
  const landedAt = START_MS + RALLY.length * STEP_MS;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      role="img"
      aria-label="Một pha cầu trên sân: B phát cầu, A đẩy cầu dọc biên, B lốp cầu chéo sân, A đập cầu vào khoảng trống bên phải sân B và ghi điểm."
    >
      {/* Court surface and lines */}
      <path
        d={`${line(-0.35, -0.5, 6.45, -0.5)}L${project(6.45, 13.9).join(' ')}L${project(-0.35, 13.9).join(' ')}Z`}
        fill="#145638"
      />
      <path d={COURT_LINES} stroke="rgba(255,255,255,0.82)" strokeWidth={1.6} fill="none" strokeLinecap="square" />

      {/* Net: posts on the doubles sidelines, tape 1.55 m above the floor */}
      <path
        d={`M${netLeft[0]} ${netLeft[1]}L${netRight[0]} ${netRight[1]}L${netRight[0]} ${netRight[1] - netRise}L${netLeft[0]} ${netLeft[1] - netRise}Z`}
        fill="rgba(255,255,255,0.10)"
      />
      <path d={`M${netLeft[0]} ${netLeft[1] - netRise}L${netRight[0]} ${netRight[1] - netRise}`} stroke="#fff" strokeWidth={2.4} />
      <path d={`M${netLeft[0]} ${netLeft[1]}V${netLeft[1] - netRise}M${netRight[0]} ${netRight[1]}V${netRight[1] - netRise}`} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />

      {/* Shuttle flights, drawn one after another */}
      {flights.map((f, i) => (
        <path
          key={i}
          d={f.d}
          pathLength={1}
          fill="none"
          stroke={COLOR[f.by]}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1"
          className="motion-safe:animate-trace"
          style={delay(START_MS + i * STEP_MS)}
        />
      ))}

      {/* Where each stroke was played */}
      {RALLY.map((hit, i) => {
        const [x, y] = project(hit.x, hit.y);
        const left = hit.labelLeft;
        return (
          <g key={i} className="motion-safe:animate-pop" style={popStyle(START_MS + i * STEP_MS - 120)}>
            <circle cx={x} cy={y} r={11} fill={COLOR[hit.by]} stroke="#fff" strokeWidth={2} />
            <text x={x} y={y + 4.2} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff" fontFamily="'Barlow Condensed', sans-serif">
              {i + 1}
            </text>
            <text
              x={left ? x - 18 : x + 18}
              y={y + 5}
              textAnchor={left ? 'end' : 'start'}
              fontSize={15}
              fontWeight={600}
              fill="#fff"
              fontFamily="'Be Vietnam Pro', sans-serif"
            >
              {hit.shot}
            </text>
          </g>
        );
      })}

      {/* Where the shuttle landed */}
      <g className="motion-safe:animate-pop" style={popStyle(landedAt)}>
        <circle cx={lx} cy={ly} r={16} fill="none" stroke="#fff" strokeWidth={2} />
        <path d={`M${lx - 6} ${ly - 6}L${lx + 6} ${ly + 6}M${lx + 6} ${ly - 6}L${lx - 6} ${ly + 6}`} stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
        <text x={lx + 26} y={ly + 5} fontSize={15} fontWeight={600} fill="#fff" fontFamily="'Be Vietnam Pro', sans-serif">
          Cầu rơi, A ghi điểm
        </text>
      </g>
    </svg>
  );
};
