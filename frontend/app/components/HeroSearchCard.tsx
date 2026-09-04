'use client';

import type { ReactNode } from 'react';
import { Navigation, MapPin, Calendar, Users, Search } from 'lucide-react';

interface HeroSearchCardProps {
  locations: string[];
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
  locations,
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
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-border/60 p-3 md:p-2">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <Field label="Haradan?" icon={<Navigation size={14} className="text-muted-foreground" />}>
          <input
            type="text"
            value={fromCity}
            onChange={(e) => onFromCityChange(e.target.value)}
            placeholder="Bakı"
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal"
          />
        </Field>

        <Divider />

        <Field label="Hara?" icon={<MapPin size={14} className="text-muted-foreground" />}>
          <select
            value={toLocation}
            onChange={(e) => onToLocationChange(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground appearance-none cursor-pointer"
          >
            <option value="all">Hər yer</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </Field>

        <Divider />

        <Field label="Gediş" icon={<Calendar size={14} className="text-muted-foreground" />}>
          <input
            type="date"
            value={departDate}
            onChange={(e) => onDepartDateChange(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground"
          />
        </Field>

        <Divider />

        <Field label="Qayıdış" icon={<Calendar size={14} className="text-muted-foreground" />}>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => onReturnDateChange(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-medium text-foreground"
          />
        </Field>

        <Divider />

        <Field label="Sərnişin sayı" icon={<Users size={14} className="text-muted-foreground" />}>
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
          className="mt-2 md:mt-0 md:ml-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 md:py-0 rounded-xl hover:opacity-90 transition-opacity shrink-0"
        >
          Axtar <Search size={15} />
        </button>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex-1 min-w-0 px-3 py-2 md:py-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden md:block w-px my-1 bg-border shrink-0" />;
}
