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
  MessageCircle,
  AtSign,
  Heart,
  Send,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  Languages,
  Car,
  ShieldCheck,
  Info,
  Share2,
  UserCheck,
  Bus,
} from 'lucide-react';
import { CATEGORY_STYLE, CategoryMotif } from '@/app/components/TourCard';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/app/context/ToastContext';
import { useLanguage } from '@/app/context/LanguageContext';
import type { TranslationKey } from '@/app/lib/translations';
import { TOUR_FEATURES, parseFeatures } from '@/app/lib/tourFeatures';
import OperatorProfileModal from '@/app/components/OperatorProfileModal';
import GroupInviteCard from '@/app/components/GroupInviteCard';
import WeatherForecast from '@/app/components/WeatherForecast';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { instagramUrl as buildInstagramUrl } from '@/app/lib/instagram';
import Link from 'next/link';
import { photoSrc } from '@/app/lib/photo';
import { tourTitle, tourSummary, tourDetails, tourFacts, placeName } from '@/app/lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tour {
  id: number;
  operator_id: number;
  title: string;
  description: string | null;
  title_i18n?: string | null;
  description_i18n?: string | null;
  details_i18n?: string | null;
  facts?: string | null;
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
  route?: string | null;
}

type TabId = 'overview' | 'itinerary' | 'included' | 'reviews' | 'weather';

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
  const { token, user, operatorProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { t, locale } = useLanguage();

  const [tour, setTour] = useState<Tour | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);

  const [loadingTour, setLoadingTour] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

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

  // Only a traveler with a CONFIRMED booking on this tour can review it
  // (enforced server-side in reviews.js; this state just drives the
  // messaging). Asked of GET /api/reviews/eligibility.
  const [eligibility, setEligibility] = useState<
    'loading' | 'eligible' | 'not-logged-in' | 'needs-booking' | 'own-tour' | 'not-yet'
  >('loading');

  const fetchReviews = useCallback(() => {
    if (!id) return;
    fetch(`${API_URL}/api/reviews?tour_id=${id}`)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    if (!token) {
      setEligibility('not-logged-in');
      return;
    }
    if (!id) return;
    let cancelled = false;
    setEligibility('loading');
    fetch(`${API_URL}/api/reviews/eligibility?tour_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.eligible) setEligibility('eligible');
        else setEligibility(data?.reason === 'own-tour' ? 'own-tour' : data?.reason === 'not-yet' ? 'not-yet' : 'needs-booking');
      })
      .catch(() => !cancelled && setEligibility('needs-booking'));
    return () => {
      cancelled = true;
    };
  }, [token, id]);

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
    // Wait until the saved login has been read, so the very first request
    // already carries the token and the server can recognise the tour's
    // owner (their own views are never counted).
    if (!id || authLoading) return;
    let cancelled = false;

    setLoadingTour(true);
    setTour(null);
    setOperator(null);

    fetch(`${API_URL}/api/tours/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
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
  }, [id, fetchReviews, authLoading, token]);

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
  // Text in the reader's language (falls back to the plain columns for tours
  // an operator wrote by hand - see lib/tourContent.ts).
  const title = tour ? tourTitle(tour, locale) : '';
  const summary = tour ? tourSummary(tour, locale) : '';
  const details = tour ? tourDetails(tour, locale) : null;
  const facts = tour ? tourFacts(tour) : {};
  const factItems: { Icon: typeof Clock; text: string }[] = [];
  if (facts.duration_hours) factItems.push({ Icon: Clock, text: t('facts.durationHours', { count: facts.duration_hours }) });
  if (facts.guide_languages?.length) {
    const languages = facts.guide_languages
      .map((code) => (['az', 'en', 'ru', 'tr', 'ar'].includes(code) ? t(`lang.${code}` as TranslationKey) : code))
      .join(', ');
    factItems.push({ Icon: Languages, text: t('facts.guide', { languages }) });
  }
  if (facts.pickup) factItems.push({ Icon: Car, text: t('facts.pickup') });
  if (facts.private) factItems.push({ Icon: Users, text: t('facts.private') });
  // Matches the refund tiers in backend/src/lib/refundPolicy.js (7+ days = 100%).
  factItems.push({ Icon: ShieldCheck, text: t('facts.freeCancel') });
  const paragraphs = details?.description ?? [];
  const visibleParagraphs = showFullDescription ? paragraphs : paragraphs.slice(0, 2);
  // Pre-filled so the operator immediately knows which tour and date the
  // message is about.
  const whatsappUrl =
    operator?.phone && /^\+994\d{9}$/.test(operator.phone)
      ? `https://wa.me/${operator.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
          t('tourDetail.whatsappPrefill', { title, date: formatDate(tour?.date, locale) })
        )}`
      : null;
  const instagramUrl = buildInstagramUrl(operator?.instagram);
  const isOwnTour = !!operatorProfile && !!tour && operatorProfile.id === tour.operator_id;
  const bookHref = tour ? `/tours/${tour.id}/book` : '#';
  // A tour that already happened can't be booked (the API rejects it too).
  const isPast = isPastDate(tour?.date);

  // Current group for this tour (same read-only endpoint GroupInviteCard
  // uses) - drives the sidebar's "3 / 8 people" progress.
  const [group, setGroup] = useState<{ status: string; current_participants: number; min_participants: number } | null>(null);
  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/group-formations?tour_id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [id]);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const goToTab = (tab: TabId) => {
    setActiveTab(tab);
    document.getElementById(`section-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function handleShare() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t('invite.linkCopied'));
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  const groupMin = group?.min_participants ?? tour?.min_participants ?? 1;
  const groupCurrent = group?.status === 'cancelled' ? 0 : group?.current_participants ?? 0;
  const groupConfirmed = group?.status === 'confirmed';
  const groupNeeded = Math.max(0, groupMin - groupCurrent);
  const routeStops = tour?.route
    ?.split(/\s*(?:->|→|—|–)\s*/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  // Overview highlight chips - only what this tour really offers.
  const offerChips: { Icon: typeof Clock; text: string }[] = [];
  if (facts.guide_languages?.length || tourFeatures.includes('guide')) offerChips.push({ Icon: UserCheck, text: t('ui.tour.professionalGuide') });
  if (facts.pickup || operator?.vehicle_features) offerChips.push({ Icon: Bus, text: t('ui.tour.comfortableTransport') });
  if (operator) offerChips.push({ Icon: MapPin, text: t('ui.tour.localExperience') });

  const tabs: { id: TabId; labelKey: TranslationKey }[] = [
    { id: 'overview', labelKey: 'ui.tour.tabOverview' },
    { id: 'itinerary', labelKey: 'ui.tour.tabItinerary' },
    { id: 'included', labelKey: 'ui.tour.tabIncluded' },
    { id: 'reviews', labelKey: 'ui.tour.tabReviews' },
    { id: 'weather', labelKey: 'ui.tour.tabWeather' },
  ];

  const card = 'bg-card border border-border rounded-xl p-5';

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <button
          onClick={() => router.push('/tours')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ChevronLeft size={16} /> {t('tourDetail.backToTours')}
        </button>
      </div>

      {loadingTour && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-sm">{t('tourDetail.loadingTour')}</p>
        </div>
      )}

      {!loadingTour && !tour && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <p className="text-sm">{t('tourDetail.tourNotFound')}</p>
        </div>
      )}

      {!loadingTour && tour && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-32 lg:pb-16 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">
          <div className="min-w-0">
            {/* Photo + headline */}
            <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-5 md:gap-6 mb-6">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                {tour.photo_url ? (
                  <img src={photoSrc(tour.photo_url) ?? ''} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <CategoryMotif category={tour.category} />
                )}
                {hasDeal && (
                  <span className="absolute top-3 left-3 flex items-center gap-1 bg-warning text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    <Zap size={12} /> {t('tourCard.lastMinuteDeal')}
                    {tour.active_deal ? ` −${tour.active_deal.discount_percent}%` : ''}
                  </span>
                )}
                <span className="absolute bottom-3 left-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-md">
                  {t(style.labelKey)}
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl sm:text-[28px] font-bold text-foreground leading-tight">{title}</h1>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={toggleFavorite}
                      title={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
                      aria-label={t(isFavorited ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
                    >
                      <Heart size={16} className={isFavorited ? 'fill-danger text-danger' : 'text-foreground/70'} />
                    </button>
                    <button
                      onClick={handleShare}
                      title={t('invite.share')}
                      aria-label={t('invite.share')}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
                    >
                      <Share2 size={16} className="text-foreground/70" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2 text-sm">
                  {reviews.length > 0 ? (
                    <>
                      <Star size={15} className="fill-rating text-rating" />
                      <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                      <button onClick={() => goToTab('reviews')} className="text-muted-foreground hover:text-primary">
                        ({t('tourDetail.reviewCount', { count: reviews.length })})
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t('tourDetail.noReviewsYet')}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-muted-foreground">
                  {tour.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} /> {placeName(tour.location, locale)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> {t('tourDetail.duration', { count: tour.duration_days })}
                  </span>
                  {facts.guide_languages?.length ? (
                    <span className="flex items-center gap-1.5">
                      <Languages size={14} />
                      {facts.guide_languages
                        .map((code) => (['az', 'en', 'ru', 'tr', 'ar'].includes(code) ? t(`lang.${code}` as TranslationKey) : code))
                        .join(' / ')}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="text-sm text-muted-foreground">{t('ui.tour.from')}</p>
                  <div className="flex items-baseline gap-2">
                    {hasDeal && <span className="text-base text-muted-foreground line-through">{formatAzn(tour.price)}</span>}
                    <span className="text-3xl font-bold text-foreground">{formatAzn(effectivePrice)}</span>
                    <span className="text-sm text-muted-foreground">{t('ui.card.perPerson')}</span>
                  </div>
                </div>

                {/* Operator summary - full profile opens in a modal */}
                <button
                  onClick={() => operator && setShowOperatorModal(true)}
                  disabled={!operator}
                  className="mt-auto pt-5 flex items-center gap-3 text-left group"
                >
                  <span className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-bold shrink-0">
                    {operator?.photo_url ? (
                      <img src={photoSrc(operator.photo_url) ?? ''} alt={operator.name} className="w-full h-full object-cover" />
                    ) : (
                      (operator?.name ?? 'T').charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{t('ui.tour.operatedBy')}</span>
                    <span className="block text-sm font-semibold text-foreground group-hover:text-primary truncate">
                      {operator?.name ?? t('tourCard.defaultOperator')}
                      {typeof operator?.rating === 'number' && operator.rating > 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                          <Star size={11} className="fill-rating text-rating" /> {operator.rating.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {showOperatorModal && operator && (
              <OperatorProfileModal operator={operator} onClose={() => setShowOperatorModal(false)} />
            )}

            {/* Tabs - jump to each section; every section stays on the page */}
            <div className="sticky top-14 md:top-16 z-20 bg-background border-b border-border mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => goToTab(tab.id)}
                    className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-foreground/70 hover:text-primary'
                    }`}
                  >
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview */}
            <section id="section-overview" className="scroll-mt-32 mb-8">
              {summary && <p className="text-[15px] text-foreground/80 leading-relaxed">{summary}</p>}
              {!summary && paragraphs.length === 0 && tour.description && (
                <p className="text-[15px] text-foreground/80 leading-relaxed">{tour.description}</p>
              )}

              {offerChips.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                  {offerChips.map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                      <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon size={17} className="text-primary" />
                      </span>
                      {text}
                    </div>
                  ))}
                </div>
              )}

              {factItems.length > 0 && (
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/75 mt-5">
                  {factItems.map(({ Icon, text }) => (
                    <li key={text} className="flex items-center gap-1.5">
                      <Icon size={14} className="text-primary shrink-0" /> {text}
                    </li>
                  ))}
                </ul>
              )}

              {details && details.highlights.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-foreground mb-2">{t('tourDetail.highlights')}</h3>
                  <ul className="space-y-1.5">
                    {details.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check size={16} className="text-primary shrink-0 mt-0.5" /> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {paragraphs.length > 0 && (
                <div className="mt-6 space-y-3">
                  {visibleParagraphs.map((p, i) => (
                    <p key={i} className="text-sm text-foreground/80 leading-relaxed">{p}</p>
                  ))}
                  {paragraphs.length > 2 && (
                    <button
                      onClick={() => setShowFullDescription((v) => !v)}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {showFullDescription ? t('tourDetail.showLess') : t('tourDetail.showMore')}
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Itinerary */}
            <section id="section-itinerary" className="scroll-mt-32 mb-8">
              <h2 className="text-lg font-bold text-foreground mb-3">{t('ui.tour.tabItinerary')}</h2>
              {routeStops.length > 0 ? (
                <ol className="relative border-l-2 border-primary/20 ml-2 space-y-4">
                  {routeStops.map((stop, i) => (
                    <li key={`${stop}-${i}`} className="pl-5 relative">
                      <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-card border-2 border-primary" />
                      <p className="text-xs font-semibold text-primary">{t('ui.tour.stop', { n: i + 1 })}</p>
                      <p className="text-sm text-foreground">{stop}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">{t('ui.tour.noItinerary')}</p>
              )}
              {details?.meeting && (
                <div className="mt-5 flex items-start gap-2.5 bg-muted rounded-lg p-3.5">
                  <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('tourDetail.meetingPoint')}</p>
                    <p className="text-sm text-foreground/75 mt-0.5 leading-relaxed">{details.meeting}</p>
                  </div>
                </div>
              )}
            </section>

            {/* What's included */}
            <section id="section-included" className="scroll-mt-32 mb-8">
              <h2 className="text-lg font-bold text-foreground mb-3">{t('tourDetail.whatsIncluded')}</h2>
              {details && (details.includes.length > 0 || details.excludes.length > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {details.includes.map((item) => (
                    <p key={`in-${item}`} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check size={16} className="text-success shrink-0 mt-0.5" /> {item}
                    </p>
                  ))}
                  {details.excludes.map((item) => (
                    <p key={`ex-${item}`} className="flex items-start gap-2 text-sm text-foreground/60">
                      <X size={16} className="text-danger shrink-0 mt-0.5" /> {item}
                    </p>
                  ))}
                </div>
              ) : tourFeatures.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOUR_FEATURES.filter((f) => tourFeatures.includes(f.slug)).map((f) => (
                    <span key={f.slug} className="flex items-center gap-2 text-sm text-foreground/80 bg-muted rounded-lg px-3 py-2">
                      <f.Icon size={15} className="text-primary shrink-0" /> {t(f.labelKey)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('ui.tour.askOperator')}</p>
              )}

              {details &&
                ([
                  ['tourDetail.notSuitableFor', details.notSuitable],
                  ['tourDetail.whatToBring', details.bring],
                  ['tourDetail.notAllowed', details.notAllowed],
                  ['tourDetail.knowBeforeYouGo', details.know],
                ] as [TranslationKey, string[]][])
                  .filter(([, items]) => items.length > 0)
                  .map(([key, items]) => (
                    <div key={key} className="mt-5">
                      <h3 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                        {key === 'tourDetail.knowBeforeYouGo' && <Info size={14} className="text-primary" />}
                        {t(key)}
                      </h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/75">
                        {items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
            </section>

            {/* Reviews */}
            <section id="section-reviews" className="scroll-mt-32 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground">{t('tourDetail.reviews')}</h2>
                {eligibility === 'eligible' && !alreadyReviewed && (
                  <button
                    onClick={() => setShowReviewForm((v) => !v)}
                    className="text-sm text-primary font-semibold hover:underline"
                  >
                    {showReviewForm ? t('tourDetail.cancel') : t('tourDetail.writeReview')}
                  </button>
                )}
              </div>

              {reviews.length > 0 && (
                <div className="flex items-center gap-6 bg-muted rounded-xl p-4 mb-4">
                  <div className="text-center shrink-0">
                    <p className="text-4xl font-bold text-foreground leading-none">{avgRating.toFixed(1)}</p>
                    <div className="mt-2">
                      <StarRow rating={avgRating} size={12} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('tourDetail.reviewCount', { count: reviews.length })}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star, i) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-3">{star}</span>
                        <div className="flex-1 h-1.5 bg-card rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rating rounded-full"
                            style={{ width: `${(starCounts[i] / reviews.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {eligibility !== 'loading' && eligibility !== 'eligible' && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3.5 py-3 mb-3">
                  {eligibility === 'needs-booking' && t('tourDetail.bookToReview')}
                  {eligibility === 'not-yet' && t('tourDetail.reviewAfterTour')}
                  {eligibility === 'own-tour' && t('tourDetail.ownTourNoReview')}
                  {eligibility === 'not-logged-in' && (
                    <>
                      <Link href="/login" className="text-primary font-semibold hover:underline">
                        {t('nav.logIn')}
                      </Link>
                      {t('tourDetail.loginToReview')}
                    </>
                  )}
                </p>
              )}
              {eligibility === 'eligible' && alreadyReviewed && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3.5 py-3 mb-3">{t('tourDetail.alreadyReviewed')}</p>
              )}

              {showReviewForm && eligibility === 'eligible' && !alreadyReviewed && (
                <form onSubmit={handleSubmitReview} className="border border-border rounded-xl p-4 mb-4 space-y-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)} aria-label={`${n}`}>
                        <Star size={22} className={n <= reviewRating ? 'fill-rating text-rating' : 'text-border'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={t('tourDetail.shareExperience')}
                    rows={3}
                    className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:border-primary resize-none"
                  />
                  {reviewError && (
                    <p className="flex items-center gap-1.5 text-xs text-danger">
                      <AlertCircle size={12} /> {reviewError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
                  >
                    {reviewSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {reviewSubmitting ? t('tourDetail.submitting') : t('tourDetail.submitReview')}
                  </button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('tourDetail.noReviewsYet')}</p>
              ) : (
                <div className="divide-y divide-border border-y border-border">
                  {reviews.map((r) => {
                    const isOwn = user ? r.user_id === user.id : false;
                    const isEditing = editingReviewId === r.id;
                    return (
                      <div key={r.id} className="py-4">
                        {isEditing ? (
                          <form onSubmit={(e) => handleSaveReview(e, r.id)} className="space-y-2.5">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} type="button" onClick={() => setEditRating(n)} aria-label={`${n}`}>
                                  <Star size={18} className={n <= editRating ? 'fill-rating text-rating' : 'text-border'} />
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              rows={2}
                              className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:border-primary resize-none"
                            />
                            {editError && (
                              <p className="flex items-center gap-1.5 text-xs text-danger">
                                <AlertCircle size={12} /> {editError}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                disabled={editSubmitting}
                                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                              >
                                {editSubmitting && <Loader2 size={12} className="animate-spin" />}
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
                            <div className="flex items-center justify-between mb-1.5">
                              <StarRow rating={r.rating} />
                              <div className="flex items-center gap-2">
                                {r.created_at && <span className="text-xs text-muted-foreground">{formatDate(r.created_at, locale)}</span>}
                                {isOwn && (
                                  <>
                                    <button
                                      onClick={() => startEditReview(r)}
                                      title={t('tourDetail.editReview')}
                                      className="text-muted-foreground hover:text-foreground p-0.5"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReview(r.id)}
                                      disabled={deletingReviewId === r.id}
                                      title={t('tourDetail.deleteReview')}
                                      className="text-muted-foreground hover:text-danger disabled:opacity-40 p-0.5"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Weather */}
            <section id="section-weather" className="scroll-mt-32 mb-8">
              <WeatherForecast location={tour.location} date={tour.date} durationDays={tour.duration_days} />
            </section>

            {/* Invite friends (group tours only) */}
            {!isPast && (
              <GroupInviteCard
                tourId={tour.id}
                tourTitle={title}
                minParticipants={tour.min_participants}
                maxParticipants={tour.max_participants}
              />
            )}

            {/* Contact the operator - WhatsApp only once the phone is verified */}
            <section className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-1">{t('ui.tour.contactOperator')}</h2>
              <p className="text-sm text-muted-foreground mb-3">{t('tourDetail.contactHint')}</p>
              {whatsappUrl || instagramUrl ? (
                <div className="flex flex-wrap gap-2">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                    >
                      <MessageCircle size={16} /> {t('tourDetail.messageOnWhatsapp')}
                    </a>
                  )}
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 border border-border text-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-primary/40 transition-colors"
                    >
                      <AtSign size={16} /> {t('tourDetail.viewInstagram')}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('tourDetail.noContactYet')}</p>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className={`${card} hidden lg:block`}>
              <h2 className="text-base font-bold text-foreground mb-4">{t('ui.tour.checkAvailability')}</h2>

              <p className="text-xs font-medium text-muted-foreground mb-1">{t('ui.tour.tourDate')}</p>
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground mb-4">
                <Calendar size={15} className="text-muted-foreground" /> {formatDate(tour.date, locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-muted-foreground">{t('ui.tour.groupSize')}</span>
                <span className="font-semibold text-foreground">
                  {t('ui.tour.peopleOf', { current: groupCurrent, max: tour.max_participants })}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${groupConfirmed ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (groupCurrent / Math.max(1, tour.max_participants)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 mb-4">
                {groupConfirmed || groupNeeded === 0
                  ? t('ui.tour.groupConfirmed')
                  : t('ui.tour.moreNeeded', { count: groupNeeded })}
              </p>

              {isOwnTour ? (
                <p className="text-xs text-muted-foreground text-center bg-muted rounded-lg py-3">{t('tourDetail.ownTourNote')}</p>
              ) : isPast ? (
                <p className="text-center text-sm font-semibold text-muted-foreground bg-muted rounded-lg py-3">
                  {t('tourDetail.tourEnded')}
                </p>
              ) : (
                <Link
                  href={bookHref}
                  className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold py-3 rounded-lg transition-colors"
                >
                  {t('tourDetail.bookNow')}
                </Link>
              )}
              <p className="flex items-center justify-center gap-1.5 text-xs text-success mt-2.5">
                <ShieldCheck size={13} /> {t('ui.tour.freeCancellation')}
              </p>
            </div>

            {groupMin > 1 && (
              <div className={card}>
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                  <Users size={16} className="text-primary" /> {t('ui.tour.groupFormation')}
                </h2>
                <p className="text-sm font-semibold text-foreground">
                  {t('ui.tour.travelersOf', { current: groupCurrent, min: groupMin })}
                </p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5 mb-3">
                  <div
                    className={`h-full rounded-full ${groupConfirmed ? 'bg-success' : 'bg-warning'}`}
                    style={{ width: `${Math.min(100, (groupCurrent / groupMin) * 100)}%` }}
                  />
                </div>
                <ol className="space-y-2 text-xs text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-success shrink-0" /> {t('ui.tour.step1')}
                  </li>
                  <li className="flex items-center gap-2">
                    {groupConfirmed ? (
                      <CheckCircle2 size={14} className="text-success shrink-0" />
                    ) : (
                      <Clock size={14} className="text-warning shrink-0" />
                    )}
                    {t('ui.tour.step2')}
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t('ui.tour.groupExplainer')}</p>
              </div>
            )}

            <div className={card}>
              <h2 className="text-sm font-bold text-foreground mb-3">{t('booking.refundPolicyTitle')}</h2>
              <dl className="text-xs space-y-2">
                {(
                  [
                    ['ui.policy.days7', '100%'],
                    ['ui.policy.days3', '50%'],
                    ['ui.policy.days0', '0%'],
                    ['ui.policy.operatorCancels', '100%'],
                    ['ui.policy.groupFails', '100%'],
                  ] as [TranslationKey, string][]
                ).map(([key, pct]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t(key)}</dt>
                    <dd className={`font-semibold ${pct === '0%' ? 'text-danger' : 'text-foreground'}`}>
                      {t('ui.policy.refund', { pct })}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile / tablet sticky booking bar */}
      {!loadingTour && tour && (
        <div className="fixed bottom-16 md:bottom-0 lg:hidden inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('ui.tour.from')}</p>
              <p className="text-lg font-bold text-foreground">
                {formatAzn(effectivePrice)} <span className="text-xs font-normal text-muted-foreground">{t('ui.card.perPerson')}</span>
              </p>
            </div>
            {isOwnTour ? (
              <p className="flex-1 text-xs text-muted-foreground text-right">{t('tourDetail.ownTourNote')}</p>
            ) : isPast ? (
              <p className="text-sm font-semibold text-muted-foreground bg-muted rounded-lg px-4 py-2.5">{t('tourDetail.tourEnded')}</p>
            ) : (
              <Link
                href={bookHref}
                className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-hover"
              >
                {t('tourDetail.bookNow')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
