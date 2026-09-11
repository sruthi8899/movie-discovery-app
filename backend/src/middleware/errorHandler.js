// A single place that turns any thrown error (ours or TMDB's) into a
// consistent JSON error shape the frontend can branch on:
// { error: string }. This keeps route handlers free of try/catch
// boilerplate for anything beyond calling next(err).
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', req.method, req.originalUrl, err);
  }
  res.status(status).json({
    error: err.message || 'Something went wrong.',
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route: ${req.method} ${req.originalUrl}` });
}
