'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type Locale, type TranslationKey } from '../lib/translations';

const LOCALE_KEY = 'turpoint_locale';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Defaults to 'az' to match the app's existing default content; the
  // stored preference (if any) overrides this right after mount. Kept as
  // a plain useState + effect (not lazy-init from localStorage) so server
  // and first client render agree, avoiding a hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>('az');

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'az' || stored === 'en' || stored === 'ru') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (next: Locale) => {
    localStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let str = translations[locale][key] ?? translations.az[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
