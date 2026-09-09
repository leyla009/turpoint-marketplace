'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigation, MapPin, Calendar, Users, Search, ChevronDown, Minus, Plus, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AZERBAIJAN_CITIES } from '../lib/azerbaijanCities';

interface HeroSearchCardProps {
  fromLocation: string;
  onFromLocationChange: (value: string) => void;
  toLocation: string;
  onToLocationChange: (value: string) => void;
  departDate: string;
  onDepartDateChange: (value: string) => void;
  returnDate: string;
  onReturnDateChange: (value: string) => void;
  travelers: string;
  onTravelersChange: (value: string) => void;
  onSearch: () => void;
}

// Floating hero search card, styled after a flights-style search bar but
// scoped to what a tour marketplace actually has: one destination and one
// date per tour, not an origin airport or a round trip.
// - "Haradan?" is the traveler's own starting city - editable (any real
//   Azerbaijan city), but it doesn't filter the tour results below, since
//   tours have no origin-city field to filter by. It's real input, not a
//   fake control: Smart Planner picks it up as the trip's starting point
//   when a traveler opens it from the homepage.
// - "Hara?" drives the same locationFilter state as the location dropdown
//   further down the page - both stay in sync from one source of truth.
// - "Gediş"/"Qayıdış" are a date RANGE filter (backend's fromDate/toDate),
//   not a literal round-trip - relabeled to fit this layout.
// - "Nəqliyyatın tutumu" (vehicle capacity) filters out tours whose
//   max_participants (== the "Yer sayı" set on the tour) is below the
//   requested count.
export default function HeroSearchCard({
  fromLocation,
  onFromLocationChange,
  toLocation,
  onToLocationChange,
  departDate,
  onDepartDateChange,
  returnDate,
  onReturnDateChange,
  travelers,
  onTravelersChange,
  onSearch,
}: HeroSearchCardProps) {
  const { t } = useLanguage();

  return (
    // A single white surface with hairline dividers between fields, sitting
    // on the hero's sand background - this is the hero's visual center, so
    // it gets real elevation (a soft shadow, not a border trick) rather
    // than blending into whatever sits behind it.
    <div className="bg-card rounded-2xl shadow-[0_12px_32px_-8px_rgba(27,61,47,0.18)] p-2">
      {/* Grid on mobile - pairs related fields (from/to, depart/return) into
          two-up rows instead of stacking all six full-width, since a fully
          stacked card can render tall enough to sit behind the persistent
          mobile bottom nav bar on shorter phones. Plain flex-row on desktop,
          unchanged from before - the grid classes below are simply inert
          once display:flex takes over at md, so the divide-x dividers
          between all six fields still work exactly as they did. */}
      <div className="grid grid-cols-2 gap-1.5 md:flex md:gap-0 md:items-stretch md:divide-x md:divide-border">
        <DestinationField
          label={t('search.from')}
          value={fromLocation}
          onChange={onFromLocationChange}
          icon={<Navigation size={15} className="text-muted-foreground shrink-0" />}
          showAnywhere={false}
        />

        <DestinationField label={t('search.to')} value={toLocation} onChange={onToLocationChange} />

        <DateField label={t('search.depart')} value={departDate} onChange={onDepartDateChange} />

        <DateField label={t('search.return')} value={returnDate} onChange={onReturnDateChange} />

        <TravelersField
          label={t('search.travelers')}
          value={travelers}
          onChange={onTravelersChange}
          className="col-span-2"
        />

        <div className="col-span-2 p-1.5 md:pl-3 md:py-1.5 flex items-stretch">
          <button
            onClick={onSearch}
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-sm font-bold px-7 py-3 md:py-0 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shrink-0"
          >
            <Search size={16} /> {t('search.search')}
          </button>
        </div>
      </div>
    </div>
  );
}

// "Hara?"/"Haradan?" - a searchable destination dropdown instead of a
// plain <select>, so picking from 65+ districts doesn't mean scrolling a
// native list one entry at a time. Shared between both fields: "Hara?"
// allows an "Anywhere" option (it drives the real location filter below),
// "Haradan?" doesn't (a starting city is always a specific place) - see
// showAnywhere.
function DestinationField({
  label,
  value,
  onChange,
  icon,
  showAnywhere: allowAnywhere = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  showAnywhere?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const anywhereLabel = t('search.anywhere');
  const displayValue = allowAnywhere && value === 'all' ? anywhereLabel : value;

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const cities = q ? AZERBAIJAN_CITIES.filter((c) => c.toLocaleLowerCase().includes(q)) : AZERBAIJAN_CITIES;
    const showAnywhere = allowAnywhere && (!q || anywhereLabel.toLocaleLowerCase().includes(q));
    return { showAnywhere, cities };
  }, [query, anywhereLabel, allowAnywhere]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function pick(city: string) {
    onChange(city);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div
        className={`rounded-xl px-4 py-2.5 transition-colors cursor-text ${
          open ? 'bg-muted/60' : 'hover:bg-muted/50'
        }`}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5 truncate">{label}</p>
        <div className="flex items-center gap-1.5">
          {icon ?? <MapPin size={15} className="text-muted-foreground shrink-0" />}
          {open ? (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={displayValue}
              className="w-full bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground"
            />
          ) : (
            <span className="text-sm font-medium text-foreground truncate">{displayValue}</span>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-full sm:w-72 max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-xl py-1.5 z-50">
          {matches.showAnywhere && (
            <button
              type="button"
              onClick={() => pick('all')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <MapPin size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 font-medium text-foreground">{anywhereLabel}</span>
              {value === 'all' && <Check size={14} className="text-primary shrink-0" />}
            </button>
          )}
          {matches.cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => pick(city)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <MapPin size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-foreground truncate">{city}</span>
              {value === city && <Check size={14} className="text-primary shrink-0" />}
            </button>
          ))}
          {!matches.showAnywhere && matches.cities.length === 0 && (
            <p className="px-3.5 py-3 text-sm text-muted-foreground">{t('search.noDestinationMatch')}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Date field: label on top, native date input below with a calendar icon
// pinned to the right edge. The browser's own calendar-picker-indicator is
// stretched invisibly over the whole input (::-webkit-calendar-picker-
// indicator) so clicking anywhere on the field - the digits or the icon -
// opens the native date picker, not just a narrow hit target.
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl px-4 py-2.5 transition-colors hover:bg-muted/50 focus-within:bg-muted/60">
      <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{label}</p>
      <div className="relative flex items-center">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none text-sm font-medium text-foreground pr-5 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
        <Calendar size={13} className="text-muted-foreground absolute right-0 pointer-events-none" />
      </div>
    </div>
  );
}

// "Sərnişin sayı" - a +/- stepper in a small popover instead of a bare
// number input, matching the occupancy-style pattern this kind of search
// bar is expected to have. Still just one plain traveler count under the
// hood (the data model has no separate adults/children/rooms), so the
// popover is deliberately a single row, not a multi-field form pretending
// there's more to configure than there actually is.
function TravelersField({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = value === '' ? 1 : Math.max(1, Number(value) || 1);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative md:flex-none md:w-40 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-xl px-4 py-2.5 transition-colors ${
          open ? 'bg-muted/60' : 'hover:bg-muted/50'
        }`}
      >
        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5 truncate">{label}</p>
        <div className="flex items-center gap-1.5">
          <Users size={15} className="text-muted-foreground shrink-0" />
          <span className="flex-1 text-sm font-medium text-foreground">
            {t('search.travelerCount', { count })}
          </span>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 md:left-auto md:right-0 mt-1.5 w-full md:w-64 bg-card border border-border rounded-xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t('search.travelers')}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange(String(Math.max(1, count - 1)))}
                disabled={count <= 1}
                aria-label={t('search.decreaseTravelers')}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:border-primary transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-4 text-center text-sm font-semibold text-foreground">{count}</span>
              <button
                type="button"
                onClick={() => onChange(String(count + 1))}
                aria-label={t('search.increaseTravelers')}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full mt-4 text-sm font-semibold bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 transition-opacity"
          >
            {t('search.done')}
          </button>
        </div>
      )}
    </div>
  );
}
