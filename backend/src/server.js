import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { moviesRouter } from './routes/movies.js';
import { wishlistRouter } from './routes/wishlist.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// Protects OUR server (and, transitively, TMDB's rate limit) from a client
// that's misbehaving — e.g. a search box that isn't debounced correctly.
// This is on top of, not instead of, debouncing on the frontend: the
// frontend debounce reduces requests for a well-behaved client; this limiter
// bounds the damage from a client that isn't well-behaved.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/movies', moviesRouter);
app.use('/api/wishlist', wishlistRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Movie discovery API listening on http://localhost:${config.port}`);
});
