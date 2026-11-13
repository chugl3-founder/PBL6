import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HighlightReel, deleteHighlightReel, isRendering, listMyHighlightReels } from '../../api/highlights';
import { getAccessToken } from '../../auth/session';
import { errorMessage, errorStatus } from '../../api/errors';
import { HighlightJobsValue, HighlightJobsContext } from './useHighlightJobs';

const POLL_MS = 3000;

/**
 * Highlight renders run on the media worker, so the user can leave the page like with a Drive upload. The list
 * lives here, above the routes: one poll serves the tray, the Highlight page and the replay dialog, and only
 * while something is rendering. After a reload the server state brings back the jobs still running.
 */
export const HighlightJobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const token = getAccessToken();
  const [reels, setReels] = useState<HighlightReel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trayIds, setTrayIds] = useState<number[]>([]);
  const loadedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listMyHighlightReels();
      setReels(list);
      setLoaded(true);
      setLoadError(null);
      // Jobs still running when the page loads go back into the tray.
      setTrayIds(prev => Array.from(new Set([...prev, ...list.filter(isRendering).map(r => r.id)])));
    } catch (err) {
      // Keep the last list; tell the page why nothing came back instead of spinning forever.
      const status = errorStatus(err);
      setLoadError(
        status === 404
          ? 'Máy chủ chưa có tính năng highlight. Hãy khởi động lại backend.'
          : status !== undefined
            ? errorMessage(err, `Máy chủ báo lỗi (${status}).`)
            : 'Không kết nối được máy chủ.',
      );
    }
  }, []);

  // Load once per signed-in session; login and logout happen through navigation.
  useEffect(() => {
    if (!token) {
      loadedFor.current = null;
      setReels([]);
      setTrayIds([]);
      setLoaded(false);
      setLoadError(null);
      return;
    }
    if (loadedFor.current !== token) {
      loadedFor.current = token;
      refresh();
    }
  }, [token, location.pathname, refresh]);

  const rendering = reels.some(isRendering);
  useEffect(() => {
    if (!rendering) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [rendering, refresh]);

  const track = useCallback((reel: HighlightReel) => {
    setReels(prev => [reel, ...prev.filter(r => r.id !== reel.id)]);
    setTrayIds(prev => (prev.includes(reel.id) ? prev : [reel.id, ...prev]));
  }, []);

  const dismiss = useCallback((reelId: number) => setTrayIds(prev => prev.filter(id => id !== reelId)), []);

  const remove = useCallback(async (reel: HighlightReel) => {
    await deleteHighlightReel(reel.matchId, reel.id);
    setReels(prev => prev.filter(r => r.id !== reel.id));
    setTrayIds(prev => prev.filter(id => id !== reel.id));
  }, []);

  const value = useMemo<HighlightJobsValue>(() => {
    const byId = new Map(reels.map(r => [r.id, r]));
    const trayReels = trayIds.map(id => byId.get(id)).filter((r): r is HighlightReel => r != null);
    return { reels, loaded, loadError, trayReels, track, dismiss, remove, refresh };
  }, [reels, loaded, loadError, trayIds, track, dismiss, remove, refresh]);

  return <HighlightJobsContext.Provider value={value}>{children}</HighlightJobsContext.Provider>;
};
