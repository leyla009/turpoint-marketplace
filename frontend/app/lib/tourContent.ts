// Tour text in the reader's language.
//
// Seeded (and any future translated) tours store their text as JSON per
// language - title_i18n, description_i18n, details_i18n (see
// backend/src/db/seedTourData.js). Tours an operator typed in by hand only
// have the plain `title` / `description` columns. Everything that shows a
// tour title or description goes through the helpers here, so:
//   - az / en / ru readers each get their own language, and
//   - a tour with no translation (or a missing language) simply shows its
//     plain text, never a blank.

import type { Locale } from './translations';

export interface TourDetails {
  highlights: string[];
  description: string[]; // one entry per paragraph
  includes: string[];
  excludes: string[];
  notSuitable: string[];
  bring: string[];
  notAllowed: string[];
  know: string[];
  meeting: string;
}

export interface TourFacts {
  duration_hours?: number;
  guide_languages?: string[]; // 'en' | 'tr' | 'ar' | 'ru' | 'az'
  pickup?: boolean;
  private?: boolean;
}

/** The translation-related columns a tour from the API may carry. */
export interface TranslatedTour {
  title: string;
  description?: string | null;
  title_i18n?: string | Record<string, string> | null;
  description_i18n?: string | Record<string, string> | null;
  details_i18n?: string | Record<string, TourDetails> | null;
  facts?: string | TourFacts | null;
}

function parseJson<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Picks `locale` out of a {az,en,ru} map; falls back to en, then az, then `fallback`. */
function pick<T>(map: Record<string, T> | null, locale: Locale): T | null {
  if (!map) return null;
  return map[locale] ?? map.en ?? map.az ?? null;
}

export function tourTitle(tour: Pick<TranslatedTour, 'title' | 'title_i18n'>, locale: Locale): string {
  return pick(parseJson<Record<string, string>>(tour.title_i18n), locale) || tour.title;
}

/** Same, for places that only have the raw JSON string (bookings list, notifications). */
export function titleFromI18n(
  title: string,
  title_i18n: string | Record<string, string> | null | undefined,
  locale: Locale
): string {
  return pick(parseJson<Record<string, string>>(title_i18n), locale) || title;
}

export function tourSummary(tour: Pick<TranslatedTour, 'description' | 'description_i18n'>, locale: Locale): string {
  return pick(parseJson<Record<string, string>>(tour.description_i18n), locale) || tour.description || '';
}

export function tourDetails(tour: Pick<TranslatedTour, 'details_i18n'>, locale: Locale): TourDetails | null {
  return pick(parseJson<Record<string, TourDetails>>(tour.details_i18n), locale);
}

export function tourFacts(tour: Pick<TranslatedTour, 'facts'>): TourFacts {
  return parseJson<TourFacts>(tour.facts) ?? {};
}

// --- place names ----------------------------------------------------------
// tours.location holds the Azerbaijani name (it is also the filter value, the
// weather lookup key and the map key, so it must stay one stable string).
// This only changes how it is DISPLAYED. Unknown places show as stored.
const PLACES: Record<string, { en: string; ru: string }> = {
  'Bakı': { en: 'Baku', ru: 'Баку' },
  'Şəki': { en: 'Shaki', ru: 'Шеки' },
  'Quba': { en: 'Quba', ru: 'Куба' },
  'Qəbələ': { en: 'Gabala', ru: 'Габала' },
  'Qax': { en: 'Qakh', ru: 'Гах' },
  'Lənkəran': { en: 'Lankaran', ru: 'Ленкорань' },
  'Qobustan': { en: 'Gobustan', ru: 'Гобустан' },
  'Şamaxı': { en: 'Shamakhi', ru: 'Шемаха' },
  'İsmayıllı': { en: 'Ismayilli', ru: 'Исмаиллы' },
  'Şirvan': { en: 'Shirvan', ru: 'Ширван' },
  'Xankəndi': { en: 'Khankendi', ru: 'Ханкенди' },
  'Şuşa': { en: 'Shusha', ru: 'Шуша' },
  'Gəncə': { en: 'Ganja', ru: 'Гянджа' },
  'Sumqayıt': { en: 'Sumgait', ru: 'Сумгаит' },
  'Xaçmaz': { en: 'Khachmaz', ru: 'Хачмас' },
  'Qusar': { en: 'Qusar', ru: 'Гусар' },
  'Astara': { en: 'Astara', ru: 'Астара' },
  'Lerik': { en: 'Lerik', ru: 'Лерик' },
  'Masallı': { en: 'Masally', ru: 'Масаллы' },
  'Göygöl': { en: 'Goygol', ru: 'Гёйгёль' },
  'Naxçıvan': { en: 'Nakhchivan', ru: 'Нахичевань' },
  'Zaqatala': { en: 'Zagatala', ru: 'Загатала' },
  'Mingəçevir': { en: 'Mingachevir', ru: 'Мингечевир' },
  'Naftalan': { en: 'Naftalan', ru: 'Нафталан' },
  'Xızı': { en: 'Khizi', ru: 'Хызы' },
  'Oğuz': { en: 'Oghuz', ru: 'Огуз' },
  'Ağdam': { en: 'Aghdam', ru: 'Агдам' },
  'Laçın': { en: 'Lachin', ru: 'Лачин' },
  'Abşeron': { en: 'Absheron', ru: 'Апшерон' },
  'Şabran': { en: 'Shabran', ru: 'Шабран' },
  'Siyəzən': { en: 'Siyazan', ru: 'Сиязань' },
  'Ağsu': { en: 'Agsu', ru: 'Агсу' },
  'Daşkəsən': { en: 'Dashkasan', ru: 'Дашкесан' },
  'Goranboy': { en: 'Goranboy', ru: 'Геранбой' },
  'Samux': { en: 'Samukh', ru: 'Самух' },
  'Qazax': { en: 'Qazakh', ru: 'Газах' },
  'Tovuz': { en: 'Tovuz', ru: 'Товуз' },
  'Ağstafa': { en: 'Aghstafa', ru: 'Агстафа' },
  'Gədəbəy': { en: 'Gadabay', ru: 'Гедабек' },
  'Şəmkir': { en: 'Shamkir', ru: 'Шамкир' },
  'Cəlilabad': { en: 'Jalilabad', ru: 'Джалилабад' },
  'Yardımlı': { en: 'Yardimli', ru: 'Ярдымлы' },
  'Ağdaş': { en: 'Agdash', ru: 'Агдаш' },
  'Kürdəmir': { en: 'Kurdamir', ru: 'Кюрдамир' },
  'Ucar': { en: 'Ujar', ru: 'Уджар' },
  'Yevlax': { en: 'Yevlakh', ru: 'Евлах' },
  'Zərdab': { en: 'Zardab', ru: 'Зардаб' },
  'Beyləqan': { en: 'Beylagan', ru: 'Бейлаган' },
  'İmişli': { en: 'Imishli', ru: 'Имишли' },
  'Saatlı': { en: 'Saatly', ru: 'Саатлы' },
  'Sabirabad': { en: 'Sabirabad', ru: 'Сабирабад' },
  'Biləsuvar': { en: 'Bilasuvar', ru: 'Билясувар' },
  'Hacıqabul': { en: 'Hajigabul', ru: 'Гаджигабул' },
  'Neftçala': { en: 'Neftchala', ru: 'Нефтчала' },
  'Salyan': { en: 'Salyan', ru: 'Сальяны' },
  'Ağcabədi': { en: 'Aghjabadi', ru: 'Агджабеди' },
  'Ağdərə': { en: 'Aghdara', ru: 'Агдере' },
  'Bərdə': { en: 'Barda', ru: 'Барда' },
  'Tərtər': { en: 'Tartar', ru: 'Тертер' },
  'Babək': { en: 'Babek', ru: 'Бабек' },
  'Culfa': { en: 'Culfa', ru: 'Джульфа' },
  'Kəngərli': { en: 'Kangarli', ru: 'Кенгерли' },
  'Ordubad': { en: 'Ordubad', ru: 'Ордубад' },
  'Sədərək': { en: 'Sadarak', ru: 'Садарак' },
  'Şahbuz': { en: 'Shakhbuz', ru: 'Шахбуз' },
  'Şərur': { en: 'Sharur', ru: 'Шарур' },
  'Balakən': { en: 'Balakan', ru: 'Балакен' },
  'Göyçay': { en: 'Goychay', ru: 'Гёйчай' },
  'Füzuli': { en: 'Fuzuli', ru: 'Физули' },
  'Xocavənd': { en: 'Khojavend', ru: 'Ходжавенд' },
  'Qubadlı': { en: 'Qubadli', ru: 'Губадлы' },
  'Cəbrayıl': { en: 'Jabrayil', ru: 'Джебраил' },
  'Zəngilan': { en: 'Zangilan', ru: 'Зангилан' },
  'Kəlbəcər': { en: 'Kalbajar', ru: 'Кельбаджар' },
  'Xocalı': { en: 'Khojaly', ru: 'Ходжалы' },
};

export function placeName(location: string | null | undefined, locale: Locale): string {
  if (!location) return '';
  if (locale === 'az') return location;
  return PLACES[location]?.[locale] ?? location;
}
