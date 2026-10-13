'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, Ticket, Star, Store, ChevronRight, AlertCircle, PlusCircle, ScanLine, WalletCards,
} from 'lucide-react';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import OperatorPanelContent from '@/app/components/OperatorPanelContent';
import OperatorAnalytics from '@/app/components/OperatorAnalytics';
import OperatorProfileForm from '@/app/components/OperatorProfileForm';
import TicketScanner from '@/app/components/TicketScanner';
import OperatorEarnings from '@/app/components/OperatorEarnings';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { titleFromI18n, placeName } from '@/app/lib/tourContent';
import type { TranslationKey } from '@/app/lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Section = 'overview' | 'tours' | 'bookings' | 'earnings' | 'reviews' | 'profile';
type BookingFilter = 'upcoming' | 'past' | 'cancelled';

interface AnalyticsData {
  summary: { total_tours: number; total_bookings: number; revenue: number; pending_revenue: number; avg_rating: number | null; review_count: number };
  monthly: { month: string; bookings: number; revenue: number }[];
  tours: { id: number; title: string; title_i18n?: string | null; review_count: number; avg_rating: number | null; location: string | null }[];
}

const STATUS_BADGE: Record<string, { className: string; labelKey: TranslationKey }> = {
  pending: { className: 'text-warning bg-warning/10', labelKey: 'status.pending' },
  confirmed: { className: 'text-success bg-success/10', labelKey: 'status.confirmed' },
  cancelled: { className: 'text-muted-foreground bg-muted', labelKey: 'status.cancelled' },
};

const NAV: { id: Section; labelKey: TranslationKey; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', labelKey: 'nav.dashboard', Icon: LayoutDashboard },
  { id: 'tours', labelKey: 'ui.dash.myTours', Icon: MapIcon },
  { id: 'bookings', labelKey: 'ui.dash.bookings', Icon: Ticket },
  { id: 'earnings', labelKey: 'ui.dash.earnings', Icon: WalletCards },
  { id: 'reviews', labelKey: 'tourDetail.reviews', Icon: Star },
  { id: 'profile', labelKey: 'dashboard.profileButton', Icon: Store },
];

function Kpi({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${value}`}
        className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">{content}</div>
  );
}

export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const { token, user, operatorProfile } = useAuth();
  const { t, locale } = useLanguage();
  const [section, setSection] = useState<Section>('overview');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('upcoming');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [loadErrors, setLoadErrors] = useState({ analytics: false, bookings: false, tours: false });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [reviewsByTour, setReviewsByTour] = useState<Record<number, any[]>>({});
  const operatorId = operatorProfile?.id;

  useEffect(() => {
    const readSection = () => {
      const value = new URLSearchParams(window.location.search).get('section');
      const oldSection: Record<string, Section> = { scan: 'bookings', deals: 'tours', analytics: 'overview' };
      setScannerOpen(value === 'scan');
      setSection(NAV.some((item) => item.id === value) ? (value as Section) : oldSection[value ?? ''] ?? 'overview');
    };
    readSection();
    window.addEventListener('popstate', readSection);
    return () => window.removeEventListener('popstate', readSection);
  }, []);

  function navigateSection(next: Section) {
    setSection(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('section');
    else url.searchParams.set('section', next);
    window.history.pushState({}, '', url);
  }

  useEffect(() => {
    if (!token || !operatorId) return;
    let cancelled = false;
    setDashboardLoading(true);
    setLoadErrors({ analytics: false, bookings: false, tours: false });
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const requests = [fetch(`${API_URL}/api/operators/me/analytics`, auth)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setAnalytics(data); })
      .catch(() => { if (!cancelled) setLoadErrors((current) => ({ ...current, analytics: true })); }),
    fetch(`${API_URL}/api/bookings/mine`, auth)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setBookings(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setLoadErrors((current) => ({ ...current, bookings: true })); }),
    fetch(`${API_URL}/api/tours`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((all) => { if (!cancelled) setTours(Array.isArray(all) ? all.filter((x: any) => x.operator_id === operatorId) : []); })
      .catch(() => { if (!cancelled) setLoadErrors((current) => ({ ...current, tours: true })); })];
    Promise.all(requests).finally(() => { if (!cancelled) setDashboardLoading(false); });
    return () => { cancelled = true; };
  }, [token, operatorId]);

  // Reviews section: comments for the operator's reviewed tours.
  useEffect(() => {
    if (section !== 'reviews' || !analytics) return;
    let cancelled = false;
    analytics.tours
      .filter((x) => x.review_count > 0)
      .slice(0, 12)
      .forEach((x) => {
        fetch(`${API_URL}/api/reviews?tour_id=${x.id}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((list) => {
            if (!cancelled) setReviewsByTour((prev) => ({ ...prev, [x.id]: Array.isArray(list) ? list : [] }));
          })
          .catch(() => {});
      });
    return () => { cancelled = true; };
  }, [section, analytics]);

  const bookingGroups = useMemo(() => {
    const groups: Record<BookingFilter, any[]> = { upcoming: [], past: [], cancelled: [] };
    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') groups.cancelled.push(booking);
      else if (isPastDate(booking.tour_date)) groups.past.push(booking);
      else groups.upcoming.push(booking);
    });
    groups.upcoming.sort((a, b) => String(a.tour_date).localeCompare(String(b.tour_date)));
    groups.past.sort((a, b) => String(b.tour_date).localeCompare(String(a.tour_date)));
    return groups;
  }, [bookings]);
  const upcoming = bookingGroups.upcoming;
  const visibleBookings = bookingGroups[bookingFilter];

  if (authLoading) return <div className="max-w-7xl mx-auto p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;

  if (!operatorProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <OperatorPanelContent />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greetingKey: TranslationKey = hour < 12 ? 'ui.dash.goodMorning' : hour < 18 ? 'ui.dash.goodAfternoon' : 'ui.dash.goodEvening';
  const firstName = user?.name?.split(' ')[0] ?? operatorProfile.name;

  const bookingRow = (b: any) => {
    const badge = STATUS_BADGE[b.status] ?? STATUS_BADGE.confirmed;
    return (
      <li key={b.id} className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{titleFromI18n(b.tour_title, b.tour_title_i18n, locale)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(b.tour_date, locale, { day: 'numeric', month: 'short' })} · {b.traveler_name} ·{' '}
            {t('ui.book.travelersCount', { count: b.seats })}
            {/* The traveler's own number from their account settings - shown only when they added one. */}
            {b.traveler_phone && (
              <>
                {' · '}
                <a
                  href={`https://wa.me/${String(b.traveler_phone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  WhatsApp {b.traveler_phone}
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-sm font-semibold text-foreground">{formatAzn(b.total_price)}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>{t(badge.labelKey)}</span>
        </div>
      </li>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <aside className="bg-navy text-white rounded-2xl p-3 lg:sticky lg:top-24">
          <p className="hidden lg:block px-3 pt-2 pb-4 text-sm font-semibold text-white/90 truncate">{operatorProfile.name}</p>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
            {NAV.map(({ id, labelKey, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigateSection(id)}
                aria-pressed={section === id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  section === id ? 'bg-white/10 text-white' : 'text-white/65 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} /> {t(labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {section === 'overview' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{t(greetingKey, { name: firstName })}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t('ui.dash.overviewSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateSection('tours')}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <PlusCircle size={16} /> {t('dashboard.addTour')}
                </button>
              </div>
              {(loadErrors.bookings || loadErrors.tours) && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle size={16} /> {t('analytics.loadError')}
                </p>
              )}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <Kpi label={t('ui.dash.tours')} value={dashboardLoading ? '—' : String(analytics?.summary.total_tours ?? tours.length)} onClick={() => navigateSection('tours')} />
                <Kpi label={t('ui.dash.bookings')} value={dashboardLoading ? '—' : String(analytics?.summary.total_bookings ?? bookings.length)} onClick={() => navigateSection('bookings')} />
                <Kpi label={t('ui.dash.bookingValue')} value={analytics ? formatAzn(analytics.summary.revenue) : '—'} onClick={() => navigateSection('earnings')} />
                <Kpi
                  label={t('dashboard.rating')}
                  value={analytics?.summary.avg_rating ? analytics.summary.avg_rating.toFixed(1) : '—'}
                  onClick={() => navigateSection('reviews')}
                />
              </div>

              <OperatorAnalytics onAddTour={() => navigateSection('tours')} />

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-foreground">{t('ui.dash.upcomingBookings')}</h2>
                  {upcoming.length > 5 && (
                    <button type="button" onClick={() => navigateSection('bookings')} className="flex items-center text-xs font-semibold text-primary">
                      {t('ui.home.viewAll')} <ChevronRight size={13} />
                    </button>
                  )}
                </div>
                {dashboardLoading ? (
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                ) : loadErrors.bookings ? (
                  <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><AlertCircle size={16} /> {t('analytics.loadError')}</p>
                ) : upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{t('ui.dash.noUpcoming')}</p>
                ) : (
                  <ul className="divide-y divide-border">{upcoming.slice(0, 5).map(bookingRow)}</ul>
                )}
              </div>
            </div>
          )}

          {section === 'tours' && <OperatorPanelContent />}

          {section === 'bookings' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{t('ui.dash.bookings')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t('ui.dash.bookingsSubtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    {t('ui.dash.pendingCount', { count: dashboardLoading ? '—' : bookings.filter((booking) => booking.status === 'pending').length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScannerOpen((open) => !open)}
                    aria-expanded={scannerOpen}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
                  >
                    <ScanLine size={16} /> {t(scannerOpen ? 'ui.scan.hideScanner' : 'ui.scan.title')}
                  </button>
                </div>
              </div>
              {scannerOpen && token && <div className="mb-5"><TicketScanner token={token} /></div>}
              <div className="mb-4 flex gap-2 overflow-x-auto border-b border-border">
                {(['upcoming', 'past', 'cancelled'] as BookingFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setBookingFilter(filter)}
                    aria-pressed={bookingFilter === filter}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${bookingFilter === filter ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    {t(`ui.bookings.${filter}` as TranslationKey)}
                    <span className="ml-1.5 text-xs">{bookingGroups[filter].length}</span>
                  </button>
                ))}
              </div>
              {dashboardLoading ? (
                <div className="h-28 animate-pulse rounded-lg bg-muted" />
              ) : loadErrors.bookings ? (
                <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><AlertCircle size={16} /> {t('analytics.loadError')}</p>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t('ui.dash.noBookings')}</p>
              ) : visibleBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t('ui.bookings.emptyTab')}</p>
              ) : (
                <ul className="divide-y divide-border">{visibleBookings.map(bookingRow)}</ul>
              )}
            </div>
          )}

          {section === 'earnings' && <OperatorEarnings />}

          {section === 'reviews' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h1 className="text-xl font-bold text-foreground mb-4">{t('tourDetail.reviews')}</h1>
              {dashboardLoading ? (
                <div className="h-28 animate-pulse rounded-lg bg-muted" />
              ) : loadErrors.analytics ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle size={16} /> {t('analytics.loadError')}</p>
              ) : !analytics || analytics.tours.every((x) => x.review_count === 0) ? (
                <p className="text-sm text-muted-foreground">{t('tourDetail.noReviewsYet')}</p>
              ) : (
                <div className="space-y-5">
                  {analytics.tours
                    .filter((x) => x.review_count > 0)
                    .map((x) => (
                      <div key={x.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">
                            {titleFromI18n(x.title, x.title_i18n, locale)}
                            {x.location && <span className="font-normal text-muted-foreground"> · {placeName(x.location, locale)}</span>}
                          </p>
                          <span className="flex items-center gap-1 text-sm font-semibold shrink-0">
                            <Star size={14} className="fill-rating text-rating" /> {x.avg_rating?.toFixed(1)}
                            <span className="text-xs font-normal text-muted-foreground">({x.review_count})</span>
                          </span>
                        </div>
                        <ul className="mt-2 space-y-2">
                          {(reviewsByTour[x.id] ?? [])
                            .filter((r) => r.comment)
                            .map((r) => (
                              <li key={r.id} className="text-sm text-foreground/80 bg-muted rounded-lg px-3 py-2">
                                <span className="text-rating mr-1.5">{'★'.repeat(r.rating)}</span>
                                {r.comment}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {section === 'profile' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 max-w-2xl">
              <OperatorProfileForm />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
