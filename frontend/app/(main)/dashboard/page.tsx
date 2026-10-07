'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, Ticket, Zap, BarChart3, Star, Store, ChevronRight, AlertCircle,
} from 'lucide-react';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import OperatorPanelContent from '@/app/components/OperatorPanelContent';
import OperatorAnalytics from '@/app/components/OperatorAnalytics';
import OperatorProfileForm from '@/app/components/OperatorProfileForm';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { titleFromI18n, placeName } from '@/app/lib/tourContent';
import type { TranslationKey } from '@/app/lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Section = 'overview' | 'tours' | 'bookings' | 'deals' | 'analytics' | 'reviews' | 'profile';

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
  { id: 'deals', labelKey: 'ui.dash.deals', Icon: Zap },
  { id: 'analytics', labelKey: 'analytics.title', Icon: BarChart3 },
  { id: 'reviews', labelKey: 'tourDetail.reviews', Icon: Star },
  { id: 'profile', labelKey: 'dashboard.profileButton', Icon: Store },
];

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

// Bookings per month as a single-series line: 2px brand line, faint area,
// recessive grid, crosshair + tooltip on hover. One series, so the card
// title names it and there is no legend; a visually-hidden table carries
// the same numbers for screen readers.
function ActivityChart({ data }: { data: { month: string; bookings: number }[] }) {
  const { t, locale } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const W = 900;
  const H = 260;
  const pad = { l: 28, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...data.map((d) => d.bookings));
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / niceMax);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.bookings)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const label = (m: string) => formatDate(`${m}-01`, locale, { month: 'short' });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t('ui.dash.bookingActivity')}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = Math.round(niceMax * f);
          return (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
                {v}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={d.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
            {label(d.month)}
          </text>
        ))}
        <path d={area} fill="var(--primary)" opacity={0.08} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].bookings)} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
          </>
        )}
        {data.map((d, i) => (
          <rect
            key={d.month}
            x={x(i) - (W - pad.l - pad.r) / Math.max(1, data.length - 1) / 2}
            y={0}
            width={(W - pad.l - pad.r) / Math.max(1, data.length - 1)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-navy text-white text-xs rounded-md px-2.5 py-1.5 shadow-lift whitespace-nowrap"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].bookings) / H) * 100}%`, marginTop: -10 }}
        >
          <span className="font-semibold">{label(data[hover].month)}</span>: {t('ui.dash.bookingsCount', { count: data[hover].bookings })}
        </div>
      )}
      <table className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <th>{label(d.month)}</th>
              <td>{d.bookings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const { token, user, operatorProfile } = useAuth();
  const { t, locale } = useLanguage();
  const [section, setSection] = useState<Section>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [reviewsByTour, setReviewsByTour] = useState<Record<number, any[]>>({});

  useEffect(() => {
    if (!token || !operatorProfile) return;
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    fetch(`${API_URL}/api/operators/me/analytics`, auth)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setAnalytics)
      .catch(() => setLoadError(true));
    fetch(`${API_URL}/api/bookings/mine`, auth)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch(`${API_URL}/api/tours`)
      .then((r) => (r.ok ? r.json() : []))
      .then((all) => setTours(Array.isArray(all) ? all.filter((x: any) => x.operator_id === operatorProfile.id) : []))
      .catch(() => {});
  }, [token, operatorProfile, section]);

  // Reviews section: comments for the operator's reviewed tours.
  useEffect(() => {
    if (section !== 'reviews' || !analytics) return;
    analytics.tours
      .filter((x) => x.review_count > 0)
      .slice(0, 12)
      .forEach((x) => {
        fetch(`${API_URL}/api/reviews?tour_id=${x.id}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((list) => setReviewsByTour((prev) => ({ ...prev, [x.id]: Array.isArray(list) ? list : [] })))
          .catch(() => {});
      });
  }, [section, analytics]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'cancelled' && !isPastDate(b.tour_date))
        .sort((a, b) => String(a.tour_date).localeCompare(String(b.tour_date))),
    [bookings]
  );
  const dealTours = useMemo(() => tours.filter((x) => x.active_deal), [tours]);

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
                onClick={() => setSection(id)}
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
              <h1 className="text-2xl font-bold text-foreground">{t(greetingKey, { name: firstName })}</h1>
              {loadError && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle size={16} /> {t('analytics.loadError')}
                </p>
              )}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <Kpi label={t('ui.dash.tours')} value={String(analytics?.summary.total_tours ?? tours.length)} />
                <Kpi label={t('ui.dash.bookings')} value={String(analytics?.summary.total_bookings ?? '—')} />
                <Kpi label={t('ui.dash.bookingValue')} value={analytics ? formatAzn(analytics.summary.revenue) : '—'} />
                <Kpi
                  label={t('dashboard.rating')}
                  value={analytics?.summary.avg_rating ? analytics.summary.avg_rating.toFixed(1) : '—'}
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground">{t('ui.dash.bookingActivity')}</h2>
                  <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
                    {t('ui.dash.last6Months')}
                  </span>
                </div>
                {analytics ? (
                  <ActivityChart data={analytics.monthly} />
                ) : (
                  <div className="h-48 bg-muted rounded-lg animate-pulse" />
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold text-foreground">{t('ui.dash.upcomingBookings')}</h2>
                  {upcoming.length > 5 && (
                    <button onClick={() => setSection('bookings')} className="flex items-center text-xs font-semibold text-primary">
                      {t('ui.home.viewAll')} <ChevronRight size={13} />
                    </button>
                  )}
                </div>
                {upcoming.length === 0 ? (
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
              <h1 className="text-xl font-bold text-foreground mb-2">{t('ui.dash.bookings')}</h1>
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t('ui.dash.noBookings')}</p>
              ) : (
                <ul className="divide-y divide-border">{bookings.map(bookingRow)}</ul>
              )}
            </div>
          )}

          {section === 'deals' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h1 className="text-xl font-bold text-foreground mb-1">{t('ui.dash.deals')}</h1>
              <p className="text-sm text-muted-foreground mb-4">{t('ui.dash.dealsHint')}</p>
              {dealTours.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t('ui.dash.noDeals')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {dealTours.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{titleFromI18n(x.title, x.title_i18n, locale)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('ui.dash.expires', { date: formatDate(x.active_deal.expires_at, locale) })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white bg-warning rounded-md px-2 py-0.5">
                          −{x.active_deal.discount_percent}%
                        </span>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          <span className="text-xs text-muted-foreground line-through mr-1">{formatAzn(x.price)}</span>
                          {formatAzn(x.discounted_price)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setSection('tours')}
                className="mt-4 text-sm font-semibold text-primary flex items-center gap-1"
              >
                <Zap size={14} /> {t('dashboard.createDeal')}
              </button>
            </div>
          )}

          {section === 'analytics' && <OperatorAnalytics />}

          {section === 'reviews' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h1 className="text-xl font-bold text-foreground mb-4">{t('tourDetail.reviews')}</h1>
              {!analytics || analytics.tours.every((x) => x.review_count === 0) ? (
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
