'use client';

import { Mountain, Landmark, Flower2, Wine, FerrisWheel, Zap, Check, Star, Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';
import { photoSrc } from '../lib/photo';
import { formatAzn } from '../lib/format';
import { tourTitle, placeName, tourFacts } from '../lib/tourContent';
import { parseFeatures } from '../lib/tourFeatures';

// Category labels/icons - drives the category filters and the homepage
// "Explore by category" tiles as well as the photo-less card fallback.
export const CATEGORY_STYLE: Record<string, { gradient: string; Icon: any; emoji: string; labelKey: TranslationKey }> = {
  nature: { gradient: 'from-emerald-400 to-emerald-600', Icon: Mountain, emoji: '🏔️', labelKey: 'category.nature' },
  history: { gradient: 'from-amber-400 to-amber-700', Icon: Landmark, emoji: '🏛️', labelKey: 'category.history' },
  wellness: { gradient: 'from-teal-400 to-teal-600', Icon: Flower2, emoji: '🧘', labelKey: 'category.wellness' },
  food: { gradient: 'from-orange-400 to-red-500', Icon: Wine, emoji: '🍷', labelKey: 'category.food' },
  entertainment: { gradient: 'from-violet-400 to-violet-600', Icon: FerrisWheel, emoji: '🎡', labelKey: 'category.entertainment' },
};

/** "Multi-day Tours" isn't a stored category - it's tours lasting 2+ days. */
export const MULTIDAY_EMOJI = '🗺️';

// Muted mountain-silhouette fallback for a tour without a real photo yet,
// tinted per category in the brand's teal/navy family.
const CATEGORY_MOTIF: Record<string, { base: string; ridge: string; crest: string }> = {
  nature: { base: '#0F3B47', ridge: '#14505F', crest: '#1A6677' },
  history: { base: '#1E3348', ridge: '#28425B', crest: '#33516E' },
  entertainment: { base: '#2A2F52', ridge: '#373D66', crest: '#454C7A' },
  food: { base: '#3D2E2A', ridge: '#4D3B35', crest: '#5E4941' },
  wellness: { base: '#1D4440', ridge: '#255751', crest: '#2E6A63' },
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
  click_count?: number;
  created_at?: string;
}

/** "1 day" / "3 days" / "2 дня" / "5 дней" - real plural forms per language. */
export function dayCount(count: number, locale: string, t: (k: TranslationKey, p?: Record<string, string | number>) => string): string {
  const form = new Intl.PluralRules(locale).select(count);
  const key: TranslationKey = form === 'one' ? 'ui.ex.days.one' : form === 'few' ? 'ui.ex.days.few' : 'ui.ex.days.many';
  return t(key, { count });
}

/** Guide languages from the tour's facts as short codes, e.g. "EN / AZ". */
export function tourLanguageCodes(tour: Pick<ApiTour, 'facts'>): string {
  const langs = tourFacts({ facts: tour.facts ?? null }).guide_languages ?? [];
  return langs.slice(0, 3).map((l) => l.toUpperCase()).join(' / ');
}

// Explore-page card: photo with duration badge and save button, then
// "place · operator", title, what's included, price and a Compare toggle.
// Everything shown comes from the tour record - tags are its real
// inclusions, the rating only appears once real reviews exist.
export default function TourCard({
  tour,
  operatorName,
  onClick,
  compareSelected = false,
  compareDisabled = false,
  onToggleCompare,
  isFavorited = false,
  onToggleFavorite,
}: {
  tour: ApiTour;
  operatorName?: string;
  onClick: () => void;
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
  const tags = parseFeatures(tour.features).slice(0, 3);
  const meta = [placeName(tour.location, locale), operatorName].filter(Boolean).join(' · ');

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-2xl overflow-hidden border cursor-pointer group h-full flex flex-col transition-all duration-300 ${
        compareSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:shadow-lift'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted shrink-0">
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

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-white/95 text-navy text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
            {dayCount(tour.duration_days, locale, t)}
          </span>
          {hasDeal && (
            <span className="flex items-center gap-0.5 bg-warning text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              <Zap size={10} /> −{Math.round((1 - tour.discounted_price! / tour.price) * 100)}%
            </span>
          )}
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            title={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
            aria-label={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
            aria-pressed={isFavorited}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center transition-colors"
          >
            <Heart size={15} className={isFavorited ? 'fill-danger text-danger' : 'text-navy/70'} />
          </button>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <span className="truncate">{meta}</span>
          {hasRating && (
            <span className="flex items-center gap-0.5 shrink-0 ml-auto font-semibold text-foreground">
              <Star size={11} className="fill-rating text-rating" /> {tour.rating!.toFixed(1)}
            </span>
          )}
        </p>
        <h3 className="text-[15px] font-bold text-navy leading-snug line-clamp-2 mt-1">{title}</h3>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((slug) => (
              <span key={slug} className="text-[11px] font-medium text-foreground/75 bg-muted rounded-md px-2 py-0.5">
                {t(`ui.ex.tag.${slug}` as TranslationKey)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <p className="flex items-baseline gap-1 min-w-0">
            {hasDeal && <span className="text-xs text-muted-foreground line-through">{formatAzn(tour.price)}</span>}
            <span className="text-lg font-bold text-navy">{formatAzn(hasDeal ? tour.discounted_price : tour.price)}</span>
            <span className="text-xs text-muted-foreground">{t('ui.card.perPerson')}</span>
          </p>
          {onToggleCompare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!compareDisabled) onToggleCompare();
              }}
              aria-pressed={compareSelected}
              disabled={compareDisabled}
              title={compareDisabled ? t('ui.ex.compareFull') : undefined}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold rounded-lg border px-2.5 py-1.5 transition-colors ${
                compareSelected
                  ? 'border-primary/40 bg-primary/10 text-navy'
                  : compareDisabled
                    ? 'border-border text-muted-foreground/60 cursor-not-allowed'
                    : 'border-border text-foreground/80 hover:border-primary/40'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center ${
                  compareSelected ? 'bg-primary border-primary' : 'border-foreground/30 bg-card'
                }`}
              >
                {compareSelected && <Check size={10} className="text-white" strokeWidth={3} />}
              </span>
              {t('ui.ex.compare')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
