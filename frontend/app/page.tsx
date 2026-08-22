'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Filter, Leaf, Landmark, Music, Utensils } from 'lucide-react';
import TourCard, { ApiTour } from './components/TourCard';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filtered = useMemo(() => {
    return tours.filter((t) => {
      const matchCat = activeCategory === 'all' || t.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchQ =
        q === '' ||
        t.title.toLowerCase().includes(q) ||
        (t.location ?? '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [tours, activeCategory, searchQuery]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-primary px-4 sm:px-6 pt-8 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white opacity-[0.04] rounded-full translate-x-20 -translate-y-20" />
        <div className="relative max-w-5xl mx-auto">
          <h1
            className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Where to next?
          </h1>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm max-w-xl">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pt-6 max-w-5xl mx-auto">
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

        <div className="mt-4 mb-10">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
