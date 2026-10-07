'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Locale, TranslationKey } from '../lib/translations';
import Logo from './Logo';

const LANGUAGES: Locale[] = ['az', 'en', 'ru'];

const EMERGENCY: { number: string; labelKey: TranslationKey }[] = [
  { number: '112', labelKey: 'footer.emergencyGeneral' },
  { number: '102', labelKey: 'footer.emergencyPolice' },
  { number: '103', labelKey: 'footer.emergencyAmbulance' },
  { number: '101', labelKey: 'footer.emergencyFire' },
];

// Global footer on every (main) page. Every link points at a real route;
// social icons are deliberately left out until real TurPoint accounts
// exist. Azerbaijan's public emergency number is real and useful to any
// traveler, so it stays in the Support column.
export default function Footer() {
  const { t, locale, setLocale } = useLanguage();

  const columns: { titleKey: TranslationKey; links: { href: string; labelKey: TranslationKey }[] }[] = [
    {
      titleKey: 'footer.explore',
      links: [
        { href: '/tours', labelKey: 'ui.footer.tours' },
        { href: '/#destinations', labelKey: 'ui.nav.destinations' },
        { href: '/planner', labelKey: 'ui.nav.planner' },
      ],
    },
    {
      titleKey: 'footer.forOperators',
      links: [
        { href: '/dashboard', labelKey: 'ui.nav.becomeOperator' },
        { href: '/dashboard', labelKey: 'ui.footer.operatorDashboard' },
        { href: '/dashboard/new-tour', labelKey: 'footer.addTour' },
      ],
    },
    {
      titleKey: 'ui.footer.support',
      links: [
        { href: '/bookings', labelKey: 'nav.bookings' },
        { href: '/about', labelKey: 'about.title' },
        { href: '/terms', labelKey: 'ui.footer.refundPolicy' },
      ],
    },
  ];

  const linkClass = 'text-sm text-white/60 hover:text-white transition-colors w-fit';

  return (
    <footer className="mt-auto mb-16 md:mb-0 bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8 grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-10">
        <div className="col-span-2 md:col-span-4">
          <Logo tone="light" />
          <p className="text-sm text-white/60 mt-3 max-w-xs leading-relaxed">{t('ui.footer.tagline')}</p>
          {/* Azerbaijan's public emergency numbers - plain text, not links. */}
          <ul className="mt-5 space-y-1.5">
            {EMERGENCY.map(({ number, labelKey }) => (
              <li key={number} className="flex items-center gap-2 text-xs text-white/60">
                <Phone size={13} className="shrink-0" /> {t(labelKey)}: <span className="font-bold text-white">{number}</span>
              </li>
            ))}
          </ul>
        </div>

        {columns.map(({ titleKey, links }) => (
          <div key={titleKey} className="md:col-span-2 md:col-start-auto">
            <h3 className="text-sm font-semibold text-white mb-4">{t(titleKey)}</h3>
            <nav className="flex flex-col gap-2.5">
              {links.map(({ href, labelKey }) => (
                <Link key={labelKey} href={href} className={linkClass}>
                  {t(labelKey)}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="border-t border-white/10 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/50">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link>
            <span className="flex items-center gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`font-semibold transition-colors ${locale === l ? 'text-white' : 'hover:text-white'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
