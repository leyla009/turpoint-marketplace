'use client';

import Link from 'next/link';
import { Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Locale } from '../lib/translations';

// Plain language codes, not flag emoji - a flag maps to a country, not a
// language (and English in particular has no single flag for it), and
// flag emoji render as bare two-letter fallback text on systems without
// full color-emoji fonts anyway, which was showing "GB" for English.
const LANGUAGES: Locale[] = ['az', 'en', 'ru'];

// The stripped-down header/footer for (auth) pages - just the brand mark
// and the language switcher, no nav links, no mode toggle, no account
// menu. Someone landing on Sign In already knows why they're here; a full
// copy of the site's main navigation would just be noise competing with
// the form.
export function AuthHeader() {
  const { locale, setLocale } = useLanguage();

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 max-w-[1600px] w-full mx-auto">
      <Link href="/" className="flex items-center gap-2">
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

      <div className="flex items-center gap-0.5 bg-muted rounded-full p-1">
        {LANGUAGES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            title={l.toUpperCase()}
            aria-label={l.toUpperCase()}
            className={`h-7 px-2.5 flex items-center justify-center rounded-full text-xs font-semibold leading-none transition-all ${
              locale === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

export function AuthFooter() {
  const { t } = useLanguage();
  return (
    <footer className="py-6 px-4 text-center">
      <p className="text-xs text-muted-foreground">{t('footer.rights', { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
