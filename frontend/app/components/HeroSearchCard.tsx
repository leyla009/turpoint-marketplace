'use client';

import type { ReactNode } from 'react';
import { Navigation, MapPin, Calendar, Users, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Azerbaijan's district centers plus its major cities, sorted per the
// Azerbaijani alphabet (ə, ı, ö, ü, ç, ş, ğ collate correctly via the 'az'
// locale). Used for both Haradan? and Hara? - a tour marketplace covering
// the whole country should let you pick any of them, not just the handful
// that happen to have a tour listed right now.
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
].sort((a, b) => a.localeCompare(b, 'az'));

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
    <div className="bg-white rounded-2xl shadow-xl border border-border/60 p-1.5 md:p-1">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <Field label={t('search.from')} icon={<Navigation size={13} className="text-muted-foreground shrink-0" />}>
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

        <Divider />

        <Field label={t('search.to')} icon={<MapPin size={13} className="text-muted-foreground shrink-0" />}>
          <select
            value={toLocation}
            onChange={(e) => onToLocationChange(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground appearance-none cursor-pointer"
          >
            <option value="all">{t('search.anywhere')}</option>
            {AZERBAIJAN_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </Field>

        <Divider />

        <DateField label={t('search.depart')} value={departDate} onChange={onDepartDateChange} />

        <Divider />

        <DateField label={t('search.return')} value={returnDate} onChange={onReturnDateChange} />

        <Divider />

        <Field
          label={t('search.travelers')}
          icon={<Users size={13} className="text-muted-foreground shrink-0" />}
          className="md:flex-none md:w-24"
        >
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={travelers}
            onChange={(e) => onTravelersChange(e.target.value)}
            placeholder="1"
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal"
          />
        </Field>

        <button
          onClick={onSearch}
          className="mt-1.5 md:mt-0 md:ml-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 md:py-0 rounded-xl hover:opacity-90 transition-opacity shrink-0"
        >
          {t('search.search')} <Search size={14} />
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
    <div className={`flex-1 min-w-0 px-2.5 py-1.5 md:py-1 ${className}`}>
      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 truncate">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        {children}
      </div>
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
    <div className="flex-1 min-w-0 px-2.5 py-1.5 md:py-1">
      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</p>
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

function Divider() {
  return <div className="hidden md:block w-px my-1 bg-border shrink-0" />;
}
