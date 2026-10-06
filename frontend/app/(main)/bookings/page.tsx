'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Calendar, Users, AlertCircle, FileDown, Ticket, Loader2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { CategoryMotif } from '@/app/components/TourCard';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { placeName, titleFromI18n } from '@/app/lib/tourContent';
import { photoSrc } from '@/app/lib/photo';
import type { TranslationKey } from '@/app/lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Tab = 'upcoming' | 'past' | 'cancelled';

const STATUS_BADGE: Record<string, { className: string; labelKey: TranslationKey }> = {
  pending: { className: 'text-warning bg-warning/10', labelKey: 'status.pending' },
  confirmed: { className: 'text-success bg-success/10', labelKey: 'status.confirmed' },
  cancelled: { className: 'text-muted-foreground bg-muted', labelKey: 'status.cancelled' },
};

export default function MyBookingsPage() {
  const { loading: authLoading } = useRequireAuth();
  const { token } = useAuth();
  const { t, locale } = useLanguage();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    setError(false);
    fetch(`${API_URL}/api/bookings/my-trips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('request failed');
        return r.json();
      })
      .then(setBookings)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  const grouped = useMemo(() => {
    const out: Record<Tab, any[]> = { upcoming: [], past: [], cancelled: [] };
    bookings.forEach((b) => {
      if (b.status === 'cancelled') out.cancelled.push(b);
      else if (isPastDate(b.tour_date)) out.past.push(b);
      else out.upcoming.push(b);
    });
    out.upcoming.sort((a, b) => String(a.tour_date).localeCompare(String(b.tour_date)));
    return out;
  }, [bookings]);

  async function downloadPdf(b: any) {
    setPdfBusyId(b.id);
    try {
      const res = await fetch(`${API_URL}/api/bookings/${b.id}/ticket.pdf?lang=${locale}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('pdf');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${b.ticket_code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* the detail page shows the full error state */
    } finally {
      setPdfBusyId(null);
    }
  }

  if (authLoading || loading) {
    return <div className="max-w-4xl mx-auto p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  const list = grouped[tab];
  const tabs: { id: Tab; labelKey: TranslationKey }[] = [
    { id: 'upcoming', labelKey: 'ui.bookings.upcoming' },
    { id: 'past', labelKey: 'ui.bookings.past' },
    { id: 'cancelled', labelKey: 'ui.bookings.cancelled' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 md:pb-10">
      <h1 className="text-2xl font-bold text-foreground">{t('myBookings.title')}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{t('myBookings.subtitle')}</p>

      <div className="flex border-b border-border mb-5">
        {tabs.map(({ id, labelKey }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-primary text-primary' : 'border-transparent text-foreground/65 hover:text-primary'
            }`}
          >
            {t(labelKey)}
            <span className="ml-1.5 text-xs text-muted-foreground">{grouped[id].length}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <AlertCircle size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('myBookings.couldntLoad')}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Ticket size={26} className="text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            {tab === 'upcoming' ? t('myBookings.notBookedYet') : t('ui.bookings.emptyTab')}
          </p>
          <Link href="/tours" className="inline-block bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg">
            {t('myBookings.browseTours')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((b) => {
            const badge = STATUS_BADGE[b.status] ?? STATUS_BADGE.confirmed;
            const title = titleFromI18n(b.tour_title, b.tour_title_i18n, locale);
            const waiting = b.status === 'pending' && b.group_min;
            return (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/tours/${b.tour_id}`}
                  className="relative w-full sm:w-40 aspect-[16/10] sm:aspect-[4/3] rounded-lg overflow-hidden bg-muted shrink-0"
                >
                  {b.tour_photo_url ? (
                    <img src={photoSrc(b.tour_photo_url) ?? ''} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <CategoryMotif category={null} />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold text-foreground leading-snug">{title}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.className}`}>
                      ● {t(badge.labelKey)}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Calendar size={14} /> {formatDate(b.tour_date, locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="flex items-center gap-1.5">
                      {b.tour_location && (
                        <>
                          <MapPin size={14} /> {placeName(b.tour_location, locale)} <span className="mx-1">·</span>
                        </>
                      )}
                      <Users size={14} /> {t('ui.book.travelersCount', { count: b.seats })}
                    </p>
                    <p className="text-xs">
                      {t('ui.bookings.ticket')}: <span className="font-mono text-foreground">{b.ticket_code}</span>
                      <span className="mx-2">·</span>
                      <span className="font-semibold text-foreground">{formatAzn(b.total_price)}</span>
                    </p>
                    {waiting && (
                      <p className="text-xs text-warning font-medium">
                        {t('ui.bookings.waitingGroup', { current: b.group_current ?? 0, min: b.group_min })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Link
                      href={`/bookings/${b.id}`}
                      className="text-sm font-semibold text-primary border border-primary rounded-lg px-4 py-1.5 hover:bg-primary/5 transition-colors"
                    >
                      {b.status === 'cancelled' ? t('ui.bookings.viewDetails') : t('ui.bookings.viewTicket')}
                    </Link>
                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => downloadPdf(b)}
                        disabled={pdfBusyId === b.id}
                        className="flex items-center gap-1.5 text-sm font-semibold text-foreground border border-border rounded-lg px-4 py-1.5 hover:border-primary/40 disabled:opacity-60"
                      >
                        {pdfBusyId === b.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                        {t('eTicket.downloadPdf')}
                      </button>
                    )}
                    {tab === 'upcoming' && (
                      <Link
                        href={`/bookings/${b.id}#cancel`}
                        className="text-sm font-medium text-muted-foreground hover:text-danger px-2 py-1.5"
                      >
                        {t('ui.bookings.cancelBooking')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
