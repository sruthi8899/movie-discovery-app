import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WishlistProvider } from './context/WishlistContext';
import { Navbar } from './components/Navbar';
import { BrowsePage } from './pages/BrowsePage';
import { MovieDetailsPage } from './pages/MovieDetailsPage';
import { WishlistPage } from './pages/WishlistPage';

export default function App() {
  return (
    <WishlistProvider>
      <BrowserRouter>
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<BrowsePage />} />
            <Route path="/movie/:id" element={<MovieDetailsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </WishlistProvider>
  );
}
