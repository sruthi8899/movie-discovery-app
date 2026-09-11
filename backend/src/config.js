import 'dotenv/config';

export const config = {
  port: process.env.PORT || 4000,
  tmdb: {
    apiKey: process.env.TMDB_API_KEY,
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p',
  },
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
};

if (!config.tmdb.apiKey) {
  // We don't crash the process — the app can still boot (e.g. for a code
  // review), but every TMDB-backed route will return a clear 500 telling
  // the developer to set the key, instead of failing with a cryptic axios error.
  console.warn(
    '[config] WARNING: TMDB_API_KEY is not set. Copy .env.example to .env and add your key.'
  );
}
