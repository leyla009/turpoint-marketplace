// The 22 demo tours, with real content in Azerbaijani, English and Russian.
// Source of truth for both seed.js (fresh databases) and seedRealTours.js
// (upgrades an existing database in place).
//
// The content itself lives in three files so each stays readable:
//   seedToursBaku.js, seedToursRegionsA.js, seedToursRegionsB.js
//
// How a tour is stored (see buildTourRow below):
//   tours.title / tours.description   English title + short summary. Plain
//                                     columns, so nothing that ignores
//                                     translations (planner prompt, old
//                                     clients, search) breaks.
//   tours.title_i18n                  JSON {"az": "...", "en": "...", "ru": "..."}
//   tours.description_i18n            JSON, same shape (the short summary)
//   tours.details_i18n                JSON {"az": {highlights, description, includes,
//                                     excludes, notSuitable, bring, notAllowed,
//                                     know, meeting}, "en": {...}, "ru": {...}}
//   tours.facts                       JSON, language-neutral (duration_hours,
//                                     guide_languages, pickup, private)
//
// The frontend picks the reader's language from these (app/lib/tourContent.ts)
// and falls back to the plain columns for tours operators create themselves.

import { BAKU_TOURS } from './seedToursBaku.js';
import { REGIONS_A_TOURS } from './seedToursRegionsA.js';
import { REGIONS_B_TOURS } from './seedToursRegionsB.js';

export const LOCALES = ['az', 'en', 'ru'];

// Order the tours appear in the PDF (and so the order their dates are spread in).
const ORDER = [
  'baku-old-city',
  'baku-restaurant-evening',
  'gobustan-mud-volcanoes-ateshgah',
  'baku-caspian-boat',
  'baku-cooking-class',
  'lahij-village-city-of-masters',
  'shirvan-eco-tour',
  'sheki-old-town-khans-palace',
  'sheki-old-town-walking',
  'sheki-private-unesco',
  'shamakhi-basgal-lahij-private',
  'shamakhi-alpaca-farm',
  'guba-khinalig-candy-cane',
  'shahdag-2day-quba-gecresh',
  'karabakh-khankendi-shusha',
  'gabala-day-trip',
  'baku-food-tour-market-teahouse',
  'baku-flavors-tasting',
  'baku-street-food',
  'sheki-sparkling-wine-2day',
  'baku-bazaar-tour',
  'baku-best-of-walking',
];

const LIST_FIELDS = ['highlights', 'description', 'includes', 'excludes', 'notSuitable', 'bring', 'notAllowed', 'know'];
const TEXT_FIELDS = ['title', 'summary', 'meeting'];
const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

const byKey = new Map([...BAKU_TOURS, ...REGIONS_A_TOURS, ...REGIONS_B_TOURS].map((t) => [t.key, t]));

export const SEED_TOURS = ORDER.map((key) => {
  const tour = byKey.get(key);
  if (!tour) throw new Error(`seedTourData: no content for "${key}"`);
  return tour;
});

// Fail loudly at seed time (not silently in production) if a translation or
// field is missing - a half-translated tour is exactly the bug this fixes.
function validate() {
  if (byKey.size !== ORDER.length) {
    throw new Error(`seedTourData: ${byKey.size} tours defined but ${ORDER.length} in ORDER`);
  }
  for (const tour of SEED_TOURS) {
    if (!CATEGORIES.includes(tour.category)) throw new Error(`${tour.key}: bad category ${tour.category}`);
    if (!(tour.price > 0)) throw new Error(`${tour.key}: bad price`);
    for (const locale of LOCALES) {
      const c = tour.i18n?.[locale];
      if (!c) throw new Error(`${tour.key}: missing ${locale} content`);
      for (const f of TEXT_FIELDS) {
        if (typeof c[f] !== 'string' || !c[f].trim()) throw new Error(`${tour.key}.${locale}.${f} is empty`);
      }
      for (const f of LIST_FIELDS) {
        if (!Array.isArray(c[f])) throw new Error(`${tour.key}.${locale}.${f} must be an array`);
      }
      for (const f of ['highlights', 'description', 'includes']) {
        if (c[f].length === 0) throw new Error(`${tour.key}.${locale}.${f} is empty`);
      }
    }
    // The three languages must have the same list shape, otherwise one
    // language silently shows less than the others.
    for (const f of LIST_FIELDS) {
      const lens = LOCALES.map((l) => tour.i18n[l][f].length);
      if (new Set(lens).size > 1) throw new Error(`${tour.key}.${f}: lists differ in length across languages (${lens.join('/')})`);
    }
  }
}
validate();

/**
 * Dates for the seed tours: spread over the CURRENT month (Baku time), starting
 * tomorrow, so a freshly seeded database always has upcoming, bookable tours.
 * If fewer than 10 days are left in the month the window runs to the end of
 * NEXT month instead, so there is never only a handful of days to spread over.
 * Returns `count` YYYY-MM-DD strings in ascending order (some may share a day).
 */
export function seedDates(count, now = new Date()) {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' }); // YYYY-MM-DD
  const [y, m, d] = today.split('-').map(Number);
  let lastDay = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of this one
  if (lastDay.getUTCDate() - d < 10) lastDay = new Date(Date.UTC(y, m + 1, 0));
  const start = new Date(Date.UTC(y, m - 1, d + 1)); // tomorrow
  const span = Math.round((lastDay - start) / 86400000) + 1; // days available, inclusive
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + Math.floor((i * span) / count));
    return day.toISOString().slice(0, 10);
  });
}

/**
 * Turns one seed tour into the column values for an INSERT/UPDATE.
 * `date` is YYYY-MM-DD. interest_score mirrors the old seed / the tour form.
 */
export function buildTourRow(tour, { operatorId, date }) {
  const titleI18n = {};
  const descriptionI18n = {};
  const detailsI18n = {};
  for (const locale of LOCALES) {
    const { title, summary, ...details } = tour.i18n[locale];
    titleI18n[locale] = title;
    descriptionI18n[locale] = summary;
    detailsI18n[locale] = details;
  }

  const interestScore = {};
  for (const c of CATEGORIES) interestScore[c] = c === tour.category ? 0.9 : 0.1;

  // The e-ticket / calendar file read the first line of `route` as
  // "HH:MM - place". Only tours with a fixed start time need one; the rest
  // fall back to the tour's location there.
  const time = /^(\d{1,2}:\d{2})/.exec(tour.route ?? '')?.[1];

  return {
    operator_id: operatorId,
    title: titleI18n.en,
    description: descriptionI18n.en,
    title_i18n: JSON.stringify(titleI18n),
    description_i18n: JSON.stringify(descriptionI18n),
    details_i18n: JSON.stringify(detailsI18n),
    facts: JSON.stringify(tour.facts ?? {}),
    location: tour.location,
    category: tour.category,
    route: time ? `${time} - ${tour.location}` : null,
    price: tour.price,
    date,
    duration_days: tour.duration_days,
    min_participants: tour.min_participants,
    max_participants: tour.max_participants,
    interest_score: JSON.stringify(interestScore),
    features: tour.features ?? '',
    vehicle_features: tour.vehicle_features ?? null,
    photo_url: tour.photo,
  };
}
