'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, Ticket, CalendarPlus, Clock, CheckCircle2, FileDown } from 'lucide-react';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import PageContainer from '@/app/components/PageContainer';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { titleFromI18n, placeName } from '@/app/lib/tourContent';

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

function downloadICS(booking: any, pickup: { time: string | null; text: string } | null, title: string) {
  const timeStr = pickup?.time ?? '09:00';
  const [hh, mm] = timeStr.split(':');
  const dateStr = (booking.tour.date as string).replace(/-/g, '');
  const dtStart = `${dateStr}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
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
  const { t, locale } = useLanguage();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

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

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetch(`${API_URL}/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || t('eTicket.cancelFailed'));
        return;
      }
      setBooking((prev: any) => ({
        ...prev,
        status: data.status,
        payment_status: data.payment_status,
        refund_amount: data.refund_amount,
        refund_percent: data.refund_percent,
        refund_preview: null,
        cancel_refund: data.refund,
      }));
      setConfirmingCancel(false);
    } catch {
      setCancelError(t('eTicket.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  // The PDF endpoint needs the Authorization header, so a plain <a href> can't
  // reach it: fetch it as a blob and trigger the download from memory.
  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    setPdfError('');
    try {
      const res = await fetch(`${API_URL}/api/bookings/${id}/ticket.pdf?lang=${locale}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${booking.ticket_code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(t('eTicket.pdfFailed'));
    } finally {
      setPdfBusy(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }
  if (error || !booking) {
    return <div className="p-6 text-sm text-muted-foreground">{error || t('eTicket.notFound')}</div>;
  }

  const pickup = parseFirstStop(booking.tour.route);
  const ticketTitle = titleFromI18n(booking.tour.title, booking.tour.title_i18n, locale);
  const isPending = booking.status === 'pending';
  const isCancelled = booking.status === 'cancelled';

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
            <p className="font-display font-bold">{ticketTitle}</p>
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
                {formatDate(booking.tour.date, locale)}
                {pickup?.time ? ` · ${pickup.time}` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">{t('eTicket.pickup')}</p>
              <p className="text-sm text-foreground">{pickup?.text ?? placeName(booking.tour.location, locale)}</p>
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
              <p className="text-lg font-bold text-foreground">{formatAzn(booking.total_price)}</p>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 ${
                  isCancelled ? 'text-red-600' : isPending ? 'text-primary' : 'text-accent'
                }`}
              >
                {isPending ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                {isCancelled ? t('status.cancelled') : isPending ? t('status.pending') : t('status.confirmed')}
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

      {booking.card_last4 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          {t('eTicket.paidWith')} {booking.card_brand === 'visa' ? 'Visa' : booking.card_brand === 'mastercard' ? 'Mastercard' : 'Card'} •••• {booking.card_last4}
        </p>
      )}

      {isCancelled && booking.payment_status && (
        <div className="bg-card border border-border rounded-xl p-4 mt-3 text-sm">
          {booking.payment_status === 'voided' ? (
            <p className="text-muted-foreground">{t('eTicket.holdReleased')}</p>
          ) : Number(booking.refund_amount) > 0 ? (
            <>
              <p className="font-semibold text-accent">{t('eTicket.refundedAmount')}: {formatAzn(booking.refund_amount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('eTicket.refundedOf', { amount: booking.refund_amount, percent: booking.refund_percent ?? '' })}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{t('eTicket.noRefundIssued')}</p>
          )}
        </div>
      )}

      <button
        onClick={handleDownloadPdf}
        disabled={pdfBusy}
        className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-sm font-semibold rounded-xl py-2.5 mt-3 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        <FileDown size={15} /> {t('eTicket.downloadPdf')}
      </button>
      {pdfError && <p className="text-xs text-red-600 mt-2 text-center">{pdfError}</p>}

      <button
        onClick={() => downloadICS(booking, pickup, ticketTitle)}
        className="flex items-center justify-center gap-2 w-full bg-card border border-border text-foreground text-sm font-semibold rounded-xl py-2.5 mt-3 hover:bg-muted transition-colors"
      >
        <CalendarPlus size={15} /> {t('eTicket.addToCalendar')}
      </button>

      {booking.status !== 'cancelled' && !isPastDate(booking.tour?.date) && (
        confirmingCancel ? (
          <div className="border border-red-200 rounded-xl p-4 mt-2 bg-red-50/50 space-y-3">
            <p className="text-sm font-semibold text-foreground">{t('eTicket.cancelConfirm')}</p>
            {booking.refund_preview && (
              <p className="text-xs text-muted-foreground">
                {isPending || booking.payment_status === 'authorized'
                  ? t('eTicket.refundNotCharged')
                  : booking.refund_preview.percent === 100
                  ? t('eTicket.refundFull', { amount: booking.refund_preview.amount })
                  : booking.refund_preview.percent > 0
                  ? t('eTicket.refundPartial', {
                      amount: booking.refund_preview.amount,
                      percent: booking.refund_preview.percent,
                      retained: booking.refund_preview.retained,
                    })
                  : t('eTicket.refundNone', {
                      days: booking.refund_preview.days_before,
                      retained: booking.refund_preview.retained,
                    })}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                className="flex-1 text-sm font-semibold border border-border rounded-lg py-2 hover:bg-muted transition-colors"
              >
                {t('eTicket.keepBooking')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 text-sm font-semibold text-white bg-red-600 rounded-lg py-2 hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {cancelling ? t('eTicket.cancelling') : t('eTicket.confirmCancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="flex items-center justify-center w-full text-sm font-semibold text-red-600 border border-red-200 rounded-xl py-2.5 mt-2 hover:bg-red-50 transition-colors"
          >
            {t('eTicket.cancelBooking')}
          </button>
        )
      )}
      {cancelError && <p className="text-xs text-red-600 mt-2 text-center">{cancelError}</p>}
    </PageContainer>
  );
}