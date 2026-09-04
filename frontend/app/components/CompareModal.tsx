'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Calendar, Users, Tag, Loader2 } from 'lucide-react';
import { CATEGORY_STYLE, type ApiTour } from './TourCard';
import { useLanguage } from '../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CompareTour extends ApiTour {
  active_deal?: { discount_percent: number } | null;
}

// Floating side-by-side comparison, opened from the homepage's compare
// tray instead of navigating to a separate page - rendered via a portal
// straight into <body> so it isn't trapped by the sidebar's `sticky`
// stacking context (same issue the destination map's expand modal hit).
export default function CompareModal({
  tourIds,
  operators,
  onClose,
  onViewTour,
}: {
  tourIds: number[];
  operators: Record<number, string>;
  onClose: () => void;
  onViewTour: (id: number) => void;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<CompareTour[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all(tourIds.map((id) => fetch(`${API_URL}/api/tours/${id}`).then((r) => r.json())))
      .then((results) => !cancelled && setData(results))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourIds.join(',')]);

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

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto relative shadow-2xl p-5"
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
          className="text-lg sm:text-xl font-bold text-foreground mb-4 pr-10"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('compare.comparing', { count: tourIds.length })}
        </h2>

        {loading && (
          <div className="text-center py-16 text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> {t('compare.loadingComparison')}
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">{t('compare.couldntLoadComparison')}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="overflow-x-auto -mx-5 px-5">
            <div
              className="grid gap-4 min-w-[560px]"
              style={{ gridTemplateColumns: `120px repeat(${data.length}, 1fr)` }}
            >
              {/* Header row: tour cards */}
              <div />
              {data.map((tour) => {
                const style = CATEGORY_STYLE[tour.category ?? ''] ?? CATEGORY_STYLE.history;
                const Icon = style.Icon;
                return (
                  <div key={tour.id} className="bg-background border border-border rounded-xl overflow-hidden">
                    <div className={`h-16 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                      <Icon size={20} className="text-white/90" />
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-xs font-semibold text-foreground leading-snug mb-1 line-clamp-2">
                        {tour.title}
                      </h3>
                      <button
                        onClick={() => onViewTour(tour.id)}
                        className="text-[10px] text-accent font-semibold hover:underline"
                      >
                        {t('compare.viewTour')}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Price row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">{t('compare.price')}</div>
              {data.map((tour) => (
                <div key={tour.id} className="flex items-center px-1">
                  {typeof tour.discounted_price === 'number' ? (
                    <div>
                      <span className="text-sm font-bold text-accent">{tour.discounted_price} AZN</span>
                      <span className="text-xs text-muted-foreground line-through ml-1.5">{tour.price} AZN</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{tour.price} AZN</span>
                  )}
                </div>
              ))}

              {/* Category row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Tag size={13} className="mr-1.5" /> {t('compare.category')}
              </div>
              {data.map((tour) => {
                const catStyle = CATEGORY_STYLE[tour.category ?? ''];
                return (
                  <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                    {catStyle ? t(catStyle.labelKey) : '—'}
                  </div>
                );
              })}

              {/* Location row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <MapPin size={13} className="mr-1.5" /> {t('compare.location')}
              </div>
              {data.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {tour.location ?? '—'}
                </div>
              ))}

              {/* Date row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Calendar size={13} className="mr-1.5" /> {t('compare.date')}
              </div>
              {data.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {tour.date}
                </div>
              ))}

              {/* Duration row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">{t('compare.duration')}</div>
              {data.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {t('compare.days', { count: tour.duration_days })}
                </div>
              ))}

              {/* Group size row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Users size={13} className="mr-1.5" /> {t('compare.groupSize')}
              </div>
              {data.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {t('tourDetail.peopleRange', { min: tour.min_participants, max: tour.max_participants })}
                </div>
              ))}

              {/* Operator row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">{t('compare.operator')}</div>
              {data.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {operators[tour.operator_id] ?? '—'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
