'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Globe2,
  Heart,
  AtSign,
  Languages,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { CATEGORY_STYLE, CategoryMotif, dayCount, type ApiTour } from '@/app/components/TourCard';
import { useFavorites } from '@/app/lib/useFavorites';
import { formatAzn, formatDate, isPastDate } from '@/app/lib/format';
import { instagramUrl } from '@/app/lib/instagram';
import { photoSrc } from '@/app/lib/photo';
import { placeName, tourTitle } from '@/app/lib/tourContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Operator {
  id: number;
  name: string;
  description?: string | null;
  languages?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  phone_verified?: number | boolean | null;
  instagram?: string | null;
  rating?: number | null;
  created_at?: string | null;
}

interface ProfileReview {
  id: number;
  tour_id: number;
  rating: number;
  comment: string | null;
  created_at?: string;
  reviewer_name?: string;
  tour_title: string;
  tour_title_i18n?: string | null;
  tour_photo?: string | null;
}

interface ReviewSummary {
  total: number;
  ratingCounts: Record<number, number>;
  reviews: ProfileReview[];
}

function languageList(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // Older profiles store this as a comma or slash separated string.
  }
  return value.split(/[,/|]/).map((item) => item.trim()).filter(Boolean);
}

function initials(name?: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function OperatorProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { t, locale } = useLanguage();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [servedAreas, setServedAreas] = useState<string[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ total: 0, ratingCounts: {}, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setOperator(null);
    setTours([]);
    setServedAreas([]);
    setSummary({ total: 0, ratingCounts: {}, reviews: [] });
    setShowAllReviews(false);
    Promise.all([
      fetch(`${API_URL}/api/operators/${encodeURIComponent(id)}`, { signal: controller.signal }),
      fetch(`${API_URL}/api/tours`, { signal: controller.signal }).catch(() => null),
      fetch(`${API_URL}/api/reviews/operator/${encodeURIComponent(id)}/summary`, { signal: controller.signal }).catch(() => null),
    ])
      .then(async ([operatorResponse, toursResponse, reviewsResponse]) => {
        if (!operatorResponse.ok) {
          setOperator(null);
          return;
        }
        const [operatorData, toursData, summaryData] = await Promise.all([
          operatorResponse.json(),
          toursResponse && toursResponse.ok ? toursResponse.json() : [],
          reviewsResponse && reviewsResponse.ok ? reviewsResponse.json() : null,
        ]);
        setOperator(operatorData);
        const operatorTours: ApiTour[] = Array.isArray(toursData)
          ? toursData.filter((tour: ApiTour) => tour.operator_id === operatorData.id)
          : [];
        setServedAreas(Array.from(new Set(operatorTours
          .map((tour) => tour.location?.trim())
          .filter((location): location is string => Boolean(location)))));
        setTours(operatorTours.filter((tour) => !isPastDate(tour.date)));
        if (summaryData) {
          setSummary({
            total: Number(summaryData.total) || 0,
            ratingCounts: summaryData.ratingCounts ?? {},
            reviews: Array.isArray(summaryData.reviews) ? summaryData.reviews : [],
          });
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setOperator(null);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    try {
      const savedIds: string[] = JSON.parse(localStorage.getItem('turpoint:saved-operators') || '[]');
      setSaved(savedIds.includes(String(id)));
    } catch {
      setSaved(false);
    }
  }, [id]);

  const languages = useMemo(() => languageList(operator?.languages), [operator?.languages]);
  const areas = useMemo(() => servedAreas.map((area) => placeName(area, locale)), [servedAreas, locale]);
  const rating = useMemo(() => {
    if (!summary.total) return Number(operator?.rating) || 0;
    const weighted = [1, 2, 3, 4, 5].reduce((total, stars) => total + stars * (Number(summary.ratingCounts[stars]) || 0), 0);
    return weighted / summary.total;
  }, [operator?.rating, summary]);
  const profilePhoto = photoSrc(operator?.photo_url);
  const heroPhoto = photoSrc(tours.find((tour) => tour.photo_url)?.photo_url);
  const profileUrl = instagramUrl(operator?.instagram);
  const phone = operator?.phone?.trim();
  const verified = operator?.phone_verified === true || Number(operator?.phone_verified) === 1;
  const displayedReviews = showAllReviews ? summary.reviews : summary.reviews.slice(0, 3);

  function toggleSavedProfile() {
    const next = !saved;
    setSaved(next);
    try {
      const current: string[] = JSON.parse(localStorage.getItem('turpoint:saved-operators') || '[]');
      const values = new Set(current.map(String));
      if (next) values.add(String(id));
      else values.delete(String(id));
      localStorage.setItem('turpoint:saved-operators', JSON.stringify([...values]));
    } catch {
      // Keep the button usable for this visit even if browser storage is disabled.
    }
  }

  if (loading) {
    return <main className="min-h-[60vh] flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-3" size={20} />{t('ui.operatorPage.loading')}</main>;
  }
  if (!operator) {
    return <main className="min-h-[55vh] px-5 flex flex-col items-center justify-center text-center"><p className="text-lg font-semibold text-navy">{t('ui.operatorPage.notFound')}</p><Link href="/tours" className="mt-4 text-primary font-semibold">{t('ui.operatorPage.viewAllTours')} →</Link></main>;
  }

  return (
    <main className="bg-white text-navy">
      <section className="relative min-h-[300px] md:min-h-[340px] overflow-hidden bg-[#143342]">
        {heroPhoto ? <img src={heroPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#153c4c] via-[#25596a] to-[#102b3b]" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071d2b]/90 via-[#071d2b]/65 to-[#071d2b]/20" />
        <div className="relative mx-auto flex min-h-[300px] max-w-7xl items-end px-5 pb-8 pt-10 md:min-h-[340px] md:px-10 md:pb-10">
          <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 items-end gap-5">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lg md:h-28 md:w-28">
                {profilePhoto ? <img src={profilePhoto} alt={`${operator.name} logo`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-[#eef6f6] text-3xl font-bold text-primary">{initials(operator.name)}</div>}
              </div>
              <div className="min-w-0 text-white">
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                  {verified ? <><ShieldCheck size={13} />{t('ui.td.phoneVerified')}</> : t('ui.operatorPage.role')}
                </p>
                <h1 className="text-3xl font-bold leading-tight md:text-4xl">{operator.name}</h1>
                <p className="mt-1 max-w-2xl text-sm text-white/85 md:text-base">{operator.description?.trim() || t('ui.operatorPage.aboutFallback')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
                  {areas.length > 0 && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{areas.slice(0, 2).join(', ')}</span>}
                  <span>{t('ui.td.tourCount', { count: tours.length })}</span>
                  {rating > 0 && <span className="inline-flex items-center gap-1.5"><Star size={15} className="fill-rating text-rating" />{rating.toFixed(1)} <span className="text-white/70">({summary.total})</span></span>}
                </div>
              </div>
            </div>
            <button type="button" onClick={toggleSavedProfile} aria-pressed={saved} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-white/75 bg-black/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:self-end">
              <Heart size={17} className={saved ? 'fill-white' : ''} />{t(saved ? 'ui.operatorPage.savedProfile' : 'ui.operatorPage.saveProfile')}
            </button>
          </div>
        </div>
      </section>

      <nav aria-label="Tour operator profile sections" className="sticky top-14 z-30 border-b border-border bg-white/95 backdrop-blur md:top-16">
        <div className="mx-auto flex max-w-7xl gap-7 overflow-x-auto px-5 md:px-10">
          {([
            ['about', 'ui.operatorPage.aboutTab'],
            ['tours', 'ui.operatorPage.toursTab'],
            ['reviews', 'ui.operatorPage.reviewsTab'],
            ['contact', 'ui.operatorPage.contactTab'],
          ] as const).map(([section, label]) => <a key={section} href={`#${section}`} className="whitespace-nowrap border-b-2 border-transparent py-4 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary">{t(label)}</a>)}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-10 md:pt-10">
        <section id="about" className="scroll-mt-28 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 md:scroll-mt-32">
          <div>
            <h2 className="text-2xl font-bold">{t('ui.operatorPage.aboutTitle', { name: operator.name })}</h2>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-foreground/75">{operator.description?.trim() || t('ui.operatorPage.aboutFallback')}</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Feature icon={<MapPin size={20} />} title={t('ui.operatorProfile.areasServed')} text={areas.length ? areas.slice(0, 2).join(', ') : t('ui.operatorPage.noAreas')} />
              <Feature icon={<Languages size={20} />} title={t('ui.operatorProfile.languages')} text={languages.length ? languages.join(', ') : '—'} />
              <Feature icon={<ShieldCheck size={20} />} title={t('ui.operatorPage.phoneStatus')} text={verified ? t('ui.td.phoneVerified') : t('ui.operatorPage.notVerified')} />
              <Feature icon={<Heart size={20} />} title={t('ui.operatorPage.toursTab')} text={t('ui.td.tourCount', { count: tours.length })} />
            </div>
          </div>
          <aside className="rounded-2xl bg-[#eff7f7] p-6">
            <h3 className="mb-5 text-base font-bold">{t('ui.operatorPage.profileAtGlance')}</h3>
            <div className="space-y-5">
              <InfoRow icon={<MapPin size={20} />} label={t('ui.operatorProfile.areasServed')} value={areas.length ? areas.join(', ') : t('ui.operatorPage.noAreas')} />
              <InfoRow icon={<Globe2 size={20} />} label={t('ui.operatorProfile.languages')} value={languages.length ? languages.join(' · ') : '—'} />
              {operator.created_at && <InfoRow icon={<CalendarDays size={20} />} label={t('ui.operatorPage.memberSince')} value={formatDate(operator.created_at, locale, { month: 'short', year: 'numeric' })} />}
              {phone && <InfoRow icon={<Phone size={20} />} label={t('ui.operatorPage.phoneLabel')} value={phone} />}
            </div>
          </aside>
        </section>

        <section id="tours" className="scroll-mt-28 mt-14 md:scroll-mt-32">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-2xl font-bold">{t('ui.operatorPage.toursTitle', { name: operator.name })}</h2><p className="mt-1 text-sm text-muted-foreground">{t('ui.td.tourCount', { count: tours.length })}</p></div>
            <Link href="/tours" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{t('ui.operatorPage.viewAllTours')} <ArrowRight size={15} /></Link>
          </div>
          {tours.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => {
              const category = CATEGORY_STYLE[tour.category ?? ''];
              const categoryLabel = category ? t(category.labelKey) : t('ui.operatorPage.toursTab');
              return <article key={tour.id} className="group overflow-hidden rounded-xl border border-border bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                <Link href={`/tours/${tour.id}`} className="block">
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {tour.photo_url ? <img src={photoSrc(tour.photo_url) ?? ''} alt={tourTitle(tour, locale)} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <CategoryMotif category={tour.category} />}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold">{categoryLabel}</span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold">{dayCount(tour.duration_days, locale, t)}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 min-h-11 font-bold leading-snug group-hover:text-primary">{tourTitle(tour, locale)}</h3>
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} />{placeName(tour.location, locale)}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="font-bold">{formatAzn(tour.discounted_price ?? tour.price)} <span className="font-normal text-muted-foreground">{t('ui.card.perPerson')}</span></p>
                      {Number(tour.rating) > 0 && <span className="inline-flex items-center gap-1 text-sm font-semibold"><Star size={14} className="fill-rating text-rating" />{Number(tour.rating).toFixed(1)} <span className="font-normal text-muted-foreground">({tour.review_count ?? 0})</span></span>}
                    </div>
                  </div>
                </Link>
                <div className="border-t border-border px-4 py-2.5 text-right">
                  <button type="button" onClick={() => toggleFavorite(tour.id)} aria-pressed={favoriteIds.has(tour.id)} aria-label={t(favoriteIds.has(tour.id) ? 'tourCard.removeFromFavorites' : 'tourCard.addToFavorites')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-danger">
                    <Heart size={15} className={favoriteIds.has(tour.id) ? 'fill-danger text-danger' : ''} />{t(favoriteIds.has(tour.id) ? 'ui.td.saved' : 'ui.td.save')}
                  </button>
                </div>
              </article>;
            })}
          </div> : <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">{t('ui.operatorPage.noTours')}</div>}
        </section>

        <section id="reviews" className="scroll-mt-28 mt-14 md:scroll-mt-32">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-2xl font-bold">{t('ui.operatorPage.reviewsTitle')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('ui.operatorPage.reviewCount', { count: summary.total })}</p></div>
            {summary.reviews.length > 3 && <button type="button" onClick={() => setShowAllReviews((value) => !value)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{t(showAllReviews ? 'ui.operatorPage.showFewerReviews' : 'ui.operatorPage.viewAllReviews')} <ArrowRight size={15} /></button>}
          </div>
          {summary.total > 0 ? <div className="grid gap-5 rounded-2xl bg-[#f1f7f7] p-4 md:grid-cols-[220px_minmax(0,1fr)] md:p-6">
            <div className="border-b border-border/70 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-6">
              <p className="text-4xl font-bold">{rating.toFixed(1)} <span className="text-2xl text-primary">☆</span></p>
              <StarRating rating={rating} />
              <p className="mt-2 text-xs text-muted-foreground">{t('ui.operatorPage.reviewCount', { count: summary.total })}</p>
              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = Number(summary.ratingCounts[stars]) || 0;
                  const percent = summary.total ? (count / summary.total) * 100 : 0;
                  return <div key={stars} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-5">{stars} ★</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div><span className="w-8 text-right">{Math.round(percent)}%</span></div>;
                })}
              </div>
            </div>
            {displayedReviews.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {displayedReviews.map((review) => <article key={review.id} className="flex flex-col rounded-xl bg-white p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d7eef0] text-xs font-bold text-navy">{initials(review.reviewer_name)}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{review.reviewer_name || t('ui.operatorPage.traveler')}</p><p className="text-xs text-muted-foreground">{formatDate(review.created_at, locale)}</p></div>
                </div>
                <StarRating rating={review.rating} className="mt-2" />
                <p className="mt-2 line-clamp-4 flex-1 text-sm leading-6 text-foreground/75">{review.comment}</p>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  {review.tour_photo && <img src={photoSrc(review.tour_photo) ?? ''} alt="" className="h-9 w-12 rounded-md object-cover" />}
                  <p className="line-clamp-2 text-xs font-medium">{tourTitle({ title: review.tour_title, title_i18n: review.tour_title_i18n }, locale)}</p>
                </div>
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#e9f6f1] px-2.5 py-1 text-[11px] font-medium text-emerald-800"><CheckCircle2 size={12} />{t('ui.operatorPage.verifiedBooking')}</span>
              </article>)}
            </div> : <p className="flex items-center justify-center rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">{t('ui.operatorPage.noReviews')}</p>}
          </div> : <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">{t('ui.operatorPage.noReviews')}</div>}
        </section>

        <section id="contact" className="scroll-mt-28 mt-14 rounded-2xl border border-border bg-white p-6 md:flex md:items-center md:justify-between md:p-8 md:scroll-mt-32">
          <div><h2 className="text-2xl font-bold">{t('ui.operatorPage.contactTitle')}</h2><p className="mt-2 text-sm text-muted-foreground">{t('ui.operatorPage.contactHint')}</p></div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            {phone && <a href={`tel:${phone}`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"><Phone size={16} />{phone}</a>}
            {profileUrl && <a href={profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"><AtSign size={16} />Instagram</a>}
            {!phone && !profileUrl && <p className="text-sm text-muted-foreground">{t('ui.operatorPage.noContact')}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="min-w-0"><span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf4f4] text-primary">{icon}</span><p className="text-sm font-bold">{title}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{text}</p></div>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 shrink-0 text-primary">{icon}</span><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{value}</p></div></div>;
}

function StarRating({ rating, className = '' }: { rating: number; className?: string }) {
  return <div className={`flex items-center gap-0.5 text-rating ${className}`} aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className={star <= Math.round(rating) ? 'fill-current' : 'text-border'} />)}</div>;
}
