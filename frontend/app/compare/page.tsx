'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, Search, X, Check, ArrowLeft, MapPin, Calendar, Users, Tag } from 'lucide-react';
import { CATEGORY_STYLE, ApiTour } from '../components/TourCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CompareTour extends ApiTour {
  description?: string | null;
  active_deal?: { discount_percent: number } | null;
}

export default function ComparePage() {
  const router = useRouter();

  const [tours, setTours] = useState<ApiTour[]>([]);
  const [operators, setOperators] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [comparing, setComparing] = useState(false);
  const [compareData, setCompareData] = useState<CompareTour[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(false);

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

  const filteredTours = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (q === '') return tours;
    return tours.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.location ?? '').toLowerCase().includes(q)
    );
  }, [tours, searchQuery]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // cap at 3, matches backend limit
      return [...prev, id];
    });
  }

  async function runCompare() {
    setComparing(true);
    setCompareLoading(true);
    setCompareError(false);
    try {
      // Compare endpoint returns bare tour rows; hit /:id per tour in
      // parallel too so we also get discounted_price / active_deal, same
      // as the tour detail page does.
      const detailed = await Promise.all(
        selectedIds.map((id) => fetch(`${API_URL}/api/tours/${id}`).then((r) => r.json()))
      );
      setCompareData(detailed);
    } catch {
      setCompareError(true);
    } finally {
      setCompareLoading(false);
    }
  }

  function backToSelection() {
    setComparing(false);
    setCompareData(null);
    setCompareError(false);
  }

  if (comparing) {
    return (
      <div className="min-h-full px-4 sm:px-6 pt-6 pb-16 max-w-[1600px] mx-auto">
        <button
          onClick={backToSelection}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={14} /> Change tours
        </button>

        <h1
          className="text-xl sm:text-2xl font-bold text-foreground mb-5"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Comparing {selectedIds.length} tours
        </h1>

        {compareLoading && (
          <div className="text-center py-20 text-muted-foreground text-sm">Loading comparison...</div>
        )}

        {compareError && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">Couldn&apos;t load the comparison. Is the backend running?</p>
            <button
              onClick={runCompare}
              className="mt-3 text-xs text-accent font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!compareLoading && !compareError && compareData && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div
              className="grid gap-4 min-w-[640px]"
              style={{ gridTemplateColumns: `140px repeat(${compareData.length}, 1fr)` }}
            >
              {/* Header row: tour cards */}
              <div />
              {compareData.map((tour) => {
                const style = CATEGORY_STYLE[tour.category ?? ''] ?? CATEGORY_STYLE.history;
                const Icon = style.Icon;
                return (
                  <div key={tour.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className={`h-20 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                      <Icon size={22} className="text-white/90" />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{tour.title}</h3>
                      <button
                        onClick={() => router.push(`/tours/${tour.id}`)}
                        className="text-[11px] text-accent font-semibold hover:underline"
                      >
                        View tour →
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Price row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">Price</div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1">
                  {typeof tour.discounted_price === 'number' ? (
                    <div>
                      <span className="text-sm font-bold text-accent">{tour.discounted_price} AZN</span>
                      <span className="text-xs text-muted-foreground line-through ml-1.5">{tour.price} AZN</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{tour.price} AZN</span>
                  )}
                </div>
              ))}

              {/* Category row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Tag size={13} className="mr-1.5" /> Category
              </div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground capitalize">
                  {tour.category ?? '—'}
                </div>
              ))}

              {/* Location row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <MapPin size={13} className="mr-1.5" /> Location
              </div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {tour.location ?? '—'}
                </div>
              ))}

              {/* Date row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Calendar size={13} className="mr-1.5" /> Date
              </div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {tour.date}
                </div>
              ))}

              {/* Duration row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">Duration</div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {tour.duration_days} day{tour.duration_days !== 1 ? 's' : ''}
                </div>
              ))}

              {/* Group size row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Users size={13} className="mr-1.5" /> Group size
              </div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {tour.min_participants}–{tour.max_participants} people
                </div>
              ))}

              {/* Operator row */}
              <div className="flex items-center text-xs font-semibold text-muted-foreground">Operator</div>
              {compareData.map((tour) => (
                <div key={tour.id} className="flex items-center px-1 text-sm text-foreground">
                  {operators[tour.operator_id] ?? '—'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 sm:px-6 pt-6 pb-24 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <TrendingDown size={18} className="text-accent" />
        <h1
          className="text-xl sm:text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Compare tours
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Pick 2 or 3 tours to compare side-by-side.</p>

      <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm max-w-xl mb-5">
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

      {loading && <div className="text-center py-20 text-muted-foreground text-sm">Loading tours...</div>}

      {error && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">Couldn&apos;t reach the backend. Is it running?</p>
        </div>
      )}

      {!loading && !error && filteredTours.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Search size={30} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tours match your search.</p>
        </div>
      )}

      {!loading && !error && filteredTours.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTours.map((tour) => {
            const style = CATEGORY_STYLE[tour.category ?? ''] ?? CATEGORY_STYLE.history;
            const Icon = style.Icon;
            const selected = selectedIds.includes(tour.id);
            const disabled = !selected && selectedIds.length >= 3;
            return (
              <button
                key={tour.id}
                onClick={() => toggleSelect(tour.id)}
                disabled={disabled}
                className={`text-left bg-card border rounded-xl overflow-hidden transition-all ${
                  selected
                    ? 'border-accent ring-2 ring-accent/30'
                    : disabled
                    ? 'border-border opacity-50 cursor-not-allowed'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className={`relative h-24 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                  <Icon size={22} className="text-white/90" />
                  {selected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-foreground leading-snug mb-0.5 line-clamp-2">
                    {tour.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-1.5">{tour.location}</p>
                  <p className="text-sm font-bold text-foreground">{tour.price} AZN</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length >= 2 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-semibold">{selectedIds.length} selected</span>
          <button
            onClick={runCompare}
            className="text-sm font-bold bg-accent text-accent-foreground rounded-full px-4 py-1.5 hover:opacity-90"
          >
            Compare now
          </button>
        </div>
      )}
    </div>
  );
}