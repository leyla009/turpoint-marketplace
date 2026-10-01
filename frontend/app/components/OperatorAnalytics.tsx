'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Eye, Heart, Star, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/translations';
import { DATE_LOCALES, formatAzn, formatDate } from '../lib/format';
import { tourTitle, placeName, titleFromI18n } from '../lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOURS_COLLAPSED = 5;

// Shape of GET /api/operators/me/analytics (see backend/src/lib/analytics.js).
interface TourStats {
  id: number;
  title: string;
  title_i18n?: string | null;
  location: string | null;
  date: string;
  max_participants: number;
  views: number;
  favorites_count: number;
  bookings_count: number;
  seats_confirmed: number;
  seats_pending: number;
  revenue: number;
  pending_revenue: number;
  fill_rate: number; // 0..1
  group_status: 'waiting' | 'forming' | 'confirmed' | 'cancelled' | null;
  review_count: number;
  avg_rating: number | null;
  is_upcoming: boolean;
}

interface Analytics {
  summary: {
    total_tours: number;
    total_bookings: number;
    confirmed_bookings: number;
    revenue: number;
    pending_revenue: number;
    fill_rate_upcoming: number | null;
    total_views: number;
    total_favorites: number;
    conversion_rate: number | null;
    review_count: number;
    avg_rating: number | null;
  };
  monthly: { month: string; bookings: number; revenue: number }[]; // month = 'YYYY-MM'
  tours: TourStats[];
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: Analytics };

const pct = (n: number | null, digits = 0) => (n === null ? '—' : `${(n * 100).toFixed(digits)}%`);

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl shadow-md p-3.5">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// The operator dashboard's "Analytics" section: headline numbers, bookings
// per month, and a per-tour breakdown (fill rate, revenue, views, saves,
// rating). Pure CSS bars - no chart library needed.
export default function OperatorAnalytics() {
  const { token } = useAuth();
  const { t, locale } = useLanguage();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    fetch(`${API_URL}/api/operators/me/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('request failed');
        return r.json();
      })
      .then((data: Analytics) => !cancelled && setState({ kind: 'ready', data }))
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === 'ready' && state.data.summary.total_tours === 0) return null; // nothing to analyze yet

  function monthLabel(ym: string) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(DATE_LOCALES[locale], { month: 'short' });
  }

  return (
    <section className="mb-6">
      {/* The heading used to be dark text (text-foreground) sitting directly
          on the dark forest photo, so it was effectively invisible - only
          the icon showed. It now sits on its own card surface, same
          treatment as the "Turlarınız" tab below. */}
      <div className="inline-flex items-center gap-2 bg-card rounded-full pl-1.5 pr-4 py-1.5 mb-3 shadow-md">
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <BarChart3 size={14} className="text-primary" />
        </span>
        <h2
          className="text-base sm:text-lg font-bold text-foreground leading-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('analytics.title')}
        </h2>
      </div>

      {state.kind === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[74px] rounded-xl bg-card shadow-md animate-pulse" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <div className="bg-card rounded-xl shadow-md p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={16} className="shrink-0" /> {t('analytics.loadError')}
        </div>
      )}

      {state.kind === 'ready' &&
        (() => {
          const { summary, monthly, tours } = state.data;
          const maxMonthly = Math.max(1, ...monthly.map((m) => m.bookings));
          const hasMonthly = monthly.some((m) => m.bookings > 0);
          const visibleTours = showAll ? tours : tours.slice(0, TOURS_COLLAPSED);

          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <Kpi
                  label={t('analytics.revenue')}
                  value={formatAzn(summary.revenue)}
                  sub={summary.pending_revenue > 0 ? t('analytics.pendingRevenue', { amount: formatAzn(summary.pending_revenue) }) : undefined}
                />
                <Kpi
                  label={t('analytics.bookings')}
                  value={String(summary.total_bookings)}
                  sub={t('analytics.bookingsSub', { confirmed: summary.confirmed_bookings })}
                />
                <Kpi label={t('analytics.fillRate')} value={pct(summary.fill_rate_upcoming)} />
                <Kpi
                  label={t('analytics.rating')}
                  value={summary.avg_rating === null ? '—' : summary.avg_rating.toFixed(1)}
                  sub={t('analytics.ratingSub', { count: summary.review_count })}
                />
                <Kpi
                  label={t('analytics.views')}
                  value={String(summary.total_views)}
                  sub={t('analytics.viewsSub', { count: summary.total_favorites })}
                />
                <Kpi
                  label={t('analytics.conversion')}
                  value={pct(summary.conversion_rate, 1)}
                  sub={t('analytics.conversionHint')}
                />
              </div>

              <div className="bg-card rounded-xl shadow-md p-4 mb-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">{t('analytics.monthly')}</h3>
                {hasMonthly ? (
                  <div className="flex items-end gap-2 h-28">
                    {monthly.map((m) => (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                        title={`${monthLabel(m.month)}: ${m.bookings} · ${formatAzn(m.revenue)}`}
                      >
                        <span className="text-xs font-semibold text-foreground mb-0.5">{m.bookings}</span>
                        <div
                          className="w-full max-w-[36px] rounded-t-md bg-primary"
                          style={{ height: `${Math.max(m.bookings > 0 ? 6 : 2, (m.bookings / maxMonthly) * 76)}px`, opacity: m.bookings > 0 ? 1 : 0.25 }}
                        />
                        <span className="text-xs text-muted-foreground mt-1">{monthLabel(m.month)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('analytics.monthlyEmpty')}</p>
                )}
              </div>

              <div className="bg-card rounded-xl shadow-md overflow-hidden">
                <h3 className="text-sm font-semibold text-foreground px-4 pt-4 pb-2">{t('analytics.perTour')}</h3>
                <div className="divide-y divide-border">
                  {visibleTours.map((tour) => {
                    const taken = tour.seats_confirmed + tour.seats_pending;
                    const fillPct = Math.round(tour.fill_rate * 100);
                    return (
                      <div key={tour.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{tourTitle(tour, locale)}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {tour.group_status && (
                              <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                {t(`tourDetail.groupStatus.${tour.group_status}` as TranslationKey)}
                              </span>
                            )}
                            <span
                              className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                tour.is_upcoming ? 'text-accent-foreground bg-accent' : 'text-muted-foreground bg-muted'
                              }`}
                            >
                              {t(tour.is_upcoming ? 'analytics.upcoming' : 'analytics.past')}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {[placeName(tour.location, locale), formatDate(tour.date, locale)].filter(Boolean).join(' · ')}
                        </p>

                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {t('analytics.seatsLabel', { taken, max: tour.max_participants })}
                          </span>
                          <span className="font-semibold text-foreground">{fillPct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${fillPct}%` }} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {t('analytics.revenue')}: {formatAzn(tour.revenue)}
                          </span>
                          <span className="flex items-center gap-1" title={t('analytics.views')}>
                            <Eye size={12} /> {tour.views}
                          </span>
                          <span className="flex items-center gap-1" title={t('analytics.saved')}>
                            <Heart size={12} /> {tour.favorites_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-rating" fill="currentColor" />
                            {tour.avg_rating === null ? t('analytics.noReviews') : `${tour.avg_rating.toFixed(1)} (${tour.review_count})`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {tours.length > TOURS_COLLAPSED && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full text-xs font-semibold text-primary py-2.5 border-t border-border hover:bg-muted/50 transition-colors"
                  >
                    {showAll ? t('analytics.showLess') : t('analytics.showAll', { count: tours.length })}
                  </button>
                )}
              </div>
            </>
          );
        })()}
    </section>
  );
}
