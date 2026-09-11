const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const DEVICE_ID_KEY = 'movieapp_device_id';

// A durable, anonymous id used purely so the backend can tell "your"
// wishlist apart from everyone else's, without requiring sign-in. Created
// once and kept in localStorage so it survives closing/reopening the app.
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { signal, ...options } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': getDeviceId(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* response wasn't JSON, use default message */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getGenres: (opts) => request('/movies/genres', opts),

  getMovies: ({ page = 1, genreId, sortBy, query } = {}, opts) => {
    const params = new URLSearchParams();
    params.set('page', page);
    if (genreId) params.set('genreId', genreId);
    if (sortBy) params.set('sortBy', sortBy);
    if (query) params.set('query', query);
    return request(`/movies?${params.toString()}`, opts);
  },

  getMovieDetails: (id, opts) => request(`/movies/${id}`, opts),

  getWishlist: (opts) => request('/wishlist', opts),

  addToWishlist: (movie, opts) =>
    request('/wishlist', {
      method: 'POST',
      body: JSON.stringify(movie),
      ...opts,
    }),

  removeFromWishlist: (id, opts) =>
    request(`/wishlist/${id}`, { method: 'DELETE', ...opts }),
};

export { ApiError };
