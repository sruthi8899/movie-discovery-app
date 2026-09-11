import { config } from '../config.js';

class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status || 502;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level fetch wrapper around the TMDB API with:
 *  - a request timeout (TMDB being "slow" shouldn't hang our server forever)
 *  - retry with exponential backoff on 429 (rate limited) and 5xx responses
 *  - TMDB's own `Retry-After` header is respected when present
 *
 * Anything else (4xx like 404/401) is NOT retried — retrying a "not found"
 * or "bad api key" just wastes time and hides the real problem.
 */
async function tmdbFetch(pathname, searchParams = {}, { retries = 3 } = {}) {
  if (!config.tmdb.apiKey) {
    throw new UpstreamError(
      'Server is not configured with a TMDB_API_KEY. See backend/.env.example.',
      500
    );
  }

  const url = new URL(config.tmdb.baseUrl + pathname);
  url.searchParams.set('api_key', config.tmdb.apiKey);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        return res.json();
      }

      // Rate limited or transient upstream failure -> retry with backoff.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfterHeader = Number(res.headers.get('retry-after'));
        const backoffMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : 300 * 2 ** attempt; // 300ms, 600ms, 1200ms...
        attempt += 1;
        await sleep(backoffMs);
        continue;
      }

      const body = await res.json().catch(() => ({}));
      throw new UpstreamError(
        body.status_message || `TMDB request failed with status ${res.status}`,
        res.status === 404 ? 404 : 502
      );
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        if (attempt < retries) {
          attempt += 1;
          await sleep(300 * 2 ** attempt);
          continue;
        }
        throw new UpstreamError('The movie database took too long to respond.', 504);
      }
      if (err instanceof UpstreamError) throw err;
      throw new UpstreamError('Could not reach the movie database.', 502);
    }
  }
}

export const tmdbService = {
  getGenres: () => tmdbFetch('/genre/movie/list'),

  discoverMovies: ({ page = 1, genreId, sortBy = 'popularity.desc' } = {}) =>
    tmdbFetch('/discover/movie', {
      page,
      with_genres: genreId || undefined,
      sort_by: sortBy,
      'vote_count.gte': sortBy?.startsWith('vote_average') ? 50 : undefined, // avoid a 10/10 movie with 2 votes topping "top rated"
    }),

  searchMovies: ({ query, page = 1 }) =>
    tmdbFetch('/search/movie', { query, page, include_adult: false }),

  getMovieDetails: (id) =>
    tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos,similar' }),
};

export { UpstreamError };
