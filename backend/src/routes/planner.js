// Smart Planner v2: a conversational, AI-assisted trip planner.
//
// The AI is a reasoning layer only - it never invents tours, prices, or
// availability. The flow for every message is:
//
//   1. A small/fast model extracts structured trip requirements from the
//      user's free text + any structured form fields + conversation so far
//      (extractRequirements below). If it genuinely can't proceed (no
//      destination AND no duration/interest to go on), it asks ONE
//      clarifying question instead of guessing.
//   2. The backend queries the REAL tours table using those requirements
//      (findCandidateTours) - this is the actual marketplace data, and the
//      only data the next step is allowed to reference.
//   3. A larger model builds a day-by-day itinerary, but is only ever shown
//      that candidate list and told it may only cite ids from it
//      (buildItinerary below).
//   4. The backend re-hydrates every activity from its own database row -
//      title, price, rating, everything - discarding whatever the model
//      wrote for those fields. A tourId the model invents or mis-copies is
//      dropped, not trusted. Totals are recomputed server-side, never
//      taken from the model's own arithmetic.
//
// This means even a misbehaving or hallucinating model cannot cause a fake
// tour, price, or rating to reach the frontend - the worst it can do is
// recommend nothing, which is handled as an honest "no match" response.

import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { attachActiveDeals, attachReviewStats } from './tours.js';
import { groqJson, GroqError, groqConfigured, GROQ_EXTRACT_MODEL, GROQ_ITINERARY_MODEL } from '../lib/groq.js';

const router = Router();

const CATEGORIES = ['nature', 'history', 'entertainment', 'food'];

const LANGUAGE_NAMES = { az: 'Azerbaijani', en: 'English', ru: 'Russian' };

// A handful of common English/transliterated spellings for real TurPoint
// destinations, so "Baku"/"Gabala"/"Sheki" etc. in a user's message or the
// model's own output resolve to the actual location strings stored on
// tours - without hardcoding the destination list itself (see
// realLocations() below, which always reflects the live database).
const EXONYMS = {
  baku: 'bakı',
  sheki: 'şəki',
  shaki: 'şəki',
  gabala: 'qəbələ',
  qabala: 'qəbələ',
  gebele: 'qəbələ',
  guba: 'quba',
  lankaran: 'lənkəran',
  lenkeran: 'lənkəran',
  ganja: 'gəncə',
  gyanja: 'gəncə',
  shusha: 'şuşa',
  susha: 'şuşa',
  susa: 'şuşa',
};

function foldAz(text) {
  return String(text)
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/q/g, 'g')
    .trim();
}

function normalizePlaceName(text) {
  const folded = foldAz(text);
  const exonym = EXONYMS[folded];
  return exonym ? foldAz(exonym) : folded;
}

function realLocations() {
  return db
    .prepare('SELECT DISTINCT location FROM tours WHERE location IS NOT NULL')
    .all()
    .map((r) => r.location);
}

// Maps whatever destination strings the AI/user produced onto the real
// location values actually present in the tours table - never trusts the
// spelling verbatim, since a tour's `location` column has to match exactly
// for the SQL filter below to find anything.
function resolveDestinations(rawDestinations) {
  if (!Array.isArray(rawDestinations) || rawDestinations.length === 0) return [];
  const locations = realLocations();
  const resolved = new Set();
  for (const raw of rawDestinations) {
    const target = normalizePlaceName(raw);
    for (const loc of locations) {
      const normLoc = normalizePlaceName(loc);
      if (normLoc === target || normLoc.includes(target) || target.includes(normLoc)) {
        resolved.add(loc);
      }
    }
  }
  return [...resolved];
}

const CLARIFY_SYSTEM_PROMPT = `You are the requirements-extraction step of TurPoint's Smart Planner, a real trip-planning feature for a tour marketplace in Azerbaijan.

Read the traveler's message (and any prior conversation / structured form fields provided) and extract structured trip requirements as JSON. Output ONLY a JSON object, no prose, matching exactly this shape:

{
  "needsClarification": boolean,
  "clarifyingQuestion": string | null,
  "extracted": {
    "travelerType": "local" | "international" | "unspecified",
    "origin": string | null,
    "destinations": string[],
    "travelers": number,
    "durationDays": number | null,
    "startDate": string | null,
    "endDate": string | null,
    "budgetMax": number | null,
    "currency": "AZN" | "EUR" | "USD",
    "interests": string[],
    "travelStyle": "relaxed" | "packed" | "balanced",
    "mustSee": string[],
    "avoid": string[]
  }
}

Rules:
- "travelerType": infer from context. Phrases like "I live in", "I'm from [Azerbaijani city]", "I've lived here" imply "local". Phrases like "visiting", "first time here", "from [a foreign country]" imply "international". If genuinely unclear, use "unspecified".
- "interests" must only contain values from this exact set: ${CATEGORIES.join(', ')}. Map things like "nightlife" to nothing (there is no such category) and note it isn't offered rather than inventing a category.
- "destinations" are place names as the user wrote them (don't worry about exact spelling - a later step resolves them against the real database).
- Merge in any previously-known structured fields given to you rather than discarding them; only overwrite a field if the new message clearly changes it.
- Only set "needsClarification": true if you cannot reasonably proceed at all - e.g. there's no destination, no duration, and no interest to go on. Do NOT ask for information you can reasonably default (assume 1 traveler if unstated, assume Bakı as origin for an unspecified local trip, assume "balanced" travel style). Prefer proceeding over asking.
- "clarifyingQuestion" must be a single, short, natural question, written in ${'{{LANGUAGE}}'}, and must be null when needsClarification is false.
- Never mention tours, prices, or any TurPoint data here - this step only extracts what the traveler wants, it doesn't see the marketplace yet.`;

const ITINERARY_SYSTEM_PROMPT = `You are TurPoint's Smart Planner, a professional travel-planning assistant for a real tour marketplace in Azerbaijan, serving both local Azerbaijani travelers and international visitors.

You will be given the traveler's structured requirements and a list of REAL candidate tours currently available on TurPoint (with real ids, prices, durations, locations, ratings and dates). You may ONLY recommend tours from this candidate list, by their exact "id" field. You must NEVER invent a tour, operator, price, rating, or availability that is not in the candidate list. If none of the candidates genuinely fit, say so honestly instead of forcing a bad match.

Build a realistic day-by-day itinerary:
- A tour's "duration_days" occupies that many consecutive days - never schedule two full-day tours to overlap on the same day.
- Respect the traveler count against each tour's max_participants.
- Prefer staying within budgetMax if one was given; if you must exceed it to build a sensible trip, say so plainly in "notes".
- If specific travel dates were given, prefer candidates whose own "date" falls in that window, and mention in "notes" if a good match falls outside it.
- Match the traveler's stated travelStyle: "relaxed" means fewer, longer activities and real rest time between them; "packed" means making full use of the available days.
- If the traveler is editing a previous itinerary (given to you as "currentItinerary"), modify it according to their new instruction rather than starting over from nothing, keeping days/activities that are still appropriate.
- If there simply aren't enough good candidates to fill every requested day, return fewer days rather than padding with irrelevant tours - say so in "notes".

Output ONLY a JSON object, no prose, matching exactly this shape:

{
  "tripSummary": string,
  "days": [
    {
      "day": number,
      "destination": string | null,
      "activities": [
        { "tourId": number, "reason": string }
      ]
    }
  ],
  "notes": string[]
}

"tripSummary" and every "reason" and every entry in "notes" must be written in ${'{{LANGUAGE}}'}, be concise (one short sentence each), and must never state a price, rating, or duration yourself - the app already displays those from real data next to your reason.`;

function languageInstruction(locale) {
  return LANGUAGE_NAMES[locale] || 'English';
}

async function extractRequirements({ message, locale, structured, history, currentItinerary }) {
  const system = CLARIFY_SYSTEM_PROMPT.replace('{{LANGUAGE}}', languageInstruction(locale));
  const context = {
    latestMessage: message,
    structuredFieldsFromUI: structured ?? {},
    priorConversation: (history ?? []).slice(-6),
    isEditingExistingItinerary: !!currentItinerary,
  };
  return groqJson({
    model: GROQ_EXTRACT_MODEL,
    system,
    messages: [{ role: 'user', content: JSON.stringify(context) }],
    temperature: 0.2,
  });
}

async function buildItinerary({ locale, extracted, candidates, currentItinerary, message }) {
  const system = ITINERARY_SYSTEM_PROMPT.replace('{{LANGUAGE}}', languageInstruction(locale));
  const context = {
    requirements: extracted,
    latestInstruction: message,
    currentItinerary: currentItinerary ?? null,
    candidateTours: candidates.map((t) => ({
      id: t.id,
      title: t.title,
      location: t.location,
      category: t.category,
      price: t.discounted_price ?? t.price,
      duration_days: t.duration_days,
      max_participants: t.max_participants,
      rating: t.rating,
      review_count: t.review_count,
      date: t.date,
    })),
  };
  return groqJson({
    model: GROQ_ITINERARY_MODEL,
    system,
    messages: [{ role: 'user', content: JSON.stringify(context) }],
    temperature: 0.5,
  });
}

// Queries the real tours table for candidates matching the extracted
// requirements. Widens the filter twice (dropping budget, then dropping
// destination) before giving up, so a slightly-too-narrow request still
// surfaces honest "closest" alternatives instead of an empty result on the
// first try - real tours only, at every step.
function findCandidateTours(extracted) {
  const destinations = resolveDestinations(extracted?.destinations);
  const interests = (extracted?.interests ?? []).filter((i) => CATEGORIES.includes(i));
  const budgetMax = typeof extracted?.budgetMax === 'number' ? extracted.budgetMax : null;

  function query({ useDestinations, useBudget }) {
    let sql = 'SELECT * FROM tours WHERE 1=1';
    const params = [];
    if (useDestinations && destinations.length > 0) {
      sql += ` AND location IN (${destinations.map(() => '?').join(',')})`;
      params.push(...destinations);
    }
    if (interests.length > 0) {
      sql += ` AND category IN (${interests.map(() => '?').join(',')})`;
      params.push(...interests);
    }
    if (useBudget && budgetMax !== null) {
      sql += ' AND price <= ?';
      params.push(budgetMax * 1.15); // small headroom - a deal can bring the effective price back under budget
    }
    sql += ' ORDER BY date ASC LIMIT 40';
    return db.prepare(sql).all(...params);
  }

  let rows = query({ useDestinations: true, useBudget: true });
  let widened = null;
  if (rows.length === 0 && budgetMax !== null) {
    rows = query({ useDestinations: true, useBudget: false });
    if (rows.length > 0) widened = 'budget';
  }
  if (rows.length === 0 && destinations.length > 0) {
    rows = query({ useDestinations: false, useBudget: true });
    if (rows.length > 0) widened = 'destination';
  }
  if (rows.length === 0) {
    rows = db.prepare('SELECT * FROM tours ORDER BY date ASC LIMIT 40').all();
    if (rows.length > 0) widened = 'everything';
  }

  return { candidates: attachReviewStats(attachActiveDeals(rows)), widened };
}

function cheapestAlternatives(excludeIds = []) {
  const placeholders = excludeIds.length ? `WHERE id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
  const rows = db.prepare(`SELECT * FROM tours ${placeholders} ORDER BY price ASC LIMIT 3`).all(...excludeIds);
  return attachReviewStats(attachActiveDeals(rows));
}

const FRIENDLY_ERRORS = {
  az: {
    not_configured: 'Süni intellekt planlaşdırıcısı hazırda konfiqurasiya edilməyib.',
    unreachable: 'Süni intellekt xidmətinə qoşulmaq mümkün olmadı. Bir az sonra yenidən cəhd edin.',
    unauthorized: 'Süni intellekt xidmətinin girişi düzgün konfiqurasiya edilməyib.',
    rate_limited: 'Süni intellekt xidməti hazırda məşğuldur. Bir az sonra yenidən cəhd edin.',
    provider_error: 'Süni intellekt xidmətində müvəqqəti problem yarandı.',
    empty_response: 'Süni intellekt cavab vermədi. Yenidən cəhd edin.',
    malformed_json: 'Süni intellekt cavabını emal etmək mümkün olmadı. Yenidən cəhd edin.',
    generic: 'Nəsə səhv getdi. Yenidən cəhd edin.',
  },
  en: {
    not_configured: 'The AI planner isn’t configured yet.',
    unreachable: 'Couldn’t reach the AI service. Please try again in a moment.',
    unauthorized: 'The AI service isn’t configured correctly.',
    rate_limited: 'The AI service is busy right now. Please try again shortly.',
    provider_error: 'The AI service had a temporary problem.',
    empty_response: 'The AI didn’t return a response. Please try again.',
    malformed_json: 'Couldn’t process the AI’s response. Please try again.',
    generic: 'Something went wrong. Please try again.',
  },
  ru: {
    not_configured: 'ИИ-планировщик пока не настроен.',
    unreachable: 'Не удалось подключиться к ИИ-сервису. Попробуйте ещё раз через момент.',
    unauthorized: 'Доступ к ИИ-сервису настроен некорректно.',
    rate_limited: 'ИИ-сервис сейчас перегружен. Попробуйте немного позже.',
    provider_error: 'Во ИИ-сервисе произошла временная ошибка.',
    empty_response: 'ИИ не вернул ответ. Попробуйте ещё раз.',
    malformed_json: 'Не удалось обработать ответ ИИ. Попробуйте ещё раз.',
    generic: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
};

function friendlyError(locale, reason) {
  const table = FRIENDLY_ERRORS[locale] || FRIENDLY_ERRORS.en;
  return table[reason] || table.generic;
}

const NO_MATCH_MESSAGES = {
  az: 'Təəssüf ki, bütün istəklərinizə tam uyğun tur tapmadım. Ən yaxın variantları göstərirəm:',
  en: 'I couldn’t find a tour that matches everything you asked for. Here are the closest options I found:',
  ru: 'К сожалению, я не нашёл тур, полностью соответствующий всем вашим пожеланиям. Вот ближайшие варианты:',
};

const WIDENED_NOTES = {
  budget: {
    az: 'Büdcənizə tam uyğun tur tapılmadı, ona görə büdcə şərtini bir qədər genişləndirdim.',
    en: 'Nothing fit your exact budget, so I widened it slightly to find these.',
    ru: 'Ничего не подошло точно под ваш бюджет, поэтому я немного его расширил.',
  },
  destination: {
    az: 'İstədiyiniz istiqamətdə uyğun tur tapılmadı, ona görə digər istiqamətlərdən təkliflər göstərirəm.',
    en: 'Nothing matched your requested destination, so these are from other destinations.',
    ru: 'В запрошенном направлении ничего не нашлось, поэтому вот варианты из других направлений.',
  },
  everything: {
    az: 'Kriteriyalarınıza uyğun tur tapmadım, ona görə mövcud turlardan bəzilərini göstərirəm.',
    en: 'I couldn’t find tours matching your criteria, so here are some of what’s currently available.',
    ru: 'Не нашлось туров по вашим критериям, поэтому вот некоторые из доступных сейчас.',
  },
};

function hydrateActivity(tour) {
  return {
    tourId: tour.id,
    title: tour.title,
    location: tour.location,
    category: tour.category,
    durationDays: tour.duration_days,
    price: tour.price,
    discountedPrice: tour.discounted_price ?? null,
    rating: tour.rating,
    reviewCount: tour.review_count,
    date: tour.date,
    minParticipants: tour.min_participants,
    maxParticipants: tour.max_participants,
  };
}

function budgetNote(locale, estimatedCost, budgetMax) {
  if (budgetMax === null || budgetMax === undefined) return null;
  const over = estimatedCost - budgetMax;
  if (over > budgetMax * 0.03) {
    const table = {
      az: `Bu plan təxminən ${estimatedCost} AZN-dir, bu isə ${budgetMax} AZN büdcənizdən ${Math.round(over)} AZN çoxdur.`,
      en: `This plan comes to about ${estimatedCost} AZN, which is ${Math.round(over)} AZN above your ${budgetMax} AZN budget.`,
      ru: `Этот план стоит около ${estimatedCost} AZN, что на ${Math.round(over)} AZN больше вашего бюджета в ${budgetMax} AZN.`,
    };
    return table[locale] || table.en;
  }
  const remaining = Math.round((budgetMax - estimatedCost) * 100) / 100;
  if (remaining > 0) {
    const table = {
      az: `Planlaşdırılan xərc təxminən ${estimatedCost} AZN, büdcənizdən ${remaining} AZN qalır.`,
      en: `Your planned activities come to about ${estimatedCost} AZN, leaving around ${remaining} AZN of your budget.`,
      ru: `Запланированные активности стоят около ${estimatedCost} AZN, у вас останется около ${remaining} AZN бюджета.`,
    };
    return table[locale] || table.en;
  }
  return null;
}

router.post('/chat', async (req, res) => {
  const { message, locale = 'en', structured, history, currentItinerary } = req.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  const safeLocale = LANGUAGE_NAMES[locale] ? locale : 'en';

  if (!groqConfigured()) {
    return res.json({
      phase: 'error',
      message: friendlyError(safeLocale, 'not_configured'),
      error: { reason: 'not_configured' },
    });
  }

  let requirements;
  try {
    requirements = await extractRequirements({ message, locale: safeLocale, structured, history, currentItinerary });
  } catch (err) {
    const reason = err instanceof GroqError ? err.reason : 'generic';
    return res.json({ phase: 'error', message: friendlyError(safeLocale, reason), error: { reason } });
  }

  const extracted = requirements?.extracted;
  if (!extracted) {
    return res.json({ phase: 'error', message: friendlyError(safeLocale, 'malformed_json'), error: { reason: 'malformed_json' } });
  }

  if (requirements.needsClarification && !currentItinerary) {
    return res.json({
      phase: 'clarify',
      message: requirements.clarifyingQuestion || friendlyError(safeLocale, 'generic'),
      extracted,
    });
  }

  const { candidates, widened } = findCandidateTours(extracted);

  if (candidates.length === 0) {
    return res.json({
      phase: 'no_match',
      message: NO_MATCH_MESSAGES[safeLocale] || NO_MATCH_MESSAGES.en,
      extracted,
      alternatives: cheapestAlternatives(),
    });
  }

  let modelItinerary;
  try {
    modelItinerary = await buildItinerary({ locale: safeLocale, extracted, candidates, currentItinerary, message });
  } catch (err) {
    const reason = err instanceof GroqError ? err.reason : 'generic';
    return res.json({ phase: 'error', message: friendlyError(safeLocale, reason), error: { reason } });
  }

  const candidatesById = new Map(candidates.map((t) => [t.id, t]));
  const droppedInvalidRef = { count: 0 };

  const days = (Array.isArray(modelItinerary?.days) ? modelItinerary.days : [])
    .map((day, i) => {
      const activities = (Array.isArray(day?.activities) ? day.activities : [])
        .map((a) => {
          const tour = candidatesById.get(Number(a?.tourId));
          if (!tour) {
            droppedInvalidRef.count += 1;
            return null;
          }
          return { ...hydrateActivity(tour), reason: typeof a.reason === 'string' ? a.reason.slice(0, 240) : '' };
        })
        .filter(Boolean);
      return { day: typeof day?.day === 'number' ? day.day : i + 1, destination: day?.destination ?? null, activities };
    })
    .filter((day) => day.activities.length > 0);

  const allActivities = days.flatMap((d) => d.activities);

  if (allActivities.length === 0) {
    return res.json({
      phase: 'no_match',
      message: NO_MATCH_MESSAGES[safeLocale] || NO_MATCH_MESSAGES.en,
      extracted,
      alternatives: cheapestAlternatives(),
    });
  }

  // De-dupe: the same real tour recommended twice across days counts once
  // toward cost/destination totals, matching what a traveler would
  // actually pay and visit.
  const uniqueTourIds = new Set(allActivities.map((a) => a.tourId));
  const uniqueDestinations = new Set(allActivities.map((a) => a.location).filter(Boolean));
  const estimatedCost =
    Math.round(
      [...uniqueTourIds]
        .map((id) => candidatesById.get(id))
        .reduce((sum, t) => sum + (t.discounted_price ?? t.price), 0) * 100
    ) / 100;

  const notes = Array.isArray(modelItinerary?.notes) ? modelItinerary.notes.filter((n) => typeof n === 'string') : [];
  if (widened && WIDENED_NOTES[widened]) {
    notes.unshift(WIDENED_NOTES[widened][safeLocale] || WIDENED_NOTES[widened].en);
  }
  if (droppedInvalidRef.count > 0) {
    const table = {
      az: 'Bəzi təkliflər real turlarla uyğunlaşmadığı üçün çıxarıldı.',
      en: 'A couple of suggested activities didn’t match a real tour and were left out.',
      ru: 'Некоторые предложенные активности не соответствовали реальным турам и были убраны.',
    };
    notes.push(table[safeLocale] || table.en);
  }
  const bNote = budgetNote(safeLocale, estimatedCost, extracted.budgetMax);
  if (bNote) notes.push(bNote);

  const itinerary = {
    tripSummary: typeof modelItinerary?.tripSummary === 'string' ? modelItinerary.tripSummary : '',
    travelerType: extracted.travelerType || 'unspecified',
    travelers: extracted.travelers || 1,
    days,
    estimatedCost,
    toursCount: uniqueTourIds.size,
    destinationsCount: uniqueDestinations.size,
    notes,
  };

  res.json({ phase: 'itinerary', message: itinerary.tripSummary, extracted, itinerary });
});

// --- Saved trips -----------------------------------------------------

router.post('/trips', requireAuth, (req, res) => {
  const { title, trip } = req.body ?? {};
  if (!title || !trip) return res.status(400).json({ error: 'title and trip are required' });
  const result = db
    .prepare('INSERT INTO saved_trips (user_id, title, trip_json) VALUES (?, ?, ?)')
    .run(req.user.userId, String(title).slice(0, 200), JSON.stringify(trip));
  res.status(201).json({ id: result.lastInsertRowid, title, trip });
});

router.get('/trips/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT id, title, trip_json, created_at FROM saved_trips WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.userId);
  res.json(rows.map((r) => ({ id: r.id, title: r.title, created_at: r.created_at, trip: JSON.parse(r.trip_json) })));
});

router.delete('/trips/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT user_id FROM saved_trips WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'trip not found' });
  if (row.user_id !== req.user.userId) return res.status(403).json({ error: 'you can only delete your own saved trips' });
  db.prepare('DELETE FROM saved_trips WHERE id = ?').run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

export default router;
