import { createContext, useContext } from 'react';
import type { HighlightReel } from '../../api/highlights';

/** The background highlight jobs: provided by HighlightJobsProvider, read with useHighlightJobs. */

export interface HighlightJobsValue {
  /** All reels of the signed-in user, newest first. */
  reels: HighlightReel[];
  loaded: boolean;
  /** Message of the last failed load, cleared when a load succeeds. */
  loadError: string | null;
  /** Reels shown in the floating tray: started this session or still rendering. */
  trayReels: HighlightReel[];
  /** A reel was just queued: list it and follow it in the tray. */
  track: (reel: HighlightReel) => void;
  dismiss: (reelId: number) => void;
  remove: (reel: HighlightReel) => Promise<void>;
  refresh: () => Promise<void>;
}

export const HighlightJobsContext = createContext<HighlightJobsValue | null>(null);

export const useHighlightJobs = () => {
  const value = useContext(HighlightJobsContext);
  if (!value) throw new Error('useHighlightJobs must be used inside HighlightJobsProvider');
  return value;
};
