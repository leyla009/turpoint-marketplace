'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, MapPinned, Calendar } from 'lucide-react';
import TourCard, { ApiTour } from './components/TourCard';
import Greeting from './components/Greeting';
import HeroSlideshow from './components/HeroSlideshow';
import HeroSearchCard from './components/HeroSearchCard';
import PriceRangeSlider from './components/PriceRangeSlider';
import CompareModal from './components/CompareModal';
import PlannerModal from './components/PlannerModal';
import { TOUR_FEATURES, parseFeatures } from './lib/tourFeatures';
import { VEHICLE_FEATURES, parseVehicleFeatures } from './lib/vehicleFeatures';
import { useLanguage } from './context/LanguageContext';

// Leaflet touches `window` at import time, so it can only run in the
// browser — ssr: false keeps Next from trying to render it server-side.
const DestinationMap = dynamic(() => import('./components/DestinationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 rounded-xl border border-border bg-card animate-pulse" />
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Local calendar date as YYYY-MM-DD. Deliberately NOT
// `new Date().toISOString().slice(0, 10)` - toISOString() converts to UTC
// first, so for anyone in a timezone ahead of UTC (Azerbaijan is UTC+4)
// the date field showed yesterday's date for the first few hours after
// local midnight, since UTC hadn't rolled over to the new day yet.
function todayLocalISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

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
    minPrice,
    maxPrice,
    departDate,
    returnDate,
    datesTouched,
    travelers,
  ]);

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
            className="text-2xl sm:text-3xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('home.whereToNext')}
          </h1>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                {loading ? t('home.loadingTours') : t('home.toursAvailable', { count: filtered.length })}
              </h2>
            </div>

            {error && (
              <div className="text-center py-14 text-muted-foreground">
                <p className="text-sm">{t('home.couldntReachBackend')}</p>
              </div>
            )}

            {!error && !loading && filtered.length === 0 && (
              <div className="text-center py-14 text-muted-foreground">
                <Search size={30} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('home.noToursMatch')}</p>
              </div>
            )}

            {!error && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((tour) => (
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