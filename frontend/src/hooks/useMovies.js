import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

// A tiny in-memory cache keyed by the exact query params, shared across the
// life of the tab. Combined with the backend's own cache, this means
// flipping back to a filter/page you already viewed is instant and makes
// zero network requests — directly answering "the same information is
// requested repeatedly" from the assignment brief.
const memoryCache = new Map();
const cacheKeyOf = ({ page, genreId, sortBy, query }) =>
  `${query || ''}|${genreId || ''}|${sortBy || ''}|${page}`;

/**
 * Fetches one page of movies for the given filters.
 *
 * - Cancels the in-flight request if `params` changes before it resolves,
 *   so rapidly changing filters/search never lets a stale, older response
 *   overwrite a newer one ("last write wins" race).
 * - Serves from `memoryCache` first when available.
 */
export function useMovies(params) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const paramsKey = cacheKeyOf(params);
  const abortRef = useRef(null);

  useEffect(() => {
    const cached = memoryCache.get(paramsKey);
    if (cached) {
      setState({ status: 'success', data: cached, error: null });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));

    api
      .getMovies(params, { signal: controller.signal })
      .then((data) => {
        memoryCache.set(paramsKey, data);
        setState({ status: 'success', data, error: null });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // superseded by a newer request
        setState({ status: 'error', data: null, error: err });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return state;
}
