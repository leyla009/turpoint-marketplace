'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, Filter, Leaf, Landmark, Music, Utensils, MapPinned } from 'lucide-react';
import TourCard, { ApiTour } from './components/TourCard';
import Greeting from './components/Greeting';
import HeroSlideshow from './components/HeroSlideshow';
import HeroSearchCard from './components/HeroSearchCard';

// Leaflet touches `window` at import time, so it can only run in the
// browser — ssr: false keeps Next from trying to render it server-side.
const DestinationMap = dynamic(() => import('./components/DestinationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 rounded-xl border border-border bg-card animate-pulse" />
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Category = 'all' | 'nature' | 'history' | 'entertainment' | 'food';

const CATEGORIES: { id: Category; label: string; Icon: any }[] = [
  { id: 'all', label: 'All', Icon: Filter },
  { id: 'nature', label: 'Nature', Icon: Leaf },
  { id: 'history', label: 'History', Icon: Landmark },
  { id: 'entertainment', label: 'Entertainment', Icon: Music },
  { id: 'food', label: 'Food', Icon: Utensils },
];

export default function Home() {
  const router = useRouter();
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [operators, setOperators] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Hero search card state. fromCity is decorative only (see
  // HeroSearchCard's comment - tours have no origin-city field to filter
  // by). departDate/returnDate are a date-range filter, not a literal
  // round trip.
  const [fromCity, setFromCity] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/tours`).then((r) => r.json()),
      fetch(`${API_URL}/api/operators`).then((r) => r.json()),
    ])
      .then(([toursData, operatorsData]) => {
        setTours(toursData);
        const map: Record<number, string> = {};
        operatorsData.forEach((op: any) => {
          map[op.id] = op.name;
        });
        setOperators(map);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const locations = useMemo(
    () => Array.from(new Set(tours.map((t) => t.location).filter(Boolean))) as string[],
    [tours]
  );

  const filtered = useMemo(() => {
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    const minSeats = travelers === '' ? null : Number(travelers);

    return tours.filter((t) => {
      const matchCat = activeCategory === 'all' || t.category === activeCategory;
      const matchLocation = locationFilter === 'all' || t.location === locationFilter;
      const effectivePrice = t.discounted_price ?? t.price;
      const matchMin = min === null || effectivePrice >= min;
      const matchMax = max === null || effectivePrice <= max;
      // ISO 'YYYY-MM-DD' strings compare lexicographically in date order.
      const matchDepart = departDate === '' || t.date >= departDate;
      const matchReturn = returnDate === '' || t.date <= returnDate;
      const matchTravelers = minSeats === null || t.max_participants >= minSeats;
      return matchCat && matchLocation && matchMin && matchMax && matchDepart && matchReturn && matchTravelers;
    });
  }, [tours, activeCategory, locationFilter, minPrice, maxPrice, departDate, returnDate, travelers]);

  const scrollToResults = () => {
    document.getElementById('tour-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            Növbəti dayanacağın haradır?
          </h1>
        </div>
      </div>

      {/* Floating search card - straddles the hero/content boundary, with
          the same left/right page margins as everything else so it never
          touches the screen edges. */}
      <div className="px-4 sm:px-6 max-w-[1600px] mx-auto relative z-20 -mt-8 md:-mt-10">
        <HeroSearchCard
          locations={locations}
          fromCity={fromCity}
          onFromCityChange={setFromCity}
          toLocation={locationFilter}
          onToLocationChange={setLocationFilter}
          departDate={departDate}
          onDepartDateChange={setDepartDate}
          returnDate={returnDate}
          onReturnDateChange={setReturnDate}
          travelers={travelers}
          onTravelersChange={setTravelers}
          onSearch={scrollToResults}
        />
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pt-8 md:pt-10 max-w-[1600px] mx-auto">
        {/* Destination map */}
        {!loading && tours.length > 0 && (
          <div className="mb-6">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3">
              <MapPinned size={15} /> Explore destinations
            </h2>
            <DestinationMap tours={tours} />
          </div>
        )}

        {/* Filters: location + price range */}
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none"
          >
            <option value="all">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min AZN"
            className="w-24 text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none"
          />
          <input
            type="number"
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max AZN"
            className="w-24 text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none"
          />
          {(locationFilter !== 'all' || minPrice !== '' || maxPrice !== '') && (
            <button
              onClick={() => {
                setLocationFilter('all');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-foreground border-border hover:border-primary/30'
                }`}
              >
                <Icon size={12} />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div id="tour-results" className="mt-4 mb-10 scroll-mt-20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              {loading
                ? 'Loading tours...'
                : `${filtered.length} tour${filtered.length !== 1 ? 's' : ''} available`}
            </h2>
            <button
              onClick={() => router.push('/compare')}
              className="text-xs text-accent font-semibold hover:underline"
            >
              Compare tours →
            </button>
          </div>

          {error && (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-sm">Couldn&apos;t reach the backend. Is it running?</p>
            </div>
          )}

          {!error && !loading && filtered.length === 0 && (
            <div className="text-center py-14 text-muted-foreground">
              <Search size={30} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tours match your search.</p>
            </div>
          )}

          {!error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  operatorName={operators[tour.operator_id]}
                  onClick={() => router.push(`/tours/${tour.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}