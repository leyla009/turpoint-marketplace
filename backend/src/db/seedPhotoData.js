// Single source of truth for the 20 demo tours: which location + category each
// one has, and which image it uses. seed.js (new databases) and seedPhotos.js
// (photos for tours already in a database) both read this, so they cannot drift.
//
// The images are static files in the FRONTEND: frontend/public/seed/tour-NN.jpg.
// They are served by Vercel at /seed/tour-NN.jpg, so they survive backend
// redeploys and need no uploads volume. To use a different photo for a tour,
// overwrite that file (same name) - no code or database change needed.

const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];
const LOCATIONS = ['Quba', 'Şəki', 'Qəbələ', 'Bakı', 'Qax', 'Lənkəran'];

export const SEED_TOURS = Array.from({ length: 20 }, (_, i) => ({
  number: i + 1,
  location: LOCATIONS[i % LOCATIONS.length],
  category: CATEGORIES[i % CATEGORIES.length],
  photo: `/seed/tour-${String(i + 1).padStart(2, '0')}.jpg`,
}));
