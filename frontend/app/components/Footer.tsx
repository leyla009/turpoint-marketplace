'use client';

import Link from 'next/link';
import { Send, Mail, Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { CONTACT_EMAIL, CONTACT_PHONE } from '../lib/contact';

// Global footer, shown at the end of every page's content (see
// layout.tsx). Used to have "Sürətli keçidlər" (just one Home link) and
// "Kateqoriyalar" (duplicated the homepage's own category filter) columns
// - both dropped as dead weight. In their place: a real "Haqqımızda"
// (About) link and contact details. CONTACT_EMAIL/CONTACT_PHONE (from
// ../lib/contact) are placeholders - no real support channel exists for
// this project yet.
export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-primary text-primary-foreground mt-auto mb-16 md:mb-0">
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
            {t('footer.contact')}
          </h3>
          <div className="flex flex-col gap-2.5">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              <Mail size={14} className="shrink-0" /> {CONTACT_EMAIL}
            </a>
            <a
              href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              <Phone size={14} className="shrink-0" /> {CONTACT_PHONE}
            </a>
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
