'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Search, MapPinned, Calendar, LayoutGrid, Zap,
  Users2, ShieldCheck, Wallet, ChevronDown, MapPin,
} from 'lucide-react';
import TourCard, { ApiTour, CATEGORY_STYLE } from './components/TourCard';
import Greeting from './components/Greeting';
import HeroSlideshow from './components/HeroSlideshow';
import HeroSearchCard from './components/HeroSearchCard';
import PriceRangeSlider from './components/PriceRangeSlider';
import CompareModal from './components/CompareModal';
import PlannerModal from './components/PlannerModal';
import { TOUR_FEATURES, parseFeatures } from './lib/tourFeatures';
import { VEHICLE_FEATURES, parseVehicleFeatures } from './lib/vehicleFeatures';
import { todayLocalISODate } from './lib/date';
import { useLanguage } from './context/LanguageContext';
import type { TranslationKey } from './lib/translations';

// Leaflet touches `window` at import time, so it can only run in the
// browser — ssr: false keeps Next from trying to render it server-side.
const DestinationMap = dynamic(() => import('./components/DestinationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 rounded-xl border border-border bg-card animate-pulse" />
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [tours, setTours] = useState<ApiTour[]>([]);
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
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating-desc'>('recommended');

  // Hero search card state. fromCity is decorative only (see
  // HeroSearchCard's comment - tours have no origin-city field to filter
  // by). departDate/returnDate are a date-range filter, not a literal
  // round trip - both default to today, set client-side after mount to
  // avoid a server/client render mismatch on the initial date.
  const [fromCity, setFromCity] = useState('Bakı');
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

  // Deep-linking for the footer's category links and any shared/bookmarked
  // homepage URL - reads plain window.location instead of Next's
  // useSearchParams() so this stays a one-time client-side read with no
  // Suspense-boundary requirement, matching how the rest of this page
  // already treats itself as fully client-rendered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const location = params.get('location');
    if (category) setCategoryFilter(category);
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
      const vehicleFeatures = parseVehicleFeatures(operatorVehicleFeatures[t.operator_id]);
      const matchVehicleFeatures = activeVehicleFeatures.every((f) => vehicleFeatures.includes(f));
      const matchLocation = locationFilter === 'all' || t.location === locationFilter;
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
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
    categoryFilter,
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

  // Popular destinations - grouped straight from each tour's own `location`
  // field, not a separate hardcoded list, so it only ever shows places that
  // actually have a bookable tour right now.
  const destinations = useMemo(() => {
    const byLocation: Record<string, { count: number; minPrice: number; category: string | null }> = {};
    tours.forEach((t) => {
      if (!t.location) return;
      const price = t.discounted_price ?? t.price;
      const existing = byLocation[t.location];
      if (!existing) {
        byLocation[t.location] = { count: 1, minPrice: price, category: t.category };
      } else {
        existing.count += 1;
        existing.minPrice = Math.min(existing.minPrice, price);
      }
    });
    return Object.entries(byLocation)
      .map(([location, info]) => ({ location, ...info }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tours]);

  const dealTours = useMemo(() => tours.filter((t) => typeof t.discounted_price === 'number'), [tours]);

  const selectDestination = (location: string) => {
    setLocationFilter(location);
    scrollToResults();
  };

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
        parseVehicleFeatures(operatorVehicleFeatures[t.operator_id]).includes(f.slug)
      ).length;
    });
    return counts;
  }, [tours, operatorVehicleFeatures]);

  return (
    <div className="min-h-full">
      {/* Header - photo slideshow hero, pulled up under the transparent
          desktop nav (see Nav.tsx) so the images show through behind it. */}
      <div className="relative md:-mt-16 min-h-[340px] md:min-h-[420px] flex flex-col justify-end overflow-hidden">
        <HeroSlideshow />
        <div className="w-full px-4 sm:px-6 max-w-[1600px] mx-auto relative pt-24 md:pt-28 pb-10 md:pb-16">
          <Greeting />
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('home.whereToNext')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/90">{t('home.whereToNextSubtitle')}</p>
        </div>
      </div>

      {/* Floating search card - straddles the hero/content boundary, with
          the same left/right page margins as everything else so it never
          touches the screen edges. */}
      <div className="px-4 sm:px-6 max-w-[1600px] mx-auto relative z-20 -mt-8 md:-mt-10">
        <HeroSearchCard
          fromCity={fromCity}
          onFromCityChange={setFromCity}
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

      {/* Category quick filters - the tour's `category` field drove only
          the card's color/icon before; this is the first place a visitor
          can actually filter by it. Only categories with at least one real
          tour show up, so an empty category never dead-ends the browse. */}
      {!loading && tours.length > 0 && (
        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto mt-8 md:mt-10">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex items-center gap-1.5 shrink-0 text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-primary/40'
              }`}
            >
              <LayoutGrid size={14} /> {t('home.allCategories')}
            </button>
            {Object.keys(CATEGORY_STYLE)
              .filter((cat) => categoryCounts[cat] > 0)
              .map((cat) => {
                const style = CATEGORY_STYLE[cat];
                const CatIcon = style.Icon;
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(active ? 'all' : cat)}
                    className={`flex items-center gap-1.5 shrink-0 text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    <CatIcon size={14} /> {t(style.labelKey)}
                    <span className={active ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                      {categoryCounts[cat]}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Last-minute deals - surfaces tours that already have an active
          last_minute_deals row (real discount data, same discounted_price
          the cards below already show) as their own dedicated strip instead
          of leaving them to blend into the general grid. */}
      {!loading && dealTours.length > 0 && (
        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto mt-8 md:mt-10">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-foreground mb-3">
            <Zap size={16} className="text-accent" /> {t('home.lastMinuteDeals')}
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {dealTours.map((tour) => (
              <div key={tour.id} className="w-64 shrink-0">
                <TourCard
                  tour={tour}
                  operatorName={operators[tour.operator_id]}
                  onClick={() => router.push(`/tours/${tour.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular destinations - grouped straight from tours' real `location`
          values (see `destinations` above), so this only ever lists places
          that currently have a bookable tour. */}
      {!loading && destinations.length > 0 && (
        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto mt-8 md:mt-10">
          <h2 className="text-base font-bold text-foreground mb-3">{t('home.popularDestinations')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {destinations.map((d) => {
              const style = CATEGORY_STYLE[d.category ?? ''] ?? CATEGORY_STYLE.history;
              const DIcon = style.Icon;
              return (
                <button
                  key={d.location}
                  onClick={() => selectDestination(d.location)}
                  className={`text-left rounded-xl border overflow-hidden bg-card hover:shadow-md transition-all group ${
                    locationFilter === d.location ? 'border-accent ring-2 ring-accent/30' : 'border-border'
                  }`}
                >
                  <div className={`h-16 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                    <DIcon size={22} className="text-white/80 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-foreground truncate">{d.location}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t('home.toursAvailable', { count: d.count })}
                    </p>
                    <p className="text-[11px] font-semibold text-primary mt-0.5">
                      {t('home.fromPrice', { price: d.minPrice })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content - left sidebar (map + filters) alongside the results
          grid on the right, matching a standard listing-site layout. */}
      <div className="px-4 sm:px-6 pt-6 md:pt-8 pb-10 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-hide">
            {!loading && tours.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <MapPinned size={15} /> {t('home.exploreOnMap')}
                </h2>
                <DestinationMap tours={tours} heightClassName="h-48" />
              </div>
            )}

            <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-4 flex items-center justify-between">
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

            <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-4">
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

              {(activeFeatures.length > 0 ||
                activeVehicleFeatures.length > 0 ||
                minPrice !== '' ||
                maxPrice !== '') && (
                <button
                  onClick={() => {
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
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works - explains the group-buying mechanic (price drops as
          more travelers join, confirmed once the tour's minimum is hit),
          which isn't obvious from a first glance at a tour card. */}
      <div className="bg-muted/40 border-y border-border">
        <div className="px-4 sm:px-6 py-10 md:py-14 max-w-[1600px] mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-8" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('home.howItWorksTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {(
              [
                { Icon: Search, titleKey: 'home.step1Title', bodyKey: 'home.step1Body' },
                { Icon: Users2, titleKey: 'home.step2Title', bodyKey: 'home.step2Body' },
                { Icon: ShieldCheck, titleKey: 'home.step3Title', bodyKey: 'home.step3Body' },
              ] satisfies { Icon: typeof Search; titleKey: TranslationKey; bodyKey: TranslationKey }[]
            ).map(({ Icon, titleKey, bodyKey }, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{t(titleKey)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why TurPoint - real product mechanics only (group pricing,
          verified-buyer-only reviews, operators who own their listings),
          nothing fabricated like award badges or made-up guest counts. */}
      <div className="px-4 sm:px-6 py-10 md:py-14 max-w-[1600px] mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-8" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('home.whyUsTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {(
            [
              { Icon: Wallet, titleKey: 'home.why1Title', bodyKey: 'home.why1Body' },
              { Icon: ShieldCheck, titleKey: 'home.why2Title', bodyKey: 'home.why2Body' },
              { Icon: MapPin, titleKey: 'home.why3Title', bodyKey: 'home.why3Body' },
            ] satisfies { Icon: typeof Wallet; titleKey: TranslationKey; bodyKey: TranslationKey }[]
          ).map(({ Icon, titleKey, bodyKey }, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-2xl shadow-sm p-5">
              <Icon size={20} className="text-accent mb-2.5" />
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
          the homepage. */}
      <button
        onClick={() => setShowPlannerModal(true)}
        className="fixed bottom-20 md:bottom-4 right-4 z-40 flex items-center gap-2 bg-accent text-accent-foreground rounded-full shadow-lg px-4 py-3 hover:opacity-90 transition-opacity"
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