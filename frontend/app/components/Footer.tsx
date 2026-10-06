'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, ShieldAlert, Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import type { TranslationKey } from '../lib/translations';

// Global footer, shown at the end of every page's content (see
// layout.tsx). Used to have "Sürətli keçidlər" (just one Home link) and
// "Kateqoriyalar" (duplicated the homepage's own category filter) columns
// - both dropped as dead weight, then a "Əlaqə" (contact) column with a
// placeholder email/phone - dropped entirely now (see CONTACT_EMAIL in
// ../lib/contact, still used by the privacy page's own contact mention,
// but no real support channel exists for this project yet). A language
// switcher briefly lived here too, then was dropped again - it already
// lives in the nav on every page, so repeating it here was pure noise
// with no real second purpose.
//
// Dark again now that the homepage operator pitch is an inset green panel
// on the cream page (not a full-bleed dark band), so the footer no longer
// merges into the section above it. Every link points at a real route;
// social icons are left out until real TurPoint accounts exist.
export default function Footer() {
  const { t } = useLanguage();
  const { operatorProfile, loading } = useAuth();
  const pathname = usePathname();

  // The homepage already has its own full "Tur operatorları üçün" pitch
  // section right above this footer - repeating the same CTA immediately
  // below it would read as nagging rather than a second, useful
  // reinforcement, so it's suppressed there. Also hidden once someone
  // already has an operator profile, since "become an operator" doesn't
  // apply to them.
  const showOperatorCta = !loading && !operatorProfile && pathname !== '/';

  const columns: { titleKey: TranslationKey; links: { href: string; labelKey: TranslationKey }[] }[] = [
    {
      titleKey: 'footer.explore',
      links: [
        { href: '/#tour-results', labelKey: 'footer.allTours' },
        { href: '/bookings', labelKey: 'nav.bookings' },
      ],
    },
    {
      titleKey: 'footer.forOperators',
      links: [
        { href: '/dashboard', labelKey: 'dashboard.becomeOperator' },
        { href: '/dashboard/new-tour', labelKey: 'footer.addTour' },
        { href: '/dashboard', labelKey: 'nav.dashboard' },
      ],
    },
    {
      titleKey: 'footer.company',
      links: [
        { href: '/about', labelKey: 'about.title' },
        { href: '/terms', labelKey: 'footer.terms' },
        { href: '/privacy', labelKey: 'footer.privacy' },
      ],
    },
  ];

  // Azerbaijan's real public emergency numbers - useful to any traveler
  // on a tour, and true regardless of what TurPoint itself offers.
  const emergency: { number: string; labelKey: TranslationKey }[] = [
    { number: '112', labelKey: 'footer.emergencyGeneral' },
    { number: '102', labelKey: 'footer.emergencyPolice' },
    { number: '103', labelKey: 'footer.emergencyAmbulance' },
    { number: '101', labelKey: 'footer.emergencyFire' },
  ];

  const linkClass =
    'text-[15px] text-white/65 hover:text-white transition-colors w-fit focus-visible:outline-none focus-visible:text-white focus-visible:underline underline-offset-4';

  return (
    <footer className="mt-auto mb-16 md:mb-0">
      {showOperatorCta && (
        <div className="bg-primary text-primary-foreground">
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

      {/* Deep forest green (darker than the brand primary so it separates
          from green panels above it): brand block on the left, three link
          columns, and an emergency-numbers column on the right. */}
      <div className="bg-[#10261C] text-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 md:pb-14 grid grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-2 lg:col-span-4 lg:pr-10">
            <Link href="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-accent shrink-0">
                <Send size={19} className="text-white -rotate-45" />
              </span>
              <span
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                TurPoint
              </span>
            </Link>
            <p className="text-[15px] text-white/65 mt-5 max-w-sm leading-relaxed">{t('footer.description')}</p>
          </div>

          {columns.map(({ titleKey, links }) => (
            <div key={titleKey} className="lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-white mb-5">{t(titleKey)}</h3>
              <nav className="flex flex-col gap-3.5">
                {links.map(({ href, labelKey }) => (
                  <Link key={labelKey} href={href} className={linkClass}>
                    {t(labelKey)}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <div className="lg:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-white mb-5">
              <ShieldAlert size={17} className="text-[#E39A6B] shrink-0" />
              {t('footer.emergency')}
            </h3>
            <ul className="flex flex-col gap-3">
              {emergency.map(({ number, labelKey }) => (
                <li key={number} className="flex items-center gap-2.5 text-sm text-white/65">
                  <Phone size={14} className="text-white/40 shrink-0" />
                  <span>
                    {t(labelKey)}: <span className="font-bold text-white tabular-nums">{number}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* md:pr-40 keeps this row clear of the homepage's floating
            "Planner" button, which is fixed to the bottom-right corner. */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/10 py-6 md:pr-40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-white/55">{t('footer.rights', { year: new Date().getFullYear() })}</p>
            <p className="text-sm text-white/55">{t('nav.tagline')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
