'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigation, MapPin, Calendar, Users, Search, ChevronDown, Minus, Plus, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Azerbaijani alphabet order, used to sort AZERBAIJAN_CITIES below instead
// of `localeCompare(x, 'az')`. That locale-aware sort depends on the ICU
// data baked into whatever JS engine runs it, which differs between
// Node (server-side render) and the browser (client-side render) - the two
// could silently disagree on ə/ı/ö/ü/ç/ş/ğ ordering and produce a
// server/client markup mismatch (a React hydration error) purely from list
// order. A fixed index lookup gives the identical order everywhere.
// Lower- and upper-case pairs listed explicitly (rather than lower-casing
// input at compare time) so this never touches a locale-aware case-mapping
// API either - Intl case folding for the dotted/dotless İ/I pair is itself
// ICU-version-dependent, which is exactly the kind of environment
// difference this function exists to avoid.
const AZ_ALPHABET_LOWER = 'abcçdeəfgğhxıijklmnoöprsştuüvyz';
const AZ_ALPHABET_UPPER = 'ABCÇDEƏFGĞHXIİJKLMNOÖPRSŞTUÜVYZ';
function azRank(char: string): number {
  const i = AZ_ALPHABET_LOWER.indexOf(char);
  if (i !== -1) return i;
  const j = AZ_ALPHABET_UPPER.indexOf(char);
  return j !== -1 ? j : AZ_ALPHABET_LOWER.length;
}
function azCompare(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ra = i < a.length ? azRank(a[i]) : -1;
    const rb = i < b.length ? azRank(b[i]) : -1;
    if (ra !== rb) return ra - rb;
  }
  return 0;
}

// Azerbaijan's district centers plus its major cities. Used for both
// Haradan? and Hara? - a tour marketplace covering the whole country should
// let you pick any of them, not just the handful that happen to have a
// tour listed right now.
const AZERBAIJAN_CITIES = [
  'Ağcabədi', 'Ağdam', 'Ağdaş', 'Ağstafa', 'Ağsu', 'Astara', 'Bakı', 'Balakən',
  'Beyləqan', 'Bərdə', 'Biləsuvar', 'Cəbrayıl', 'Cəlilabad', 'Daşkəsən',
  'Füzuli', 'Gədəbəy', 'Gəncə', 'Goranboy', 'Göyçay', 'Göygöl', 'Hacıqabul',
  'Xaçmaz', 'Xankəndi', 'Xızı', 'Xocalı', 'Xocavənd', 'İmişli', 'İsmayıllı',
  'Kəlbəcər', 'Kürdəmir', 'Qax', 'Qazax', 'Qəbələ', 'Qobustan', 'Quba',
  'Qubadlı', 'Qusar', 'Laçın', 'Lənkəran', 'Lerik', 'Masallı', 'Mingəçevir',
  'Naftalan', 'Naxçıvan', 'Neftçala', 'Oğuz', 'Ordubad', 'Saatlı', 'Sabirabad',
  'Salyan', 'Samux', 'Siyəzən', 'Sumqayıt', 'Şabran', 'Şamaxı', 'Şəki',
  'Şəmkir', 'Şirvan', 'Şuşa', 'Tərtər', 'Tovuz', 'Ucar', 'Yardımlı', 'Yevlax',
  'Zaqatala', 'Zəngilan', 'Zərdab',
].sort(azCompare);

interface HeroSearchCardProps {
  fromCity: string;
  onFromCityChange: (value: string) => void;
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
// - "Haradan?" is decorative only, by product decision - there's no origin
//   city in the tour data, so it can't filter anything real yet.
// - "Hara?" drives the same locationFilter state as the location dropdown
//   further down the page - both stay in sync from one source of truth.
// - "Gediş"/"Qayıdış" are a date RANGE filter (backend's fromDate/toDate),
//   not a literal round-trip - relabeled to fit this layout.
// - "Sərnişin sayı" filters out tours whose max_participants is below the
//   requested count.
export default function HeroSearchCard({
  fromCity,
  onFromCityChange,
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
    <div className="bg-accent rounded-2xl shadow-xl p-1.5">
      <div className="flex flex-col md:flex-row gap-1.5 md:items-stretch">
        <Field label={t('search.from')} icon={<Navigation size={15} className="text-muted-foreground shrink-0" />}>
          <select
            value={fromCity}
            onChange={(e) => onFromCityChange(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground appearance-none cursor-pointer"
          >
            {AZERBAIJAN_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </Field>

        <DestinationField label={t('search.to')} value={toLocation} onChange={onToLocationChange} />

        <DateField label={t('search.depart')} value={departDate} onChange={onDepartDateChange} />

        <DateField label={t('search.return')} value={returnDate} onChange={onReturnDateChange} />

        <TravelersField label={t('search.travelers')} value={travelers} onChange={onTravelersChange} />

        <button
          onClick={onSearch}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-8 py-3 md:py-0 rounded-xl hover:opacity-90 transition-opacity shrink-0"
        >
          <Search size={16} /> {t('search.search')}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  className = '',
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 min-w-0 bg-card rounded-xl border-2 border-transparent focus-within:border-primary px-3 py-2 transition-colors ${className}`}
    >
      <p className="text-[11px] font-semibold text-foreground mb-0.5 truncate">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        {children}
      </div>
    </div>
  );
}

// "Hara?" - a searchable destination dropdown instead of a plain <select>,
// so picking from 65+ districts doesn't mean scrolling a native list one
// entry at a time. Still just drives the same toLocation string as before;
// nothing about what it filters changed, only how it's picked.
function DestinationField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const anywhereLabel = t('search.anywhere');
  const displayValue = value === 'all' ? anywhereLabel : value;

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const cities = q ? AZERBAIJAN_CITIES.filter((c) => c.toLocaleLowerCase().includes(q)) : AZERBAIJAN_CITIES;
    const showAnywhere = !q || anywhereLabel.toLocaleLowerCase().includes(q);
    return { showAnywhere, cities };
  }, [query, anywhereLabel]);

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
        className={`bg-card rounded-xl border-2 px-3 py-2 transition-colors cursor-text ${
          open ? 'border-primary' : 'border-transparent'
        }`}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <p className="text-[11px] font-semibold text-foreground mb-0.5 truncate">{label}</p>
        <div className="flex items-center gap-1.5">
          <MapPin size={15} className="text-muted-foreground shrink-0" />
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
    <div className="flex-1 min-w-0 bg-card rounded-xl border-2 border-transparent focus-within:border-primary px-3 py-2 transition-colors">
      <p className="text-[11px] font-semibold text-foreground mb-0.5">{label}</p>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
    <div ref={containerRef} className="relative md:flex-none md:w-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left bg-card rounded-xl border-2 px-3 py-2 transition-colors ${
          open ? 'border-primary' : 'border-transparent'
        }`}
      >
        <p className="text-[11px] font-semibold text-foreground mb-0.5 truncate">{label}</p>
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
