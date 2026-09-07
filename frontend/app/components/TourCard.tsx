'use client';

import { Leaf, Landmark, Music, Utensils, MapPin, Users, Zap, Check, Star, Clock, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const CATEGORY_STYLE: Record<string, { gradient: string; Icon: any; labelKey: TranslationKey }> = {
  nature: { gradient: 'from-emerald-400 to-emerald-600', Icon: Leaf, labelKey: 'category.nature' },
  history: { gradient: 'from-amber-400 to-amber-700', Icon: Landmark, labelKey: 'category.history' },
  entertainment: { gradient: 'from-violet-400 to-violet-600', Icon: Music, labelKey: 'category.entertainment' },
  food: { gradient: 'from-orange-400 to-red-500', Icon: Utensils, labelKey: 'category.food' },
};

export interface ApiTour {
  id: number;
  operator_id: number;
  title: string;
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
  rating?: number | null;
  review_count?: number;
}

export default function TourCard({
  tour,
  operatorName,
  onClick,
  compareMode = false,
  compareSelected = false,
  compareDisabled = false,
  onToggleCompare,
}: {
  tour: ApiTour;
  operatorName?: string;
  onClick: () => void;
  /** Show the compare checkbox overlay (homepage's "Compare properties" toggle). */
  compareMode?: boolean;
  compareSelected?: boolean;
  /** True once the compare cap (3) is hit and this card isn't already selected. */
  compareDisabled?: boolean;
  onToggleCompare?: () => void;
}) {
  const { t } = useLanguage();
  const style = CATEGORY_STYLE[tour.category ?? ''] ?? CATEGORY_STYLE.history;
  const Icon = style.Icon;
  const hasDeal = typeof tour.discounted_price === 'number';
  const hasRating = typeof tour.rating === 'number' && tour.rating > 0;

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group ${
        compareSelected ? 'border-accent ring-2 ring-accent/30' : 'border-border'
      }`}
    >
      <div
        className={`relative h-36 sm:h-40 flex items-center justify-center overflow-hidden ${
          tour.photo_url ? 'bg-muted' : `bg-gradient-to-br ${style.gradient}`
        }`}
      >
        {tour.photo_url ? (
          <img
            src={`${API_URL}${tour.photo_url}`}
            alt={tour.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <>
            {/* Subtle diagonal-weave texture instead of a flat gradient - a
                nod to Azerbaijani carpet motifs without literally
                illustrating a carpet, since there's no real tour photo. */}
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, #fff 0 2px, transparent 2px 14px)',
              }}
            />
            <Icon size={40} className="text-white/70 transition-transform duration-300 group-hover:scale-110" />
          </>
        )}

        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1.5">
          {hasDeal ? (
            <span className="flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              <Zap size={9} /> {t('tourCard.lastMinuteDeal')}
            </span>
          ) : (
            <span />
          )}
          {compareMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!compareDisabled) onToggleCompare?.();
              }}
              disabled={compareDisabled}
              title={t('home.compareProperties')}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                compareSelected
                  ? 'bg-accent border-accent'
                  : compareDisabled
                  ? 'bg-white/60 border-white/60 cursor-not-allowed'
                  : 'bg-white/90 border-white hover:bg-white'
              }`}
            >
              {compareSelected && <Check size={14} className="text-white" />}
            </button>
          )}
        </div>

        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
            <Clock size={9} /> {t('tourDetail.duration', { count: tour.duration_days })}
          </span>
          <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">{t(style.labelKey)}</span>
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug flex-1">{tour.title}</h3>
          {hasRating && (
            <span className="flex items-center gap-0.5 shrink-0 text-xs font-bold text-foreground pt-0.5">
              <Star size={12} className="fill-rating text-rating" /> {tour.rating!.toFixed(1)}
            </span>
          )}
        </div>
        {tour.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mb-2.5">
            <MapPin size={11} /> {tour.location}
            {hasRating && tour.review_count ? (
              <span className="text-muted-foreground/70">
                · {t('tourCard.reviewCount', { count: tour.review_count })}
              </span>
            ) : null}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate text-foreground">
              {operatorName ?? t('tourCard.defaultOperator')}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <Users size={10} /> {t('tourCard.minToConfirm', { count: tour.min_participants })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="text-right">
              {hasDeal ? (
                <>
                  <p className="text-[10px] text-muted-foreground line-through">AZN {tour.price}</p>
                  <p className="text-sm font-bold text-primary">
                    AZN {tour.discounted_price}
                    <span className="text-[10px] font-normal text-muted-foreground">{t('tourCard.perPerson')}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-primary">
                  AZN {tour.price}
                  <span className="text-[10px] font-normal text-muted-foreground">{t('tourCard.perPerson')}</span>
                </p>
              )}
            </div>
            <ChevronRight
              size={16}
              className="text-muted-foreground/40 -mr-1 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
