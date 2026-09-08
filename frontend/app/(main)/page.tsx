'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Search, MapPinned, Calendar, LayoutGrid, Zap,
  Users2, ShieldCheck, Wallet, ChevronDown, MapPin, LogIn,
} from 'lucide-react';
import TourCard, { ApiTour, CATEGORY_STYLE } from '@/app/components/TourCard';
import Greeting from '@/app/components/Greeting';
import HeroSearchCard from '@/app/components/HeroSearchCard';
import HorizontalScroller from '@/app/components/HorizontalScroller';
import PriceRangeSlider from '@/app/components/PriceRangeSlider';
import CompareModal from '@/app/components/CompareModal';
import PlannerModal from '@/app/components/PlannerModal';
import { TOUR_FEATURES, parseFeatures } from '@/app/lib/tourFeatures';
import { VEHICLE_FEATURES, parseVehicleFeatures } from '@/app/lib/vehicleFeatures';
import { todayLocalISODate } from '@/app/lib/date';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import type { TranslationKey } from '@/app/lib/translations';
import Link from 'next/link';

// Leaflet touches `window` at import time, so it can only run in the
// browser — ssr: false keeps Next from trying to render it server-side.
const DestinationMap = dynamic(() => import('@/app/components/DestinationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 rounded-xl border border-border bg-card animate-pulse" />
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';


export default function Home() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [tours, setTours] = useState<ApiTour[]>([]);
  // "Populyar turlar" - actual tours ranked by popularity (favorites +
  // views), not tours grouped by destination city like the old section
  // was (that just duplicated the "Hara?" filter). Fetched once,
  // separately from the main tour list/search results.
  const [popularTours, setPopularTours] = useState<ApiTour[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/api/tours/popular?limit=8`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPopularTours(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);
  // Heart icon on tour cards - saved tours also show up in the account
  // menu's "Sevimlilər" section. Loaded once per login; toggling updates
  // this set optimistically so the heart flips instantly, then confirms
  // (or reverts) against the backend.
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) {
      setFavoriteIds(new Set());
      return;
    }
    fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFavoriteIds(new Set(Array.isArray(data) ? data.map((f: any) => f.id) : [])))
      .catch(() => {});
  }, [token]);

  function toggleFavorite(tourId: number) {
    if (!user) {
      router.push('/login');
      return;
    }
    const alreadyFavorited = favoriteIds.has(tourId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (alreadyFavorited) next.delete(tourId);
      else next.add(tourId);
      return next;
    });
    const request = alreadyFavorited
      ? fetch(`${API_URL}/api/favorites/${tourId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      : fetch(`${API_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tour_id: tourId }),
        });
    request.catch(() => {
      // Revert the optimistic update if the request itself failed (e.g.
      // backend unreachable) - a non-ok response still leaves the toggle
      // as the user intended, since the failure modes there (already
      // favorited, tour not found) don't warrant flipping it back.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (alreadyFavorited) next.add(tourId);
        else next.delete(tourId);
        return next;
      });
    });
  }
  const [operators, setOperators] = useState<Record<number, string>>({});
  // Operator vehicle_features (raw comma-separated string), keyed by
  // operator id - drives the "Vehicle filters" section below, which
  // filters tours by their OWNING OPERATOR's vehicle, not the tour itself.
  const [operatorVehicleFeatures, setOperatorVehicleFeatures] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Multi-select feature/inclusion tags (breakfast, guide, ...) - a tour
  // must have EVERY selected tag to match, same convention as an amenity
  // filter (not "any of").
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [activeVehicleFeatures, setActiveVehicleFeatures] = useState<string[]>([]);
  // Inline compare, replacing what used to be a separate /compare page -
  // toggled on from the sidebar, selects up to 3 cards from the results
  // grid, and opens a floating side-by-side modal instead of navigating
  // away (see CompareModal.tsx).
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelectedIds, setCompareSelectedIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  // Smart Planner, also inlined instead of a separate /planner page - a
  // persistent corner button opens it as a floating modal from anywhere
  // on the homepage.
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  // The floating Planner button sits at a fixed viewport position, so on a
  // phone it would otherwise sit permanently on top of whatever the
  // (now taller, more spacious) hero + search card happens to render at
  // that exact spot before the visitor has scrolled at all - covering the
  // search card's own capacity field and Search button. Hidden on mobile
  // until the page has scrolled a bit; desktop's hero is short relative to
  // the button's corner position, so it never needs this there.
  const [scrolledPastSearch, setScrolledPastSearch] = useState(false);
  const [locationFilter, setLocationFilter] = useState('all');
  // Kateqoriyalar - multi-select like the feature/vehicle checklists below
  // it (a tour matches if its category is ANY of the checked ones; empty
  // means no filter applied), replacing the old single-select tab row.
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating-desc'>('recommended');

  // Hero search card state. "Haradan?" is a static "Bakı" with no state of
  // its own (see HeroSearchCard's comment - tours have no origin-city
  // field to filter by). departDate/returnDate are a date-range filter,
  // not a literal round trip - both default to today, set client-side
  // after mount to avoid a server/client render mismatch on the initial date.
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState('');
  // Both date fields show today by default, but that shouldn't immediately
  // hide every tour that isn't happening today - the date filter only
  // actually applies once the traveler changes a date themselves.
  const [datesTouched, setDatesTouched] = useState(false);

  useEffect(() => {
    const today = todayLocalISODate();
    setDepartDate(today);
    setReturnDate(today);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolledPastSearch(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Deep-linking for the footer's category links and any shared/bookmarked
  // homepage URL - reads plain window.location instead of Next's
  // useSearchParams() so this stays a one-time client-side read with no
  // Suspense-boundary requirement, matching how the rest of this page
  // already treats itself as fully client-rendered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const location = params.get('location');
    if (category) setActiveCategories([category]);
    if (location) setLocationFilter(location);
    if (category || location) {
      setTimeout(() => document.getElementById('tour-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, []);

  const handleDepartDateChange = (value: string) => {
    setDepartDate(value);
    setDatesTouched(true);
  };
  const handleReturnDateChange = (value: string) => {
    setReturnDate(value);
    setDatesTouched(true);
  };

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };
  const toggleFeature = (slug: string) => {
    setActiveFeatures((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  };
  const toggleVehicleFeature = (slug: string) => {
    setActiveVehicleFeatures((prev) => (prev.includes(slug) ? prev.filter((f) => f !== slug) : [...prev, slug]));
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => {
      if (prev) setCompareSelectedIds([]);
      return !prev;
    });
  };
  const toggleCompareSelect = (id: number) => {
    setCompareSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // matches backend's 2-3 id limit
      return [...prev, id];
    });
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/tours`).then((r) => r.json()),
      fetch(`${API_URL}/api/operators`).then((r) => r.json()),
    ])
      .then(([toursData, operatorsData]) => {
        setTours(toursData);
        const map: Record<number, string> = {};
        const vehicleMap: Record<number, string> = {};
        operatorsData.forEach((op: any) => {
          map[op.id] = op.name;
          vehicleMap[op.id] = op.vehicle_features ?? '';
        });
        setOperators(map);
        setOperatorVehicleFeatures(vehicleMap);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);


  const filtered = useMemo(() => {
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    const minSeats = travelers === '' ? null : Number(travelers);

    return tours.filter((t) => {
      const tourFeatures = parseFeatures(t.features);
      const matchFeatures = activeFeatures.every((f) => tourFeatures.includes(f));
      const vehicleFeatures = parseVehicleFeatures(t.vehicle_features || operatorVehicleFeatures[t.operator_id]);
      const matchVehicleFeatures = activeVehicleFeatures.every((f) => vehicleFeatures.includes(f));
      const matchLocation = locationFilter === 'all' || t.location === locationFilter;
      const matchCategory = activeCategories.length === 0 || (!!t.category && activeCategories.includes(t.category));
      const effectivePrice = t.discounted_price ?? t.price;
      const matchMin = min === null || effectivePrice >= min;
      const matchMax = max === null || effectivePrice <= max;
      // ISO 'YYYY-MM-DD' strings compare lexicographically in date order.
      // Both dates default to today for display, so the range filter only
      // kicks in once the traveler has actually touched one of them.
      const matchDepart = !datesTouched || departDate === '' || t.date >= departDate;
      const matchReturn = !datesTouched || returnDate === '' || t.date <= returnDate;
      const matchTravelers = minSeats === null || t.max_participants >= minSeats;
      return (
        matchFeatures &&
        matchVehicleFeatures &&
        matchLocation &&
        matchCategory &&
        matchMin &&
        matchMax &&
        matchDepart &&
        matchReturn &&
        matchTravelers
      );
    });
  }, [
    tours,
    activeFeatures,
    activeVehicleFeatures,
    operatorVehicleFeatures,
    locationFilter,
    activeCategories,
    minPrice,
    maxPrice,
    departDate,
    returnDate,
    datesTouched,
    travelers,
  ]);

  // Client-side sort - all the data needed (price, discounted_price, rating)
  // is already on each tour from the list response, so there's no reason to
  // round-trip to the backend just to reorder what's already in memory.
  const sortedFiltered = useMemo(() => {
    const list = [...filtered];
    const effective = (t: ApiTour) => t.discounted_price ?? t.price;
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => effective(a) - effective(b));
      case 'price-desc':
        return list.sort((a, b) => effective(b) - effective(a));
      case 'rating-desc':
        return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default:
        return list;
    }
  }, [filtered, sortBy]);

  // Real categories actually present in the loaded tours, with counts - no
  // point offering a "Food" pill if not a single tour is tagged that way.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tours.forEach((t) => {
      if (t.category) counts[t.category] = (counts[t.category] ?? 0) + 1;
    });
    return counts;
  }, [tours]);

  const dealTours = useMemo(() => tours.filter((t) => typeof t.discounted_price === 'number'), [tours]);

  const scrollToResults = () => {
    document.getElementById('tour-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Price slider bounds adapt to whatever tours are actually loaded,
  // instead of a hardcoded ceiling that could clip real prices.
  const priceSliderMax = useMemo(() => {
    const prices = tours.map((t) => t.discounted_price ?? t.price);
    const highest = prices.length ? Math.max(...prices) : 100;
    return Math.max(100, Math.ceil(highest / 10) * 10);
  }, [tours]);
  const sliderMinValue = minPrice === '' ? 0 : Number(minPrice);
  const sliderMaxValue = maxPrice === '' ? priceSliderMax : Number(maxPrice);

  const featureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TOUR_FEATURES.forEach((f) => {
      counts[f.slug] = tours.filter((t) => parseFeatures(t.features).includes(f.slug)).length;
    });
    return counts;
  }, [tours]);

  const vehicleFeatureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    VEHICLE_FEATURES.forEach((f) => {
      counts[f.slug] = tours.filter((t) =>
        parseVehicleFeatures(t.vehicle_features || operatorVehicleFeatures[t.operator_id]).includes(f.slug)
      ).length;
    });
    return counts;
  }, [tours, operatorVehicleFeatures]);

  return (
    <div className="min-h-full">
      {/* Hero - deliberately not a photograph. TurPoint's photography
          belongs to the tours and destinations a visitor is actually
          discovering (see the cards below); the hero's job is just to
          state what the product is and get a search started, so it's a
          single calm sand surface carrying nothing but type and the
          search card itself - no image, no gradient, no motion. */}
      <div className="bg-surface-sand">
        <div className="w-full px-4 sm:px-6 max-w-[1600px] mx-auto pt-12 pb-10 md:pt-16 md:pb-14">
          <p className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-accent mb-3">
            {t('nav.tagline')}
          </p>
          <Greeting />
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
            {t('home.whereToNextSubtitle')}
          </p>

          <div className="mt-7 md:mt-9">
            <HeroSearchCard
              toLocation={locationFilter}
              onToLocationChange={setLocationFilter}
              departDate={departDate}
              onDepartDateChange={handleDepartDateChange}
              returnDate={returnDate}
              onReturnDateChange={handleReturnDateChange}
              travelers={travelers}
              onTravelersChange={setTravelers}
              onSearch={scrollToResults}
            />
          </div>
        </div>
      </div>

      {/* Last-minute deals - surfaces tours that already have an active
          last_minute_deals row (real discount data, same discounted_price
          the cards below already show) as their own dedicated strip instead
          of leaving them to blend into the general grid. */}
      {!loading && dealTours.length > 0 && (
        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto mt-12 md:mt-16">
          <h2
            className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-foreground mb-5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Zap size={18} className="text-accent" /> {t('home.lastMinuteDeals')}
          </h2>
          <HorizontalScroller>
            {dealTours.map((tour) => (
              <div key={tour.id} className="w-64 shrink-0 snap-start">
                <TourCard
                  tour={tour}
                  operatorName={operators[tour.operator_id]}
                  onClick={() => router.push(`/tours/${tour.id}`)}
                  isFavorited={favoriteIds.has(tour.id)}
                  onToggleFavorite={() => toggleFavorite(tour.id)}
                />
              </div>
            ))}
          </HorizontalScroller>
        </div>
      )}

      {/* Popular tours - ranked by real popularity (favorites + views),
          not grouped by destination city like the old section was (that
          just duplicated the "Hara?" filter above). Sits on its own soft
          sand band so it reads as a deliberate "moment" rather than more
          cards on the same white canvas as everything else. */}
      {popularTours.length > 0 && (
        <div className="bg-surface-sand mt-12 md:mt-16 py-10 md:py-14">
          <div className="px-4 sm:px-6 max-w-[1600px] mx-auto">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-accent mb-2">
              {t('home.discoverEyebrow')}
            </p>
            <h2
              className="text-xl sm:text-2xl font-bold text-foreground mb-6"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t('home.popularTours')}
            </h2>
            <HorizontalScroller>
              {popularTours.map((tour) => (
                <div key={tour.id} className="w-64 shrink-0 snap-start">
                  <TourCard
                    tour={tour}
                    operatorName={operators[tour.operator_id]}
                    onClick={() => router.push(`/tours/${tour.id}`)}
                    isFavorited={favoriteIds.has(tour.id)}
                    onToggleFavorite={() => toggleFavorite(tour.id)}
                  />
                </div>
              ))}
            </HorizontalScroller>
          </div>
        </div>
      )}

      {/* Sign-in prompt - only for logged-out visitors, and only ever
          points at real functionality (managing bookings, faster
          checkout) - no fabricated "member discounts" like a booking
          site's loyalty program would claim, since we don't have one.
          A quiet card with an accent rule rather than a solid green
          block, so it reads as a gentle nudge, not another banner. */}
      {!authLoading && !user && (
        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto mt-10 md:mt-12">
          <div className="bg-card border-l-4 border-accent rounded-r-xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <LogIn size={16} className="text-primary" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t('home.signInBannerTitle')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('home.signInBannerBody')}</p>
              </div>
            </div>
            <Link
              href="/login"
              className="shrink-0 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('nav.signIn')}
            </Link>
          </div>
        </div>
      )}

      {/* Main Content - left sidebar (map + filters) alongside the results
          grid on the right, matching a standard listing-site layout. */}
      <div className="px-4 sm:px-6 pt-8 md:pt-10 pb-12 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {!loading && tours.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <MapPinned size={15} /> {t('home.exploreOnMap')}
                </h2>
                <DestinationMap tours={tours} heightClassName="h-48" />
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{t('home.compareProperties')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={compareMode}
                onClick={toggleCompareMode}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  compareMode ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    compareMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">{t('home.budget')}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                AZN {sliderMinValue} – AZN {sliderMaxValue}
              </p>
              <PriceRangeSlider
                min={0}
                max={priceSliderMax}
                valueMin={sliderMinValue}
                valueMax={sliderMaxValue}
                onChangeMin={(v) => setMinPrice(String(v))}
                onChangeMax={(v) => setMaxPrice(String(v))}
              />

              <div className="h-px bg-border my-4" />

              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                <LayoutGrid size={14} /> {t('home.categories')}
              </h3>
              <div className="space-y-2">
                {Object.keys(CATEGORY_STYLE).map((cat) => {
                  const style = CATEGORY_STYLE[cat];
                  const CatIcon = style.Icon;
                  const active = activeCategories.includes(cat);
                  return (
                    <label key={cat} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleCategory(cat)}
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <CatIcon size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{t(style.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{categoryCounts[cat] ?? 0}</span>
                    </label>
                  );
                })}
              </div>

              <div className="h-px bg-border my-4" />

              <h3 className="text-sm font-semibold text-foreground mb-2">{t('home.popularFilters')}</h3>
              <div className="space-y-2">
                {TOUR_FEATURES.map((feature) => {
                  const active = activeFeatures.includes(feature.slug);
                  const Icon = feature.Icon;
                  return (
                    <label
                      key={feature.slug}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleFeature(feature.slug)}
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <Icon size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{t(feature.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{featureCounts[feature.slug] ?? 0}</span>
                    </label>
                  );
                })}
              </div>

              <div className="h-px bg-border my-4" />

              <h3 className="text-sm font-semibold text-foreground mb-2">{t('home.vehicleFilters')}</h3>
              <div className="space-y-2">
                {VEHICLE_FEATURES.map((feature) => {
                  const active = activeVehicleFeatures.includes(feature.slug);
                  const Icon = feature.Icon;
                  return (
                    <label
                      key={feature.slug}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleVehicleFeature(feature.slug)}
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <Icon size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{t(feature.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{vehicleFeatureCounts[feature.slug] ?? 0}</span>
                    </label>
                  );
                })}
              </div>

              {(activeCategories.length > 0 ||
                activeFeatures.length > 0 ||
                activeVehicleFeatures.length > 0 ||
                minPrice !== '' ||
                maxPrice !== '') && (
                <button
                  onClick={() => {
                    setActiveCategories([]);
                    setActiveFeatures([]);
                    setActiveVehicleFeatures([]);
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {t('home.clearFilters')}
                </button>
              )}
            </div>
          </aside>

          {/* Results */}
          <div id="tour-results" className="scroll-mt-20">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                {loading ? t('home.loadingTours') : t('home.toursAvailable', { count: sortedFiltered.length })}
              </h2>
              {!loading && sortedFiltered.length > 0 && (
                <div className="relative shrink-0">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    aria-label={t('home.sortBy')}
                    className="appearance-none text-xs font-semibold bg-card border border-border rounded-full pl-3 pr-7 py-1.5 outline-none cursor-pointer hover:border-primary/40"
                  >
                    <option value="recommended">{t('home.sortRecommended')}</option>
                    <option value="price-asc">{t('home.sortPriceAsc')}</option>
                    <option value="price-desc">{t('home.sortPriceDesc')}</option>
                    <option value="rating-desc">{t('home.sortRatingDesc')}</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              )}
            </div>

            {error && (
              <div className="text-center py-14 text-muted-foreground">
                <p className="text-sm">{t('home.couldntReachBackend')}</p>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                    <div className="h-36 sm:h-40 bg-muted" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!error && !loading && sortedFiltered.length === 0 && (
              <div className="text-center py-14 text-muted-foreground">
                <Search size={30} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('home.noToursMatch')}</p>
              </div>
            )}

            {!error && !loading && sortedFiltered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedFiltered.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    operatorName={operators[tour.operator_id]}
                    onClick={() => router.push(`/tours/${tour.id}`)}
                    compareMode={compareMode}
                    compareSelected={compareSelectedIds.includes(tour.id)}
                    compareDisabled={!compareSelectedIds.includes(tour.id) && compareSelectedIds.length >= 3}
                    onToggleCompare={() => toggleCompareSelect(tour.id)}
                    isFavorited={favoriteIds.has(tour.id)}
                    onToggleFavorite={() => toggleFavorite(tour.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works - explains the group-buying mechanic (price drops as
          more travelers join, confirmed once the tour's minimum is hit),
          which isn't obvious from a first glance at a tour card. A subtle
          green-tinted band (--surface-moss) rather than plain white or
          another beige block, so the page's third act reads as its own
          calm beat rather than a continuation of the sand-toned discovery
          section above it. */}
      <div className="bg-surface-moss">
        <div className="px-4 sm:px-6 py-14 md:py-20 max-w-[1600px] mx-auto">
          <h2
            className="text-xl sm:text-2xl font-bold text-foreground text-center mb-10"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('home.howItWorksTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 max-w-4xl mx-auto">
            {(
              [
                { Icon: Search, titleKey: 'home.step1Title', bodyKey: 'home.step1Body' },
                { Icon: Users2, titleKey: 'home.step2Title', bodyKey: 'home.step2Body' },
                { Icon: ShieldCheck, titleKey: 'home.step3Title', bodyKey: 'home.step3Body' },
              ] satisfies { Icon: typeof Search; titleKey: TranslationKey; bodyKey: TranslationKey }[]
            ).map(({ Icon, titleKey, bodyKey }, i) => (
              <div key={i} className="text-center">
                <div className="w-11 h-11 rounded-full bg-card text-primary flex items-center justify-center mx-auto mb-4">
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1.5">{t(titleKey)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operator story - a full-bleed photographic band (a real image
          from the same pool the hero draws from, not a new asset), so the
          operator pitch reads as part of the brand's own visual world
          instead of a bolted-on advertisement banner. Only describes
          capabilities that actually exist: the public marketplace listing,
          the operator dashboard's bookings view, and real photo uploads
          on a tour listing. */}
      <div className="relative overflow-hidden">
        <img
          src="/pictures/4.jpeg"
          alt="Green mountain valley in the Caucasus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f17]/92 via-[#0f1f17]/75 to-[#0f1f17]/45" />
        <div className="relative px-4 sm:px-6 py-16 md:py-24 max-w-[1600px] mx-auto">
          <div className="max-w-lg">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/70 mb-3">
              {t('home.operatorEyebrow')}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t('home.operatorTitle')}
            </h2>
            <p className="text-sm sm:text-base text-white/80 mb-8 leading-relaxed">{t('home.operatorBody')}</p>

            <div className="space-y-5 mb-9">
              {(
                [
                  { titleKey: 'home.operatorBenefit1Title', bodyKey: 'home.operatorBenefit1Body' },
                  { titleKey: 'home.operatorBenefit2Title', bodyKey: 'home.operatorBenefit2Body' },
                  { titleKey: 'home.operatorBenefit3Title', bodyKey: 'home.operatorBenefit3Body' },
                ] satisfies { titleKey: TranslationKey; bodyKey: TranslationKey }[]
              ).map(({ titleKey, bodyKey }, i) => (
                <div key={i} className="flex gap-3.5">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{t(titleKey)}</p>
                    <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{t(bodyKey)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/profile"
              className="inline-flex items-center gap-2 bg-white text-primary text-sm font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              {t('dashboard.becomeOperator')}
            </Link>
          </div>
        </div>
      </div>

      {/* Why TurPoint - real product mechanics only (group pricing,
          verified-buyer-only reviews, operators who own their listings),
          nothing fabricated like award badges or made-up guest counts.
          A plain list rather than three bordered/shadowed boxes, closing
          the page on a quiet, editorial note before the footer. */}
      <div className="px-4 sm:px-6 py-14 md:py-20 max-w-[1600px] mx-auto">
        <h2
          className="text-xl sm:text-2xl font-bold text-foreground text-center mb-10"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t('home.whyUsTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {(
            [
              { Icon: Wallet, titleKey: 'home.why1Title', bodyKey: 'home.why1Body' },
              { Icon: ShieldCheck, titleKey: 'home.why2Title', bodyKey: 'home.why2Body' },
              { Icon: MapPin, titleKey: 'home.why3Title', bodyKey: 'home.why3Body' },
            ] satisfies { Icon: typeof Wallet; titleKey: TranslationKey; bodyKey: TranslationKey }[]
          ).map(({ Icon, titleKey, bodyKey }, i) => (
            <div key={i} className="text-center sm:text-left">
              <Icon size={18} className="text-accent mb-2.5 mx-auto sm:mx-0" />
              <h3 className="text-sm font-bold text-foreground mb-1">{t(titleKey)}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating compare tray - only while compare mode is on and at
          least one card is selected; mirrors the old /compare page's
          "N selected" pill but stays on this page instead of navigating. */}
      {compareMode && compareSelectedIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-semibold">{t('compare.selected', { count: compareSelectedIds.length })}</span>
          {compareSelectedIds.length >= 2 ? (
            <button
              onClick={() => setShowCompareModal(true)}
              className="text-sm font-bold bg-accent text-accent-foreground rounded-full px-4 py-1.5 hover:opacity-90"
            >
              {t('compare.compareNow')}
            </button>
          ) : (
            <span className="text-xs text-primary-foreground/80">{t('home.selectMoreToCompare')}</span>
          )}
        </div>
      )}

      {showCompareModal && (
        <CompareModal
          tourIds={compareSelectedIds}
          operators={operators}
          onClose={() => setShowCompareModal(false)}
          onViewTour={(id) => router.push(`/tours/${id}`)}
        />
      )}

      {/* Persistent Smart Planner button - replaces the old separate
          /planner page with a floating modal, opened from anywhere on
          the homepage. Hidden on mobile while the compare tray above is
          showing (both are fixed-bottom pills that would otherwise
          collide), and until the page has scrolled a little (see
          scrolledPastSearch - otherwise it sits fixed on top of the
          search card's own capacity field and Search button before the
          visitor has scrolled at all). Desktop's shorter hero doesn't
          have either problem, so it stays visible there regardless. */}
      <button
        onClick={() => setShowPlannerModal(true)}
        className={`fixed bottom-20 md:bottom-4 right-4 z-40 items-center gap-2 bg-accent text-accent-foreground rounded-full shadow-lg px-4 py-3 hover:opacity-90 transition-opacity md:flex ${
          (compareMode && compareSelectedIds.length > 0) || !scrolledPastSearch ? 'hidden' : 'flex'
        }`}
      >
        <Calendar size={16} />
        <span className="text-sm font-semibold">{t('nav.planner')}</span>
      </button>

      {showPlannerModal && (
        <PlannerModal
          onClose={() => setShowPlannerModal(false)}
          onViewTour={(id) => router.push(`/tours/${id}`)}
        />
      )}
    </div>
  );
}