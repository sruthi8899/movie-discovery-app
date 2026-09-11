import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { MovieGrid } from '../components/MovieGrid';
import { GridSkeleton, ErrorState, EmptyState } from '../components/StateViews';

export function BrowsePage() {
  const [genres, setGenres] = useState([]);
  const [query, setQuery] = useState('');
  const [genreId, setGenreId] = useState(null);
  const [sortBy, setSortBy] = useState('popularity.desc');

  const debouncedQuery = useDebounce(query, 400);

  // `movies` accumulates across pages (for infinite scroll); `page` tracks
  // which page we're currently on for the *current* filter set.
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('loading'); // loading | success | error | loading-more
  const [error, setError] = useState(null);

  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    api.getGenres().catch(() => {}).then((data) => data && setGenres(data));
  }, []);

  // Reset to page 1 whenever the *filters themselves* change (not when page
  // changes). This is what makes "user changes filters quickly" behave
  // correctly: each change starts a fresh, cancellable fetch instead of
  // appending mismatched results to the previous filter's list.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, genreId, sortBy]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus(page === 1 ? 'loading' : 'loading-more');
    setError(null);

    api
      .getMovies({ page, genreId, sortBy, query: debouncedQuery }, { signal: controller.signal })
      .then((data) => {
        if (requestId !== requestIdRef.current) return; // a newer request has already superseded this one
        setMovies((prev) => (page === 1 ? data.results : [...prev, ...data.results]));
        setTotalPages(data.totalPages);
        setStatus('success');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (requestId !== requestIdRef.current) return;
        setStatus('error');
        setError(err);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, genreId, sortBy, debouncedQuery, reloadToken]);

  const isSearching = debouncedQuery.length > 0;
  const hasMore = page < totalPages;

  function retry() {
    setReloadToken((t) => t + 1);
  }

  return (
    <div className="page browse-page">
      <div className="browse-page__controls">
        <SearchBar value={query} onChange={setQuery} />
        <FilterBar
          genres={genres}
          genreId={genreId}
          onGenreChange={setGenreId}
          sortBy={sortBy}
          onSortChange={setSortBy}
          disabled={isSearching}
        />
      </div>

      {status === 'loading' && <GridSkeleton />}

      {status === 'error' && (
        <ErrorState
          message={error?.message || 'Could not load movies. Please check your connection.'}
          onRetry={retry}
        />
      )}

      {(status === 'success' || status === 'loading-more') && movies.length === 0 && (
        <EmptyState
          title={isSearching ? `No results for "${debouncedQuery}"` : 'No movies found'}
          subtitle={isSearching ? 'Try a different title or spelling.' : 'Try a different genre.'}
        />
      )}

      {(status === 'success' || status === 'loading-more') && movies.length > 0 && (
        <MovieGrid
          movies={movies}
          onLoadMore={() => setPage((p) => p + 1)}
          hasMore={hasMore}
          isLoadingMore={status === 'loading-more'}
        />
      )}
    </div>
  );
}
