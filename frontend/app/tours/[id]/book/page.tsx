'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Minus, Plus, CreditCard, CheckCircle2, Users, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth, useRequireAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import PageContainer from '../../../components/PageContainer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function BookTour() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { user, token } = useAuth();
  const { t } = useLanguage();

  const [tour, setTour] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [cardNumber, setCardNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then(setTour)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Fixed: this was calling GET /api/group-formations with no tour_id,
    // then treating the response as an array to .find() over. The real
    // endpoint requires tour_id and returns a single group object (or
    // null), never an array - so `group` was silently always null,
    // meaning the "confirmed/forming" banners above and the settled-price
    // preview never activated, even when a real group already existed.
    fetch(`${API_URL}/api/group-formations?tour_id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [id]);

  const previewPricePerPerson = (() => {
    if (!tour) return 0;
    if (group && (group.status === 'waiting' || group.status === 'forming')) {
      const projectedCount = group.current_participants + seats;
      return Math.round((group.total_cost / projectedCount) * 100) / 100;
    }
    if (group && group.status === 'confirmed') {
      return group.price_per_person;
    }
    if (!group) {
      const totalCost = tour.price * tour.min_participants;
      return Math.round((totalCost / seats) * 100) / 100;
    }
    return tour.discounted_price ?? tour.price;
  })();

  const total = previewPricePerPerson * seats;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cardNumber) {
      setError(t('booking.pleaseEnterPayment'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tour_id: Number(id),
          seats,
          payment: { card_number: cardNumber },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('booking.bookingFailed'));
        return;
      }
      setTicket(data);
    } catch {
      setError(t('booking.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('booking.loading')}</div>;
  }
  if (!tour?.id) {
    return <div className="p-6 text-sm text-muted-foreground">{t('booking.tourNotFound')}</div>;
  }

  if (ticket) {
    const isPending = ticket.status === 'pending';
    return (
      <PageContainer maxWidth="max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          {isPending ? (
            <Clock size={40} className="text-primary mx-auto mb-3" />
          ) : (
            <CheckCircle2 size={40} className="text-accent mx-auto mb-3" />
          )}
          <h1 className="text-lg font-bold text-foreground mb-1">
            {isPending ? t('booking.seatReserved') : t('booking.bookingConfirmed')}
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            {isPending ? t('booking.notChargedYet') : t('booking.eTicketBelow')}
          </p>

          <div className="bg-background border border-dashed border-border rounded-lg p-4 text-left space-y-2">
            <div className="flex justify-center pb-2">
              <div className="bg-white p-2 rounded-lg border border-border">
                <QRCodeSVG value={ticket.ticket_code} size={100} />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('booking.ticketCode')}</span>
              <span className="font-mono font-semibold text-primary">{ticket.ticket_code}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('booking.tour')}</span>
              <span className="font-medium text-foreground">{ticket.tour_title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('booking.seats')}</span>
              <span className="font-medium text-foreground">{ticket.seats}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isPending ? t('booking.estimatedTotal') : t('booking.totalPaid')}
              </span>
              <span className="font-semibold text-foreground">AZN{ticket.total_price}</span>
            </div>
            {isPending && (
              <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                {t('booking.mayDropFurther')}
              </p>
            )}
          </div>

          <button
            onClick={() => router.push('/')}
            className="mt-5 w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5"
          >
            {t('booking.backToTours')}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="max-w-2xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> {t('booking.back')}
      </button>

      <h1 className="text-xl font-bold text-foreground mb-1">{tour.title}</h1>
      <p className="text-sm text-muted-foreground mb-2">
        {tour.location} · {tour.date}
      </p>
      {group && group.status === 'confirmed' && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-4">
          <Users size={13} /> {t('booking.groupConfirmedMsg')}
        </p>
      )}
      {group && (group.status === 'waiting' || group.status === 'forming') && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-4">
          <Users size={13} />{' '}
          {t('booking.groupJoiningMsg', { current: group.current_participants, min: group.min_participants })}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{t('booking.seatsLabel')}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground"
            >
              <Minus size={14} />
            </button>
            <span className="w-5 text-center font-semibold text-foreground">{seats}</span>
            <button
              type="button"
              onClick={() => setSeats((s) => Math.min(tour.max_participants ?? 10, s + 1))}
              className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-foreground">{t('booking.bookingAs')}</p>
          <p className="text-sm text-muted-foreground">
            {user?.name} · {user?.email}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <CreditCard size={14} /> {t('booking.paymentSimulated')}
          </p>
          <input
            type="text"
            placeholder={t('booking.cardPlaceholder')}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background outline-none"
          />
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              AZN{previewPricePerPerson} × {seats}
            </span>
            <span>AZN{total}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
            <span>{t('booking.total')}</span>
            <span>AZN{total}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-3 disabled:opacity-50"
        >
          {submitting
            ? t('booking.processing')
            : group && group.current_participants + seats >= group.min_participants
            ? t('booking.confirmBooking', { total })
            : t('booking.reserveSeat', { total })}
        </button>
      </form>
    </PageContainer>
  );
}