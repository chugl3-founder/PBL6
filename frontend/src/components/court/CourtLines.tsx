import React from 'react';

export const CourtLines: React.FC<{ floor?: string }> = ({ floor = '#0b4d29' }) => (
  <g>
    <rect x="20" y="20" width="560" height="280" fill={floor} stroke="#ffffff" strokeWidth="2.5" />
    {/* Singles sidelines */}
    <line x1="20" y1="42" x2="580" y2="42" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="20" y1="278" x2="580" y2="278" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
    {/* Doubles long service lines */}
    <line x1="50" y1="20" x2="50" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="550" y1="20" x2="550" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />
    {/* Short service lines */}
    <line x1="230" y1="20" x2="230" y2="300" stroke="#ffffff" strokeWidth="1.8" />
    <line x1="370" y1="20" x2="370" y2="300" stroke="#ffffff" strokeWidth="1.8" />
    {/* Centre lines */}
    <line x1="20" y1="160" x2="230" y2="160" stroke="#ffffff" strokeWidth="1.5" />
    <line x1="370" y1="160" x2="580" y2="160" stroke="#ffffff" strokeWidth="1.5" />
    {/* Net */}
    <line x1="300" y1="15" x2="300" y2="305" stroke="#f8fafc" strokeWidth="4" strokeDasharray="5 3" />
  </g>
);
