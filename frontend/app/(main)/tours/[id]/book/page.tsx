'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Minus, Plus, CreditCard, CheckCircle2, Users, Clock, FileDown, Calendar, Check, Lock, UserPlus, Info,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth, useRequireAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import GroupInviteCard from '@/app/components/GroupInviteCard';
import { CategoryMotif } from '@/app/components/TourCard';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { tourTitle, placeName, titleFromI18n } from '@/app/lib/tourContent';
import { photoSrc } from '@/app/lib/photo';
import { notifyChanged } from '@/app/lib/notifications';
import type { TranslationKey } from '@/app/lib/translations';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Step = 1 | 2 | 3;

function Stepper({ step }: { step: Step }) {
  const { t } = useLanguage();
  const steps: TranslationKey[] = ['ui.book.stepDetails', 'ui.book.stepPayment', 'ui.book.stepConfirmation'];
  return (
    <ol className="flex items-center mb-6">
      {steps.map((key, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const current = step === n;
        return (
          <li key={key} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done || current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? <Check size={15} /> : n}
              </span>
              <span className={`text-xs font-medium ${current ? 'text-foreground' : 'text-muted-foreground'}`}>{t(key)}</span>
            </div>
            {i < steps.length - 1 && (
              <span className={`flex-1 h-0.5 mx-2 -mt-5 rounded ${step > n ? 'bg-primary' : 'bg-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const inputClass =
  'w-full text-sm bg-card border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary placeholder:text-muted-foreground/70';

export default function BookTour() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();
  const { user, token } = useAuth();
  const { t, locale } = useLanguage();

  const [tour, setTour] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [seats, setSeats] = useState(1);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then(setTour)
      .finally(() => setLoading(false));
    fetch(`${API_URL}/api/group-formations?tour_id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [id]);

  // Flat listed price per person (matches bookings.js).
  const pricePerPerson = tour ? tour.discounted_price ?? tour.price : 0;
  const total = pricePerPerson * seats;
  const maxSeats = tour?.max_participants ?? 10;

  const onCardNumber = (v: string) =>
    setCardNumber(v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '));
  const onExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cardNumber) {
      setError(t('booking.pleaseEnterPayment'));
      return;
    }
    if (cardNumber.replace(/\s/g, '').length !== 16 || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvc)) {
      setError(t('booking.invalidCard'));
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
          payment: { card_number: cardNumber.replace(/\s/g, ''), expiry, cvc },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 402 ? data.error || t('booking.cardDeclined') : data.error || t('booking.bookingFailed'));
        return;
      }
      setTicket(data);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      notifyChanged();
    } catch {
      setError(t('booking.couldntReachBackend'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    setPdfError('');
    try {
      const res = await fetch(`${API_URL}/api/bookings/${ticket.id}/ticket.pdf?lang=${locale}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ticket.ticket_code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(t('eTicket.pdfFailed'));
    } finally {
      setPdfBusy(false);
    }
  };

  if (authLoading || loading) {
    return <div className="max-w-5xl mx-auto p-6 text-sm text-muted-foreground">{t('booking.loading')}</div>;
  }
  if (!tour?.id) {
    return <div className="max-w-5xl mx-auto p-6 text-sm text-muted-foreground">{t('booking.tourNotFound')}</div>;
  }

  const title = tourTitle(tour, locale);

  if (!ticket && isPastDate(tour.date)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Clock size={40} className="text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground mb-1">{title}</h1>
          <p className="text-sm text-muted-foreground mb-5">{t('tourDetail.tourEnded')}</p>
          <button
            onClick={() => router.push('/tours')}
            className="w-full bg-primary text-primary-foreground text-sm font-semibold rounded-lg py-2.5"
          >
            {t('booking.backToTours')}
          </button>
        </div>
      </div>
    );
  }

  const summary = (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-bold text-foreground mb-4">{t('ui.book.summary')}</h2>
      <div className="flex gap-3">
        <div className="relative w-24 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
          {tour.photo_url ? (
            <img src={photoSrc(tour.photo_url) ?? ''} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <CategoryMotif category={tour.category} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar size={12} /> {t('tourDetail.duration', { count: tour.duration_days })} · {formatDate(tour.date, locale)}
          </p>
          {tour.location && <p className="text-xs text-muted-foreground mt-0.5">{placeName(tour.location, locale)}</p>}
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Users size={12} /> {t('ui.book.travelersCount', { count: seats })}
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>
            {formatAzn(pricePerPerson)} × {seats}
          </span>
          <span>{formatAzn(total)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-foreground pt-1">
          <span>{t('booking.total')}</span>
          <span className="text-primary">{formatAzn(total)}</span>
        </div>
      </div>
      {group && (group.status === 'waiting' || group.status === 'forming') && (
        <p className="flex items-start gap-1.5 text-xs text-foreground/75 bg-warning/10 rounded-lg px-3 py-2 mt-4">
          <Users size={13} className="text-warning shrink-0 mt-0.5" />
          {t('booking.groupJoiningMsg', { current: group.current_participants, min: group.min_participants })}
        </p>
      )}
      {group && group.status === 'confirmed' && (
        <p className="flex items-center gap-1.5 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-4">
          <CheckCircle2 size={13} /> {t('booking.groupConfirmedMsg')}
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
      {step < 3 && (
        <button
          onClick={() => (step === 2 ? setStep(1) : router.back())}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ChevronLeft size={16} /> {t('booking.back')}
        </button>
      )}

      <div className="max-w-xl">
        <Stepper step={step} />
      </div>

      {step === 3 && ticket ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              {ticket.status === 'pending' ? (
                <Clock size={36} className="text-warning shrink-0" />
              ) : (
                <CheckCircle2 size={36} className="text-success shrink-0" />
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {ticket.status === 'pending' ? t('booking.seatReserved') : t('booking.bookingConfirmed')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {ticket.status === 'pending' ? t('booking.notChargedYet') : t('booking.eTicketBelow')}
                </p>
              </div>
            </div>

            <div className="border border-dashed border-border rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-center">
              <div className="bg-white p-2 rounded-lg border border-border shrink-0">
                <QRCodeSVG value={ticket.ticket_code} size={112} />
              </div>
              <dl className="flex-1 w-full space-y-2 text-sm">
                {(
                  [
                    ['booking.ticketCode', <span key="c" className="font-mono font-semibold text-primary">{ticket.ticket_code}</span>],
                    ['booking.tour', titleFromI18n(ticket.tour_title, ticket.tour_title_i18n, locale)],
                    ['ui.book.date', formatDate(tour.date, locale)],
                    ['booking.seats', ticket.seats],
                    [ticket.status === 'pending' ? 'booking.estimatedTotal' : 'booking.totalPaid', formatAzn(ticket.total_price)],
                  ] as [TranslationKey, React.ReactNode][]
                ).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t(key)}</dt>
                    <dd className="font-medium text-foreground text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60"
              >
                <FileDown size={15} /> {t('eTicket.downloadPdf')}
              </button>
              <button
                onClick={() => router.push(`/bookings/${ticket.id}`)}
                className="border border-border text-foreground text-sm font-semibold rounded-lg py-2.5 hover:border-primary/40"
              >
                {t('booking.viewMyBooking')}
              </button>
              <button
                onClick={() => router.push('/tours')}
                className="border border-border text-foreground text-sm font-semibold rounded-lg py-2.5 hover:border-primary/40"
              >
                {t('booking.backToTours')}
              </button>
            </div>
            {pdfError && <p className="text-xs text-danger mt-2">{pdfError}</p>}
          </div>

          <GroupInviteCard
            tourId={tour.id}
            tourTitle={title}
            minParticipants={tour.min_participants}
            maxParticipants={tour.max_participants}
            refreshKey={ticket.id}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="space-y-4 order-2 lg:order-1">
            {step === 1 && (
              <>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h2 className="text-sm font-bold text-foreground mb-4">{t('ui.book.travelerDetails')}</h2>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('ui.book.leadTraveler')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs text-muted-foreground mb-1">{t('login.fullName')}</span>
                      <input value={user?.name ?? ''} readOnly className={`${inputClass} bg-muted`} />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-muted-foreground mb-1">{t('login.email')}</span>
                      <input value={user?.email ?? ''} readOnly className={`${inputClass} bg-muted`} />
                    </label>
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-5 border-t border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('ui.book.travelers')}</p>
                      <p className="text-xs text-muted-foreground">{t('ui.book.maxSeats', { count: maxSeats })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSeats((s) => Math.max(1, s - 1))}
                        disabled={seats <= 1}
                        aria-label="-"
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-semibold text-foreground">{seats}</span>
                      <button
                        type="button"
                        onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                        disabled={seats >= maxSeats}
                        aria-label="+"
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                    disabled={seats >= maxSeats}
                    className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary disabled:opacity-40"
                  >
                    <UserPlus size={15} /> {t('ui.book.addTraveler')}
                  </button>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h2 className="text-sm font-bold text-foreground mb-2">{t('booking.refundPolicyTitle')}</h2>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    <li>{t('booking.refundTier7')}</li>
                    <li>{t('booking.refundTier3')}</li>
                    <li>{t('booking.refundTier0')}</li>
                  </ul>
                  <p className="text-xs text-muted-foreground pt-2">{t('booking.refundPolicyNote')}</p>
                </div>

                <button
                  onClick={() => {
                    setStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold rounded-lg py-3 transition-colors"
                >
                  {t('ui.book.continueToPayment')}
                </button>
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <CreditCard size={16} /> {t('ui.book.paymentMethod')}
                    </h2>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Lock size={11} /> {t('ui.book.secure')}
                    </span>
                  </div>
                  <label className="block">
                    <span className="block text-xs text-muted-foreground mb-1">{t('ui.book.cardNumber')}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => onCardNumber(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs text-muted-foreground mb-1">{t('ui.book.expiry')}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t('booking.expiryPlaceholder')}
                        value={expiry}
                        onChange={(e) => onExpiry(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-muted-foreground mb-1">CVC</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                    <Info size={13} className="shrink-0 mt-0.5" /> {t('booking.testCardHint')}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{t('booking.total')}</span>
                  <span className="text-xl font-bold text-primary">{formatAzn(total)}</span>
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold rounded-lg py-3 disabled:opacity-50 transition-colors"
                >
                  {submitting
                    ? t('booking.processing')
                    : (group?.status === 'confirmed' ? Infinity : group?.current_participants ?? 0) + seats <
                      (group?.min_participants ?? tour.min_participants ?? 1)
                    ? t('booking.reserveSeat', { total })
                    : t('ui.book.completeBooking')}
                </button>
              </form>
            )}
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-24">{summary}</div>
        </div>
      )}
    </div>
  );
}
