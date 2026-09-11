import { useEffect, useRef } from 'react';
import { MovieCard } from './MovieCard';
import { MovieCardSkeleton } from './StateViews';

// Renders movies in a responsive CSS grid (column count adapts via
// auto-fill/minmax rather than fixed breakpoints — see index.css) and loads
// the next page automatically as the user scrolls near the bottom. This is
// how "continue exploring when there are many matching results" is handled
// without a numbered pagination UI that would be awkward on mobile.
export function MovieGrid({ movies, onLoadMore, hasMore, isLoadingMore }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: '400px' } // start loading before the user hits the literal bottom
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <>
      <div className="movie-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
        {isLoadingMore &&
          Array.from({ length: 6 }).map((_, i) => <MovieCardSkeleton key={`more-${i}`} />)}
      </div>
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
    </>
  );
}
