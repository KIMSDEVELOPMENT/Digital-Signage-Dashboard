import { useState, useEffect } from 'react';
import { getBranchConfig } from '../config/branchRegistry';

const SSE_URL = `http://${window.location.hostname}:5000/api/display/stream`;

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

    const fetchAndBuild = async () => {
      try {
        setLoading(true);
        const { pages: builtPages, playlist: builtPlaylist } = await config.buildPages(branch, location);
        setPages(builtPages);
        setPlaylist(builtPlaylist);
        setError(null);
      } catch (err) {
        console.error('Error fetching display playlist:', err);
        setError('Unable to load display configuration.');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAndBuild();

    // SSE — real-time updates: re-fetch the entire playlist when server notifies
    const eventSource = new EventSource(SSE_URL);
    eventSource.onmessage = (event) => {
      if (event.data === 'update') {
        console.log('[SSE] Real-time update received — refreshing playlist...');
        fetchAndBuild();
      }
    };
    eventSource.onerror = (err) => {
      // EventSource automatically reconnects; just log it
      console.warn('[SSE] Connection error (will retry):', err);
    };

    return () => {
      eventSource.close();
    };
  }, [branch, location]);

  return { pages, playlist, loading, error };
};
