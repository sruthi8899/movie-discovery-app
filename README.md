# MovieScout — Movie Discovery App

A full-stack movie discovery app built with **React (Vite)** and **Node.js/Express**, backed by
the **TMDB (The Movie Database) API**.

- Browse movies by popularity, rating, release date, or title, with genre filtering
- Search across all movies
- Infinite scroll for large result sets
- Movie detail pages with cast, trailer, and similar titles
- A persistent wishlist that survives closing and reopening the app
- Loading, empty, and error states throughout
- Responsive layout from small phones to desktop

---

## 1. Setup Instructions

### Prerequisites
- Node.js 18+
- A free TMDB API key: sign up at https://www.themoviedb.org/signup, then generate a key at
  https://www.themoviedb.org/settings/api ("API Key (v3 auth)").

### Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env and paste your TMDB_API_KEY
npm start
# API runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # default already points at http://localhost:4000/api
npm run dev
# App runs on http://localhost:5173
```

Open http://localhost:5173 in a browser. No separate database setup is needed — the backend
creates a local SQLite file (`backend/data.sqlite3`) automatically on first run.

---

## 2. Approach

The brief asked for a product that "feels like a real movie discovery product," so the backend
is designed as a genuine **abstraction layer**, not a thin proxy:

```
Browser (React)  →  Our Node/Express API  →  TMDB API
                          ↕
                     SQLite (wishlist)
```

The client never talks to TMDB directly. It talks to our own, stable API (`/api/movies`,
`/api/movies/:id`, `/api/wishlist`), and our backend is responsible for:
- Normalizing TMDB's raw response shape into a small, predictable contract the frontend can rely
  on (`movieMapper.js`) — nulls handled, image URLs pre-built, runtime formatted, etc.
- Caching results (`cache.js`) so repeated or overlapping requests don't repeatedly hit TMDB.
- Retrying transient TMDB failures (429 rate limits, 5xx, timeouts) with backoff
  (`tmdbService.js`), instead of surfacing every hiccup straight to the user.
- Owning the wishlist's persistence and schema (SQLite via `better-sqlite3`).

If TMDB were ever swapped for a different provider, only `tmdbService.js` and `movieMapper.js`
would need to change — routes, the database, and the entire frontend would be unaffected.

---

## 3. Important Technical Decisions

**Backend caching + request de-duplication (`backend/src/cache.js`).**
An in-memory cache (5 min TTL) sits in front of every TMDB call, keyed by the exact query
(e.g. `discover:28:popularity.desc:1`). If two requests for the same key arrive while a fetch is
already in flight, the second one reuses the first's in-flight promise instead of firing a
duplicate request. This directly targets "the same information is requested repeatedly" and "the
external service has rate limits" from the brief.

**Retry with backoff, not naive pass-through (`backend/src/services/tmdbService.js`).**
On a 429 or 5xx from TMDB, the backend retries with exponential backoff (respecting TMDB's
`Retry-After` header if present) before giving up. Requests also time out after 8s so a slow
upstream can't hang our server. 4xx errors like "not found" are never retried.

**Debounce (frontend) + rate limiting (backend), not just one or the other.**
The search box debounces input by 400ms so fast typing doesn't fire a request per keystroke.
That protects against a *well-behaved* client. Separately, `express-rate-limit` caps our own API
at 120 req/min per client, which protects the server (and transitively TMDB) even if a client
somehow isn't well-behaved — e.g. a bug, or someone hitting the API directly.

**Cancelling stale requests, everywhere filters can change quickly.**
Both the browse page and the details page use `AbortController` plus a monotonically increasing
request id. If the user changes the genre filter three times in a second, only the response to
the *last* request is applied — an older, slower response arriving out of order can never
overwrite newer state. This was tested manually by rapidly toggling filters.

**Infinite scroll over numbered pagination.**
An `IntersectionObserver`-based sentinel loads the next page as the user approaches the bottom
(`components/MovieGrid.jsx`). This matches how movie-discovery apps actually behave (Netflix,
Letterboxd) and avoids the awkwardness of numbered pagination on a narrow phone screen, per the
"application should remain usable as the amount of content increases" requirement.

**Wishlist persistence: SQLite + a denormalized snapshot, not just a list of IDs.**
The `wishlist_items` table stores the TMDB id *plus* a small snapshot (title, poster, year,
rating) at the time of adding. This means the wishlist page renders instantly without re-fetching
every movie from TMDB, and still shows something sensible if a title is later removed from TMDB
or TMDB is briefly unreachable. The tradeoff — the snapshot can go stale if a movie's poster or
rating changes upstream — is accepted deliberately, since a wishlist is a personal "I want to
remember this" list, not a live catalogue view.

**No user accounts; wishlist scoped by an anonymous device id.**
The brief doesn't ask for authentication, so the frontend generates a random id
(`crypto.randomUUID()`) on first load, stores it in `localStorage`, and sends it as an
`x-device-id` header on every wishlist request. This gives every install of the app a durable,
private-feeling wishlist without building a login system. It is **not** real auth (see
Limitations).

**Optimistic UI for the wishlist toggle (`context/WishlistContext.jsx`).**
Clicking the heart updates the UI immediately and rolls back only if the server call fails. This
keeps the interaction feeling instant while a single global context (rather than per-component
fetches) keeps browse, details, and the wishlist page all in sync — so navigating between them
never loses context or shows stale state.

**Two layers of client-side caching.**
Beyond the backend cache, the frontend keeps its own small in-memory `Map` of “params → response”
(`hooks/useMovies.js`, and inlined in `BrowsePage`), so flipping back to a filter combination
already viewed in this tab is instant and makes zero network calls.

---

## 4. Assumptions

- A single TMDB API key (v3, on the free tier) is sufficient; no paid TMDB tier is assumed.
- "Persistent wishlist... after closing and reopening the app" means persisted server-side (so it
  survives clearing the browser's `localStorage`, short of the device id itself being cleared) —
  not merely `localStorage`, which would break under app updates that change storage, or with app
  data being cleared.
- Anonymous, per-installation wishlists are an acceptable substitute for user accounts, since the
  brief does not mention authentication.
- "Explore movies using relevant categories or attributes" is satisfied by genre + sort, which is
  what TMDB's discover endpoint natively supports well; a full multi-attribute filter builder
  (year range, multiple genres, min rating, etc.) was treated as a nice-to-have, not a requirement.
- Vote counts below 50 are excluded when sorting by rating, to stop obscure titles with e.g. 2
  votes and a 10/10 average from dominating "Top Rated" — a real product would visibly reflect
  this rule, but here it's applied silently server-side (see Limitations).

---

## 5. Known Limitations

- **Wishlist "auth" is a spoofable device id, not real authentication.** Anyone who guesses or
  copies another device's id could read/modify that wishlist. Fine for a demo; would need real
  accounts (e.g. email + session or OAuth) for production.
- **In-memory backend cache doesn't survive a server restart** and wouldn't be shared across
  multiple backend instances behind a load balancer. A production version would use Redis.
- **No automated tests.** Given the timeline, testing was manual (documented in the PR/commit
  history and this README) rather than via a Jest/Vitest/Supertest suite.
- **No image CDN/optimization beyond TMDB's own pre-sized images**; posters are lazy-loaded but
  not further compressed or served in next-gen formats.
- **The "Top Rated" vote-count threshold (50) is hardcoded** and not surfaced in the UI — a user
  might reasonably wonder why a very obscure high-rated title doesn't appear.
- **No offline mode.** If the network drops entirely mid-session, in-flight requests fail with an
  error state rather than queuing for retry.
- **Rate limiting is per-process, in-memory** (`express-rate-limit`'s default store); would need a
  shared store (e.g. Redis) if the backend were horizontally scaled.

---

## 6. AI Tools Used

Claude was used to generate the initial project scaffolding (Express route structure, the SQLite
schema, the TMDB retry/backoff logic, and the React component boilerplate) and to review the
error-handling paths for edge cases called out in the brief (rate limits, slow/unavailable
upstream, rapid filter changes). The overall architecture (backend as an abstraction layer,
caching strategy, device-id-based wishlist persistence, and the specific tradeoffs documented
above) were my own decisions, made based on what the brief specifically asked for. I've read and
understand every file in this repo and can walk through, debug, or extend any part of it.

---

## 7. What I'd Improve With More Time

- Real authentication (e.g. email/password or OAuth) so wishlists belong to accounts, not devices.
- Move the in-memory cache and rate limiter to Redis, so the backend can be horizontally scaled.
- Add automated tests: unit tests for `movieMapper.js` and `tmdbService.js`'s retry logic, and
  integration tests for the wishlist routes against a test SQLite DB.
- A richer filter model (year range, minimum rating, multiple genres at once).
- Virtualize the movie grid (e.g. `react-window`) for very large result sets, instead of relying
  on the DOM to hold every rendered card.
- Surface the "Top Rated" vote-count threshold in the UI copy, so it isn't a silent rule.
- Add a service worker / basic offline cache for previously viewed movies and the wishlist.

---

## Project Structure

```
movie-discovery-app/
├── backend/
│   ├── src/
│   │   ├── server.js            # Express app entry point
│   │   ├── config.js            # env config
│   │   ├── cache.js             # in-memory cache + in-flight de-dup
│   │   ├── db/index.js          # SQLite connection + schema
│   │   ├── services/
│   │   │   ├── tmdbService.js   # TMDB HTTP calls, retry/backoff
│   │   │   └── movieMapper.js   # TMDB shape -> our API's shape
│   │   ├── routes/
│   │   │   ├── movies.js
│   │   │   └── wishlist.js
│   │   └── middleware/errorHandler.js
│   └── .env.example
└── frontend/
    └── src/
        ├── api/client.js         # fetch wrapper, device id
        ├── context/WishlistContext.jsx
        ├── hooks/{useDebounce,useMovies}.js
        ├── components/           # SearchBar, FilterBar, MovieGrid, MovieCard, StateViews, Navbar
        ├── pages/                # BrowsePage, MovieDetailsPage, WishlistPage
        └── styles/index.css
```
