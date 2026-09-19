import { useState, useEffect } from 'react';
import { getBranchConfig } from '../config/branchRegistry';

const SSE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/display/stream` 
  : `${window.location.origin}/api/display/stream`;

/**
 * useDisplayPlaylist
 *
 * Encapsulates all data-fetching, playlist-building and SSE real-time
 * update logic that previously lived inside DisplayScreen.jsx.
 *
 * @param {string} branch   - branch slug from URL params (e.g. "sscc", "kims")
 * @param {string} location - location slug from URL params (e.g. "kss", "a-block")
 *
 * @returns {{ pages, playlist, loading, error }}
 */
export const useDisplayPlaylist = (branch, location) => {
  const [pages, setPages] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!branch || !location) return;

    const config = getBranchConfig(branch);

    const fetchAndBuild = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const { pages: builtPages, playlist: builtPlaylist } = await config.buildPages(branch, location);
        setPages(builtPages);
        setPlaylist(builtPlaylist);
        setError(null);
      } catch (err) {
        console.error('Error fetching display playlist:', err);
        if (!silent) {
          setError(`Unable to load display configuration. Error: ${err.message || 'Unknown Network Error'}`);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    };

    // Initial fetch
    fetchAndBuild();

    // SSE — real-time updates: re-fetch the entire playlist immediately when server notifies
    let eventSource = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      try {
        if (eventSource) eventSource.close();
        eventSource = new EventSource(SSE_URL);

        eventSource.onmessage = (event) => {
          const data = event.data;
          if (data === 'update' || data === '"update"' || (typeof data === 'string' && data.includes('update'))) {
            console.log('[SSE] Real-time update received — refreshing display playlist immediately...');
            fetchAndBuild(true);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('[SSE] Connection error (retrying in 5s)...', err);
          eventSource.close();
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (e) {
        console.error('[SSE] Failed to initialize EventSource:', e);
      }
    };

    connectSSE();

    // Auto-refresh interval (every 10 minutes) for all departments in the display screen
    const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
    const autoRefreshInterval = setInterval(() => {
      console.log('[DisplayScreen] 10-minute scheduled refresh: Re-fetching playlist for all departments...');
      fetchAndBuild(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
      clearInterval(autoRefreshInterval);
    };
  }, [branch, location]);

  return { pages, playlist, loading, error };
};
