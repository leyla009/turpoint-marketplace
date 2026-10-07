import type { Locale } from './translations';

// ISO 3166-1 alpha-2 codes for the "Country of residence" select. Names are
// never hard-coded: Intl.DisplayNames renders each one in the reader's
// language, so the list stays correct in az/en/ru without a translation table.
export const COUNTRY_CODES = [
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW',
  'BR','BN','BG','BF','BI','CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CY','CZ',
  'DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT',
  'GN','GW','GY','HT','HN','HK','HU','IS','IN','ID','IR','IQ','IE','IL','IT','JM','JP','JO','KZ','KE','KI','XK','KW',
  'KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MO','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD',
  'MC','MN','ME','MA','MZ','MM','NA','NR','NP','NL','NZ','NI','NE','NG','KP','MK','NO','OM','PK','PW','PS','PA','PG',
  'PY','PE','PH','PL','PT','PR','QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK',
  'SI','SB','SO','ZA','KR','SS','ES','LK','SD','SR','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TO','TT','TN','TR',
  'TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW',
] as const;

const INTL_LOCALE: Record<Locale, string> = { az: 'az', en: 'en', ru: 'ru' };

// Countries sorted by their name in the given language.
export function countryOptions(locale: Locale): { code: string; name: string }[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([INTL_LOCALE[locale], 'en'], { type: 'region' });
  } catch {
    names = null;
  }
  return COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, INTL_LOCALE[locale])
  );
}

// International dialling codes offered next to the phone field. Azerbaijan
// first, then neighbours and the countries most travellers come from.
// Several countries share +7 / +1, so the dial code alone is what's stored.
export const DIAL_CODES = [
  '+994', '+90', '+7', '+995', '+98', '+380', '+375', '+998', '+996', '+992', '+993', '+971', '+966', '+974', '+965',
  '+973', '+968', '+972', '+92', '+91', '+86', '+81', '+82', '+49', '+44', '+33', '+39', '+34', '+31', '+32', '+41',
  '+43', '+48', '+420', '+46', '+47', '+45', '+358', '+30', '+40', '+359', '+36', '+351', '+353', '+1', '+61', '+64',
];

// Splits a stored E.164 number ("+994501234567") into the longest matching
// dial code and the rest, so the form can show "+994" | "50 123 45 67".
export function splitPhone(phone: string | null | undefined): { dial: string; local: string } {
  if (!phone) return { dial: '+994', local: '' };
  const dial = [...DIAL_CODES].sort((a, b) => b.length - a.length).find((d) => phone.startsWith(d));
  if (!dial) return { dial: '+994', local: phone.replace(/^\+/, '') };
  return { dial, local: groupDigits(phone.slice(dial.length), dial) };
}

// "501234567" -> "50 123 45 67" for Azerbaijani numbers; other countries get
// their digits back unchanged (their grouping conventions vary too much).
export function groupDigits(digits: string, dial: string): string {
  if (dial === '+994' && /^\d{9}$/.test(digits)) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  return digits;
}

// Joins dial code + local number into E.164, or '' when the local part is
// empty. Returns null when the result can't be a real number (7-15 digits).
export function joinPhone(dial: string, local: string): string | null {
  const digits = local.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  const full = `${dial}${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(full) ? full : null;
}
