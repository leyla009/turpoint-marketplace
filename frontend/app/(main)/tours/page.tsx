'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, LayoutGrid, Map as MapIcon, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import TourCard, { ApiTour, CATEGORY_STYLE } from '@/app/components/TourCard';
import PriceRangeSlider from '@/app/components/PriceRangeSlider';
import CompareModal from '@/app/components/CompareModal';
import { TOUR_FEATURES, parseFeatures } from '@/app/lib/tourFeatures';
import { VEHICLE_FEATURES, parseVehicleFeatures } from '@/app/lib/vehicleFeatures';
import { tourTitle, placeName, tourFacts } from '@/app/lib/tourContent';
import { useLanguage } from '@/app/context/LanguageContext';
import { useFavorites } from '@/app/lib/useFavorites';
import type { TranslationKey } from '@/app/lib/translations';

// Leaflet touches `window` at import time, so it can only run in the browser.
const DestinationMap = dynamic(() => import('@/app/components/DestinationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[520px] rounded-xl border border-border bg-muted animate-pulse" />,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const GUIDE_LANGUAGES = ['az', 'en', 'ru', 'tr', 'ar'] as const;

type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'rating-desc' | 'date-asc';

const fieldClass =
  'w-full appearance-none text-sm bg-card border border-border rounded-lg pl-3 pr-8 py-2 outline-none focus:border-primary cursor-pointer';

function SelectField({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={fieldClass}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <h3 className="text-sm font-semibold text-foreground mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const [tours, setTours] = useState<ApiTour[]>([]);
  const [operators, setOperators] = useState<Record<number, string>>({});
  const [operatorVehicleFeatures, setOperatorVehicleFeatures] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [multiDayOnly, setMultiDayOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('all');
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [activeVehicleFeatures, setActiveVehicleFeatures] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('recommended');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareSelectedIds, setCompareSelectedIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Deep links from the homepage search, category tiles, destination tiles
  // and the footer: /tours?location=Quba&date=2026-10-18&category=nature
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category === 'multiday') setMultiDayOnly(true);
    else if (category) setActiveCategories([category]);
    if (params.get('location')) setLocationFilter(params.get('location')!);
    if (params.get('date')) setDateFilter(params.get('date')!);
    if (params.get('q')) setQuery(params.get('q')!);
    if (params.get('view') === 'map') setView('map');
    if (params.get('deals') === '1') setDealsOnly(true);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/tours`).then((r) => r.json()),
      fetch(`${API_URL}/api/operators`).then((r) => r.json()),
    ])
      .then(([toursData, operatorsData]) => {
        setTours(toursData);
        const names: Record<number, string> = {};
        const vehicles: Record<number, string> = {};
        operatorsData.forEach((op: any) => {
          names[op.id] = op.name;
          vehicles[op.id] = op.vehicle_features ?? '';
        });
        setOperators(names);
        setOperatorVehicleFeatures(vehicles);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Only destinations that actually have tours.
  const locations = useMemo(
    () => Array.from(new Set(tours.map((t) => t.location).filter(Boolean) as string[])).sort(),
    [tours]
  );

  const priceSliderMax = useMemo(() => {
    const prices = tours.map((t) => t.discounted_price ?? t.price);
    const highest = prices.length ? Math.max(...prices) : 100;
    return Math.max(100, Math.ceil(highest / 10) * 10);
  }, [tours]);
  const sliderMin = minPrice === '' ? 0 : Number(minPrice);
  const sliderMax = maxPrice === '' ? priceSliderMax : Number(maxPrice);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    return tours.filter((tour) => {
      const price = tour.discounted_price ?? tour.price;
      if (q) {
        const haystack = `${tourTitle(tour, locale)} ${tour.title} ${tour.location ?? ''} ${placeName(tour.location, locale)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (locationFilter !== 'all' && tour.location !== locationFilter) return false;
      if (dateFilter && tour.date.slice(0, 10) !== dateFilter) return false;
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      if (activeCategories.length && !(tour.category && activeCategories.includes(tour.category))) return false;
      if (multiDayOnly && tour.duration_days < 2) return false;
      if (dealsOnly && typeof tour.discounted_price !== 'number') return false;
      if (languageFilter !== 'all' && !(tourFacts({ facts: tour.facts ?? null }).guide_languages ?? []).includes(languageFilter)) {
        return false;
      }
      const features = parseFeatures(tour.features);
      if (!activeFeatures.every((f) => features.includes(f))) return false;
      const vehicle = parseVehicleFeatures(tour.vehicle_features || operatorVehicleFeatures[tour.operator_id]);
      if (!activeVehicleFeatures.every((f) => vehicle.includes(f))) return false;
      return true;
    });
  }, [tours, query, locale, locationFilter, dateFilter, minPrice, maxPrice, activeCategories, multiDayOnly, dealsOnly, languageFilter, activeFeatures, activeVehicleFeatures, operatorVehicleFeatures]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const price = (x: ApiTour) => x.discounted_price ?? x.price;
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => price(a) - price(b));
      case 'price-desc':
        return list.sort((a, b) => price(b) - price(a));
      case 'rating-desc':
        return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'date-asc':
        return list.sort((a, b) => a.date.localeCompare(b.date));
      default:
        return list;
    }
  }, [filtered, sortBy]);

  const hasFilters =
    query !== '' ||
    locationFilter !== 'all' ||
    dateFilter !== '' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    activeCategories.length > 0 ||
    multiDayOnly ||
    dealsOnly ||
    languageFilter !== 'all' ||
    activeFeatures.length > 0 ||
    activeVehicleFeatures.length > 0;

  const clearAll = () => {
    setQuery('');
    setLocationFilter('all');
    setDateFilter('');
    setMinPrice('');
    setMaxPrice('');
    setActiveCategories([]);
    setMultiDayOnly(false);
    setDealsOnly(false);
    setLanguageFilter('all');
    setActiveFeatures([]);
    setActiveVehicleFeatures([]);
  };

  const toggleCompareSelect = (id: number) =>
    setCompareSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );

  const checkbox = 'w-4 h-4 rounded border-border accent-[var(--primary)] cursor-pointer';

  const filters = (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-bold text-foreground">{t('ui.explore.filters')}</h2>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs font-semibold text-primary hover:underline">
            {t('ui.explore.clearAll')}
          </button>
        )}
      </div>

      <FilterGroup title={t('ui.explore.destination')}>
        <SelectField value={locationFilter} onChange={setLocationFilter} label={t('ui.explore.destination')}>
          <option value="all">{t('ui.explore.allLocations')}</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {placeName(l, locale)}
            </option>
          ))}
        </SelectField>
      </FilterGroup>

      <FilterGroup title={t('ui.explore.date')}>
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label={t('ui.explore.date')}
            className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
          />
        </div>
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="mt-1.5 text-xs text-muted-foreground hover:text-foreground">
            {t('ui.explore.anyDate')}
          </button>
        )}
      </FilterGroup>

      <FilterGroup title={t('ui.explore.priceRange')}>
        <PriceRangeSlider
          min={0}
          max={priceSliderMax}
          valueMin={sliderMin}
          valueMax={sliderMax}
          onChangeMin={(v) => setMinPrice(String(v))}
          onChangeMax={(v) => setMaxPrice(String(v))}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>₼{sliderMin}</span>
          <span>₼{sliderMax}{sliderMax === priceSliderMax ? '+' : ''}</span>
        </div>
      </FilterGroup>

      <FilterGroup title={t('ui.explore.category')}>
        <div className="space-y-2">
          {Object.entries(CATEGORY_STYLE).map(([cat, style]) => (
            <label key={cat} className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={activeCategories.includes(cat)} onChange={() => toggle(setActiveCategories, cat)} className={checkbox} />
              {t(style.labelKey)}
            </label>
          ))}
          <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={multiDayOnly} onChange={() => setMultiDayOnly((v) => !v)} className={checkbox} />
            {t('ui.category.multiday')}
          </label>
          <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={dealsOnly} onChange={() => setDealsOnly((v) => !v)} className={checkbox} />
            {t('home.lastMinuteDeals')}
          </label>
        </div>
      </FilterGroup>

      <FilterGroup title={t('ui.explore.language')}>
        <SelectField value={languageFilter} onChange={setLanguageFilter} label={t('ui.explore.language')}>
          <option value="all">{t('ui.explore.allLanguages')}</option>
          {GUIDE_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {t(`lang.${code}` as TranslationKey)}
            </option>
          ))}
        </SelectField>
      </FilterGroup>

      <FilterGroup title={t('ui.explore.sortBy')}>
        <SelectField value={sortBy} onChange={(v) => setSortBy(v as SortKey)} label={t('ui.explore.sortBy')}>
          <option value="recommended">{t('ui.explore.mostPopular')}</option>
          <option value="rating-desc">{t('home.sortRatingDesc')}</option>
          <option value="price-asc">{t('home.sortPriceAsc')}</option>
          <option value="price-desc">{t('home.sortPriceDesc')}</option>
          <option value="date-asc">{t('ui.explore.soonest')}</option>
        </SelectField>
      </FilterGroup>

      <div className="pt-4">
        <button
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold text-primary"
          aria-expanded={showMore}
        >
          {t('ui.explore.moreFilters')}
          <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {showMore && (
          <div className="mt-3 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t('home.popularFilters')}</h3>
              <div className="space-y-2">
                {TOUR_FEATURES.map((f) => (
                  <label key={f.slug} className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={activeFeatures.includes(f.slug)} onChange={() => toggle(setActiveFeatures, f.slug)} className={checkbox} />
                    {t(f.labelKey)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t('home.vehicleFilters')}</h3>
              <div className="space-y-2">
                {VEHICLE_FEATURES.map((f) => (
                  <label key={f.slug} className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={activeVehicleFeatures.includes(f.slug)} onChange={() => toggle(setActiveVehicleFeatures, f.slug)} className={checkbox} />
                    {t(f.labelKey)}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-2 text-sm font-medium text-foreground cursor-pointer">
              {t('home.compareProperties')}
              <input
                type="checkbox"
                checked={compareMode}
                onChange={() => {
                  setCompareMode((v) => !v);
                  setCompareSelectedIds([]);
                }}
                className={checkbox}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start bg-card border border-border rounded-xl p-5 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide">
          {filters}
        </aside>

        <div className="min-w-0">
          {/* Search + view toggle */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ui.explore.searchPlaceholder')}
                className="w-full text-sm bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm font-medium"
            >
              <SlidersHorizontal size={15} /> {t('ui.explore.filters')}
            </button>
            <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
              {(
                [
                  ['list', LayoutGrid, 'ui.explore.list'],
                  ['map', MapIcon, 'ui.explore.map'],
                ] as const
              ).map(([key, Icon, labelKey]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={`flex items-center gap-1.5 h-10 px-3 text-sm font-medium transition-colors ${
                    view === key ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/75 hover:text-primary'
                  }`}
                >
                  <Icon size={15} /> <span className="hidden sm:inline">{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {loading ? t('home.loadingTours') : t('ui.explore.toursFound', { count: sorted.length })}
          </p>

          {error && (
            <div className="text-center py-16 text-muted-foreground text-sm">{t('home.couldntReachBackend')}</div>
          )}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden border border-border animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && view === 'map' && <DestinationMap tours={sorted} heightClassName="h-[520px]" />}

          {!loading && !error && view === 'list' && sorted.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Search size={28} className="mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t('home.noToursMatch')}</p>
              {hasFilters && (
                <button onClick={clearAll} className="mt-3 text-sm font-semibold text-primary">
                  {t('ui.explore.clearAll')}
                </button>
              )}
            </div>
          )}

          {!loading && !error && view === 'list' && sorted.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((tour) => (
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

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setFiltersOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-card p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFiltersOpen(false)}
              aria-label={t('map.close')}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X size={16} />
            </button>
            {filters}
            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-5 w-full bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg"
            >
              {t('ui.explore.showResults', { count: sorted.length })}
            </button>
          </div>
        </div>
      )}

      {compareMode && compareSelectedIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-navy text-white rounded-full shadow-lift px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-semibold">{t('compare.selected', { count: compareSelectedIds.length })}</span>
          {compareSelectedIds.length >= 2 ? (
            <button
              onClick={() => setShowCompareModal(true)}
              className="text-sm font-bold bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:bg-primary-hover"
            >
              {t('compare.compareNow')}
            </button>
          ) : (
            <span className="text-xs text-white/70">{t('home.selectMoreToCompare')}</span>
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
    </div>
  );
}
