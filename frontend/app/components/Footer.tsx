'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import type { Locale } from '../lib/translations';

const LANGUAGES: Locale[] = ['az', 'en', 'ru'];

// Global footer, shown at the end of every page's content (see
// layout.tsx). Used to have "Sürətli keçidlər" (just one Home link) and
// "Kateqoriyalar" (duplicated the homepage's own category filter) columns
// - both dropped as dead weight, then a "Əlaqə" (contact) column with a
// placeholder email/phone - dropped entirely now (see CONTACT_EMAIL in
// ../lib/contact, still used by the privacy page's own contact mention,
// but no real support channel exists for this project yet, so this
// footer no longer displays it as if it were one) in favor of a real
// operator-conversion CTA band and the language switcher.
export default function Footer() {
  const { t, locale, setLocale } = useLanguage();
  const { operatorProfile, loading } = useAuth();
  const pathname = usePathname();

  // The homepage already has its own full "Tur operatorları üçün" pitch
  // section right above this footer - repeating the same CTA immediately
  // below it would read as nagging rather than a second, useful
  // reinforcement, so it's suppressed there. Also hidden once someone
  // already has an operator profile, since "become an operator" doesn't
  // apply to them.
  const showOperatorCta = !loading && !operatorProfile && pathname !== '/';

  return (
    <footer className="bg-primary text-primary-foreground mt-auto mb-16 md:mb-0">
      {showOperatorCta && (
        <div className="border-b border-white/10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
            <p
              className="text-lg sm:text-xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t('footer.ctaHeading')}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              {t('dashboard.becomeOperator')}
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
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
          <p className="text-xs text-white/65 mt-3 max-w-[220px] leading-relaxed">{t('nav.tagline')}</p>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50 mb-3.5">
            {t('footer.about')}
          </h3>
          <nav className="flex flex-col gap-2.5">
            <Link href="/about" className="text-sm text-white/80 hover:text-white transition-colors">
              {t('about.title')}
            </Link>
          </nav>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50 mb-3.5">
            {t('footer.language')}
          </h3>
          <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-1 w-fit">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                title={l.toUpperCase()}
                aria-label={l.toUpperCase()}
                className={`h-7 px-2.5 flex items-center justify-center rounded-full text-xs font-semibold leading-none transition-all ${
                  locale === l ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50 mb-3.5">
            {t('footer.forOperators')}
          </h3>
          <nav className="flex flex-col gap-2.5">
            <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition-colors">
              {t('dashboard.becomeOperator')}
            </Link>
            <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition-colors">
              {t('nav.dashboard')}
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-white/50">{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[11px] text-white/50 hover:text-white/80 transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href="/privacy" className="text-[11px] text-white/50 hover:text-white/80 transition-colors">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
