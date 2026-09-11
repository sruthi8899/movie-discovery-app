const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'release_date.desc', label: 'Newest' },
  { value: 'release_date.asc', label: 'Oldest' },
  { value: 'title.asc', label: 'Title (A-Z)' },
];

// Sorting and genre filtering are disabled during an active search: TMDB's
// search endpoint doesn't support sort_by/with_genres, and silently
// ignoring them would be more confusing than graying them out with an
// explanation.
export function FilterBar({ genres, genreId, onGenreChange, sortBy, onSortChange, disabled }) {
  return (
    <div className="filter-bar">
      <select
        className="filter-bar__select"
        value={genreId || ''}
        onChange={(e) => onGenreChange(e.target.value || null)}
        disabled={disabled}
        aria-label="Filter by genre"
      >
        <option value="">All Genres</option>
        {genres.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        className="filter-bar__select"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        disabled={disabled}
        aria-label="Sort results"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {disabled && <span className="filter-bar__hint">Filters apply to browsing, not search</span>}
    </div>
  );
}
