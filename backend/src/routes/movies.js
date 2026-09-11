import { Router } from 'express';
import { getOrSet } from '../cache.js';
import { tmdbService } from '../services/tmdbService.js';
import { toGenreList, toMovieList, toMovieDetails } from '../services/movieMapper.js';

export const moviesRouter = Router();

// GET /api/movies/genres
moviesRouter.get('/genres', async (req, res, next) => {
  try {
    const data = await getOrSet('genres', () => tmdbService.getGenres());
    res.json(toGenreList(data));
  } catch (err) {
    next(err);
  }
});

// GET /api/movies?page=1&genreId=28&sortBy=popularity.desc&query=batman
// A single "browse" endpoint handles both discovery (no query) and search
// (with query) so the frontend doesn't need to juggle two different result
// shapes when the user types into the search box while filters are active.
moviesRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const genreId = req.query.genreId ? Number(req.query.genreId) : undefined;
    const sortBy = req.query.sortBy || 'popularity.desc';
    const query = (req.query.query || '').trim();

    const cacheKey = query
      ? `search:${query}:${page}`
      : `discover:${genreId || 'all'}:${sortBy}:${page}`;

    const data = await getOrSet(cacheKey, () =>
      query
        ? tmdbService.searchMovies({ query, page })
        : tmdbService.discoverMovies({ page, genreId, sortBy })
    );

    res.json(toMovieList(data));
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/:id
moviesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid movie id.' });
    }
    const data = await getOrSet(`details:${id}`, () => tmdbService.getMovieDetails(id));
    res.json(toMovieDetails(data));
  } catch (err) {
    next(err);
  }
});
