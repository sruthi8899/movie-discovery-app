import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useWishlist } from '../context/WishlistContext';
import { ErrorState } from '../components/StateViews';

function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function MovieDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isWishlisted, toggle } = useWishlist();
  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    setStatus('loading');
    setMovie(null);
    const controller = new AbortController();
    api
      .getMovieDetails(id, { signal: controller.signal })
      .then((data) => {
        setMovie(data);
        setStatus('success');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [id]);

  if (status === 'loading') {
    return <div className="page"><p className="loading-text">Loading movie…</p></div>;
  }

  if (status === 'error' || !movie) {
    return (
      <div className="page">
        <ErrorState message="Could not load this movie. It may not exist or the server may be unavailable." />
        <button className="btn" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const wishlisted = isWishlisted(movie.id);

  return (
    <div className="page details-page">
      {movie.backdropUrl && (
        <div className="details-page__backdrop" style={{ backgroundImage: `url(${movie.backdropUrl})` }} />
      )}
      <div className="details-page__content">
        <div className="details-page__poster">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt="" />
          ) : (
            <div className="movie-card__poster-fallback">{movie.title}</div>
          )}
        </div>
        <div className="details-page__info">
          <h1>{movie.title}</h1>
          {movie.tagline && <p className="details-page__tagline">{movie.tagline}</p>}

          <div className="details-page__meta">
            {movie.releaseYear && <span>{movie.releaseYear}</span>}
            {movie.runtimeMinutes && <span>{formatRuntime(movie.runtimeMinutes)}</span>}
            {movie.voteAverage != null && <span>★ {movie.voteAverage}</span>}
          </div>

          {movie.genres.length > 0 && (
            <div className="details-page__genres">
              {movie.genres.map((g) => (
                <span key={g} className="chip">{g}</span>
              ))}
            </div>
          )}

          <button
            className={`btn btn--wishlist ${wishlisted ? 'btn--wishlist-active' : ''}`}
            onClick={() => toggle({
              id: movie.id,
              title: movie.title,
              posterUrl: movie.posterUrl,
              releaseYear: movie.releaseYear,
              voteAverage: movie.voteAverage,
            })}
          >
            {wishlisted ? '♥ In your wishlist' : '♡ Add to wishlist'}
          </button>

          <p className="details-page__overview">{movie.overview}</p>

          {movie.director && <p><strong>Director:</strong> {movie.director}</p>}

          {movie.cast.length > 0 && (
            <>
              <h3>Cast</h3>
              <div className="cast-list">
                {movie.cast.map((c) => (
                  <div key={c.id} className="cast-list__item">
                    {c.profileUrl ? (
                      <img src={c.profileUrl} alt="" />
                    ) : (
                      <div className="cast-list__fallback" />
                    )}
                    <div className="cast-list__name">{c.name}</div>
                    <div className="cast-list__character">{c.character}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {movie.trailerKey && (
            <>
              <h3>Trailer</h3>
              <div className="trailer-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                  title="Trailer"
                  allowFullScreen
                />
              </div>
            </>
          )}

          {movie.similar.length > 0 && (
            <>
              <h3>You might also like</h3>
              <div className="similar-list">
                {movie.similar.map((m) => (
                  <Link key={m.id} to={`/movie/${m.id}`} className="similar-list__item">
                    {m.posterUrl && <img src={m.posterUrl} alt="" />}
                    <span>{m.title}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
