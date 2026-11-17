import React from 'react';
import { Link } from 'react-router-dom';

type Action = { label: string; to: string } | { label: string; onClick: () => void };

interface EmptyStateProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: Action;
  /** Inside a panel or after a filter: less padding, no dashed frame. */
  compact?: boolean;
}

/** "Nothing here yet": what is missing, why, and the one thing to do about it. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, compact }) => (
  <div
    className={`flex flex-col items-center text-center ${
      compact ? 'px-4 py-8' : 'rounded-xl border border-dashed border-ink/20 bg-sheet px-6 py-14'
    }`}
  >
    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-pitch-soft text-pitch-deep">
      <Icon className="w-6 h-6" />
    </span>
    <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
    {description && <p className="mt-1.5 max-w-md text-sm text-ink/70 leading-relaxed">{description}</p>}
    {action && (
      'to' in action ? (
        <Link
          to={action.to}
          className="mt-5 inline-flex items-center h-9 px-4 rounded-md bg-pitch hover:bg-pitch-deep text-white text-sm font-semibold transition-colors"
        >
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center h-9 px-4 rounded-md border border-ink/15 bg-sheet text-ink text-sm font-semibold hover:border-pitch hover:text-pitch-deep transition-colors"
        >
          {action.label}
        </button>
      )
    )}
  </div>
);
