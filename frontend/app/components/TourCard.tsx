'use client';

import { Leaf, Landmark, Music, Utensils, MapPin, Zap, Check, Star, Heart, Clock, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';
import { photoSrc } from '../lib/photo';
import { formatAzn } from '../lib/format';
import { tourTitle, placeName, tourFacts } from '../lib/tourContent';

// Category labels/icons - drives the category filters and the homepage
// "Explore by category" tiles as well as the photo-less card fallback.
export const CATEGORY_STYLE: Record<string, { gradient: string; Icon: any; labelKey: TranslationKey }> = {
  nature: { gradient: 'from-emerald-400 to-emerald-600', Icon: Leaf, labelKey: 'category.nature' },
  history: { gradient: 'from-amber-400 to-amber-700', Icon: Landmark, labelKey: 'category.history' },
  entertainment: { gradient: 'from-violet-400 to-violet-600', Icon: Music, labelKey: 'category.entertainment' },
  food: { gradient: 'from-orange-400 to-red-500', Icon: Utensils, labelKey: 'category.food' },
};

// Muted mountain-silhouette fallback for a tour without a real photo yet,
// tinted per category in the brand's teal/navy family.
const CATEGORY_MOTIF: Record<string, { base: string; ridge: string; crest: string }> = {
  nature: { base: '#0F3B47', ridge: '#14505F', crest: '#1A6677' },
  history: { base: '#1E3348', ridge: '#28425B', crest: '#33516E' },
  entertainment: { base: '#2A2F52', ridge: '#373D66', crest: '#454C7A' },
  food: { base: '#3D2E2A', ridge: '#4D3B35', crest: '#5E4941' },
};
const MOTIF_RIDGE = 'M0 100 L35 55 L60 85 L95 40 L130 90 L160 60 L200 100 L200 140 L0 140 Z';
const MOTIF_CREST = 'M0 120 L50 85 L85 110 L120 75 L155 105 L200 80 L200 140 L0 140 Z';

export function CategoryMotif({ category }: { category: string | null }) {
  const colors = CATEGORY_MOTIF[category ?? ''] ?? CATEGORY_MOTIF.history;
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <rect width="200" height="140" fill={colors.base} />
      <path d={MOTIF_RIDGE} fill={colors.ridge} />
      <path d={MOTIF_CREST} fill={colors.crest} />
    </svg>
  );
}

export interface ApiTour {
  id: number;
  operator_id: number;
  title: string;
  title_i18n?: string | null;
  location: string | null;
  category: string | null;
  price: number;
  date: string;
  duration_days: number;
  min_participants: number;
  max_participants: number;
  discounted_price?: number;
  features?: string | null;
  vehicle_features?: string | null;
  photo_url?: string | null;
  facts?: string | null;
  rating?: number | null;
  review_count?: number;
}

/** Guide languages from the tour's facts as short codes, e.g. "EN / AZ". */
export function tourLanguageCodes(tour: Pick<ApiTour, 'facts'>): string {
  const langs = tourFacts({ facts: tour.facts ?? null }).guide_languages ?? [];
  return langs.slice(0, 3).map((l) => l.toUpperCase()).join(' / ');
}

export default function TourCard({
  tour,
  operatorName,
  onClick,
  showCta = false,
  compareMode = false,
  compareSelected = false,
  compareDisabled = false,
  onToggleCompare,
  isFavorited = false,
  onToggleFavorite,
}: {
  tour: ApiTour;
  operatorName?: string;
  onClick: () => void;
  /** Full-width "View tour" button under the price (homepage cards). */
  showCta?: boolean;
  compareMode?: boolean;
  compareSelected?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}) {
  const { t, locale } = useLanguage();
  const title = tourTitle(tour, locale);
  const hasDeal = typeof tour.discounted_price === 'number';
  const hasRating = typeof tour.rating === 'number' && tour.rating > 0;
  const languages = tourLanguageCodes(tour);

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl overflow-hidden border cursor-pointer group h-full flex flex-col transition-shadow duration-300 ${
        compareSelected ? 'border-primary ring-2 ring-primary' : 'border-border hover:shadow-lift'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
        {tour.photo_url ? (
          <img
            src={photoSrc(tour.photo_url) ?? ''}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <CategoryMotif category={tour.category} />
        )}

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5">
          {hasDeal ? (
            <span className="flex items-center gap-1 bg-warning text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
              <Zap size={10} /> {t('tourCard.lastMinuteDeal')}
            </span>
          ) : (
            <span />
          )}
          {compareMode ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!compareDisabled) onToggleCompare?.();
              }}
              disabled={compareDisabled}
              title={t('home.compareProperties')}
              className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                compareSelected
                  ? 'bg-primary border-primary'
                  : compareDisabled
                  ? 'bg-white/60 border-white/60 cursor-not-allowed'
                  : 'bg-white/90 border-white hover:bg-white'
              }`}
            >
              {compareSelected && <Check size={14} className="text-white" />}
            </button>
          ) : (
            onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                title={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
                aria-label={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
                className="w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center transition-colors shrink-0"
              >
                <Heart size={15} className={isFavorited ? 'fill-danger text-danger' : 'text-navy/70'} />
              </button>
            )
          )}
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <div className="flex items-center gap-1 text-xs mb-1 h-4">
          {hasRating ? (
            <>
              <Star size={12} className="fill-rating text-rating" />
              <span className="font-semibold text-foreground">{tour.rating!.toFixed(1)}</span>
              {tour.review_count ? <span className="text-muted-foreground">({tour.review_count})</span> : null}
            </>
          ) : (
            <span className="text-muted-foreground">{t('ui.card.new')}</span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{title}</h3>

        {tour.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <MapPin size={12} className="shrink-0" /> {placeName(tour.location, locale)}
          </p>
        )}
        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock size={12} className="shrink-0" /> {t('tourDetail.duration', { count: tour.duration_days })}
          {languages && (
            <>
              <span className="mx-0.5">·</span>
              <Languages size={12} className="shrink-0" /> {languages}
            </>
          )}
        </p>
        {operatorName && <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">{operatorName}</p>}

        <div className="mt-auto pt-3 flex items-baseline gap-1.5">
          {hasDeal && <span className="text-xs text-muted-foreground line-through">{formatAzn(tour.price)}</span>}
          <span className="text-base font-bold text-foreground">{formatAzn(hasDeal ? tour.discounted_price : tour.price)}</span>
          <span className="text-xs text-muted-foreground">{t('ui.card.perPerson')}</span>
        </div>

        {showCta && (
          <span className="mt-3 block w-full text-center bg-primary group-hover:bg-primary-hover text-primary-foreground text-sm font-semibold py-2 rounded-lg transition-colors">
            {t('ui.card.viewTour')}
          </span>
        )}
      </div>
    </div>
  );
}
