import React from 'react';
import { Check } from 'lucide-react';

const STEPS = ['Thông tin trận', 'Tải video', 'AI phân tích'];

/** The three steps from an empty match to an analysed one; `current` is 1-based. */
export const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <ol className="flex flex-wrap items-center gap-2 text-sm text-ink/70" aria-label="Các bước">
    {STEPS.map((label, index) => {
      const n = index + 1;
      const done = n < current;
      const active = n === current;
      return (
        <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
          {index > 0 && <span className="w-6 h-px bg-ink/20" aria-hidden />}
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              done ? 'bg-pitch text-white' : active ? 'bg-ink text-white' : 'bg-ink/10 text-ink/70'
            }`}
          >
            {done ? <Check className="w-3.5 h-3.5" aria-label="Xong" /> : n}
          </span>
          <span className={active ? 'text-ink font-medium' : ''}>{label}</span>
        </li>
      );
    })}
  </ol>
);
