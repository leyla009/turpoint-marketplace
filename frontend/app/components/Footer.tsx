'use client';

import Link from 'next/link';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORY_STYLE } from './TourCard';

// Global footer, shown at the end of every page's content (see
// layout.tsx). Kept deliberately minimal - no contact details or social
// links, since none exist for this project and inventing placeholders
// would just be fake content. The "Explore by category" column links back
// into the homepage's own real category filter (see page.tsx's
// window.location-based deep-link effect) rather than a separate page.
export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-primary text-primary-foreground mt-auto mb-16 md:mb-0">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 shrink-0">
              <Send size={15} className="text-white -rotate-45" />
            </span>
            <span
              className="text-lg font-bold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              TurPoint
            </span>
          </Link>
          <p className="text-xs text-white/70 mt-2 max-w-xs">{t('nav.tagline')}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2.5">
            {t('footer.quickLinks')}
          </h3>
          <nav className="flex flex-col gap-1.5">
            <Link href="/" className="text-sm text-white/85 hover:text-white transition-colors">
              {t('nav.home')}
            </Link>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2.5">
            {t('footer.exploreByCategory')}
          </h3>
          <nav className="flex flex-col gap-1.5">
            {Object.entries(CATEGORY_STYLE).map(([cat, style]) => (
              <Link
                key={cat}
                href={`/?category=${cat}`}
                className="text-sm text-white/85 hover:text-white transition-colors"
              >
                {t(style.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2.5">
            {t('footer.forOperators')}
          </h3>
          <nav className="flex flex-col gap-1.5">
            <Link href="/dashboard/profile" className="text-sm text-white/85 hover:text-white transition-colors">
              {t('dashboard.becomeOperator')}
            </Link>
            <Link href="/dashboard" className="text-sm text-white/85 hover:text-white transition-colors">
              {t('nav.dashboard')}
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 text-[11px] text-white/60">
          {t('footer.rights', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
