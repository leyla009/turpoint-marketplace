'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, Ticket, CalendarPlus, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth, useRequireAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PageContainer from '../../components/PageContainer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function parseFirstStop(route: string | null): { time: string | null; text: string } | null {
  if (!route) return null;
  const firstLine = route
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)[0];
  if (!firstLine) return null;
  const match = firstLine.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(.+)$/);
  return match ? { time: match[1], text: match[2] } : { time: null, text: firstLine };
}

function downloadICS(booking: any, pickup: { time: string | null; text: string } | null) {
  const timeStr = pickup?.time ?? '09:00';
  const [hh, mm] = timeStr.split(':');
  const dateStr = (booking.tour.date as string).replace(/-/g, '');
  const dtStart = `${dateStr}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${booking.tour.title}`,
    `DTSTART:${dtStart}`,
    `LOCATION:${pickup?.text ?? booking.tour.location ?? ''}`,
    `DESCRIPTION:TurPoint ticket ${booking.ticket_code}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${booking.ticket_code}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ETicketPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { token } = useAuth();
  const { t } = useLanguage();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/bookings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? t('eTicket.notYours') : t('eTicket.notFound'));
        return r.json();
      })
      .then(setBooking)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }
  if (error || !booking) {
    return <div className="p-6 text-sm text-muted-foreground">{error || t('eTicket.notFound')}</div>;
  }

  const pickup = parseFirstStop(booking.tour.route);
  const isPending = booking.status === 'pending';

  return (
    <PageContainer maxWidth="max-w-2xl">
      <button
        onClick={() => router.push('/bookings')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('eTicket.myBookings')}
      </button>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-wide opacity-75">{t('eTicket.eTicketLabel')}</p>
            <p className="font-display font-bold">{booking.tour.title}</p>
          </div>
          <Ticket size={20} className="opacity-75" />
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{t('eTicket.operator')}</p>
              <p className="text-sm text-foreground">{booking.tour.operator_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{t('eTicket.dateTime')}</p>
              <p className="text-sm text-foreground">
                {booking.tour.date}
                {pickup?.time ? ` · ${pickup.time}` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{t('eTicket.pickup')}</p>
              <p className="text-sm text-foreground">{pickup?.text ?? booking.tour.location}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{t('eTicket.seats')}</p>
              <p className="text-sm text-foreground">{t('eTicket.seatsCount', { count: booking.seats })}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                {isPending ? t('eTicket.estimatedTotal') : t('eTicket.totalPaid')}
              </p>
              <p className="text-lg font-bold text-foreground">AZN{booking.total_price}</p>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 ${
                  isPending ? 'text-primary' : 'text-accent'
                }`}
              >
                {isPending ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                {isPending ? t('status.pending') : t('status.confirmed')}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-border">
              <QRCodeSVG value={booking.ticket_code} size={88} />
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-border px-5 py-3 flex items-center justify-between bg-background">
          <span className="text-xs text-muted-foreground">{t('eTicket.ticketCode')}</span>
          <span className="font-mono text-xs font-semibold text-foreground">{booking.ticket_code}</span>
        </div>
      </div>

      <button
        onClick={() => downloadICS(booking, pickup)}
        className="flex items-center justify-center gap-2 w-full bg-card border border-border text-foreground text-sm font-semibold rounded-xl py-2.5 mt-3 hover:bg-muted transition-colors"
      >
        <CalendarPlus size={15} /> {t('eTicket.addToCalendar')}
      </button>
    </PageContainer>
  );
}