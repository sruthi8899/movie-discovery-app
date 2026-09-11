import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';

export function MovieCard({ movie }) {
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(movie.id);

  return (
    <div className="movie-card">
      <Link to={`/movie/${movie.id}`} className="movie-card__link">
        <div className="movie-card__poster">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt="" loading="lazy" />
          ) : (
            <div className="movie-card__poster-fallback">{movie.title}</div>
          )}
          {movie.voteAverage != null && (
            <span className="movie-card__rating">★ {movie.voteAverage}</span>
          )}
        </div>
        <div className="movie-card__title" title={movie.title}>
          {movie.title}
        </div>
        <div className="movie-card__year">{movie.releaseYear || 'Year unknown'}</div>
      </Link>
      <button
        className={`wishlist-btn ${wishlisted ? 'wishlist-btn--active' : ''}`}
        onClick={() => toggle(movie)}
        aria-pressed={wishlisted}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {wishlisted ? '♥' : '♡'}
      </button>
    </div>
  );
}
