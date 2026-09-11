import NodeCache from 'node-cache';
import { config } from './config.js';

// A single shared in-memory cache for anything we fetch from TMDB.
//
// Why cache at all: the assignment explicitly calls out "the same
// information is requested repeatedly" and "the external service has rate
// limits". Two users browsing "Popular" at the same time, or one user
// paginating back and forth, would otherwise re-hit TMDB every time.
// A short TTL (5 min by default) means data stays reasonably fresh while
// absorbing the vast majority of duplicate traffic.
//
// Why in-memory and not Redis: this is a single-process intern-assignment
// backend. In-memory is zero-config and fast. The tradeoff (cache is lost
// on restart, doesn't share across multiple instances) is called out in the
// README as a known limitation / scaling point.
const cache = new NodeCache({
  stdTTL: config.cacheTtlSeconds,
  checkperiod: Math.max(60, Math.floor(config.cacheTtlSeconds / 5)),
  useClones: false,
});

/**
 * Fetch-through cache helper: return the cached value for `key` if present,
 * otherwise call `fetcher()`, cache the result, and return it.
 * In-flight de-duplication: if two requests for the same key arrive while a
 * fetch is already pending, the second one reuses the first's promise
 * instead of firing a second upstream request (guards against "user changes
 * filters quickly" causing duplicate bursts to the same resource).
 */
const inFlight = new Map();

export async function getOrSet(key, fetcher) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    try {
      const value = await fetcher();
      cache.set(key, value);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export default cache;
