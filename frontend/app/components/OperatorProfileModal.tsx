'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, Star, Phone, AtSign, MapPin, Clock3, ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { instagramHandle, instagramUrl } from '@/app/lib/instagram';
import { formatAzn, isPastDate } from '@/app/lib/format';
import { placeName, titleFromI18n } from '@/app/lib/tourContent';
import { photoSrc } from '@/app/lib/photo';
import { CategoryMotif, dayCount, type ApiTour } from './TourCard';

interface OperatorProfileModalOperator {
  id: number;
  name: string;
  rating?: number | null;
  description?: string | null;
  languages?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  phone_verified?: number | null;
  instagram?: string | null;
}

interface OperatorProfileModalReview {
  id: number;
  tour_id: number;
  rating: number;
  comment: string | null;
  tour_title: string;
  tour_title_i18n?: string | null;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(rating) ? 'fill-rating text-rating' : 'text-border'} />
      ))}
    </div>
  );
}

export default function OperatorProfileModal({
  operator,
  tours,
  reviews,
  currentTourId,
  onClose,
}: {
  operator: OperatorProfileModalOperator;
  tours: ApiTour[];
  reviews: OperatorProfileModalReview[];
  currentTourId: number;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const [showAllTours, setShowAllTours] = useState(false);

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

  const languages = (operator.languages ?? '')
    .split(',')
    .map((language) => language.trim())
    .filter(Boolean);
  const sortedTours = useMemo(
    () =>
      [...tours].sort((a, b) => {
        if (a.id === currentTourId) return -1;
        if (b.id === currentTourId) return 1;
        const aIsPast = isPastDate(a.date);
        const bIsPast = isPastDate(b.date);
        if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
        return String(a.date).localeCompare(String(b.date));
      }),
    [currentTourId, tours]
  );
  const reviewCount = tours.reduce((count, tour) => count + (tour.review_count ?? 0), 0);
  const weightedRating = reviewCount
    ? tours.reduce((total, tour) => total + (tour.rating ?? 0) * (tour.review_count ?? 0), 0) / reviewCount
    : 0;
  const rating = operator.rating && operator.rating > 0 ? operator.rating : weightedRating;
  const areasServed = Array.from(new Set(tours.map((tour) => tour.location).filter((location): location is string => Boolean(location))));
  const visibleTours = showAllTours ? sortedTours : sortedTours.slice(0, 3);
  const writtenReviews = reviews.filter((review) => review.comment?.trim()).slice(0, 3);
  const handle = instagramHandle(operator.instagram);

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-3 sm:p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="operator-profile-title"
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          title={t('map.close')}
          aria-label={t('map.close')}
          className="absolute right-4 top-4 z-10 rounded-full bg-card/90 p-2 text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <X size={18} />
        </button>

        <header className="border-b border-border bg-muted/50 px-5 py-7 sm:px-8">
          <div className="flex flex-col gap-4 pr-9 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
              {operator.photo_url ? (
                <img src={photoSrc(operator.photo_url) ?? ''} alt={operator.name} className="h-full w-full object-cover" />
              ) : (
                operator.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('ui.td.yourOperator')}</p>
              <h2 id="operator-profile-title" className="mt-1 text-2xl font-bold text-navy">{operator.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span>{t('ui.td.tourCount', { count: tours.length })}</span>
                {rating > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <StarRow rating={rating} />
                    <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                    {reviewCount > 0 && <span>{t('tourDetail.reviewCount', { count: reviewCount })}</span>}
                  </span>
                ) : (
                  <span>{t('tourDetail.noRatingsYet')}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-7">
          {(operator.description || languages.length > 0 || areasServed.length > 0 || operator.phone || handle) && (
            <section className="grid gap-5 sm:grid-cols-[1.3fr_1fr]">
              {operator.description && (
                <div>
                  <h3 className="text-sm font-bold text-navy">{t('profile.description')}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground/80">{operator.description}</p>
                </div>
              )}

              <div className="space-y-4">
                {areasServed.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-navy">{t('ui.operatorProfile.areasServed')}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {areasServed.slice(0, 6).map((area) => (
                        <span key={area} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80">
                          <MapPin size={12} /> {placeName(area, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {languages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-navy">{t('ui.operatorProfile.languages')}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <span key={language} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase text-primary">
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(operator.phone || handle) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
                    {operator.phone && (
                      <a href={`tel:${operator.phone}`} className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
                        <Phone size={15} className="text-primary" /> {operator.phone}
                      </a>
                    )}
                    {handle && (
                      <a
                        href={instagramUrl(operator.instagram) ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        <AtSign size={15} className="text-primary" /> @{handle}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {sortedTours.length > 0 && (
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-navy">{t('dashboard.yourTours')}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t('ui.td.tourCount', { count: tours.length })}</p>
                </div>
                {tours.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTours((value) => !value)}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {showAllTours ? t('ui.operatorProfile.showFewerTours') : t('ui.operatorProfile.showAllTours', { count: tours.length })}
                    {showAllTours ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleTours.map((tour) => {
                  const photo = photoSrc(tour.photo_url);
                  return (
                    <Link
                      key={tour.id}
                      href={`/tours/${tour.id}`}
                      onClick={onClose}
                      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        {photo ? (
                          <img src={photo} alt={titleFromI18n(tour.title, tour.title_i18n, locale)} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <CategoryMotif category={tour.category} />
                        )}
                        {tour.id === currentTourId && (
                          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy shadow-sm">
                            {t('ui.operatorProfile.currentTour')}
                          </span>
                        )}
                      </div>
                      <div className="p-3.5">
                        <h4 className="line-clamp-2 min-h-10 text-sm font-bold text-navy group-hover:text-primary">
                          {titleFromI18n(tour.title, tour.title_i18n, locale)}
                        </h4>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1 truncate">
                            <MapPin size={13} className="shrink-0" /> {placeName(tour.location, locale)}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <Clock3 size={13} /> {dayCount(tour.duration_days, locale, t)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {tour.review_count && tour.review_count > 0 && tour.rating ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                              <Star size={13} className="fill-rating text-rating" /> {tour.rating.toFixed(1)}
                            </span>
                          ) : <span />}
                          <span className="text-right text-sm font-bold text-navy">
                            {formatAzn(tour.discounted_price ?? tour.price)} <span className="text-xs font-normal text-muted-foreground">{t('ui.card.perPerson')}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-navy">{t('tourDetail.reviews')}</h3>
              {rating > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Star size={15} className="fill-rating text-rating" /> {rating.toFixed(1)}
                  {reviewCount > 0 && <span className="font-normal text-muted-foreground">({reviewCount})</span>}
                </span>
              )}
            </div>
            {reviewCount === 0 ? (
              <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">{t('tourDetail.noRatingsYet')}</p>
            ) : writtenReviews.length > 0 ? (
              <div className="space-y-2">
                {writtenReviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StarRow rating={review.rating} size={13} />
                      <span className="text-xs text-muted-foreground">{titleFromI18n(review.tour_title, review.tour_title_i18n, locale)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-foreground/80">{review.comment}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
