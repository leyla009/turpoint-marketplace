'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Star, ListChecks, Ticket, ArrowRight, Trash2, Pencil, Zap, AlertCircle } from 'lucide-react';
import { useAuth, useRequireAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const { token, operatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [myTours, setMyTours] = useState<any[]>([]);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  const [dealFormTourId, setDealFormTourId] = useState<number | null>(null);
  const [dealDiscount, setDealDiscount] = useState('20');
  const [dealExpiresAt, setDealExpiresAt] = useState('');
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealError, setDealError] = useState('');

  function loadTours() {
    if (!operatorProfile) return;
    fetch(`${API_URL}/api/tours`)
      .then((r) => r.json())
      .then((allTours) => setMyTours(allTours.filter((t: any) => t.operator_id === operatorProfile.id)));
  }

  useEffect(() => {
    if (!operatorProfile) {
      setLoading(false);
      return;
    }
    setLoadError(false);
    Promise.all([
      fetch(`${API_URL}/api/tours`).then((r) => {
        if (!r.ok) throw new Error('request failed');
        return r.json();
      }),
      fetch(`${API_URL}/api/bookings/mine`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([allTours, bookings]) => {
        setMyTours(allTours.filter((t: any) => t.operator_id === operatorProfile.id));
        setBookingCount(bookings.length);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [operatorProfile, token]);

  async function handleDelete(tourId: number, title: string, force = false) {
    if (!force && !window.confirm(t('dashboard.deleteConfirm', { title }))) return;
    setDeleteError(null);
    setDeletingId(tourId);
    try {
      const res = await fetch(`${API_URL}/api/tours/${tourId}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 409 && data.booking_count && !force) {
        const proceed = window.confirm(`${data.error}\n\n${t('dashboard.deleteAnyway')}`);
        if (proceed) return handleDelete(tourId, title, true);
        return;
      }
      if (!res.ok) {
        setDeleteError({ id: tourId, message: data.error ?? t('dashboard.couldntDeleteTour') });
        return;
      }
      showToast(t('dashboard.tourDeletedToast', { title }));
      loadTours();
    } catch {
      setDeleteError({ id: tourId, message: t('dashboard.couldntReachBackend') });
    } finally {
      setDeletingId(null);
    }
  }

  function openDealForm(tourId: number) {
    setDealError('');
    setDealDiscount('20');
    setDealExpiresAt('');
    setDealFormTourId(dealFormTourId === tourId ? null : tourId);
  }

  async function handleCreateDeal(e: React.FormEvent, tourId: number) {
    e.preventDefault();
    setDealError('');
    const discount = Number(dealDiscount);
    if (!(discount > 0 && discount < 100)) {
      setDealError(t('dashboard.discountRangeError'));
      return;
    }
    if (!dealExpiresAt) {
      setDealError(t('dashboard.expiryRequiredError'));
      return;
    }
    setDealSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tour_id: tourId,
          discount_percent: discount,
          expires_at: new Date(dealExpiresAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDealError(data.error ?? t('dashboard.couldntCreateDeal'));
        return;
      }
      showToast(t('dashboard.dealCreatedToast'));
      setDealFormTourId(null);
      loadTours();
    } catch {
      setDealError(t('dashboard.couldntReachBackend'));
    } finally {
      setDealSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>;
  }

  if (!operatorProfile) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-20">
        <ListChecks size={32} className="text-muted-foreground mb-3" />
        <h1 className="text-lg font-semibold text-foreground mb-1">{t('dashboard.noProfileYet')}</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-4">{t('dashboard.createProfileHint')}</p>
        <Link
          href="/dashboard/profile"
          className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl"
        >
          {t('dashboard.becomeOperator')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 max-w-3xl mx-auto pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{operatorProfile.name}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Link
          href="/dashboard/new-tour"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl"
        >
          <PlusCircle size={15} /> {t('dashboard.addTour')}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{myTours.length}</p>
          <p className="text-[11px] text-muted-foreground">{t('dashboard.activeTours')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
            <Star size={16} className="text-primary" fill="currentColor" />
            {operatorProfile.rating ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground">{t('dashboard.rating')}</p>
        </div>
        <Link href="/dashboard/bookings" className="bg-card border border-border rounded-xl p-3 text-center hover:border-primary/40">
          <p className="text-2xl font-bold text-foreground">{bookingCount ?? 0}</p>
          <p className="text-[11px] text-muted-foreground">{t('dashboard.bookingsStat')}</p>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground">{t('dashboard.yourTours')}</h2>
        <Link href="/dashboard/bookings" className="flex items-center gap-1 text-xs text-accent font-semibold">
          {t('dashboard.viewBookings')} <ArrowRight size={12} />
        </Link>
      </div>

      {loadError ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <AlertCircle size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('dashboard.couldntLoadTours')}</p>
        </div>
      ) : myTours.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center">
          <Ticket size={26} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{t('dashboard.noToursYet')}</p>
          <Link href="/dashboard/new-tour" className="text-sm text-primary font-semibold">
            {t('dashboard.addFirstTour')}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {myTours.map((tour) => (
            <div key={tour.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{tour.title}</p>
                    {tour.active_deal && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-accent-foreground bg-accent px-1.5 py-0.5 rounded-full shrink-0">
                        <Zap size={9} /> -{tour.active_deal.discount_percent}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tour.location} · {tour.date} · AZN{tour.price}{t('tourCard.perPerson')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {t('dashboard.minMax', { min: tour.min_participants, max: tour.max_participants })}
                  </span>
                  <Link
                    href={`/dashboard/edit-tour/${tour.id}`}
                    title={t('dashboard.editTour')}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => openDealForm(tour.id)}
                    title={t('dashboard.createDeal')}
                    disabled={!!tour.active_deal}
                    className="text-muted-foreground hover:text-accent disabled:opacity-30 p-1"
                  >
                    <Zap size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(tour.id, tour.title)}
                    disabled={deletingId === tour.id}
                    title={t('dashboard.deleteTour')}
                    className="text-muted-foreground hover:text-red-600 disabled:opacity-40 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {deleteError?.id === tour.id && (
                <p className="text-[11px] text-red-600 mt-2 pt-2 border-t border-border">{deleteError.message}</p>
              )}
              {dealFormTourId === tour.id && (
                <form
                  onSubmit={(e) => handleCreateDeal(e, tour.id)}
                  className="mt-2 pt-2 border-t border-border flex items-end gap-2 flex-wrap"
                >
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                      {t('dashboard.discountPercent')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={dealDiscount}
                      onChange={(e) => setDealDiscount(e.target.value)}
                      className="w-20 text-xs bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                      {t('dashboard.expires')}
                    </label>
                    <input
                      type="datetime-local"
                      value={dealExpiresAt}
                      onChange={(e) => setDealExpiresAt(e.target.value)}
                      className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={dealSubmitting}
                    className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {dealSubmitting ? t('dashboard.creating') : t('dashboard.createDealBtn')}
                  </button>
                  {dealError && <p className="text-[11px] text-red-600 w-full">{dealError}</p>}
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
