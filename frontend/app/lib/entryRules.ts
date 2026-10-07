// Entry rules for visiting Azerbaijan, used by the homepage "Know before you
// go" section. Every value here is a real, published rule - check the
// sources below and update ENTRY_RULES_CHECKED whenever this file changes.
//
// Sources (checked 7 Oct 2026):
//  - Visa-free list, temporary exemptions, e-Visa eligibility and fees:
//    Ministry of Foreign Affairs (mfa.gov.az) and evisa.gov.az, as summarised
//    at en.wikipedia.org/wiki/Visa_policy_of_Azerbaijan
//  - Land borders: Cabinet of Ministers decision extending the special
//    quarantine regime to 06:00, 2 January 2027 (report.az, 17 Sep 2026)
//  - Registration after 15 days (30 for Kazakhstan): migration.gov.az
//  - Karabakh entry permit: yolumuzqarabaga.az

export const ENTRY_RULES_CHECKED = '2026-10-07';

// Land borders are closed to passenger ENTRY (leaving by land is allowed).
export const LAND_BORDERS_CLOSED_UNTIL = '2027-01-02';

export const LINKS = {
  evisa: 'https://evisa.gov.az/en/',
  migration: 'https://migration.gov.az/en',
  karabakh: 'https://yolumuzqarabaga.az',
  borders: 'https://report.az/en/domestic-politics/azerbaijan-extends-special-quarantine-regime-until-january-2027',
  rates: 'https://www.cbar.az/currency/rates?language=en',
  guide: 'https://azerbaijan.travel/en',
};

// Ordinary passports, visa-free, up to 90 days.
const VISA_FREE_90 = ['AL', 'BY', 'GE', 'KZ', 'KG', 'MV', 'MD', 'MA', 'RU', 'RS', 'TJ', 'TR', 'UA', 'AE', 'UZ'];

// Visa-free, up to 30 days. `until` = a temporary exemption's end date
// (exclusive); after it passes the country falls back to e-Visa / embassy.
const VISA_FREE_30: Record<string, string | null> = {
  CN: null,
  QA: null,
  HK: '2027-02-02',
  MO: '2027-02-02',
  BH: '2027-02-15',
  KW: '2027-02-15',
  OM: '2027-02-15',
  SA: '2027-02-15',
  JP: '2027-07-01',
  KR: '2027-07-01',
  BA: '2027-08-01',
  SG: '2027-08-01',
};

// The temporary 30-day exemptions also cap the number of visits.
const MAX_THREE_VISITS = ['BH', 'KW', 'OM', 'SA', 'JP', 'KR', 'BA', 'SG'];

const EU_EFTA = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH',
];

// Countries whose citizens can get the ASAN e-Visa at evisa.gov.az.
const EVISA = new Set([
  ...EU_EFTA,
  'DZ', 'AD', 'AR', 'AU', 'BS', 'BH', 'BB', 'BO', 'BA', 'BR', 'BN', 'CA', 'CL', 'CO', 'CR', 'CU', 'DJ', 'EC', 'GT', 'HN',
  'IN', 'ID', 'IR', 'IL', 'JM', 'JP', 'JO', 'KW', 'MY', 'MU', 'MX', 'MC', 'MN', 'ME', 'NP', 'NZ', 'MK', 'OM', 'PK', 'PA',
  'PY', 'PE', 'SM', 'SA', 'SC', 'SG', 'ZA', 'KR', 'LK', 'TH', 'TT', 'TM', 'GB', 'US', 'VA', 'VN',
]);

// Visa on arrival at Azerbaijan's international airports (30 USD; free for Japan).
const VISA_ON_ARRIVAL = new Set(['BH', 'CN', 'ID', 'IL', 'JP', 'KW', 'MY', 'OM', 'SA', 'SG']);

export type EntryKind = 'free' | 'evisa' | 'embassy';

export interface EntryRule {
  kind: EntryKind;
  days: number | null;          // stay allowed without a visa / on the e-Visa; null for an embassy visa
  until: string | null;         // end of a temporary visa-free arrangement
  maxThreeVisits: boolean;
  evisa: boolean;               // the e-Visa is available to this nationality
  onArrival: boolean;
  registerAfterDays: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function entryRuleFor(country: string, now: string = today()): EntryRule {
  const evisa = EVISA.has(country);
  const base = {
    evisa,
    onArrival: VISA_ON_ARRIVAL.has(country),
    registerAfterDays: country === 'KZ' ? 30 : 15,
    until: null,
    maxThreeVisits: false,
  };
  if (VISA_FREE_90.includes(country)) return { ...base, kind: 'free', days: 90 };
  if (country in VISA_FREE_30) {
    const until = VISA_FREE_30[country];
    if (!until || now < until) {
      return { ...base, kind: 'free', days: 30, until, maxThreeVisits: MAX_THREE_VISITS.includes(country) };
    }
  }
  if (evisa) return { ...base, kind: 'evisa', days: 30 };
  return { ...base, kind: 'embassy', days: null };
}

// Best guess at the visitor's country from the browser language ("de-DE" -> DE).
export function browserCountry(): string | null {
  if (typeof navigator === 'undefined') return null;
  for (const lang of navigator.languages ?? [navigator.language]) {
    const region = lang?.split('-')[1];
    if (region && /^[A-Z]{2}$/.test(region.toUpperCase())) return region.toUpperCase();
  }
  return null;
}
