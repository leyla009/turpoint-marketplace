'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, Store, Star, Ticket, Trash2, Pencil, Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import NewTourModal from './NewTourModal';
import EditTourModal from './EditTourModal';
import OperatorProfileForm from './OperatorProfileForm';
import OperatorProfileFormModal from './OperatorProfileFormModal';
import type { ExistingTour } from './NewTourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// The operator dashboard page's content. "+ Tur əlavə et" (both the header
// button and the "İlk turunuzu əlavə edin" empty-state link) opens
// NewTourModal as a popup right here instead of navigating to
// /dashboard/new-tour - closing the popup and refreshing the tour list on
// a successful publish.
export default function OperatorPanelContent({ authLoading = false }: { authLoading?: boolean }) {
  const { token, operatorProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [showNewTourModal, setShowNewTourModal] = useState(false);
  const [editingTour, setEditingTour] = useState<ExistingTour | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [myTours, setMyTours] = useState<any[]>([]);
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
    fetch(`${API_URL}/api/tours`)
      .then((r) => {
        if (!r.ok) throw new Error('request failed');
        return r.json();
      })
      .then((allTours) => setMyTours(allTours.filter((t: any) => t.operator_id === operatorProfile.id)))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [operatorProfile]);

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
    return <OperatorProfileForm />;
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-5">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-1.5 bg-accent text-accent-foreground text-sm font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Store size={15} /> {t('dashboard.profileButton')}
          </button>
          <button
            onClick={() => setShowNewTourModal(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <PlusCircle size={15} /> {t('dashboard.addTour')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl shadow-md p-3.5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Ticket size={17} className="text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-foreground leading-none">{myTours.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{t('dashboard.activeTours')}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-md p-3.5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-rating/10 flex items-center justify-center shrink-0">
            <Star size={17} className="text-rating" fill="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-foreground leading-none">{operatorProfile.rating ?? 0}</p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{t('dashboard.rating')}</p>
          </div>
        </div>
      </div>

      {/* "Turlarınız" as a trapezoid tab flowing straight into the tours
          panel below it - same bg-card color, zero gap, no radius where
          they meet - so the heading and the list read as one continuous
          shape instead of a floating label sitting above separate cards.
          The right edge is narrower at the top and flares out to full
          width at the bottom (where it merges into the panel) - the top-
          left corner is a 3-point polygon approximation of a small round,
          since clip-path can't mix straight cuts with a real border-radius
          curve on the same edge. */}
      <div
        className="relative z-10 inline-flex items-center gap-2 bg-card pl-3 pr-8 py-2 -mb-px"
        style={{ clipPath: 'polygon(0 10px, 3px 3px, 10px 0, calc(100% - 22px) 0, 100% 100%, 0 100%)' }}
      >
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Ticket size={13} className="text-primary" />
        </span>
        <h2
          className="text-base sm:text-lg font-bold text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('dashboard.yourTours')}
        </h2>
      </div>

      <div className="bg-card rounded-b-2xl rounded-tr-2xl shadow-md overflow-hidden">
        {loadError ? (
          <div className="p-6 text-center">
            <AlertCircle size={22} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('dashboard.couldntLoadTours')}</p>
          </div>
        ) : myTours.length === 0 ? (
          <div className="p-6 text-center">
            <Ticket size={26} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{t('dashboard.noToursYet')}</p>
            <button onClick={() => setShowNewTourModal(true)} className="text-sm text-primary font-semibold">
              {t('dashboard.addFirstTour')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {myTours.map((tour) => (
              <div key={tour.id} className="border-l-4 border-l-primary p-3">
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
                    {t('search.travelers')}: {tour.max_participants}
                  </span>
                  <button
                    onClick={() => setEditingTour(tour)}
                    title={t('dashboard.editTour')}
                    className="w-7 h-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => openDealForm(tour.id)}
                    title={t('dashboard.createDeal')}
                    disabled={!!tour.active_deal}
                    className="w-7 h-7 rounded-full bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-30 transition-colors flex items-center justify-center shrink-0"
                  >
                    <Zap size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(tour.id, tour.title)}
                    disabled={deletingId === tour.id}
                    title={t('dashboard.deleteTour')}
                    className="w-7 h-7 rounded-full bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {deleteError?.id === tour.id && (
                <p className="text-[11px] text-danger mt-2 pt-2 border-t border-border">{deleteError.message}</p>
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
                  {dealError && <p className="text-[11px] text-danger w-full">{dealError}</p>}
                </form>
              )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showProfileModal && <OperatorProfileFormModal onClose={() => setShowProfileModal(false)} />}

      {showNewTourModal && (
        <NewTourModal
          onClose={() => setShowNewTourModal(false)}
          onCreated={() => {
            setShowNewTourModal(false);
            loadTours();
          }}
        />
      )}

      {editingTour && (
        <EditTourModal
          tour={editingTour}
          onClose={() => setEditingTour(null)}
          onUpdated={() => {
            setEditingTour(null);
            loadTours();
          }}
        />
      )}
    </div>
  );
}
