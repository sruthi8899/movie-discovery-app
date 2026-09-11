export function MovieCardSkeleton() {
  return (
    <div className="movie-card movie-card--skeleton" aria-hidden="true">
      <div className="movie-card__poster skeleton" />
      <div className="skeleton skeleton-line" style={{ width: '80%' }} />
      <div className="skeleton skeleton-line" style={{ width: '40%' }} />
    </div>
  );
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="movie-grid" aria-busy="true" aria-label="Loading movies">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-view state-view--error" role="alert">
      <p>{message || 'Something went wrong while loading movies.'}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="state-view">
      <p className="state-view__title">{title || 'No movies found'}</p>
      {subtitle && <p className="state-view__subtitle">{subtitle}</p>}
    </div>
  );
}
