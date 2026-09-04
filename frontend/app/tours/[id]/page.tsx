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
  Clock,
  MessageSquare,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import { CATEGORY_STYLE } from '../../components/TourCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Link from 'next/link';
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
 
interface Tour {
  id: number;
  operator_id: number;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  route: string | null;
  price: number;
  date: string;
  duration_days: number;
  min_participants: number;
  max_participants: number;
  discounted_price?: number;
  active_deal?: { discount_percent: number; expires_at: string };
}
 
interface Operator {
  id: number;
  name: string;
  rating?: number;
  description?: string;
  languages?: string;
  vehicle_features?: string;
}
 
interface GroupFormation {
  id: number;
  tour_id: number;
  total_cost: number;
  min_participants: number;
  current_participants: number;
  price_per_person: number;
  status: 'waiting' | 'forming' | 'confirmed' | 'cancelled';
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
          className={n <= Math.round(rating) ? 'fill-primary text-primary' : 'text-border'}
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
 
  const [tour, setTour] = useState<Tour | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [group, setGroup] = useState<GroupFormation | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
 
  const [loadingTour, setLoadingTour] = useState(true);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [groupError, setGroupError] = useState<string | null>(null);
 
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
 
  // Reviews are gated on the backend to travelers with a *confirmed*
  // booking on this specific tour (Sprint 4 hardening - see reviews.js).
  // The old form here predated that and just took a free-text name/email,
  // which the backend no longer accepts at all - so this checks eligibility
  // up front and reflects it in the UI, instead of letting someone fill out
  // a form that's guaranteed to fail.
  const [eligibility, setEligibility] = useState<'loading' | 'eligible' | 'not-eligible' | 'not-logged-in'>(
    'loading'
  );
 
  const fetchReviews = useCallback(() => {
    if (!id) return;
    fetch(`${API_URL}/api/reviews?tour_id=${id}`)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [id]);
 
  useEffect(() => {
    if (!id) return;
    if (!token) {
      setEligibility('not-logged-in');
      return;
    }
    setEligibility('loading');
    fetch(`${API_URL}/api/bookings/my-trips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((bookings) => {
        const hasConfirmed = Array.isArray(bookings)
          ? bookings.some((b: any) => b.tour_id === Number(id) && b.status === 'confirmed')
          : false;
        setEligibility(hasConfirmed ? 'eligible' : 'not-eligible');
      })
      .catch(() => setEligibility('not-eligible'));
  }, [id, token]);
 
  const alreadyReviewed = user ? reviews.some((r) => r.user_id === user.id) : false;
 
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
 
    setLoadingGroup(true);
    setGroupError(null);
    setGroup(null);
    // GET /api/group-formations?tour_id=... returns a single group object
    // (or null) for that tour, never an array - the endpoint doesn't
    // support an unfiltered "list every group" call. Passing tour_id here
    // mirrors the same fix already applied on the booking checkout page.
    fetch(`${API_URL}/api/group-formations?tour_id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((currentGroup) => {
        if (cancelled) return;
        if (currentGroup) setGroup(currentGroup);
        else setGroupError('No group formation available for this tour yet.');
      })
      .catch(() => !cancelled && setGroupError('Could not load group status.'))
      .finally(() => !cancelled && setLoadingGroup(false));
 
    fetchReviews();
 
    return () => {
      cancelled = true;
    };
  }, [id, fetchReviews]);
 
  const handleSubmitReview = (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setReviewError('You need to be logged in to leave a review.');
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
        if (!r.ok) throw new Error(data?.error || 'Could not submit the review.');
        setReviews((prev) => [data, ...prev]);
        if (typeof data.operator_new_rating === 'number') {
          setOperator((prev) => (prev ? { ...prev, rating: data.operator_new_rating } : prev));
        }
        setReviewComment('');
        setReviewRating(5);
        setShowReviewForm(false);
        showToast('Review submitted.');
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
        if (!r.ok) throw new Error(data?.error || 'Could not update the review.');
        setReviews((prev) => prev.map((r2) => (r2.id === reviewId ? data : r2)));
        if (typeof data.operator_new_rating === 'number') {
          setOperator((prev) => (prev ? { ...prev, rating: data.operator_new_rating } : prev));
        }
        setEditingReviewId(null);
        showToast('Review updated.');
      })
      .catch((err) => setEditError(err.message))
      .finally(() => setEditSubmitting(false));
  };

  const handleDeleteReview = (reviewId: number) => {
    if (!token) return;
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    setDeletingReviewId(reviewId);
    fetch(`${API_URL}/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Could not delete the review.');
        setReviews((prev) => prev.filter((r2) => r2.id !== reviewId));
        if (typeof data.operator_new_rating === 'number') {
          setOperator((prev) => (prev ? { ...prev, rating: data.operator_new_rating } : prev));
        }
        showToast('Review deleted.');
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setDeletingReviewId(null));
  };
 
  const style = CATEGORY_STYLE[tour?.category ?? ''] ?? CATEGORY_STYLE.history;
  const Icon = style.Icon;
  const hasDeal = typeof tour?.discounted_price === 'number';
  const routeSteps = tour?.route
    ? tour.route.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : [];
 
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const starCounts = [5, 4, 3, 2, 1].map((star) => reviews.filter((r) => r.rating === star).length);
  const progressPct = group
    ? Math.min(100, Math.round((group.current_participants / group.min_participants) * 100))
    : 0;
 
  return (
    <div className="min-h-full">
      <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft size={16} /> Back to tours
        </button>
      </div>
 
      {loadingTour && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading tour...</p>
        </div>
      )}
 
      {!loadingTour && !tour && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center text-muted-foreground">
          <p className="text-sm">Tour not found.</p>
        </div>
      )}
 
      {!loadingTour && tour && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-32">
          {/* Hero */}
          <div
            className={`relative h-48 sm:h-56 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center mb-5 overflow-hidden`}
          >
            <Icon size={64} className="text-white/60" />
            {hasDeal && (
              <span className="absolute top-3 left-3 flex items-center gap-1 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                <Zap size={11} /> Last-minute deal
              </span>
            )}
            <span className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full">
              {style.label}
            </span>
          </div>
 
          {/* Title & meta */}
          <h1
            className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {tour.title}
          </h1>
 
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
            {tour.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {tour.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={14} /> {formatDate(tour.date)} · {tour.duration_days} day
              {tour.duration_days !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {tour.min_participants}–{tour.max_participants} people
            </span>
          </div>
 
          {/* Operator */}
          <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {(operator?.name ?? 'T').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {operator?.name ?? 'TurPoint operator'}
              </p>
              {typeof operator?.rating === 'number' && operator.rating > 0 ? (
                <div className="flex items-center gap-1.5">
                  <StarRow rating={operator.rating} />
                  <span className="text-xs text-muted-foreground">{operator.rating.toFixed(1)}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No ratings yet</p>
              )}
              {operator?.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{operator.description}</p>
              )}
              {operator?.languages && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {operator.languages
                    .split(',')
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((lang) => (
                      <span
                        key={lang}
                        className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
 
          {/* Description */}
          {tour.description && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-foreground mb-1.5">About this tour</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">{tour.description}</p>
            </div>
          )}
 
          {/* Route / itinerary */}
          {routeSteps.length > 0 && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-foreground mb-1.5">Route & itinerary</h2>
              {routeSteps.length > 1 ? (
                <ol className="space-y-1.5">
                  {routeSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">{routeSteps[0]}</p>
              )}
            </div>
          )}
 
          {/* Join a group — the core differentiator, given visual weight */}
          <div className="mb-6 rounded-2xl border-2 border-primary/25 bg-primary/[0.04] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users size={15} className="text-primary" /> Join a group
              </h2>
              {group && (
                <span
                  className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    group.status === 'confirmed'
                      ? 'bg-accent/15 text-accent'
                      : group.status === 'cancelled'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/15 text-primary'
                  }`}
                >
                  {group.status === 'confirmed' && <CheckCircle2 size={10} />}
                  {(group.status === 'waiting' || group.status === 'forming') && <Clock size={10} />}
                  {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                </span>
              )}
            </div>
 
            {loadingGroup && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Checking group status...
              </p>
            )}
 
            {!loadingGroup && groupError && !group && (
              <p className="text-xs text-muted-foreground">{groupError}</p>
            )}
 
            {group && (
              <>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      group.status === 'confirmed' ? 'bg-accent' : 'bg-primary'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{group.current_participants}</span>{' '}
                    of {group.min_participants} joined to confirm
                  </p>
                  <p className="text-sm font-bold text-primary">
                    AZN{group.price_per_person}
                    <span className="text-[10px] font-normal text-muted-foreground">/pp</span>
                  </p>
                </div>
 
                {(group.status === 'waiting' || group.status === 'forming') && (
                  <p className="text-xs text-muted-foreground">
                    Book your seats below to help this group reach its minimum.
                  </p>
                )}
 
                {group.status === 'confirmed' && (
                  <p className="text-xs text-accent font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Minimum reached — this group is confirmed. Booking flow
                    is coming soon.
                  </p>
                )}
 
                {group.status === 'cancelled' && (
                  <p className="text-xs text-muted-foreground">
                    This group didn&apos;t reach the minimum in time and was cancelled.
                  </p>
                )}
              </>
            )}
          </div>
 
          {/* Reviews */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare size={15} /> Reviews
              </h2>
              {eligibility === 'eligible' && !alreadyReviewed && (
                <button
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  {showReviewForm ? 'Cancel' : 'Write a review'}
                </button>
              )}
            </div>
 
            {reviews.length > 0 && (
              <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-3 mb-3">
                <div className="text-center shrink-0">
                  <p className="text-2xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
                  <StarRow rating={avgRating} size={11} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {reviews.length} review{reviews.length !== 1 ? 's' : ''}
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
                  Log in
                </Link>{' '}
                and complete a booking on this tour to leave a review.
              </p>
            )}
            {eligibility === 'not-eligible' && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2.5 mb-3">
                Only travelers with a confirmed booking on this tour can leave a review.
              </p>
            )}
            {eligibility === 'eligible' && alreadyReviewed && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2.5 mb-3">
                You&apos;ve already reviewed this tour.
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
                        className={n <= reviewRating ? 'fill-primary text-primary' : 'text-border'}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how the tour went..."
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
                  {reviewSubmitting ? 'Submitting...' : 'Submit review'}
                </button>
              </form>
            )}
 
            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No reviews yet — be the first to share your experience.
              </p>
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
                                  className={n <= editRating ? 'fill-primary text-primary' : 'text-border'}
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
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingReviewId(null)}
                              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5"
                            >
                              Cancel
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
                                    title="Edit review"
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReview(r.id)}
                                    disabled={deletingReviewId === r.id}
                                    title="Delete review"
                                    className="text-muted-foreground hover:text-red-600 disabled:opacity-40 p-0.5"
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
      )}
 
      {/* Sticky bottom price / CTA bar */}
      {!loadingTour && tour && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Per person</p>
              <p className="text-lg font-bold text-primary">
                AZN{group?.price_per_person ?? tour.discounted_price ?? tour.price}
              </p>
            </div>
            {group && (group.status === 'waiting' || group.status === 'forming') ? (
              <Link
                href={`/tours/${tour.id}/book`}
                className="flex-1 max-w-[220px] bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2"
              >
                Join Group
              </Link>
            ) : (
               <Link
              href={`/tours/${tour.id}/book`}
              className="flex-1 max-w-[220px] bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2"
            >
              Book Now
            </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}