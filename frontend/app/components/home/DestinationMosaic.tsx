'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CATEGORY_STYLE, type ApiTour } from '../TourCard';
import { photoSrc } from '../../lib/photo';
import { placeName } from '../../lib/tourContent';

interface Destination {
  name: string;
  count: number;
  photo: string;
  categories: string[];
}

// "Where do you want to go?" - one large tile for the place with the most
// tours, five smaller ones, and an "All regions" tile. Everything comes from
// the real tour list: each tile's photo is a photo from one of THAT place's
// own tours, and its subtitle lists the categories its tours actually have.
export default function DestinationMosaic({ tours }: { tours: ApiTour[] }) {
  const { t, locale } = useLanguage();

  const destinations = useMemo<Destination[]>(() => {
    const byPlace = new Map<string, { count: number; photo: string | null; cats: Map<string, number> }>();
    tours.forEach((tour) => {
      if (!tour.location) return;
      const entry = byPlace.get(tour.location) ?? { count: 0, photo: null, cats: new Map() };
      entry.count += 1;
      if (!entry.photo && tour.photo_url) entry.photo = tour.photo_url;
      if (tour.category) entry.cats.set(tour.category, (entry.cats.get(tour.category) ?? 0) + 1);
      byPlace.set(tour.location, entry);
    });
    return Array.from(byPlace.entries())
      .filter(([, v]) => v.photo)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([name, v]) => ({
        name,
        count: v.count,
        photo: v.photo!,
        categories: Array.from(v.cats.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c),
      }));
  }, [tours]);

  if (destinations.length === 0) return null;
  const [hero, ...rest] = destinations;
  const categoryText = (cats: string[]) =>
    cats
      .slice(0, 3)
      .map((c) => (CATEGORY_STYLE[c] ? t(CATEGORY_STYLE[c].labelKey) : c))
      .join(', ');
  const href = (name: string) => `/tours?location=${encodeURIComponent(name)}`;

  return (
    <section id="destinations" className="scroll-mt-24">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl sm:text-[28px] font-bold text-navy">{t('ui.home2.destTitle')}</h2>
        </div>
        <Link href="/tours" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline shrink-0">
          {t('ui.home2.allDestinations')} <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr] lg:grid-rows-[230px_230px] gap-3 sm:gap-4">
        {/* Large tile */}
        <Link
          href={href(hero.name)}
          className="group relative col-span-2 lg:col-span-1 lg:row-span-2 h-72 lg:h-auto rounded-2xl overflow-hidden bg-navy"
        >
          <img
            src={photoSrc(hero.photo) ?? ''}
            alt={placeName(hero.name, locale)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-3xl font-bold text-white">{placeName(hero.name, locale)}</p>
              <p className="text-sm text-white/85 mt-1 truncate">
                {t('ui.home.tourCount', { count: hero.count })}
                {hero.categories.length > 0 && <> · {categoryText(hero.categories)}</>}
              </p>
            </div>
            <span className="shrink-0 bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full group-hover:bg-white/90 transition-colors">
              {t('ui.home2.explore')}
            </span>
          </div>
        </Link>

        {/* Small tiles */}
        {rest.map((d) => (
          <Link key={d.name} href={href(d.name)} className="group relative h-44 lg:h-auto rounded-2xl overflow-hidden bg-navy">
            <img
              src={photoSrc(d.photo) ?? ''}
              alt={placeName(d.name, locale)}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-lg font-bold text-white leading-tight">{placeName(d.name, locale)}</p>
              <p className="text-xs text-white/80 mt-0.5">{t('ui.home.tourCount', { count: d.count })}</p>
            </div>
          </Link>
        ))}

        {/* All regions */}
        <Link
          href="/tours"
          className="group h-44 lg:h-auto rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-navy transition-colors"
        >
          <ArrowRight size={22} className="text-primary transition-transform group-hover:translate-x-1" />
          <span className="text-sm font-semibold">{t('ui.home2.allRegions')}</span>
        </Link>
      </div>
    </section>
  );
}
