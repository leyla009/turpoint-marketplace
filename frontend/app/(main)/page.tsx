'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  MapPin, ChevronRight, MessageCircle, ShieldCheck,
  Sparkles, Star, CalendarRange, Zap,
} from 'lucide-react';
import { type ApiTour, CATEGORY_STYLE } from '@/app/components/TourCard';
import HeroSlideshow from '@/app/components/HeroSlideshow';
import HeroSearchBar from '@/app/components/HeroSearchBar';
import DestinationMosaic from '@/app/components/home/DestinationMosaic';
import PopularNow from '@/app/components/home/PopularNow';
import WeatherPanel from '@/app/components/home/WeatherPanel';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useFavorites } from '@/app/lib/useFavorites';
import { formatDate } from '@/app/lib/format';
import { placeName, titleFromI18n } from '@/app/lib/tourContent';
import type { TranslationKey } from '@/app/lib/translations';

const DestinationMap = dynamic(() => import('@/app/components/DestinationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-72 rounded-xl border border-border bg-muted animate-pulse" />,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface RecentReview {
  id: number;
  tour_id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name: string;
  tour_title: string;
  tour_title_i18n?: string | null;
}

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline shrink-0">
          {linkLabel} <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}

// "Sarah K." style - first name plus last initial, never a full surname.
function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const [tours, setTours] = useState<ApiTour[]>([]);
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetch(`${API_URL}/api/tours`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTours(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch(`${API_URL}/api/reviews/recent?limit=3`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const dealCount = useMemo(() => tours.filter((t) => typeof t.discounted_price === 'number').length, [tours]);
  const multiDayCount = useMemo(() => tours.filter((t) => t.duration_days > 1).length, [tours]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tours.forEach((t) => {
      if (t.category) counts[t.category] = (counts[t.category] ?? 0) + 1;
    });
    return counts;
  }, [tours]);

  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-12 space-y-10 md:space-y-14">
      {/* Hero - photo panel with the search bar overlapping its bottom edge.
          The bar sits outside the photo's overflow-hidden box so it isn't
          clipped where it straddles the edge. */}
      <section className="relative">
        <div className="relative rounded-2xl overflow-hidden bg-navy">
          <div className="absolute inset-0">
            <HeroSlideshow />
            <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-navy/20" />
          </div>
          <div className="relative px-5 sm:px-10 pt-12 pb-20 sm:pt-20 sm:pb-24 md:pt-24 md:pb-28">
            {firstName && <p className="text-sm font-medium text-white/80 mb-2">{t('ui.home.hello', { name: firstName })}</p>}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight max-w-3xl drop-shadow-sm">
              {t('ui.home.heroTitle1')}
              <br />
              {t('ui.home.heroTitle2')}
            </h1>
            <p className="text-sm sm:text-base text-white/85 mt-3 max-w-md">{t('ui.home.heroSubtitle')}</p>
          </div>
        </div>
        <div className="relative z-10 -mt-14 md:-mt-11 px-2 sm:px-4 lg:px-6">
          <HeroSearchBar />
        </div>
      </section>

      <DestinationMosaic tours={tours} />

      <PopularNow tours={tours} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />

      {/* Last-minute deals banner - only when real deals exist */}
      {dealCount > 0 && (
        <section className="relative rounded-2xl overflow-hidden bg-navy">
          <img src="/pictures/U3.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-navy/20" />
          <div className="relative px-6 sm:px-10 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white">
                <Zap size={18} className="text-rating" /> {t('home.lastMinuteDeals')}
              </p>
              <p className="text-sm text-white/80 mt-1">{t('ui.home.dealsBody', { count: dealCount })}</p>
            </div>
            <Link
              href="/tours?deals=1"
              className="self-start sm:self-auto bg-white text-navy text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
            >
              {t('ui.home.viewDeals')}
            </Link>
          </div>
        </section>
      )}

      {/* Explore by category */}
      <section>
        <SectionHeader title={t('ui.home.exploreByCategory')} />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ...Object.entries(CATEGORY_STYLE).map(([key, s]) => ({
              key,
              Icon: s.Icon,
              label: t(s.labelKey),
              count: categoryCounts[key] ?? 0,
            })),
            { key: 'multiday', Icon: CalendarRange, label: t('ui.category.multiday'), count: multiDayCount },
          ].map(({ key, Icon, label, count }) => (
            <Link
              key={key}
              href={`/tours?category=${key}`}
              className="group flex flex-col items-center gap-2 bg-card border border-border rounded-xl px-3 py-5 hover:border-primary/40 hover:shadow-card transition-all"
            >
              <span className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon size={20} className="text-primary" />
              </span>
              <span className="text-sm font-medium text-foreground text-center">{label}</span>
              <span className="text-[11px] text-muted-foreground -mt-1.5">{t('ui.home.tourCount', { count })}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Live weather (hidden until the backend has a Stormglass key) */}
      <WeatherPanel />

      {/* Map */}
      {!loading && tours.length > 0 && (
        <section>
          <SectionHeader title={t('ui.home.exploreOnMap')} href="/tours?view=map" linkLabel={t('ui.home.openMap')} />
          <DestinationMap tours={tours} heightClassName="h-64 sm:h-80" />
        </section>
      )}

      {/* Why TurPoint + Smart Planner */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-surface-sand rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-5">{t('home.whyUsTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {(
              [
                { Icon: MessageCircle, titleKey: 'home.why1Title', bodyKey: 'home.why1Body' },
                { Icon: ShieldCheck, titleKey: 'home.why2Title', bodyKey: 'home.why2Body' },
                { Icon: MapPin, titleKey: 'home.why3Title', bodyKey: 'home.why3Body' },
              ] satisfies { Icon: typeof MapPin; titleKey: TranslationKey; bodyKey: TranslationKey }[]
            ).map(({ Icon, titleKey, bodyKey }) => (
              <div key={titleKey} className="flex sm:flex-col gap-3">
                <span className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t(titleKey)}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t(bodyKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-moss border border-primary/15 rounded-2xl p-6 sm:p-8 flex flex-col">
          <p className="flex items-center gap-2 text-base font-bold text-primary">
            <Sparkles size={18} /> {t('planner.title')}
          </p>
          <p className="text-sm text-foreground/75 mt-2 leading-relaxed flex-1">{t('ui.home.plannerBody')}</p>
          <Link
            href="/planner"
            className="mt-5 self-start bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {t('ui.home.tryPlanner')}
          </Link>
        </div>
      </section>

      {/* Traveler stories - real reviews only, hidden when there are none */}
      {reviews.length > 0 && (
        <section>
          <SectionHeader title={t('ui.home.travelerStories')} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <Link
                key={r.id}
                href={`/tours/${r.tour_id}`}
                className="bg-card border border-border rounded-xl p-5 flex flex-col hover:shadow-card transition-shadow"
              >
                <div className="flex items-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={14} className={n <= r.rating ? 'fill-rating text-rating' : 'text-border'} />
                  ))}
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed line-clamp-4 flex-1">“{r.comment}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {r.reviewer_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{shortName(r.reviewer_name)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {titleFromI18n(r.tour_title, r.tour_title_i18n, locale)} ·{' '}
                      {formatDate(r.created_at, locale, { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
