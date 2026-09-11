import { Router } from 'express';
import { db } from '../db/index.js';

export const wishlistRouter = Router();

// Every wishlist request is scoped to a `x-device-id` header. The frontend
// generates and persists this once per browser/app install. We don't treat
// this as strong auth (anyone could spoof it) — it's a pragmatic stand-in
// for accounts, appropriate for the scope of this assignment, and called
// out explicitly as a known limitation in the README.
function requireDeviceId(req, res, next) {
  const deviceId = req.header('x-device-id');
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 100) {
    return res.status(400).json({ error: 'Missing or invalid x-device-id header.' });
  }
  req.deviceId = deviceId;
  next();
}

wishlistRouter.use(requireDeviceId);

const listStmt = db.prepare(
  `SELECT movie_id AS id, title, poster_path AS posterPath,
          release_year AS releaseYear, vote_average AS voteAverage, added_at AS addedAt
   FROM wishlist_items WHERE device_id = ? ORDER BY added_at DESC`
);

const insertStmt = db.prepare(
  `INSERT INTO wishlist_items (device_id, movie_id, title, poster_path, release_year, vote_average)
   VALUES (@deviceId, @movieId, @title, @posterPath, @releaseYear, @voteAverage)
   ON CONFLICT(device_id, movie_id) DO NOTHING`
);

const deleteStmt = db.prepare(
  `DELETE FROM wishlist_items WHERE device_id = ? AND movie_id = ?`
);

// GET /api/wishlist
wishlistRouter.get('/', (req, res) => {
  const rows = listStmt.all(req.deviceId).map((r) => ({
    id: r.id,
    title: r.title,
    posterUrl: r.posterPath || null,
    releaseYear: r.releaseYear,
    voteAverage: r.voteAverage,
    addedAt: r.addedAt,
  }));
  res.json({ results: rows });
});

// POST /api/wishlist  { id, title, posterUrl, releaseYear, voteAverage }
wishlistRouter.post('/', (req, res) => {
  const { id, title, posterUrl, releaseYear, voteAverage } = req.body || {};
  if (!id || !title) {
    return res.status(400).json({ error: 'id and title are required.' });
  }
  insertStmt.run({
    deviceId: req.deviceId,
    movieId: id,
    title,
    posterPath: posterUrl || null,
    releaseYear: releaseYear || null,
    voteAverage: typeof voteAverage === 'number' ? voteAverage : null,
  });
  res.status(201).json({ ok: true });
});

// DELETE /api/wishlist/:movieId
wishlistRouter.delete('/:movieId', (req, res) => {
  const movieId = Number(req.params.movieId);
  deleteStmt.run(req.deviceId, movieId);
  res.status(204).end();
});
