'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Users,
  Star,
  Zap,
  Loader2,
  AlertCircle,
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
  ShieldCheck,
  Share2,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ExternalLink,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';
import { CATEGORY_STYLE, CategoryMotif, dayCount, type ApiTour } from '@/app/components/TourCard';
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
import { photoSrc } from '@/app/lib/photo';
import { tourTitle, tourSummary, tourDetails, tourFacts, placeName, titleFromI18n } from '@/app/lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const NEW_FOR_DAYS = 30;
const MAX_DATE_CHIPS = 5;
const FEW_SEATS = 3;
// Browsers often lack Azerbaijani weekday names (they fall back to English).
const AZ_WEEKDAYS_SHORT = ['B.', 'B.E.', 'Ç.A.', 'Ç.', 'C.A.', 'C.', 'Ş.'];

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
  photos?: { id: number; url: string }[];
  route?: string | null;
  created_at?: string;
}

type TabId = 'overview' | 'itinerary' | 'included' | 'meeting' | 'weather' | 'reviews';

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

interface OperatorReview {
  id: number;
  tour_id: number;
  rating: number;
  comment: string | null;
  created_at?: string;
  tour_title: string;
  tour_title_i18n?: string | null;
  tour_title_i18n?: string | null;
}

interface Group {
  status: string;
  current_participants: number;
  min_participants: number;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(rating) ? 'fill-rating text-rating' : 'text-border'} />
      ))}
    </div>
  );
}

function Section({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 mt-10 first:mt-0">
      {title && <h2 className="text-xl font-bold text-navy mb-4">{title}</h2>}
      {children}
    </section>
  );
}

// Full-screen photo viewer for the gallery: arrows, keyboard and Escape.
function Lightbox({ photos, start, title, onClose }: { photos: string[]; start: number; title: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [i, setI] = useState(start);
  const go = useCallback((d: number) => setI((v) => (v + d + photos.length) % photos.length), [photos.length]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [go, onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} aria-label={t('map.close')} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
        <X size={20} />
      </button>
      <p className="absolute top-6 left-1/2 -translate-x-1/2 text-sm text-white/80">{t('ui.td.photoOf', { n: i + 1, total: photos.length })}</p>
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t('ui.td.prevPhoto')}
            className="absolute left-3 sm:left-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t('ui.td.nextPhoto')}
            className="absolute right-3 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
      <img src={photos[i]} alt={`${title} - ${i + 1}`} onClick={(e) => e.stopPropagation()} className="max-w-[92vw] max-h-[82vh] object-contain rounded-lg" />
    </div>,
    document.body
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
  const closeOperatorModal = useCallback(() => setShowOperatorModal(false), []);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [allTours, setAllTours] = useState<ApiTour[]>([]);
  const [operatorReviews, setOperatorReviews] = useState<OperatorReview[]>([]);
  const [showOperatorReviews, setShowOperatorReviews] = useState(false);
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const [seats, setSeats] = useState(1);
  const [dateGroups, setDateGroups] = useState<Record<number, Group | null>>({});

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
    setSeats(1);

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
          fetch(`${API_URL}/api/reviews?operator_id=${data.operator_id}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((rows) => !cancelled && setOperatorReviews(Array.isArray(rows) ? rows : []))
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

  // Every tour - for the operator's tour count, this tour's other departure
  // dates and "You might also like".
  useEffect(() => {
    fetch(`${API_URL}/api/tours`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAllTours(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

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
      body: JSON.stringify({ tour_id: Number(id), rating: reviewRating, comment: reviewComment.trim() || null }),
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
    fetch(`${API_URL}/api/reviews/${reviewId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
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

  // Current group for this tour - drives seats left and the group box.
  const [group, setGroup] = useState<Group | null>(null);
  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/group-formations?tour_id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [id]);

  // Other departures of the same tour: same operator, same title, still ahead.
  const departures = useMemo(() => {
    if (!tour) return [] as ApiTour[];
    return allTours
      .filter((x) => x.operator_id === tour.operator_id && x.title === tour.title && (x.id === tour.id || !isPastDate(x.date)))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allTours, tour]);
  const shownDepartures = useMemo(() => {
    if (!tour) return [] as ApiTour[];
    const list = departures.slice(0, MAX_DATE_CHIPS);
    // Always keep the open tour visible among the chips.
    if (!list.some((x) => x.id === tour.id)) {
      const self = departures.find((x) => x.id === tour.id);
      if (self) list[list.length - 1] = self;
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [departures, tour]);

  // Seat counts for the other departure chips (this tour's own comes from `group`).
  useEffect(() => {
    shownDepartures
      .filter((d) => tour && d.id !== tour.id && !(d.id in dateGroups))
      .forEach((d) => {
        fetch(`${API_URL}/api/group-formations?tour_id=${d.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((g) => setDateGroups((prev) => ({ ...prev, [d.id]: g })))
          .catch(() => setDateGroups((prev) => ({ ...prev, [d.id]: null })));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownDepartures]);

  // Section tabs: jump on click, and follow the scroll position.
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const goToTab = (tab: TabId) => {
    setActiveTab(tab);
    document.getElementById(`section-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  useEffect(() => {
    if (!tour) return;
    const ids: TabId[] = ['overview', 'itinerary', 'included', 'meeting', 'weather', 'reviews'];
    const onScroll = () => {
      let current: TabId = 'overview';
      for (const tab of ids) {
        const el = document.getElementById(`section-${tab}`);
        if (el && el.getBoundingClientRect().top < 160) current = tab;
      }
      setActiveTab(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tour]);

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

  if (loadingTour) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center text-muted-foreground">
        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
        <p className="text-sm">{t('tourDetail.loadingTour')}</p>
      </div>
    );
  }
  if (!tour) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center text-muted-foreground">
        <p className="text-sm">{t('tourDetail.tourNotFound')}</p>
        <Link href="/tours" className="inline-block mt-3 text-sm font-semibold text-primary hover:underline">
          {t('tourDetail.backToTours')}
        </Link>
      </div>
    );
  }

  // ---- derived values ------------------------------------------------------
  const style = tour.category ? CATEGORY_STYLE[tour.category] : null;
  const hasDeal = typeof tour.discounted_price === 'number';
  const price = tour.discounted_price ?? tour.price;
  const title = tourTitle(tour, locale);
  const place = tour.location ? placeName(tour.location, locale) : '';
  const summary = tourSummary(tour, locale);
  const details = tourDetails(tour, locale);
  const facts = tourFacts(tour);
  const features = parseFeatures(tour.features);
  const paragraphs = details?.description ?? [];
  const visibleParagraphs = showFullDescription ? paragraphs : paragraphs.slice(0, 2);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const starCounts = [5, 4, 3, 2, 1].map((star) => reviews.filter((r) => r.rating === star).length);
  const isNew =
    reviews.length === 0 &&
    !!tour.created_at &&
    Date.now() - new Date(tour.created_at.replace(' ', 'T') + 'Z').getTime() < NEW_FOR_DAYS * 864e5;

  const photos = [tour.photo_url, ...(tour.photos ?? []).map((p) => p.url)]
    .filter((u): u is string => !!u)
    .map((u) => photoSrc(u) ?? u);

  const whatsappUrl =
    operator?.phone && /^\+994\d{9}$/.test(operator.phone)
      ? `https://wa.me/${operator.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
          t('tourDetail.whatsappPrefill', { title, date: formatDate(tour.date, locale) })
        )}`
      : null;
  const instagramUrl = buildInstagramUrl(operator?.instagram);
  const operatorTours = allTours.filter((x) => x.operator_id === tour.operator_id);
  const operatorTourCount = operatorTours.length;
  const isOwnTour = !!operatorProfile && operatorProfile.id === tour.operator_id;
  const isPast = isPastDate(tour.date);

  // Seats and group.
  const groupActive = group && group.status !== 'cancelled';
  const booked = groupActive ? group.current_participants : 0;
  const seatsLeft = Math.max(0, tour.max_participants - booked);
  const groupMin = group?.min_participants ?? tour.min_participants ?? 1;
  const groupConfirmed = group?.status === 'confirmed';
  const withYou = booked + seats;
  const bookHref = `/tours/${tour.id}/book${seats > 1 ? `?seats=${seats}` : ''}`;
  const canBook = !isOwnTour && !isPast && seatsLeft > 0;

  const weekday = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return locale === 'az' ? AZ_WEEKDAYS_SHORT[new Date(y, m - 1, d).getDay()] : formatDate(iso, locale, { weekday: 'short' });
  };

  const dateStatus = (d: ApiTour): { text: string; tone: string } => {
    const g = d.id === tour.id ? group : dateGroups[d.id];
    const taken = g && g.status !== 'cancelled' ? g.current_participants : 0;
    const left = d.max_participants - taken;
    if (left <= 0) return { text: t('ui.td.full'), tone: 'text-muted-foreground' };
    if (left <= FEW_SEATS) return { text: t('ui.td.left', { count: left }), tone: 'text-danger' };
    if (taken > 0) return { text: t('ui.td.joined', { count: taken }), tone: '' };
    return { text: t('ui.td.open'), tone: '' };
  };

  const routeStops =
    tour.route
      ?.split(/\s*(?:->|→|—|–)\s*/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const languages = facts.guide_languages?.map((c) => c.toUpperCase()).join(', ');
  const factCards: { Icon: typeof Clock; label: string; value: string }[] = [
    {
      Icon: Clock,
      label: t('ui.td.duration'),
      value: [dayCount(tour.duration_days, locale, t), facts.duration_hours ? t('ui.td.hours', { count: facts.duration_hours }) : '']
        .filter(Boolean)
        .join(' · '),
    },
    {
      Icon: Users,
      label: t('ui.td.groupSize'),
      value:
        tour.min_participants > 1
          ? t('ui.td.groupRange', { min: tour.min_participants, max: tour.max_participants })
          : t('ui.td.groupUpTo', { max: tour.max_participants }),
    },
  ];
  if (languages) factCards.push({ Icon: Languages, label: t('ui.td.languages'), value: languages });

  const tabs: { id: TabId; labelKey: TranslationKey }[] = [
    { id: 'overview', labelKey: 'ui.tour.tabOverview' },
    { id: 'itinerary', labelKey: 'ui.tour.tabItinerary' },
    { id: 'included', labelKey: 'ui.tour.tabIncluded' },
    { id: 'meeting', labelKey: 'ui.td.tabMeeting' },
    { id: 'weather', labelKey: 'ui.tour.tabWeather' },
    { id: 'reviews', labelKey: 'ui.tour.tabReviews' },
  ];

  // Similar upcoming tours: same place first, then same category.
  const similar = allTours
    .filter((x) => x.id !== tour.id && x.title !== tour.title && !isPastDate(x.date))
    .map((x) => ({ x, score: (x.location === tour.location ? 2 : 0) + (x.category === tour.category ? 1 : 0) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.x.click_count ?? 0) - (a.x.click_count ?? 0))
    .slice(0, 3)
    .map((s) => s.x);

  const refundRows: [TranslationKey, TranslationKey, string][] = [
    ['ui.policy.days7', 'ui.td.refundFull', 'text-success'],
    ['ui.policy.days3', 'ui.td.refundHalf', 'text-warning'],
    ['ui.policy.days0', 'ui.td.refundNone', 'text-danger'],
    ['ui.policy.operatorCancels', 'ui.td.refundFull', 'text-success'],
    ['ui.policy.groupFails', 'ui.td.refundFull', 'text-success'],
  ];

  const bookingButton = isOwnTour ? (
    <p className="text-xs text-muted-foreground text-center bg-muted rounded-xl py-3">{t('tourDetail.ownTourNote')}</p>
  ) : isPast ? (
    <p className="text-center text-sm font-semibold text-muted-foreground bg-muted rounded-xl py-3">{t('tourDetail.tourEnded')}</p>
  ) : seatsLeft <= 0 ? (
    <p className="text-center text-sm font-semibold text-muted-foreground bg-muted rounded-xl py-3">{t('ui.td.noSeats')}</p>
  ) : (
    <Link
      href={bookHref}
      className="flex items-center justify-center w-full bg-[#0F6F80] hover:bg-navy text-white text-sm font-bold py-3.5 rounded-xl transition-colors"
    >
      {t('ui.td.reserve')}
    </Link>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-36 lg:pb-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/tours" className="hover:text-primary">
              {t('ui.td.tours')}
            </Link>
          </li>
          {tour.location && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/tours?location=${encodeURIComponent(tour.location)}`} className="hover:text-primary">
                  {place}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li className="text-foreground font-medium truncate max-w-[50vw]" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4">
        <div className="min-w-0">
          {style && (
            <span className="inline-block text-[11px] font-semibold text-primary bg-primary/10 rounded-md px-2 py-0.5">{t(style.labelKey)}</span>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-navy leading-tight mt-2">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
            {isNew && <span className="text-[11px] font-bold text-[#8A6100] bg-rating/20 rounded-md px-2 py-0.5">{t('ui.td.newTour')}</span>}
            {reviews.length > 0 && (
              <button onClick={() => goToTab('reviews')} className="flex items-center gap-1 hover:text-primary">
                <Star size={14} className="fill-rating text-rating" />
                <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>({t('tourDetail.reviewCount', { count: reviews.length })})
              </button>
            )}
            {place && <span>{place}</span>}
            {operator && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {t('ui.td.by')}{' '}
                  <button onClick={() => setShowOperatorModal(true)} className="font-semibold text-primary hover:underline">
                    {operator.name}
                  </button>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleShare} className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-navy hover:border-primary/40">
            <Share2 size={15} /> {t('ui.td.share')}
          </button>
          <button
            onClick={toggleFavorite}
            aria-pressed={isFavorited}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-navy hover:border-primary/40"
          >
            <Heart size={15} className={isFavorited ? 'fill-danger text-danger' : ''} /> {t(isFavorited ? 'ui.td.saved' : 'ui.td.save')}
          </button>
        </div>
      </div>

      {/* Gallery - only the operator's real photos */}
      <div className="mt-5">
        {photos.length === 0 ? (
          <div className="relative h-64 sm:h-[380px] rounded-2xl overflow-hidden">
            <CategoryMotif category={tour.category} />
          </div>
        ) : photos.length === 1 ? (
          <button onClick={() => setLightboxAt(0)} className="relative block w-full h-64 sm:h-[420px] rounded-2xl overflow-hidden bg-muted">
            <img src={photos[0]} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          </button>
        ) : (
          <div className={`grid gap-2 h-64 sm:h-[420px] ${photos.length >= 5 ? 'grid-cols-4 grid-rows-2' : photos.length >= 3 ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2'}`}>
            {photos.slice(0, 5).map((src, i) => (
              <button
                key={src + i}
                onClick={() => setLightboxAt(i)}
                aria-label={t('ui.td.photoOf', { n: i + 1, total: photos.length })}
                className={`relative overflow-hidden bg-muted rounded-xl ${
                  i === 0 ? (photos.length >= 3 ? 'col-span-2 row-span-2' : '') : 'hidden sm:block'
                }`}
              >
                <img src={src} alt="" loading={i ? 'lazy' : undefined} className="absolute inset-0 w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500" />
              </button>
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setLightboxAt(0)}
              className="absolute -top-14 right-3 flex items-center gap-1.5 bg-white text-navy text-xs font-semibold px-3 py-2 rounded-lg shadow-sm hover:bg-white/90"
            >
              <LayoutGrid size={14} /> {t('ui.td.showAllPhotos', { count: photos.length })}
            </button>
          </div>
        )}
        {hasDeal && (
          <p className="mt-3 inline-flex items-center gap-1 bg-warning text-white text-xs font-bold px-2.5 py-1 rounded-md">
            <Zap size={12} /> {t('tourCard.lastMinuteDeal')}
            {tour.active_deal ? ` −${tour.active_deal.discount_percent}%` : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mt-6 items-start">
        <div className="min-w-0">
          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {factCards.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <Icon size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold text-navy truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Section tabs */}
          <div className="sticky top-14 md:top-16 z-20 bg-background border-b border-border mt-6 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => goToTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'true' : undefined}
                  className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-foreground/65 hover:text-primary'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* About */}
          <Section id="section-overview" title={t('ui.td.about')}>
            {summary && <p className="text-[15px] text-foreground/80 leading-relaxed">{summary}</p>}
            {!summary && paragraphs.length === 0 && tour.description && (
              <p className="text-[15px] text-foreground/80 leading-relaxed">{tour.description}</p>
            )}
            {paragraphs.length > 0 && (
              <div className="mt-3 space-y-3">
                {visibleParagraphs.map((p, i) => (
                  <p key={i} className="text-sm text-foreground/80 leading-relaxed">
                    {p}
                  </p>
                ))}
                {paragraphs.length > 2 && (
                  <button onClick={() => setShowFullDescription((v) => !v)} className="text-sm font-semibold text-primary hover:underline">
                    {showFullDescription ? t('tourDetail.showLess') : t('tourDetail.showMore')}
                  </button>
                )}
              </div>
            )}
            {details && details.highlights.length > 0 && (
              <div className="mt-5">
                <h3 className="text-base font-bold text-navy mb-2">{t('tourDetail.highlights')}</h3>
                <ul className="space-y-1.5">
                  {details.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check size={16} className="text-primary shrink-0 mt-0.5" /> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* Itinerary */}
          <Section id="section-itinerary" title={t('ui.tour.tabItinerary')}>
            {routeStops.length > 0 ? (
              <ol className="relative">
                {routeStops.map((stop, i) => {
                  const edge = i === 0 || i === routeStops.length - 1;
                  return (
                    <li key={`${stop}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < routeStops.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
                      <span
                        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          edge ? 'bg-navy text-white' : 'bg-primary/10 text-navy'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="pt-1">
                        <p className="text-[11px] font-semibold text-primary">{t('ui.td.stop', { n: i + 1 })}</p>
                        <p className="text-sm font-bold text-navy">{stop}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{t('ui.td.noItinerary')}</p>
            )}
          </Section>

          {/* What's included */}
          <Section id="section-included" title={t('tourDetail.whatsIncluded')}>
            {details && (details.includes.length > 0 || details.excludes.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <ul className="space-y-2">
                  {details.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check size={16} className="text-success shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
                <ul className="space-y-2">
                  {details.excludes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/70">
                      <X size={16} className="text-danger shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : features.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOUR_FEATURES.filter((f) => features.includes(f.slug)).map((f) => (
                  <li key={f.slug} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check size={16} className="text-success shrink-0 mt-0.5" /> {t(f.labelKey)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('ui.tour.askOperator')}</p>
            )}

            {details && details.bring.length > 0 && (
              <div className="mt-5 bg-muted/70 rounded-xl px-4 py-3.5">
                <p className="text-sm font-bold text-navy">{t('tourDetail.whatToBring')}</p>
                <p className="text-sm text-foreground/75 mt-1 leading-relaxed">{details.bring.join(', ')}</p>
              </div>
            )}
            {details &&
              (
                [
                  ['tourDetail.notSuitableFor', details.notSuitable],
                  ['tourDetail.notAllowed', details.notAllowed],
                  ['tourDetail.knowBeforeYouGo', details.know],
                ] as [TranslationKey, string[]][]
              )
                .filter(([, items]) => items.length > 0)
                .map(([key, items]) => (
                  <div key={key} className="mt-4">
                    <h3 className="text-sm font-bold text-navy mb-1">{t(key)}</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/75">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
          </Section>

          {/* Meeting point */}
          <Section id="section-meeting" title={t('ui.td.tabMeeting')}>
            <div className="flex items-start gap-3 bg-card border border-border rounded-2xl p-4 sm:p-5">
              <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-primary" />
              </span>
              {details?.meeting ? (
                <div className="min-w-0">
                  <p className="text-sm text-foreground/85 leading-relaxed">{details.meeting}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${details.meeting}, Azerbaijan`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-primary hover:underline"
                  >
                    {t('ui.td.openInMaps')} <ExternalLink size={13} />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-2">{t('ui.td.meetingUnknown')}</p>
              )}
            </div>
          </Section>

          {/* Weather (hidden when there's no forecast for this place/date) */}
          <section id="section-weather" className="scroll-mt-36 mt-10">
            <WeatherForecast
              compact
              heading={t('ui.td.weatherOn', { place: place || '' })}
              location={tour.location}
              date={tour.date}
              durationDays={tour.duration_days}
            />
          </section>

          {/* Cancellation policy - matches backend/src/lib/refundPolicy.js */}
          <Section title={t('ui.td.cancellation')}>
            <dl className="border border-border rounded-2xl divide-y divide-border bg-card">
              {refundRows.map(([label, value, tone]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <dt className="text-foreground/75">{t(label)}</dt>
                  <dd className={`font-bold ${tone}`}>{t(value)}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* Reviews */}
          <Section id="section-reviews">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">{t('tourDetail.reviews')}</h2>
              {eligibility === 'eligible' && !alreadyReviewed && (
                <button onClick={() => setShowReviewForm((v) => !v)} className="text-sm text-primary font-semibold hover:underline">
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
                        <div className="h-full bg-rating rounded-full" style={{ width: `${(starCounts[i] / reviews.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eligibility !== 'loading' && eligibility !== 'eligible' && reviews.length > 0 && (
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
              <div className="text-center border border-dashed border-border rounded-2xl px-6 py-8">
                <Star size={22} className="mx-auto text-navy" strokeWidth={1.5} />
                <p className="text-base font-bold text-navy mt-2">{t('ui.td.noReviewsTitle')}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {t('ui.td.noReviewsBody')}
                  {operator && operatorReviews.length > 0 && <> {t('ui.td.noReviewsOperator', { name: operator.name })}</>}
                </p>
                {operatorReviews.length > 0 && (
                  <button
                    onClick={() => setShowOperatorReviews((v) => !v)}
                    aria-expanded={showOperatorReviews}
                    className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline"
                  >
                    {showOperatorReviews ? t('ui.td.hideOperatorReviews') : t('ui.td.operatorReviews', { count: operatorReviews.length })}
                    <ArrowRight size={14} className={showOperatorReviews ? 'rotate-90 transition-transform' : 'transition-transform'} />
                  </button>
                )}
                {showOperatorReviews && (
                  <ul className="mt-4 text-left divide-y divide-border border-t border-border">
                    {operatorReviews.slice(0, 5).map((r) => (
                      <li key={r.id} className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <StarRow rating={r.rating} size={12} />
                          {r.created_at && <span className="text-xs text-muted-foreground">{formatDate(r.created_at, locale)}</span>}
                        </div>
                        {r.comment && <p className="text-sm text-foreground/80 mt-1">{r.comment}</p>}
                        <Link href={`/tours/${r.tour_id}`} className="text-xs text-primary hover:underline">
                          {titleFromI18n(r.tour_title, r.tour_title_i18n, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
                            <button type="button" onClick={() => setEditingReviewId(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5">
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
                                  <button onClick={() => startEditReview(r)} title={t('tourDetail.editReview')} className="text-muted-foreground hover:text-foreground p-0.5">
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
          </Section>

          {/* Invite friends (group tours only) */}
          {!isPast && (
            <div className="mt-8">
              <GroupInviteCard tourId={tour.id} tourTitle={title} minParticipants={tour.min_participants} maxParticipants={tour.max_participants} />
            </div>
          )}

          {/* Operator */}
          <section id="operator" className="scroll-mt-36 mt-8 bg-muted/60 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 rounded-full bg-[#0F6F80] text-white overflow-hidden flex items-center justify-center text-lg font-bold shrink-0">
                {operator?.photo_url ? (
                  <img src={photoSrc(operator.photo_url) ?? ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  (operator?.name ?? '?').charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('ui.td.yourOperator')}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-lg font-bold text-navy">{operator?.name ?? t('tourCard.defaultOperator')}</p>
                  {operator?.phone_verified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 rounded-md px-2 py-0.5">
                      <BadgeCheck size={12} /> {t('ui.td.phoneVerified')}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[
                    operatorTourCount > 0 ? t('ui.td.tourCount', { count: operatorTourCount }) : '',
                    typeof operator?.rating === 'number' && operator.rating > 0 ? `★ ${operator.rating.toFixed(1)}` : '',
                    operator?.languages
                      ? t('ui.td.speaks', {
                          // Stored as "az,en,tr" (or full names) - show codes as "AZ, EN, TR".
                          langs: operator.languages
                            .split(/\s*,\s*/)
                            .filter(Boolean)
                            .map((l) => (/^[a-z]{2}$/i.test(l) ? l.toUpperCase() : l))
                            .join(', '),
                        })
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {operator && (
                <button onClick={() => setShowOperatorModal(true)} className="shrink-0 text-sm font-semibold text-primary hover:underline">
                  {t('ui.td.viewProfile')} →
                </button>
              )}
            </div>
            {operator?.description && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/80">{operator.description}</p>
            )}
            {(whatsappUrl || instagramUrl) && <div className="flex flex-wrap gap-2 mt-4">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#1F7A45] hover:bg-[#186338] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <MessageCircle size={16} /> {t('tourDetail.messageOnWhatsapp')}
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-border bg-card text-navy text-sm font-semibold px-4 py-2.5 rounded-xl hover:border-primary/40 transition-colors"
                >
                  <AtSign size={16} /> Instagram
                </a>
              )}
            </div>}
          </section>
        </div>

        {/* Booking card */}
        <aside className="lg:sticky lg:top-24 hidden lg:block">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="flex items-baseline gap-1.5">
              {hasDeal && <span className="text-base text-muted-foreground line-through">{formatAzn(tour.price)}</span>}
              <span className="text-3xl font-bold text-navy">{formatAzn(price)}</span>
              <span className="text-sm text-muted-foreground">{t('ui.card.perPerson')}</span>
            </p>

            <p className="text-sm font-bold text-navy mt-5 mb-2">{t('ui.td.chooseDate')}</p>
            <div className="grid grid-cols-3 gap-2">
              {shownDepartures.map((d) => {
                const selected = d.id === tour.id;
                const status = dateStatus(d);
                return (
                  <button
                    key={d.id}
                    onClick={() => !selected && router.push(`/tours/${d.id}`)}
                    aria-current={selected ? 'true' : undefined}
                    className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                      selected ? 'bg-navy border-navy text-white' : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    <span className={`block text-[11px] ${selected ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {weekday(d.date)}
                    </span>
                    <span className="block text-sm font-bold">{formatDate(d.date, locale, { day: 'numeric', month: 'short' })}</span>
                    <span className={`block text-[11px] font-medium ${selected ? 'text-white/80' : status.tone || 'text-muted-foreground'}`}>{status.text}</span>
                  </button>
                );
              })}
              {departures.length > MAX_DATE_CHIPS && (
                <Link
                  href={`/tours?q=${encodeURIComponent(tour.title)}`}
                  className="rounded-xl border border-border flex items-center justify-center text-xs font-semibold text-primary hover:border-primary/40"
                >
                  {t('ui.td.moreDates')}
                </Link>
              )}
            </div>

            {canBook && (
              <div className="flex items-center justify-between mt-5">
                <div>
                  <p className="text-sm font-bold text-navy">{t('ui.td.travellers')}</p>
                  <p className="text-xs text-muted-foreground">{t('ui.td.maxPerGroup', { max: tour.max_participants })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSeats((n) => Math.max(1, n - 1))}
                    disabled={seats <= 1}
                    aria-label={t('ui.td.fewer')}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:border-primary/40 disabled:opacity-40"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-5 text-center text-base font-bold text-navy" aria-live="polite">
                    {seats}
                  </span>
                  <button
                    onClick={() => setSeats((n) => Math.min(seatsLeft, n + 1))}
                    disabled={seats >= seatsLeft}
                    aria-label={t('ui.td.more')}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:border-primary/40 disabled:opacity-40"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            )}

            {canBook && groupMin > 1 && (
              <div className="mt-4 bg-muted/70 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-navy">
                  <span>
                    {groupConfirmed
                      ? t('ui.td.groupAlready')
                      : withYou >= groupMin
                        ? t('ui.td.groupWithYou')
                        : t('ui.td.groupNeedsMore', { count: groupMin - withYou })}
                  </span>
                  <span className="text-muted-foreground font-semibold">{t('ui.td.minProgress', { current: Math.min(withYou, groupMin), min: groupMin })}</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${groupConfirmed || withYou >= groupMin ? 'bg-success' : 'bg-warning'}`}
                    style={{ width: `${Math.min(100, (withYou / groupMin) * 100)}%` }}
                  />
                </div>
                {!groupConfirmed && <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{t('ui.td.groupFailNote', { min: groupMin })}</p>}
              </div>
            )}

            {canBook && (
              <div className="flex items-center justify-between border-t border-border mt-4 pt-4 text-sm">
                <span className="text-muted-foreground">
                  {formatAzn(price)} × {seats}
                </span>
                <span className="text-lg font-bold text-navy">{formatAzn(price * seats)}</span>
              </div>
            )}

            <div className="mt-4">{bookingButton}</div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-success mt-3">
              <ShieldCheck size={13} /> {t('ui.td.freeCancel')}
            </p>
          </div>
          {!isOwnTour && (
            <p className="text-center mt-4">
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                  {t('ui.td.questions')}
                </a>
              ) : (
                <a href="#operator" className="text-sm font-semibold text-primary hover:underline">
                  {t('ui.td.questions')}
                </a>
              )}
            </p>
          )}
        </aside>
      </div>

      {/* You might also like */}
      {similar.length > 0 && (
        <section className="mt-14 pt-8 border-t border-border">
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-navy">{t('ui.td.alsoLike')}</h2>
            {tour.location && (
              <Link href={`/tours?location=${encodeURIComponent(tour.location)}`} className="text-sm font-semibold text-primary hover:underline shrink-0">
                {t('ui.td.moreIn', { place })} →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {similar.map((x) => (
              <Link key={x.id} href={`/tours/${x.id}`} className="group block">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
                  {x.photo_url ? (
                    <img src={photoSrc(x.photo_url) ?? ''} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <CategoryMotif category={x.category} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {placeName(x.location, locale)} · {dayCount(x.duration_days, locale, t)}
                </p>
                <p className="text-sm font-bold text-navy group-hover:text-primary line-clamp-1">{tourTitle(x, locale)}</p>
                <p className="text-sm text-foreground/80">
                  <span className="font-bold">{formatAzn(x.discounted_price ?? x.price)}</span>{' '}
                  <span className="text-xs text-muted-foreground">{t('ui.card.perPerson')}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showOperatorModal && operator && (
        <OperatorProfileModal
          operator={operator}
          tours={operatorTours.length > 0 ? operatorTours : [tour]}
          reviews={operatorReviews}
          currentTourId={tour.id}
          onClose={closeOperatorModal}
        />
      )}
      {lightboxAt !== null && photos.length > 0 && <Lightbox photos={photos} start={lightboxAt} title={title} onClose={() => setLightboxAt(null)} />}

      {/* Mobile / tablet booking bar */}
      <div className="fixed bottom-16 md:bottom-0 lg:hidden inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{weekday(tour.date)}, {formatDate(tour.date, locale, { day: 'numeric', month: 'short' })}</p>
            <p className="text-lg font-bold text-navy">
              {formatAzn(price)} <span className="text-xs font-normal text-muted-foreground">{t('ui.card.perPerson')}</span>
            </p>
          </div>
          {canBook ? (
            <Link href={bookHref} className="bg-[#0F6F80] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-navy">
              {t('ui.td.reserve')}
            </Link>
          ) : (
            <div className="flex-1 max-w-[60%]">{bookingButton}</div>
          )}
        </div>
      </div>
    </div>
  );
}
