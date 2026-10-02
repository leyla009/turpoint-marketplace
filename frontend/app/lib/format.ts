// One place for how money and dates are shown, so the whole app agrees
// ("AZN 120", never "AZN120" / "120 AZN" / "AZN0") and dates follow the
// language the user picked instead of the browser's default.

import type { Locale } from './translations';

export const DATE_LOCALES: Record<Locale, string> = { az: 'az-AZ', en: 'en-GB', ru: 'ru-RU' };

const AZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
const AZ_MONTHS_LONG = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];

/** "AZN 120", "AZN 89.5", "AZN 1,250". Up to 2 decimals, no trailing zeros. */
export function formatAzn(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `AZN ${safe.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * Localized date. Accepts "YYYY-MM-DD" or the "YYYY-MM-DD HH:MM:SS" form
 * SQLite returns. Date-only strings are parsed as LOCAL dates on purpose -
 * `new Date('2026-10-02')` is UTC midnight and can render as the day before.
 */
export function formatDate(
  value: string | null | undefined,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  if (locale === 'az' && options.month) {
    const names = options.month === 'long' ? AZ_MONTHS_LONG : AZ_MONTHS_SHORT;
    return [options.day ? d.getDate() : '', names[d.getMonth()], options.year ? d.getFullYear() : ''].filter(Boolean).join(' ');
  }

  return d.toLocaleDateString(DATE_LOCALES[locale], options);
}

/** True when a tour's start date (YYYY-MM-DD) is before today's local date. A tour departing today is not past. */
export function isPastDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return value.slice(0, 10) < today;
}