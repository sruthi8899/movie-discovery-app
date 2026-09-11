import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data.sqlite3');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Schema
// -----
// We deliberately store only what WE need to answer wishlist queries fast
// and offline-tolerant: the TMDB id, plus a small denormalized snapshot of
// the movie (title/poster/year/rating) so the wishlist page renders
// instantly without re-fetching each movie from TMDB (and still shows
// something sensible if TMDB is briefly down or a title is removed there).
// `device_id` stands in for a user account: the assignment doesn't ask for
// auth, so the frontend generates a random id on first load, persists it in
// localStorage, and sends it as a header. This gives every "user" of the
// app a durable, private wishlist without building a login system.
db.exec(`
  CREATE TABLE IF NOT EXISTS wishlist_items (
    device_id     TEXT NOT NULL,
    movie_id      INTEGER NOT NULL,
    title         TEXT NOT NULL,
    poster_path   TEXT,
    release_year  TEXT,
    vote_average  REAL,
    added_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (device_id, movie_id)
  );

  CREATE INDEX IF NOT EXISTS idx_wishlist_device
    ON wishlist_items (device_id, added_at DESC);
`);

export default db;
