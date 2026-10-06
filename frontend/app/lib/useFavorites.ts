'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Heart icon state shared by every page that lists tour cards. Loaded once
// per login; toggling updates the set optimistically so the heart flips
// instantly, then reverts only if the request itself failed.
export function useFavorites() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) {
      setFavoriteIds(new Set());
      return;
    }
    fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFavoriteIds(new Set(Array.isArray(data) ? data.map((f: any) => f.id) : [])))
      .catch(() => {});
  }, [token]);

  function toggleFavorite(tourId: number) {
    if (!user) {
      router.push('/login');
      return;
    }
    const wasFavorited = favoriteIds.has(tourId);
    const flip = (prev: Set<number>, add: boolean) => {
      const next = new Set(prev);
      if (add) next.add(tourId);
      else next.delete(tourId);
      return next;
    };
    setFavoriteIds((prev) => flip(prev, !wasFavorited));
    const request = wasFavorited
      ? fetch(`${API_URL}/api/favorites/${tourId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      : fetch(`${API_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tour_id: tourId }),
        });
    request.catch(() => setFavoriteIds((prev) => flip(prev, wasFavorited)));
  }

  return { favoriteIds, toggleFavorite };
}
