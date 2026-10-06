'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Heart, MapPin, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CATEGORY_STYLE, CategoryMotif, MULTIDAY_EMOJI, type ApiTour } from '../TourCard';
import { photoSrc } from '../../lib/photo';
import { formatAzn, isPastDate } from '../../lib/format';
import { placeName, tourTitle } from '../../lib/tourContent';

const NEW_FOR_DAYS = 30;

// "Popular right now": category chips over a lead tour card plus three
// compact rows. Only upcoming (still bookable) tours are shown, ranked by
// real page views, then rating, then soonest date. Every badge is a fact
// about the tour - never an invented "Featured" label.
export default function PopularNow({
  tours,
  favoriteIds,
  onToggleFavorite,
}: {
  tours: ApiTour[];
  favoriteIds: Set<number>;
  onToggleFavorite: (id: number) => void;
}) {
  const { t, locale } = useLanguage();
  const [filter, setFilter] = useState('all');

  const upcoming = useMemo(
    () =>
      tours
        .filter((tour) => !isPastDate(tour.date))
        .sort(
          (a, b) =>
            (b.click_count ?? 0) - (a.click_count ?? 0) ||
            (b.rating ?? 0) - (a.rating ?? 0) ||
            a.date.localeCompare(b.date)
        ),
    [tours]
  );

  const matches = (tour: ApiTour, key: string) =>
    key === 'all' ? true : key === 'multiday' ? tour.duration_days > 1 : tour.category === key;

  // Chips only for categories that currently have upcoming tours.
  const chips = useMemo(() => {
    const list = [
      ...Object.entries(CATEGORY_STYLE).map(([key, c]) => ({ key, label: t(c.labelKey) })),
      { key: 'multiday', label: t('ui.category.multiday') },
    ].map((c) => ({ ...c, count: upcoming.filter((tour) => matches(tour, c.key)).length }));
    return list.filter((c) => c.count > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming, t]);

  const shown = upcoming.filter((tour) => matches(tour, filter)).slice(0, 4);
  const [lead, ...others] = shown;

  function badge(tour: ApiTour): { text: string; tone: string } {
    if (typeof tour.discounted_price === 'number') {
      const pct = Math.round((1 - tour.discounted_price / tour.price) * 100);
      return { text: `−${pct}%`, tone: 'bg-warning text-white' };
    }
    if ((tour.click_count ?? 0) > 0) return { text: t('ui.home2.popular'), tone: 'bg-primary/10 text-primary' };
    if (tour.created_at && Date.now() - new Date(tour.created_at.replace(' ', 'T') + 'Z').getTime() < NEW_FOR_DAYS * 864e5) {
      return { text: t('ui.home2.new'), tone: 'bg-success/10 text-success' };
    }
    const c = tour.category ? CATEGORY_STYLE[tour.category] : null;
    if (c) return { text: `${c.emoji} ${t(c.labelKey)}`, tone: 'bg-muted text-foreground/70' };
    return { text: tour.duration_days > 1 ? `${MULTIDAY_EMOJI} ${t('ui.category.multiday')}` : '', tone: 'bg-muted text-foreground/70' };
  }

  const meta = (tour: ApiTour) =>
    `${placeName(tour.location, locale)} · ${t('tourDetail.duration', { count: tour.duration_days })}`;
  const price = (tour: ApiTour) => formatAzn(tour.discounted_price ?? tour.price);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl sm:text-[28px] font-bold text-navy">{t('ui.home2.popularTitle')}</h2>
        </div>
        <Link href="/tours" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline shrink-0">
          {t('ui.home2.viewAllTours')} <ArrowRight size={15} />
        </Link>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5" role="tablist" aria-label={t('ui.explore.category')}>
        {[{ key: 'all', label: t('ui.home2.all'), count: undefined as number | undefined }, ...chips].map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={filter === c.key}
            onClick={() => setFilter(c.key)}
            className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
              filter === c.key
                ? 'bg-navy text-white border-navy'
                : 'bg-card text-foreground border-border hover:border-primary/40'
            }`}
          >
            {c.label}
            {c.count !== undefined && (
              <span className={filter === c.key ? 'text-white/70' : 'text-muted-foreground'}>{c.count}</span>
            )}
          </button>
        ))}
      </div>

      {!lead ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-8 text-center">
          {t('ui.home2.noTours')}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4">
          {/* Lead card */}
          <Link href={`/tours/${lead.id}`} className="group bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:shadow-lift transition-shadow">
            <div className="relative h-64 sm:h-72 bg-muted overflow-hidden">
              {lead.photo_url ? (
                <img
                  src={photoSrc(lead.photo_url) ?? ''}
                  alt={tourTitle(lead, locale)}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <CategoryMotif category={lead.category} />
              )}
              {badge(lead).text && (
                <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/95 text-navy shadow-sm`}>
                  {typeof lead.discounted_price === 'number' && <Zap size={11} className="inline -mt-0.5 mr-0.5 text-warning" />}
                  {badge(lead).text}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite(lead.id);
                }}
                aria-label={t(favoriteIds.has(lead.id) ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-sm"
              >
                <Heart size={16} className={favoriteIds.has(lead.id) ? 'fill-danger text-danger' : 'text-navy/70'} />
              </button>
            </div>
            <div className="p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-navy leading-snug line-clamp-2">{tourTitle(lead, locale)}</h3>
                <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin size={13} /> {meta(lead)}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <p className="text-right">
                  <span className="text-xl font-bold text-navy">{price(lead)}</span>
                  <span className="text-xs text-muted-foreground"> {t('ui.card.perPerson')}</span>
                </p>
                <span className="bg-primary group-hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                  {t('ui.card.viewTour')}
                </span>
              </div>
            </div>
          </Link>

          {/* Compact rows */}
          <div className="flex flex-col gap-3">
            {others.map((tour) => {
              const b = badge(tour);
              return (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="group flex items-center gap-4 bg-card border border-border rounded-2xl p-3 hover:shadow-card hover:border-primary/30 transition-all lg:flex-1"
                >
                  <div className="relative w-24 h-20 sm:w-28 sm:h-[84px] rounded-xl overflow-hidden bg-muted shrink-0">
                    {tour.photo_url ? (
                      <img src={photoSrc(tour.photo_url) ?? ''} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <CategoryMotif category={tour.category} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {b.text && <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.tone}`}>{b.text}</span>}
                    <p className="text-[15px] font-semibold text-navy truncate mt-1 group-hover:text-primary transition-colors">
                      {tourTitle(tour, locale)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta(tour)}</p>
                  </div>
                  <p className="text-base font-bold text-navy shrink-0 pr-2">{price(tour)}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
