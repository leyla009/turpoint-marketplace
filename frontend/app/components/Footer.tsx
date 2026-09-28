'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

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
// Light surface (not the dark green primary this used to be) so the
// footer reads as its own distinct, purposeful region - on the homepage
// specifically, a dark footer sat directly beneath the dark cinematic
// "Tur operatorları üçün" photo band with no visual boundary between
// them, so the two blurred into one shapeless dark mass instead of
// "marketing pitch, then footer". The operator-conversion CTA band below
// (shown on other pages, where there's no adjacent dark section) keeps
// the brand's dark green deliberately, as a strip of contrast leading
// into the lighter footer beneath it.
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

  return (
    <footer className="bg-muted text-foreground mt-auto mb-16 md:mb-0">
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

      {/* Plain bold column headers and thin hairline dividers between
          columns (Airbnb/Stripe's actual footer pattern) instead of tiny
          uppercase-tracked micro-labels with no structural separation -
          dividers only from sm: up, since on the stacked 2-column mobile
          grid a left-border reads as a stray line rather than a column
          separator. Only two real link groups exist (About, Operators)
          alongside the brand block, so this is a 3-column grid rather
          than forcing a fourth column to exist. */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:divide-x sm:divide-border">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <Send size={15} className="text-primary -rotate-45" />
            </span>
            <span
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              TurPoint
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mt-3 max-w-[220px] leading-relaxed">{t('nav.tagline')}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-3.5">
            {t('footer.about')}
          </h3>
          <nav className="flex flex-col gap-2.5">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('about.title')}
            </Link>
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-3.5">
            {t('footer.forOperators')}
          </h3>
          <nav className="flex flex-col gap-2.5">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('dashboard.becomeOperator')}
            </Link>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.dashboard')}
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href="/privacy" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
