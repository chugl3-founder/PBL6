import React from 'react';
import { Video } from 'lucide-react';

/**
 * The court as the broadcast camera sees it: the far half narrower and higher up, the near
 * half wide at the bottom. Used wherever the coach has to tell who stands on which half,
 * because that is exactly the picture they have in the video.
 */

const VIEW = { width: 400, height: 410 };
const NEAR_WIDTH = 340; // near baseline, viewBox units
const FAR_SCALE = 0.68; // far baseline width / near baseline width, close to a broadcast camera
const NEAR_Y = 380;
const FAR_Y = 44;
const NET_HEIGHT = 22;

/** Court point (across 0..1, along 0..1 with 0 = far baseline) to the camera picture. */
const project = (across: number, along: number): [number, number] => {
  // Depth grows linearly in the world; the picture scales with 1 / depth.
  const depth = (1 / FAR_SCALE) * (1 - along) + along;
  const scale = 1 / depth;
  const b = (NEAR_Y - FAR_Y) / (1 - FAR_SCALE);
  const y = NEAR_Y - b + b * scale;
  const x = VIEW.width / 2 + (across - 0.5) * NEAR_WIDTH * scale;
  return [x, y];
};

const line = (a: [number, number], b: [number, number]) => {
  const [x1, y1] = project(...a);
  const [x2, y2] = project(...b);
  return { x1, y1, x2, y2 };
};

// Doubles court 6.10 x 13.40 m, as fractions.
const SINGLES = 0.46 / 6.1;
const LONG_SERVICE = 0.76 / 13.4;
const SHORT_SERVICE = (6.7 - 1.98) / 13.4;

const LINES: Array<[[number, number], [number, number], number]> = [
  [[SINGLES, 0], [SINGLES, 1], 1.5],
  [[1 - SINGLES, 0], [1 - SINGLES, 1], 1.5],
  [[0, LONG_SERVICE], [1, LONG_SERVICE], 1.5],
  [[0, 1 - LONG_SERVICE], [1, 1 - LONG_SERVICE], 1.5],
  [[0, SHORT_SERVICE], [1, SHORT_SERVICE], 2],
  [[0, 1 - SHORT_SERVICE], [1, 1 - SHORT_SERVICE], 2],
  [[0.5, 0], [0.5, SHORT_SERVICE], 1.5],
  [[0.5, 1 - SHORT_SERVICE], [0.5, 1], 1.5],
];

const NamePlate: React.FC<{ at: [number, number]; name: string; placeholder: string; tone: 'pa' | 'pb'; scale: number }> = ({
  at,
  name,
  placeholder,
  tone,
  scale,
}) => {
  const [x, y] = project(...at);
  const label = name.trim() || placeholder;
  const width = Math.min(250, Math.max(110, label.length * 9.5 + 34)) * scale;
  const height = 34 * scale;
  return (
    <g transform={`translate(${x - width / 2} ${y - height / 2})`}>
      <rect width={width} height={height} rx={6 * scale} fill={tone === 'pa' ? '#2B59C3' : '#C9701F'} opacity={name.trim() ? 1 : 0.55} />
      <text
        x={width / 2}
        y={height / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fill="#fff"
        fontSize={15 * scale}
        fontWeight={600}
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
      >
        {label.length > 24 ? `${label.slice(0, 23)}…` : label}
      </text>
    </g>
  );
};

export const CameraCourt: React.FC<{
  upperName: string;
  lowerName: string;
  className?: string;
}> = ({ upperName, lowerName, className }) => {
  const corners = [project(0, 0), project(1, 0), project(1, 1), project(0, 1)];
  const net = line([-0.04, 0.5], [1.04, 0.5]);
  const [, netY] = project(0.5, 0.5);
  const postL = project(-0.04, 0.5);
  const postR = project(1.04, 0.5);
  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Sân nhìn từ camera: ${upperName.trim() || 'người chơi thứ nhất'} ở nửa sân trên, xa camera; ${lowerName.trim() || 'người chơi thứ hai'} ở nửa sân dưới, gần camera.`}
      >
        <rect width={VIEW.width} height={VIEW.height} rx="10" fill="#16201B" />
        <polygon points={corners.map(p => p.join(',')).join(' ')} fill="#2E7D5B" stroke="#fff" strokeWidth="2.5" />
        {LINES.map(([a, b, w], i) => (
          <line key={i} {...line(a, b)} stroke="#fff" strokeWidth={w} strokeOpacity="0.85" />
        ))}
        {/* Net: posts and tape */}
        <line x1={postL[0]} y1={netY} x2={postL[0]} y2={netY - NET_HEIGHT} stroke="#E3E8E4" strokeWidth="3" />
        <line x1={postR[0]} y1={netY} x2={postR[0]} y2={netY - NET_HEIGHT} stroke="#E3E8E4" strokeWidth="3" />
        <line x1={net.x1} y1={netY - NET_HEIGHT} x2={net.x2} y2={netY - NET_HEIGHT} stroke="#fff" strokeWidth="3" />
        <rect x={net.x1} y={netY - NET_HEIGHT} width={net.x2 - net.x1} height={NET_HEIGHT} fill="#fff" opacity="0.12" />

        <NamePlate at={[0.5, 0.22]} name={upperName} placeholder="Sân trên" tone="pa" scale={0.85} />
        <NamePlate at={[0.5, 0.76]} name={lowerName} placeholder="Sân dưới" tone="pb" scale={1} />
      </svg>
      <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink/70">
        <Video className="w-3.5 h-3.5" aria-hidden />
        Camera đặt sau nửa sân dưới
      </figcaption>
    </figure>
  );
};
