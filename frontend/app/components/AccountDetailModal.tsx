'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, MapPin, Calendar, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { AccountSection } from './AccountMenu';
import { formatAzn, formatDate } from '@/app/lib/format';
import { tourTitle, placeName, titleFromI18n } from '../lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Focused floating panel for the saved-tours list, opened from the heart in
// the header. ("Personal info" is the full /account page now.) Centered + portaled to <body>,
// same pattern (and same reason) as CompareModal.
export default function AccountDetailModal({
  section,
  onClose,
}: {
  section: AccountSection;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const { t, locale } = useLanguage();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  useEffect(() => {
    if (section !== 'favorites' || !token) {
      setLoadingFavorites(false);
      return;
    }
    fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setFavorites([]))
      .finally(() => setLoadingFavorites(false));
  }, [section, token]);

  function removeFavorite(tourId: number) {
    setFavorites((prev) => prev.filter((f) => f.id !== tourId));
    fetch(`${API_URL}/api/favorites/${tourId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const titleKey = section === 'info' ? 'account.personalInfo' : 'account.favorites';

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto relative shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title={t('map.close')}
          aria-label={t('map.close')}
          className="absolute top-3 right-3 z-10 bg-muted hover:bg-border text-foreground rounded-full p-2 transition-colors"
        >
          <X size={18} />
        </button>

        <h2
          className="text-lg font-bold text-foreground mb-4 pr-10"
        >
          {t(titleKey)}
        </h2>

        {section === 'favorites' &&
          (loadingFavorites ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.loading')}</p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('account.noFavorites')}</p>
          ) : (
            <div className="space-y-2">
              {favorites.map((tour) => (
                <div
                  key={tour.id}
                  className="flex items-center gap-2 bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                >
                  <Link href={`/tours/${tour.id}`} onClick={onClose} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{tourTitle(tour, locale)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      {tour.location && (
                        <>
                          <MapPin size={11} /> {placeName(tour.location, locale)}
                          <span className="mx-1">·</span>
                        </>
                      )}
                      <Calendar size={11} /> {formatDate(tour.date, locale)}
                      <span className="mx-1">·</span>
                      <span className="font-semibold text-foreground">{formatAzn(tour.price)}</span>
                    </p>
                  </Link>
                  <button
                    onClick={() => removeFavorite(tour.id)}
                    title={t('tourCard.removeFromFavorites')}
                    className="shrink-0 p-1.5 text-danger hover:bg-danger/10 rounded-full transition-colors"
                  >
                    <Heart size={16} className="fill-danger" />
                  </button>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>,
    document.body
  );
}
