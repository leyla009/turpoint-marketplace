'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, X, Filter, MapPin, Users, Ticket } from 'lucide-react';
import TourCard, { ApiTour, CATEGORY_STYLE } from './components/TourCard';
import Greeting from './components/Greeting';

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

const CATEGORY_IDS: Exclude<Category, 'all'>[] = ['nature', 'history', 'entertainment', 'food'];

export default function Home() {
  const router = useRouter();
  const [tours, setTours] = useState<ApiTour[]>([]);
  const [operators, setOperators] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

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

    return tours.filter((t) => {
      const matchCat = activeCategory === 'all' || t.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchQ =
        q === '' ||
        t.title.toLowerCase().includes(q) ||
        (t.location ?? '').toLowerCase().includes(q);
      const matchLocation = locationFilter === 'all' || t.location === locationFilter;
      const effectivePrice = t.discounted_price ?? t.price;
      const matchMin = min === null || effectivePrice >= min;
      const matchMax = max === null || effectivePrice <= max;
      return matchCat && matchQ && matchLocation && matchMin && matchMax;
    });
  }, [tours, activeCategory, searchQuery, locationFilter, minPrice, maxPrice]);

  // Spotlight the best deal (or failing that, the cheapest tour) above the
  // grid — only while no filter is active, so it can't contradict what the
  // traveler is actually searching for.
  const featured = useMemo(() => {
    if (tours.length === 0) return null;
    const withDeal = tours.find((t) => typeof t.discounted_price === 'number');
    if (withDeal) return withDeal;
    return tours.reduce((best, t) => (t.price < best.price ? t : best), tours[0]);
  }, [tours]);

  const isFiltering =
    activeCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    locationFilter !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '';
  const showFeatured = !isFiltering && !!featured;
  const gridTours = showFeatured ? filtered.filter((t) => t.id !== featured!.id) : filtered;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative pt-8 pb-8 overflow-hidden bg-gradient-to-br from-primary to-[#122A21]">
        <div className="absolute w-[420px] h-[420px] rounded-full bg-accent opacity-[0.16] blur-[90px] -top-40 -right-16" />
        <div className="absolute w-[360px] h-[360px] rounded-full bg-[#2F6E52] opacity-[0.35] blur-[90px] -bottom-44 left-32" />

        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto relative">
          <Greeting />
          <h1
            className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Where to next?
          </h1>

          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-lg max-w-xl mb-4">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tours or destinations..."
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-white/10 border border-white/15 text-[#EFE7D8] hover:bg-white/[0.15]'
              }`}
            >
              <Filter size={12} />
              All
            </button>
            {CATEGORY_IDS.map((id) => {
              const cat = CATEGORY_STYLE[id];
              const Icon = cat.Icon;
              return (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-white/10 border border-white/15 text-[#EFE7D8] hover:bg-white/[0.15]'
                  }`}
                >
                  <Icon size={12} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-b border-border bg-card">
        <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center shrink-0">
              <Search size={16} className="text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold tracking-wide text-accent mb-0.5">STEP 1</div>
              <div className="text-sm font-extrabold mb-0.5">Browse verified tours</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Filter by location, price, and category across licensed local operators.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center shrink-0">
              <Users size={16} className="text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold tracking-wide text-accent mb-0.5">STEP 2</div>
              <div className="text-sm font-extrabold mb-0.5">Your booking joins the group</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Once the group hits its minimum, everyone&apos;s price drops together, automatically.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center shrink-0">
              <Ticket size={16} className="text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold tracking-wide text-accent mb-0.5">STEP 3</div>
              <div className="text-sm font-extrabold mb-0.5">Get your e-ticket instantly</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                A scannable QR ticket lands in My Trips the moment your booking confirms.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pt-6 max-w-[1600px] mx-auto">
        {/* Destination map */}
        {!loading && tours.length > 0 && (
          <div className="mb-6">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3">
              <MapPin size={15} /> Explore destinations
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
          {isFiltering && (
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
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

        {/* Featured / spotlight tour */}
        {showFeatured && featured && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">Featured this week</h2>
            <div
              onClick={() => router.push(`/tours/${featured.id}`)}
              className="flex flex-col sm:flex-row gap-0 bg-card border border-border rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
            >
              <div
                className={`relative w-full sm:w-72 h-40 sm:h-auto shrink-0 flex items-center justify-center bg-gradient-to-br ${
                  (CATEGORY_STYLE[featured.category ?? ''] ?? CATEGORY_STYLE.history).gradient
                }`}
              >
                {(() => {
                  const Icon = (CATEGORY_STYLE[featured.category ?? ''] ?? CATEGORY_STYLE.history).Icon;
                  return <Icon size={44} className="text-white/85" />;
                })()}
                <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-white text-[10px] font-extrabold text-primary">
                  {typeof featured.discounted_price === 'number' ? 'Last-minute deal' : 'Best value'}
                </span>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div
                  className="text-lg sm:text-xl font-bold text-foreground mb-1.5"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {featured.title}
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  {featured.location} · {featured.duration_days} day{featured.duration_days !== 1 ? 's' : ''} · min{' '}
                  {featured.min_participants} travelers to confirm group pricing
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      {operators[featured.operator_id] ?? 'TurPoint operator'}
                    </div>
                    <div className="text-xl font-extrabold text-primary">
                      AZN{featured.discounted_price ?? featured.price}
                      <span className="text-[11px] font-semibold text-muted-foreground">/pp</span>
                    </div>
                  </div>
                  <div className="px-5 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-sm font-bold">
                    View tour
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-1 mb-10">
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

          {!error && gridTours.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridTours.map((tour) => (
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
