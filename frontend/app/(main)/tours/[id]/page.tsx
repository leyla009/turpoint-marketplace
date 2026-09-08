'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  MapPin,
  Users,
  Calendar,
  Star,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  MessageCircle,
  AtSign,
  Heart,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import { CATEGORY_STYLE, CategoryMotif } from '@/app/components/TourCard';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/app/context/ToastContext';
import { useLanguage } from '@/app/context/LanguageContext';
import type { TranslationKey } from '@/app/lib/translations';
import { TOUR_FEATURES, parseFeatures } from '@/app/lib/tourFeatures';
import OperatorProfileModal from '@/app/components/OperatorProfileModal';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tour {
  id: number;
  operator_id: number;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  price: number;
  date: string;
  duration_days: number;
  min_participants: number;
  max_participants: number;
  discounted_price?: number;
  active_deal?: { discount_percent: number; expires_at: string };
  features?: string | null;
  photo_url?: string | null;
}

interface Operator {
  id: number;
  name: string;
  rating?: number;
  description?: string;
  languages?: string;
  vehicle_features?: string;
  photo_url?: string | null;
  phone?: string | null;
  phone_verified?: number | null;
  instagram?: string | null;
}

interface Review {
  id: number;
  tour_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at?: string;
}

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? 'fill-rating text-rating' : 'text-border'}
        />
      ))}
    </div>
  );
}

export default function TourDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [tour, setTour] = useState<Tour | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);

  const [loadingTour, setLoadingTour] = useState(true);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  // Any logged-in traveler can review a tour now (the old "confirmed
  // booking" requirement was removed along with in-app booking - see
  // reviews.js). This just tracks whether someone's logged in at all.
  const [eligibility, setEligibility] = useState<'loading' | 'eligible' | 'not-logged-in'>('loading');

  const fetchReviews = useCallback(() => {
    if (!id) return;
    fetch(`${API_URL}/api/reviews?tour_id=${id}`)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    setEligibility(token ? 'eligible' : 'not-logged-in');
  }, [token]);

  const alreadyReviewed = user ? reviews.some((r) => r.user_id === user.id) : false;

  useEffect(() => {
    if (!id || !token) {
      setIsFavorited(false);
      return;
    }
    fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setIsFavorited(Array.isArray(data) ? data.some((f: any) => f.id === Number(id)) : false))
      .catch(() => {});
  }, [id, token]);

  function toggleFavorite() {
    if (!user) {
      router.push('/login');
      return;
    }
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);
    const request = wasFavorited
      ? fetch(`${API_URL}/api/favorites/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      : fetch(`${API_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tour_id: Number(id) }),
        });
    request.catch(() => setIsFavorited(wasFavorited));
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoadingTour(true);
    setTour(null);
    setOperator(null);

    fetch(`${API_URL}/api/tours/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setTour(data?.id ? data : null);
        if (data?.operator_id) {
          fetch(`${API_URL}/api/operators/${data.operator_id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((op) => !cancelled && op && setOperator(op))
            .catch(() => {});
        }
      })
      .catch(() => !cancelled && setTour(null))
      .finally(() => !cancelled && setLoadingTour(false));

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [id, fetchReviews]);

  const handleSubmitReview = (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setReviewError(t('tourDetail.needLoginToReview'));
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    fetch(`${API_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tour_id: Number(id),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || t('tourDetail.couldNotSubmitReview'));
        setReviews((prev) => [data, ...prev]);
        if (typeof data.operator_new_rating === 'number') {
          setOperator((prev) => (prev ? { ...prev, rating: data.operator_new_rating } : prev));
        }
        setReviewComment('');
        setReviewRating(5);
        setShowReviewForm(false);
        showToast(t('tourDetail.reviewSubmittedToast'));
      })
      .catch((err) => setReviewError(err.message))
      .finally(() => setReviewSubmitting(false));
  };

  const startEditReview = (review: Review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment ?? '');
    setEditError(null);
  };

  const handleSaveReview = (e: FormEvent, reviewId: number) => {
    e.preventDefault();
    if (!token) return;
    setEditSubmitting(true);
    setEditError(null);
    fetch(`${API_URL}/api/reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating: editRating, comment: editComment.trim() || null }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || t('tourDetail.couldNotUpdateReview'));
        setReviews((prev) => prev.map((r2) => (r2.id === reviewId ? data : r2)));
        if (typeof data.operator_new_rating === 'number') {
          setOperator((prev) => (prev ? { ...prev, rating: data.operator_new_rating } : prev));
        }
        setEditingReviewId(null);
        showToast(t('tourDetail.reviewUpdatedToast'));
      })
      .catch((err) => setEditError(err.message))
      .finally(() => setEditSubmitting(false));
  };

  const handleDeleteReview = (reviewId: number) => {
    if (!token) return;
    if (!window.confirm(t('tourDetail.deleteConfirm'))) return;
    setDeletingReviewId(reviewId);
    fetch(`${API_URL}/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || t('tourDetail.couldNotDeleteReview'));
        setReviews((prev) => prev.filter((r2) => r2.id !== reviewId));
        if (typeof data.operator_new_rating === 'number') {
          setOperator((prev) => (prev ? { ...prev, rating: data.operator_new_rating } : prev));
        }
        showToast(t('tourDetail.reviewDeletedToast'));
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setDeletingReviewId(null));
  };

  const style = CATEGORY_STYLE[tour?.category ?? ''] ?? CATEGORY_STYLE.history;
  const hasDeal = typeof tour?.discounted_price === 'number';

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const starCounts = [5, 4, 3, 2, 1].map((star) => reviews.filter((r) => r.rating === star).length);

  const effectivePrice = tour?.discounted_price ?? tour?.price;
  const tourFeatures = parseFeatures(tour?.features);
  const whatsappUrl = operator?.phone_verified && operator.phone ? `https://wa.me/${operator.phone.replace(/\D/g, '')}` : null;
  const instagramUrl = operator?.instagram ? `https://instagram.com/${operator.instagram}` : null;

  return (
    <div className="min-h-full">
      <div className="px-4 sm:px-6 pt-4 max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft size={16} /> {t('tourDetail.backToTours')}
        </button>
      </div>

      {loadingTour && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-sm">{t('tourDetail.loadingTour')}</p>
        </div>
      )}

      {!loadingTour && !tour && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <p className="text-sm">{t('tourDetail.tourNotFound')}</p>
        </div>
      )}

      {!loadingTour && tour && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-32 lg:pb-16 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="min-w-0">
          {/* Hero */}
          <div className="relative h-48 sm:h-64 rounded-2xl flex items-center justify-center mb-5 overflow-hidden bg-muted">
            {tour.photo_url ? (
              <img src={`${API_URL}${tour.photo_url}`} alt={tour.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <CategoryMotif category={tour.category} />
            )}
            {hasDeal && (
              <span className="absolute top-3 left-3 flex items-center gap-1 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                <Zap size={11} /> {t('tourCard.lastMinuteDeal')}
              </span>
            )}
            <span className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full">
              {t(style.labelKey)}
            </span>
          </div>

          {/* Title & meta */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1
              className="text-2xl sm:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {tour.title}
            </h1>
            <button
              onClick={toggleFavorite}
              title={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
              className="shrink-0 w-10 h-10 mt-1 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
            >
              <Heart size={18} className={isFavorited ? 'fill-danger text-danger' : 'text-muted-foreground'} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
            {tour.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {tour.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={14} /> {formatDate(tour.date)} · {t('tourDetail.duration', { count: tour.duration_days })}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {t('tourDetail.peopleRange', { min: tour.min_participants, max: tour.max_participants })}
            </span>
            {reviews.length > 0 && (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Star size={14} className="fill-rating text-rating" /> {avgRating.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({t('tourDetail.reviewCount', { count: reviews.length })})
                </span>
              </span>
            )}
          </div>

          {/* Operator - a compact summary; the full profile (photo,
              description, languages, phone, Instagram) opens in
              OperatorProfileModal when clicked. */}
          <button
            onClick={() => operator && setShowOperatorModal(true)}
            disabled={!operator}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 mb-5 text-left hover:border-primary/40 transition-colors disabled:hover:border-border"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-bold shrink-0">
              {operator?.photo_url ? (
                <img src={`${API_URL}${operator.photo_url}`} alt={operator.name} className="w-full h-full object-cover" />
              ) : (
                (operator?.name ?? 'T').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {operator?.name ?? t('tourCard.defaultOperator')}
              </p>
              {typeof operator?.rating === 'number' && operator.rating > 0 ? (
                <div className="flex items-center gap-1.5">
                  <StarRow rating={operator.rating} />
                  <span className="text-xs text-muted-foreground">{operator.rating.toFixed(1)}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('tourDetail.noRatingsYet')}</p>
              )}
            </div>
          </button>

          {showOperatorModal && operator && (
            <OperatorProfileModal operator={operator} onClose={() => setShowOperatorModal(false)} />
          )}

          {/* Description */}
          {tour.description && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-foreground mb-1.5">{t('tourDetail.aboutTour')}</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">{tour.description}</p>
            </div>
          )}

          {/* What's included - the tour's own feature tags (breakfast, guide,
              etc.), previously only used to power the homepage filter chips
              and never actually shown to someone deciding whether to book. */}
          {tourFeatures.length > 0 && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-foreground mb-2">{t('tourDetail.whatsIncluded')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TOUR_FEATURES.filter((f) => tourFeatures.includes(f.slug)).map((f) => (
                  <span
                    key={f.slug}
                    className="flex items-center gap-2 text-sm text-foreground/80 bg-muted/60 rounded-lg px-2.5 py-2"
                  >
                    <f.Icon size={15} className="text-primary shrink-0" /> {t(f.labelKey)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact the operator - replaces the old in-app group-booking
              flow entirely. Instagram is always shown if the operator set
              a handle; WhatsApp only shows once the operator's phone has
              actually been verified (see the profile page's send/verify
              flow), so this never points travelers at an unconfirmed number. */}
          <div className="mb-6 rounded-2xl border-2 border-primary/25 bg-primary/[0.04] p-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-1">
              <MessageCircle size={15} className="text-primary" /> {t('tourDetail.contactUs')}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">{t('tourDetail.contactHint')}</p>

            {whatsappUrl || instagramUrl ? (
              <div className="flex flex-col sm:flex-row gap-2">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <MessageCircle size={15} /> {t('tourDetail.messageOnWhatsapp')}
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-card border border-border text-foreground text-sm font-semibold py-2.5 rounded-xl hover:border-primary/40 transition-colors"
                  >
                    <AtSign size={15} /> {t('tourDetail.viewInstagram')}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('tourDetail.noContactYet')}</p>
            )}
          </div>

          {/* Reviews */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare size={15} /> {t('tourDetail.reviews')}
              </h2>
              {eligibility === 'eligible' && !alreadyReviewed && (
                <button
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  {showReviewForm ? t('tourDetail.cancel') : t('tourDetail.writeReview')}
                </button>
              )}
            </div>

            {reviews.length > 0 && (
              <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-3 mb-3">
                <div className="text-center shrink-0">
                  <p className="text-2xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
                  <StarRow rating={avgRating} size={11} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t('tourDetail.reviewCount', { count: reviews.length })}
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((star, i) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-3">{star}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: reviews.length ? `${(starCounts[i] / reviews.length) * 100}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eligibility messaging - only a traveler with a confirmed
                booking on THIS tour can review it. */}
            {eligibility === 'not-logged-in' && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2.5 mb-3">
                <Link href="/login" className="text-accent font-semibold hover:underline">
                  {t('nav.logIn')}
                </Link>
                {t('tourDetail.loginToReview')}
              </p>
            )}
            {eligibility === 'eligible' && alreadyReviewed && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2.5 mb-3">
                {t('tourDetail.alreadyReviewed')}
              </p>
            )}

            {showReviewForm && eligibility === 'eligible' && !alreadyReviewed && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-card border border-border rounded-xl p-3 mb-3 space-y-2.5"
              >
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setReviewRating(n)}>
                      <Star
                        size={20}
                        className={n <= reviewRating ? 'fill-rating text-rating' : 'text-border'}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t('tourDetail.shareExperience')}
                  rows={3}
                  className="w-full text-sm bg-muted rounded-lg px-3 py-2 outline-none placeholder:text-muted-foreground resize-none"
                />
                {reviewError && (
                  <p className="flex items-center gap-1.5 text-xs text-primary">
                    <AlertCircle size={12} /> {reviewError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="flex items-center justify-center gap-2 w-full bg-accent text-accent-foreground text-sm font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {reviewSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {reviewSubmitting ? t('tourDetail.submitting') : t('tourDetail.submitReview')}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('tourDetail.noReviewsYet')}</p>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((r) => {
                  const isOwn = user ? r.user_id === user.id : false;
                  const isEditing = editingReviewId === r.id;
                  return (
                    <div key={r.id} className="bg-card border border-border rounded-xl p-3">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleSaveReview(e, r.id)}
                          className="space-y-2.5"
                        >
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" onClick={() => setEditRating(n)}>
                                <Star
                                  size={18}
                                  className={n <= editRating ? 'fill-rating text-rating' : 'text-border'}
                                />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            rows={2}
                            className="w-full text-sm bg-muted rounded-lg px-3 py-2 outline-none placeholder:text-muted-foreground resize-none"
                          />
                          {editError && (
                            <p className="flex items-center gap-1.5 text-xs text-primary">
                              <AlertCircle size={12} /> {editError}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={editSubmitting}
                              className="flex items-center justify-center gap-1.5 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                              {editSubmitting ? <Loader2 size={12} className="animate-spin" /> : null}
                              {t('tourDetail.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingReviewId(null)}
                              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5"
                            >
                              {t('tourDetail.cancelEdit')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <StarRow rating={r.rating} />
                            <div className="flex items-center gap-2">
                              {r.created_at && (
                                <span className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</span>
                              )}
                              {isOwn && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => startEditReview(r)}
                                    title={t('tourDetail.editReview')}
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReview(r.id)}
                                    disabled={deletingReviewId === r.id}
                                    title={t('tourDetail.deleteReview')}
                                    className="text-muted-foreground hover:text-danger disabled:opacity-40 p-0.5"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Desktop booking sidebar - sticky alongside the content instead
            of a mobile-style bottom bar, which on a wide screen wasted
            most of the page's width. Mirrors the same price/CTA logic as
            the mobile bar below so the two never disagree. */}
        <aside className="hidden lg:block sticky top-24 bg-card border border-border rounded-2xl shadow-sm p-5">
          <p className="text-xs text-muted-foreground mb-0.5">{t('tourDetail.perPerson')}</p>
          <div className="flex items-baseline gap-2 mb-4">
            {hasDeal && <span className="text-sm text-muted-foreground line-through">AZN {tour.price}</span>}
            <span className="text-2xl font-bold text-primary">AZN {effectivePrice}</span>
          </div>

          <div className="space-y-2 text-sm text-foreground/80 mb-4 pb-4 border-b border-border">
            {tour.location && (
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground shrink-0" /> {tour.location}
              </p>
            )}
            <p className="flex items-center gap-2">
              <Calendar size={14} className="text-muted-foreground shrink-0" /> {formatDate(tour.date)} ·{' '}
              {t('tourDetail.duration', { count: tour.duration_days })}
            </p>
            <p className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground shrink-0" />{' '}
              {t('tourDetail.peopleRange', { min: tour.min_participants, max: tour.max_participants })}
            </p>
          </div>

          <div className="space-y-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-sm font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <MessageCircle size={16} /> {t('tourDetail.messageOnWhatsapp')}
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-card border border-border text-foreground text-sm font-semibold py-3 rounded-xl hover:border-primary/40 transition-colors"
              >
                <AtSign size={16} /> {t('tourDetail.viewInstagram')}
              </a>
            )}
            {!whatsappUrl && !instagramUrl && (
              <p className="text-xs text-muted-foreground text-center">{t('tourDetail.noContactYet')}</p>
            )}
          </div>
        </aside>
        </div>
      )}

      {/* Sticky bottom price / CTA bar - mobile and tablet only; lg screens
          get the sidebar above instead. */}
      {!loadingTour && tour && (
        <div className="fixed bottom-16 md:bottom-0 lg:hidden inset-x-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">{t('tourDetail.perPerson')}</p>
              <p className="text-lg font-bold text-primary">AZN {effectivePrice}</p>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-[260px]">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={15} /> {t('tourDetail.messageOnWhatsapp')}
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('tourDetail.viewInstagram')}
                  className={`${
                    whatsappUrl ? 'shrink-0 w-11 h-11' : 'flex-1'
                  } bg-card border border-border text-foreground rounded-xl hover:border-primary/40 flex items-center justify-center`}
                >
                  <AtSign size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}