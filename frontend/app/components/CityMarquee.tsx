// Also used as the "Hara?" destination field's dropdown options in
// HeroSearchCard, so both places offer the same curated set of popular
// destinations instead of the full 66-city AZERBAIJAN_CITIES list.
export const POPULAR_DESTINATIONS = [
  'Quba',
  'Lahıc kəndi',
  'Şuşa',
  'Qax',
  'Tufandağ',
  'Basqal kəndi',
  'Göygöl',
  'Xınalıq kəndi',
  'Ağdam',
  'İsmayıllı',
  'İlisu kəndi',
  'Şəki',
  'Xankəndi',
  'Laza kəndi',
  'Qəbələ',
  'Şahdağ',
  'Oğuz',
  'Şamaxı',
];

// Endless right-to-left ticker of popular destinations, sitting between the
// hero and "Azərbaycanı kəşf et". The city list is rendered twice back to
// back in one flex track that scrolls exactly one list-width (-50%) before
// looping, so the seam between the two copies is never visible.
export default function CityMarquee() {
  return (
    <div className="bg-accent overflow-hidden py-3">
      <div className="flex w-max animate-marquee">
        {[...POPULAR_DESTINATIONS, ...POPULAR_DESTINATIONS].map((city, i) => (
          <span key={i} className="flex items-center shrink-0">
            <span className="px-6 text-sm font-bold tracking-wide uppercase text-accent-foreground whitespace-nowrap">
              {city}
            </span>
            <span className="text-accent-foreground/50 shrink-0">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
