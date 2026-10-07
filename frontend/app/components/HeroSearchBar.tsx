'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORY_STYLE, MULTIDAY_EMOJI } from './TourCard';
import SearchDropdown, { type DropdownOption } from './SearchDropdown';
import { formatDate } from '../lib/format';
import { placeName } from '../lib/tourContent';
import { AZERBAIJAN_PLACES, DEPARTURE_CITIES } from '../lib/destinations';
import { azCompare } from '../lib/azerbaijanCities';

// Solid brand-teal glyphs (lucide's icons are outline-only; the design calls
// for filled shapes with a white cut-out).
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary shrink-0" aria-hidden>
      <path fill="currentColor" d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.4 11.6 6.7 11.9a1.1 1.1 0 0 0 1.6 0c.3-.3 6.7-6.6 6.7-11.9A7.5 7.5 0 0 0 12 2Z" />
      <circle cx="12" cy="9.5" r="2.8" fill="white" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary shrink-0" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" fill="currentColor" />
      <rect x="6.5" y="2.5" width="2" height="4" rx="1" fill="currentColor" />
      <rect x="15.5" y="2.5" width="2" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="9" width="14" height="10" rx="1" fill="white" />
      {[7, 10.5, 14].map((x) => [11, 14.5].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="2.5" height="2.2" rx="0.4" fill="currentColor" />))}
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary shrink-0" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="15.5" y="15.5" width="3" height="3" rx="0.8" fill="white" />
    </svg>
  );
}

// One cell of the bar: icon, small grey label, bold value. `control` is the
// real (visually hidden) form control layered over the whole cell - used
// for the native date picker. To / Category use SearchDropdown instead.
function Field({
  icon,
  label,
  value,
  control,
  chevron = true,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  control?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3 px-5 py-3 md:py-2 flex-1 min-w-0 rounded-xl md:rounded-none hover:bg-muted/60 md:hover:bg-transparent focus-within:bg-muted/60 md:focus-within:bg-transparent transition-colors">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-[15px] font-semibold text-navy truncate leading-snug">{value}</p>
      </div>
      {chevron && <ChevronDown size={16} className="text-navy/60 shrink-0" />}
      {control}
    </div>
  );
}

const overlay = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer';

export default function HeroSearchBar() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [from, setFrom] = useState(DEPARTURE_CITIES[0]);
  const [to, setTo] = useState('');
  const [when, setWhen] = useState('');
  const [category, setCategory] = useState('');
  const dateRef = useRef<HTMLInputElement>(null);

  // One A-Z list of every city/district, each once, sorted by the name the
  // reader sees (Azerbaijani uses its own alphabet order - see azCompare).
  const placeOptions = AZERBAIJAN_PLACES.map((place) => ({ value: place, label: placeName(place, locale) })).sort((x, y) =>
    locale === 'az' ? azCompare(x.label, y.label) : x.label.localeCompare(y.label, locale)
  );
  const originOptions: DropdownOption[] = DEPARTURE_CITIES.map((c) => ({ value: c, label: placeName(c, locale) }));
  const destinationOptions: DropdownOption[] = [{ value: '', label: t('ui.search.anywhere') }, ...placeOptions];

  const categoryOptions: DropdownOption[] = [
    { value: '', label: t('ui.search.allCategories') },
    ...Object.entries(CATEGORY_STYLE).map(([key, c]) => ({ value: key, label: `${c.emoji} ${t(c.labelKey)}` })),
    { value: 'multiday', label: `${MULTIDAY_EMOJI} ${t('ui.category.multiday')}` },
  ];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    // Tours don't store a departure city yet, so `from` is carried in the URL
    // for Explore but doesn't narrow the results.
    if (from !== DEPARTURE_CITIES[0]) params.set('from', from);
    if (to) params.set('location', to);
    if (when) params.set('date', when);
    if (category) params.set('category', category);
    const qs = params.toString();
    router.push(`/tours${qs ? `?${qs}` : ''}`);
  }

  const divider = <span className="hidden md:block w-px h-10 bg-border shrink-0" aria-hidden />;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl md:rounded-full shadow-[0_10px_40px_-12px_rgba(15,42,61,0.25)] p-2 md:pl-3 flex flex-col md:flex-row md:items-center gap-1 md:gap-0"
    >
      <SearchDropdown icon={<PinIcon />} label={t('ui.search.from')} value={from} options={originOptions} onChange={setFrom} />
      {divider}
      <SearchDropdown icon={<PinIcon />} label={t('ui.search.to')} value={to} options={destinationOptions} onChange={setTo} />
      {divider}
      <Field
        icon={<CalendarIcon />}
        label={t('ui.home.when')}
        value={when ? formatDate(when, locale) : t('ui.explore.anyDate')}
        control={
          <input
            ref={dateRef}
            type="date"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            onClick={() => {
              // A transparent date input only opens its picker from the tiny
              // calendar glyph; open it from anywhere in the cell instead.
              try {
                dateRef.current?.showPicker();
              } catch {
                /* older browsers: native focus behaviour is fine */
              }
            }}
            aria-label={t('ui.home.when')}
            className={overlay}
          />
        }
      />
      {divider}
      <SearchDropdown icon={<GridIcon />} label={t('ui.explore.category')} value={category} options={categoryOptions} onChange={setCategory} />
      {divider}
      <button
        type="submit"
        className="md:ml-3 flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#0A6E8C] to-[#14B4CB] hover:from-[#08617C] hover:to-[#10A3B9] text-white text-base font-semibold px-10 py-4 rounded-xl md:rounded-full shadow-[0_6px_18px_-6px_rgba(11,138,163,0.6)] transition-colors shrink-0"
      >
        <Search size={20} strokeWidth={2.4} /> {t('ui.home.searchTours')}
      </button>
    </form>
  );
}
