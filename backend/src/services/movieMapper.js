import { config } from '../config.js';

// TMDB's raw shape has fields we don't need (adult, video, backdrop sizing
// logic left to the client, etc.), inconsistent nullability (poster_path can
// be null, release_date can be an empty string), and units that aren't
// convenient for a UI (runtime in minutes, not "2h 14m").
//
// This mapper is the one place that translates "whatever TMDB happens to
// send" into a stable contract our frontend can rely on. If we ever swapped
// TMDB for another provider, only this file (and tmdbService) would change.

function posterUrl(path, size = 'w342') {
  return path ? `${config.tmdb.imageBaseUrl}/${size}${path}` : null;
}

function backdropUrl(path, size = 'w1280') {
  return path ? `${config.tmdb.imageBaseUrl}/${size}${path}` : null;
}

function yearFrom(dateString) {
  return dateString && dateString.length >= 4 ? dateString.slice(0, 4) : null;
}

export function toMovieSummary(raw) {
  return {
    id: raw.id,
    title: raw.title || raw.original_title || 'Untitled',
    posterUrl: posterUrl(raw.poster_path),
    releaseYear: yearFrom(raw.release_date),
    voteAverage: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    genreIds: raw.genre_ids || [],
    overview: raw.overview || '',
  };
}

export function toMovieList(rawResponse) {
  return {
    page: rawResponse.page,
    totalPages: Math.min(rawResponse.total_pages || 1, 500), // TMDB caps usable pages at 500 anyway
    totalResults: rawResponse.total_results || 0,
    results: (rawResponse.results || []).map(toMovieSummary),
  };
}

export function toMovieDetails(raw) {
  const director = raw.credits?.crew?.find((c) => c.job === 'Director');
  const cast = (raw.credits?.cast || []).slice(0, 8).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profileUrl: posterUrl(c.profile_path, 'w185'),
  }));
  const trailer = (raw.videos?.results || []).find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer'
  );
  const similar = (raw.similar?.results || []).slice(0, 8).map(toMovieSummary);

  return {
    id: raw.id,
    title: raw.title || raw.original_title || 'Untitled',
    tagline: raw.tagline || '',
    overview: raw.overview || 'No description available.',
    posterUrl: posterUrl(raw.poster_path, 'w500'),
    backdropUrl: backdropUrl(raw.backdrop_path),
    releaseYear: yearFrom(raw.release_date),
    runtimeMinutes: raw.runtime || null,
    voteAverage: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    genres: (raw.genres || []).map((g) => g.name),
    director: director ? director.name : null,
    cast,
    trailerKey: trailer ? trailer.key : null,
    similar,
  };
}

export function toGenreList(rawResponse) {
  return (rawResponse.genres || []).map((g) => ({ id: g.id, name: g.name }));
}
