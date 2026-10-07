'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, LayoutGrid, Map as MapIcon, SlidersHorizontal, X, ChevronDown, ArrowRight, Plus } from 'lucide-react';
import TourCard, { ApiTour, CATEGORY_STYLE, CategoryMotif } from '@/app/components/TourCard';
import PriceRangeSlider from '@/app/components/PriceRangeSlider';
import CompareModal from '@/app/components/CompareModal';
import { TOUR_FEATURES, parseFeatures } from '@/app/lib/tourFeatures';
import { VEHICLE_FEATURES, parseVehicleFeatures } from '@/app/lib/vehicleFeatures';
import { tourTitle, placeName, tourFacts } from '@/app/lib/tourContent';
import { ECONOMIC_REGIONS, regionOfPlace, regionShortLabel } from '@/app/lib/destinations';
import { formatDate } from '@/app/lib/format';
import { photoSrc } from '@/app/lib/photo';
import { useLanguage } from '@/app/context/LanguageContext';
import { useFavorites } from '@/app/lib/useFavorites';
import type { TranslationKey } from '@/app/lib/translations';

// Leaflet / Google Maps touch `window`, so the map only runs in the browser.
const DestinationMap = dynamic(() => import('@/app/components/DestinationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[560px] rounded-2xl border border-border bg-muted animate-pulse" />,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const GUIDE_LANGUAGES = ['az', 'en', 'ru', 'tr', 'ar'] as const;
const MAX_COMPARE = 3;
const HISTOGRAM_BARS = 16;

type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'rating-desc' | 'date-asc';
type WhenKey = '' | 'weekend' | 'next7' | 'month' | 'custom';
type DurationKey = '' | '1' | '2-3' | '4+';

// ---- dates (local calendar days as YYYY-MM-DD) -----------------------------

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// The date window each "When" chip stands for. "This weekend" is the coming
// Saturday-Sunday, or what's left of it when today is already the weekend.
function whenRange(when: WhenKey, customFrom: string, customTo: string): [string, string] | null {
  const today = new Date();
  switch (when) {
    case 'weekend': {
      const dow = today.getDay(); // 0 = Sunday
      if (dow === 0) return [iso(today), iso(today)];
      const saturday = addDays(today, 6 - dow);
      return [iso(dow === 6 ? today : saturday), iso(addDays(saturday, 1))];
    }
    case 'next7':
      return [iso(today), iso(addDays(today, 6))];
    case 'month':
      return [iso(today), iso(new Date(today.getFullYear(), today.getMonth() + 1, 0))];
    case 'custom':
      if (!customFrom && !customTo) return null;
      return [customFrom || '0000-01-01', customTo || '9999-12-31'];
    default:
      return null;
  }
}

const matchesDuration = (days: number, d: DurationKey) =>
  d === '' || (d === '1' ? days <= 1 : d === '2-3' ? days >= 2 && days <= 3 : days >= 4);

// ---- small building blocks ---------------------------------------------------

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <h3 className="text-sm font-bold text-navy mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active ? 'bg-navy text-white border-navy' : 'bg-card text-foreground/80 border-border hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}

function CheckRow({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer py-0.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-border accent-[var(--primary)] cursor-pointer" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className={`text-xs tabular-nums ${count === 0 ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{count}</span>}
    </label>
  );
}

const selectClass =
  'w-full appearance-none text-sm bg-card border border-border rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-primary cursor-pointer';

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
  const [when, setWhen] = useState<WhenKey>('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [duration, setDuration] = useState<DurationKey>('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [multiDayOnly, setMultiDayOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('all');
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [activeVehicleFeatures, setActiveVehicleFeatures] = useState<string[]>([]);
  const [showVehicle, setShowVehicle] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Deep links from the homepage search, category tiles, destination tiles,
  // deals banner and the footer: /tours?location=Quba&date=2026-10-18&category=nature
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category === 'multiday') setMultiDayOnly(true);
    else if (category) setActiveCategories([category]);
    if (params.get('location')) setLocationFilter(params.get('location')!);
    const date = params.get('date');
    if (date) {
      setWhen('custom');
      setCustomFrom(date);
      setCustomTo(date);
    }
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

  // Destinations that actually have tours - plus whatever ?location= asked
  // for, so a place with no tours yet still shows as the selected value.
  const locationGroups = useMemo(() => {
    const set = new Set(tours.map((x) => x.location).filter(Boolean) as string[]);
    if (locationFilter !== 'all') set.add(locationFilter);
    const locations = Array.from(set);
    const groups = ECONOMIC_REGIONS.map((r) => ({
      heading: regionShortLabel(r.label[locale]),
      places: r.places.filter((p) => locations.includes(p)),
    }));
    const other = locations.filter((l) => !regionOfPlace(l)).sort();
    if (other.length) groups.push({ heading: t('ui.search.otherPlaces'), places: other });
    return groups.filter((g) => g.places.length > 0);
  }, [tours, locationFilter, locale, t]);

  const priceOf = (x: ApiTour) => x.discounted_price ?? x.price;
  const highestPrice = tours.length ? Math.max(...tours.map(priceOf)) : 100;
  const priceCeiling = Math.max(100, Math.ceil(highestPrice / 10) * 10);
  const lo = minPrice ?? 0;
  const hi = maxPrice ?? priceCeiling;

  const range = whenRange(when, customFrom, customTo);

  // One predicate for every filter. `skip` leaves one filter out so each
  // filter's own counts (category numbers, price histogram) show what
  // choosing it WOULD give, given everything else that's selected.
  const passes = (tour: ApiTour, skip?: 'category' | 'price') => {
    const q = query.trim().toLowerCase();
    if (q) {
      const haystack = `${tourTitle(tour, locale)} ${tour.title} ${tour.location ?? ''} ${placeName(tour.location, locale)} ${
        operators[tour.operator_id] ?? ''
      }`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (locationFilter !== 'all' && tour.location !== locationFilter) return false;
    if (range) {
      const d = tour.date.slice(0, 10);
      if (d < range[0] || d > range[1]) return false;
    }
    if (skip !== 'price') {
      const price = priceOf(tour);
      if (price < lo || (maxPrice !== null && price > hi)) return false;
    }
    if (!matchesDuration(tour.duration_days, duration)) return false;
    if (skip !== 'category') {
      if (activeCategories.length && !(tour.category && activeCategories.includes(tour.category))) return false;
      if (multiDayOnly && tour.duration_days < 2) return false;
      if (dealsOnly && typeof tour.discounted_price !== 'number') return false;
    }
    if (languageFilter !== 'all' && !(tourFacts({ facts: tour.facts ?? null }).guide_languages ?? []).includes(languageFilter)) return false;
    const features = parseFeatures(tour.features);
    if (!activeFeatures.every((f) => features.includes(f))) return false;
    const vehicle = parseVehicleFeatures(tour.vehicle_features || operatorVehicleFeatures[tour.operator_id]);
    if (!activeVehicleFeatures.every((f) => vehicle.includes(f))) return false;
    return true;
  };

  const filtered = tours.filter((x) => passes(x));
  const withoutCategory = tours.filter((x) => passes(x, 'category'));
  const withoutPrice = tours.filter((x) => passes(x, 'price'));

  const categoryCount = (key: string) => withoutCategory.filter((x) => x.category === key).length;
  const multiDayCount = withoutCategory.filter((x) => x.duration_days > 1).length;
  const dealCount = withoutCategory.filter((x) => typeof x.discounted_price === 'number').length;

  // Price histogram: how many tours fall in each slice of the price range.
  // (Plain computations - a few dozen tours, cheap to redo on every render.)
  const histogram = Array<number>(HISTOGRAM_BARS).fill(0);
  withoutPrice.forEach((x) => {
    histogram[Math.min(HISTOGRAM_BARS - 1, Math.floor((priceOf(x) / priceCeiling) * HISTOGRAM_BARS))] += 1;
  });
  const tallest = Math.max(1, ...histogram);

  const sorted = (() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => priceOf(a) - priceOf(b));
      case 'price-desc':
        return list.sort((a, b) => priceOf(b) - priceOf(a));
      case 'rating-desc':
        return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'date-asc':
        return list.sort((a, b) => a.date.localeCompare(b.date));
      default:
        // Most popular = real page views, then rating, then soonest.
        return list.sort(
          (a, b) => (b.click_count ?? 0) - (a.click_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0) || a.date.localeCompare(b.date)
        );
    }
  })();

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const clearAll = () => {
    setQuery('');
    setLocationFilter('all');
    setWhen('');
    setCustomFrom('');
    setCustomTo('');
    setMinPrice(null);
    setMaxPrice(null);
    setDuration('');
    setActiveCategories([]);
    setMultiDayOnly(false);
    setDealsOnly(false);
    setLanguageFilter('all');
    setActiveFeatures([]);
    setActiveVehicleFeatures([]);
  };

  // ---- active filter chips under the search bar ----------------------------
  const DURATION_LABEL: Record<Exclude<DurationKey, ''>, TranslationKey> = { '1': 'ui.ex.d1', '2-3': 'ui.ex.d23', '4+': 'ui.ex.d4' };
  const WHEN_LABEL: Record<Exclude<WhenKey, '' | 'custom'>, TranslationKey> = {
    weekend: 'ui.ex.thisWeekend',
    next7: 'ui.ex.next7',
    month: 'ui.ex.thisMonth',
  };
  const shortDate = (d: string) => formatDate(d, locale, { day: 'numeric', month: 'short' });

  const activeChips: { key: string; label: string; remove: () => void }[] = [];
  if (locationFilter !== 'all') activeChips.push({ key: 'loc', label: placeName(locationFilter, locale), remove: () => setLocationFilter('all') });
  if (when && when !== 'custom') activeChips.push({ key: 'when', label: t(WHEN_LABEL[when]), remove: () => setWhen('') });
  if (when === 'custom' && range) {
    const label = customFrom && customFrom === customTo ? shortDate(customFrom) : [customFrom && shortDate(customFrom), customTo && shortDate(customTo)].join(' – ');
    activeChips.push({ key: 'dates', label, remove: () => { setWhen(''); setCustomFrom(''); setCustomTo(''); } });
  }
  if (minPrice !== null || maxPrice !== null) {
    activeChips.push({ key: 'price', label: t('ui.ex.priceChip', { min: lo, max: hi }), remove: () => { setMinPrice(null); setMaxPrice(null); } });
  }
  if (duration) activeChips.push({ key: 'dur', label: t(DURATION_LABEL[duration]), remove: () => setDuration('') });
  activeCategories.forEach((c) =>
    activeChips.push({ key: `cat-${c}`, label: CATEGORY_STYLE[c] ? t(CATEGORY_STYLE[c].labelKey) : c, remove: () => toggle(setActiveCategories, c) })
  );
  if (multiDayOnly) activeChips.push({ key: 'multi', label: t('ui.category.multiday'), remove: () => setMultiDayOnly(false) });
  if (dealsOnly) activeChips.push({ key: 'deals', label: t('home.lastMinuteDeals'), remove: () => setDealsOnly(false) });
  activeFeatures.forEach((f) => activeChips.push({ key: `f-${f}`, label: t(`ui.ex.tag.${f}` as TranslationKey), remove: () => toggle(setActiveFeatures, f) }));
  activeVehicleFeatures.forEach((f) => {
    const vf = VEHICLE_FEATURES.find((v) => v.slug === f);
    activeChips.push({ key: `v-${f}`, label: vf ? t(vf.labelKey) : f, remove: () => toggle(setActiveVehicleFeatures, f) });
  });
  if (languageFilter !== 'all') activeChips.push({ key: 'lang', label: t(`lang.${languageFilter}` as TranslationKey), remove: () => setLanguageFilter('all') });
  const hasFilters = activeChips.length > 0 || query !== '';

  // ---- compare -------------------------------------------------------------
  const toggleCompare = (id: number) =>
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id]));
  const compareTours = compareIds.map((id) => tours.find((x) => x.id === id)).filter(Boolean) as ApiTour[];

  // The floating "Plan my trip" button steps aside while the compare bar is up.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('turpoint:fab-hidden', { detail: compareIds.length > 0 }));
    return () => {
      window.dispatchEvent(new CustomEvent('turpoint:fab-hidden', { detail: false }));
    };
  }, [compareIds.length]);

  // ---- filter panel ----------------------------------------------------------
  const filters = (
    <div>
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-base font-bold text-navy">{t('ui.explore.filters')}</h2>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs font-semibold text-navy hover:text-primary hover:underline">
            {t('ui.explore.clearAll')}
          </button>
        )}
      </div>

      <FilterGroup title={t('ui.ex.when')}>
        <div className="flex flex-wrap gap-1.5">
          {(['weekend', 'next7', 'month'] as const).map((k) => (
            <Chip key={k} active={when === k} onClick={() => setWhen(when === k ? '' : k)}>
              {t(WHEN_LABEL[k])}
            </Chip>
          ))}
          <Chip active={when === 'custom'} onClick={() => setWhen(when === 'custom' ? '' : 'custom')}>
            {t('ui.ex.pickDates')}
          </Chip>
        </div>
        {when === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="text-[11px] font-semibold text-muted-foreground">
              {t('ui.ex.from')}
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 w-full text-xs text-foreground bg-card border border-border rounded-lg px-2 py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="text-[11px] font-semibold text-muted-foreground">
              {t('ui.ex.to')}
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 w-full text-xs text-foreground bg-card border border-border rounded-lg px-2 py-2 outline-none focus:border-primary"
              />
            </label>
          </div>
        )}
      </FilterGroup>

      <FilterGroup title={t('ui.ex.pricePerPerson')}>
        <div className="flex items-end gap-[3px] h-12 mb-1" role="img" aria-label={t('ui.ex.histogram')}>
          {histogram.map((n, i) => {
            const barLo = (i / HISTOGRAM_BARS) * priceCeiling;
            const barHi = ((i + 1) / HISTOGRAM_BARS) * priceCeiling;
            const inRange = barHi > lo && barLo < hi;
            return (
              <span
                key={i}
                className={`flex-1 rounded-t-[3px] transition-colors ${inRange ? 'bg-primary/35' : 'bg-border'}`}
                style={{ height: n ? `${Math.max(12, (n / tallest) * 100)}%` : '4%' }}
              />
            );
          })}
        </div>
        <PriceRangeSlider
          min={0}
          max={priceCeiling}
          valueMin={lo}
          valueMax={hi}
          onChangeMin={(v) => setMinPrice(v === 0 ? null : v)}
          onChangeMax={(v) => setMaxPrice(v === priceCeiling ? null : v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>₼{lo}</span>
          <span>
            ₼{hi}
            {hi === priceCeiling ? '+' : ''}
          </span>
        </div>
      </FilterGroup>

      <FilterGroup title={t('ui.ex.duration')}>
        <div className="flex flex-wrap gap-1.5">
          {(['1', '2-3', '4+'] as const).map((k) => (
            <Chip key={k} active={duration === k} onClick={() => setDuration(duration === k ? '' : k)}>
              {t(DURATION_LABEL[k])}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={t('ui.explore.category')}>
        <div className="space-y-1.5">
          {Object.entries(CATEGORY_STYLE).map(([cat, style]) => (
            <CheckRow
              key={cat}
              checked={activeCategories.includes(cat)}
              onChange={() => toggle(setActiveCategories, cat)}
              label={t(style.labelKey)}
              count={categoryCount(cat)}
            />
          ))}
          <CheckRow checked={multiDayOnly} onChange={() => setMultiDayOnly((v) => !v)} label={t('ui.category.multiday')} count={multiDayCount} />
          <CheckRow checked={dealsOnly} onChange={() => setDealsOnly((v) => !v)} label={t('home.lastMinuteDeals')} count={dealCount} />
        </div>
      </FilterGroup>

      <FilterGroup title={t('ui.ex.included')}>
        <div className="space-y-1.5">
          {TOUR_FEATURES.map((f) => (
            <CheckRow key={f.slug} checked={activeFeatures.includes(f.slug)} onChange={() => toggle(setActiveFeatures, f.slug)} label={t(f.labelKey)} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowVehicle((v) => !v)}
          aria-expanded={showVehicle}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {t(showVehicle ? 'ui.ex.hideVehicleFeatures' : 'ui.ex.vehicleFeatures')}
          <ArrowRight size={12} className={`transition-transform ${showVehicle ? 'rotate-90' : ''}`} />
        </button>
        {showVehicle && (
          <div className="space-y-1.5 mt-2">
            {VEHICLE_FEATURES.map((f) => (
              <CheckRow
                key={f.slug}
                checked={activeVehicleFeatures.includes(f.slug)}
                onChange={() => toggle(setActiveVehicleFeatures, f.slug)}
                label={t(f.labelKey)}
              />
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterGroup title={t('ui.explore.language')}>
        <div className="relative">
          <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} aria-label={t('ui.explore.language')} className={selectClass}>
            <option value="all">{t('ui.explore.allLanguages')}</option>
            {GUIDE_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {t(`lang.${code}` as TranslationKey)}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </FilterGroup>

      <FilterGroup title={t('ui.explore.destination')}>
        <div className="relative">
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} aria-label={t('ui.explore.destination')} className={selectClass}>
            <option value="all">{t('ui.explore.allLocations')}</option>
            {locationGroups.map(({ heading, places }) => (
              <optgroup key={heading} label={heading}>
                {places.map((l) => (
                  <option key={l} value={l}>
                    {placeName(l, locale)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="bg-muted/40 min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[264px_1fr] gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start bg-card border border-border rounded-2xl px-5 py-4 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide">
            {filters}
          </aside>

          <div className="min-w-0">
            {/* Search, sort, view */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('ui.ex.search')}
                  aria-label={t('ui.ex.search')}
                  className="w-full h-11 text-sm bg-card border border-border rounded-xl pl-10 pr-3 outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 h-11 px-3 rounded-xl border border-border bg-card text-sm font-medium"
              >
                <SlidersHorizontal size={15} /> {t('ui.explore.filters')}
                {activeChips.length > 0 && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                    {activeChips.length}
                  </span>
                )}
              </button>
              <label className="relative flex items-center h-11 bg-card border border-border rounded-xl pl-3 pr-8 text-sm">
                <span className="text-muted-foreground mr-1 whitespace-nowrap">{t('ui.ex.sort')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label={t('ui.explore.sortBy')}
                  className="appearance-none bg-transparent font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="popular">{t('ui.explore.mostPopular')}</option>
                  <option value="rating-desc">{t('home.sortRatingDesc')}</option>
                  <option value="price-asc">{t('home.sortPriceAsc')}</option>
                  <option value="price-desc">{t('home.sortPriceDesc')}</option>
                  <option value="date-asc">{t('ui.explore.soonest')}</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </label>
              <div className="flex bg-card border border-border rounded-xl p-1 shrink-0">
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
                    className={`flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors ${
                      view === key ? 'bg-primary text-primary-foreground' : 'text-foreground/75 hover:text-primary'
                    }`}
                  >
                    <Icon size={15} className="sm:hidden" /> <span className="hidden sm:inline">{t(labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Count + active filters */}
            <div className="flex flex-wrap items-center gap-2 mt-4 mb-4 min-h-[28px]">
              <p className="text-sm font-bold text-navy mr-1">{loading ? t('home.loadingTours') : t('ui.ex.count', { count: sorted.length })}</p>
              {activeChips.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 text-xs font-semibold text-navy bg-primary/10 border border-primary/20 rounded-full pl-3 pr-1 py-1">
                  {c.label}
                  <button
                    onClick={c.remove}
                    aria-label={t('ui.ex.removeFilter', { label: c.label })}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-primary/15"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            {error && <div className="text-center py-16 text-muted-foreground text-sm">{t('home.couldntReachBackend')}</div>}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                    <div className="aspect-[16/10] bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && view === 'map' && <DestinationMap tours={sorted} heightClassName="h-[560px]" />}

            {!loading && !error && view === 'list' && sorted.length === 0 && (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
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
                    compareSelected={compareIds.includes(tour.id)}
                    compareDisabled={!compareIds.includes(tour.id) && compareIds.length >= MAX_COMPARE}
                    onToggleCompare={() => toggleCompare(tour.id)}
                    isFavorited={favoriteIds.has(tour.id)}
                    onToggleFavorite={() => toggleFavorite(tour.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setFiltersOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-card p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

      {/* Compare tray */}
      {compareIds.length > 0 && (
        <div
          role="region"
          aria-label={t('ui.ex.compareBar', { count: compareIds.length })}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[880px] bg-navy text-white rounded-2xl shadow-lift p-2.5 flex items-center gap-2"
        >
          <p className="hidden sm:block text-sm font-bold px-2 shrink-0">{t('ui.ex.compareBar', { count: compareIds.length })}</p>
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {compareTours.map((tour) => (
              <span key={tour.id} className="shrink-0 flex items-center gap-2 bg-white/10 rounded-xl pl-1.5 pr-1 py-1.5 max-w-[190px]">
                <span className="relative w-8 h-8 rounded-lg overflow-hidden bg-white/10 shrink-0">
                  {tour.photo_url ? (
                    <img src={photoSrc(tour.photo_url) ?? ''} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <CategoryMotif category={tour.category} />
                  )}
                </span>
                <span className="text-xs font-semibold truncate">{tourTitle(tour, locale)}</span>
                <button
                  onClick={() => toggleCompare(tour.id)}
                  aria-label={`${t('ui.ex.removeFromCompare')}: ${tourTitle(tour, locale)}`}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/15 shrink-0"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {compareIds.length < MAX_COMPARE && (
              <span className="shrink-0 hidden sm:flex items-center gap-1 text-xs text-white/60 border border-dashed border-white/25 rounded-xl px-3 py-2.5">
                <Plus size={12} /> {t('ui.ex.addTour')}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCompareModal(true)}
            disabled={compareIds.length < 2}
            title={compareIds.length < 2 ? t('home.selectMoreToCompare') : undefined}
            className="shrink-0 bg-[#A8E3EC] hover:bg-[#C3EDF3] text-navy text-sm font-bold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('compare.compareNow')}
          </button>
        </div>
      )}

      {showCompareModal && (
        <CompareModal
          tourIds={compareIds}
          operators={operators}
          onClose={() => setShowCompareModal(false)}
          onViewTour={(id) => router.push(`/tours/${id}`)}
        />
      )}
    </div>
  );
}
