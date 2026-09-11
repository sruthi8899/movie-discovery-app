import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../api/client';

const WishlistContext = createContext(null);

// Wishlist state lives once, at the top of the app, rather than being
// re-fetched by every MovieCard. This is what lets a user add a movie on
// the Browse page, navigate to Details, then to Wishlist, and see a
// consistent state everywhere without losing context (an explicit UX
// requirement in the brief).
export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]); // array of wishlist movie objects
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    api
      .getWishlist()
      .then((data) => {
        setItems(data.results);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const idSet = useMemo(() => new Set(items.map((m) => m.id)), [items]);

  const isWishlisted = useCallback((id) => idSet.has(id), [idSet]);

  const toggle = useCallback(
    async (movie) => {
      const wasWishlisted = idSet.has(movie.id);

      // Optimistic update: the button should feel instant. If the request
      // fails, we roll back and the UI reflects the true server state.
      if (wasWishlisted) {
        setItems((prev) => prev.filter((m) => m.id !== movie.id));
        try {
          await api.removeFromWishlist(movie.id);
        } catch {
          setItems((prev) => [movie, ...prev]);
        }
      } else {
        setItems((prev) => [movie, ...prev]);
        try {
          await api.addToWishlist(movie);
        } catch {
          setItems((prev) => prev.filter((m) => m.id !== movie.id));
        }
      }
    },
    [idSet]
  );

  const value = useMemo(
    () => ({ items, status, isWishlisted, toggle }),
    [items, status, isWishlisted, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
