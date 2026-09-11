import { useWishlist } from '../context/WishlistContext';
import { MovieCard } from '../components/MovieCard';
import { EmptyState, ErrorState } from '../components/StateViews';

export function WishlistPage() {
  const { items, status } = useWishlist();

  if (status === 'loading') {
    return <div className="page"><p className="loading-text">Loading your wishlist…</p></div>;
  }

  if (status === 'error') {
    return <div className="page"><ErrorState message="Could not load your wishlist." /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <EmptyState
          title="Your wishlist is empty"
          subtitle="Tap the ♡ on any movie to save it here."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page__heading">Your Wishlist</h1>
      <div className="movie-grid">
        {items.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
