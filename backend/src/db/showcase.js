// Shared building blocks for the showcase data: the "Azerbaijan Discovery
// (Demo)" operator, its tours, their schedule and deals, and the demo logins.
// Used by the seed scripts (seedShowcase, seedExtra, seedDemoOperator) and by
// the boot-time rebuild in demoBootstrap.js, so they all produce the same data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { SEED_TOURS, buildTourRow, seedDates, LOCALES } from './seedTourData.js';
import { ADDITIONAL_SHOWCASE_TOURS } from './seedToursShowcase.js';
import { EXTRA_TOURS } from './seedToursExtra.js';

export const OPERATOR_NAME = 'Azerbaijan Discovery (Demo)';
export const OPERATOR_EMAIL = 'operator.demo@turpoint.test';
export const TRAVELER_EMAIL = 'traveler.demo@turpoint.test';
export const SHOWCASE_TOURS = [...SEED_TOURS, ...ADDITIONAL_SHOWCASE_TOURS, ...EXTRA_TOURS];
export { EXTRA_TOURS };

const OPERATOR_DESCRIPTION =
  'A local showcase profile with sample itineraries inspired by Azerbaijan’s destinations. Listings, prices, dates, and availability are for demonstration.';
const DEAL_COUNT = 5;
const DEAL_PERCENTS = [15, 20, 25, 15, 20];
const LIST_FIELDS = ['highlights', 'description', 'includes', 'excludes', 'notSuitable', 'bring', 'notAllowed', 'know'];
const COLUMNS = [
  'title', 'description', 'title_i18n', 'description_i18n', 'details_i18n', 'facts', 'location', 'category',
  'route', 'price', 'date', 'duration_days', 'min_participants', 'max_participants', 'interest_score',
  'features', 'vehicle_features', 'photo_url',
];

// Throws if any showcase tour is missing text in a language, has lists of
// different lengths across languages, or points at a missing cover photo.
export function validateShowcaseTours(tours = SHOWCASE_TOURS) {
  if (new Set(tours.map((t) => t.key)).size !== tours.length) throw new Error('Showcase tour keys must be unique.');
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const tour of tours) {
    for (const locale of LOCALES) {
      const c = tour.i18n?.[locale];
      if (!c?.title || !c?.summary || !c?.meeting) throw new Error(`${tour.key}: incomplete ${locale} text`);
      for (const f of LIST_FIELDS) {
        if (!Array.isArray(c[f])) throw new Error(`${tour.key}.${locale}.${f} must be a list`);
        if (c[f].length !== tour.i18n.en[f].length) throw new Error(`${tour.key}.${f}: list lengths differ across languages`);
      }
      for (const f of ['highlights', 'description', 'includes']) {
        if (c[f].length === 0) throw new Error(`${tour.key}.${locale}.${f} is empty`);
      }
    }
    if (!fs.existsSync(path.resolve(here, '../../../frontend/public', `.${tour.photo}`))) {
      throw new Error(`${tour.key}: photo missing (${tour.photo})`);
    }
  }
}

export function findShowcaseOperator(db) {
  return db.prepare('SELECT id, user_id FROM operators WHERE name = ?').get(OPERATOR_NAME);
}

export function createShowcaseOperator(db, userId = null) {
  return db.prepare("INSERT INTO operators (user_id, name, description, languages, photo_url) VALUES (?, ?, ?, 'az,en,ru', NULL)")
    .run(userId, OPERATOR_NAME, OPERATOR_DESCRIPTION).lastInsertRowid;
}

// Monday, Wednesday or Saturday: the Karabakh group tour's published days.
function nextRunDay(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  while (!days.includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Brings the operator's showcase tours up to date. Safe to run again:
//   1. adds any of `addTours` that are missing (matched by English title),
//   2. fills full stop-by-stop routes where a tour has none,
//   3. moves every unbooked tour onto dates from tomorrow onwards, rotating
//      categories so each one is spread across the month,
//   4. puts last-minute deals on the five soonest tours.
export function syncShowcaseTours(db, operatorId, { addTours = EXTRA_TOURS } = {}) {
  const byTitle = new Map(SHOWCASE_TOURS.map((t) => [t.i18n.en.title, t]));
  const insertTour = db.prepare(
    `INSERT INTO tours (operator_id, ${COLUMNS.join(', ')}) VALUES (@operator_id, ${COLUMNS.map((c) => `@${c}`).join(', ')})`
  );

  return db.transaction(() => {
    // 1. Missing tours. The real date is set in step 3.
    const existingTitles = new Set(db.prepare('SELECT title FROM tours WHERE operator_id = ?').all(operatorId).map((r) => r.title));
    let added = 0;
    for (const tour of addTours) {
      if (existingTitles.has(tour.i18n.en.title)) continue;
      const row = buildTourRow(tour, { operatorId, date: '2000-01-01' });
      insertTour.run(Object.fromEntries([['operator_id', operatorId], ...COLUMNS.map((c) => [c, row[c]])]));
      added += 1;
    }

    // 2. Routes.
    const tours = db.prepare('SELECT id, title, category, route FROM tours WHERE operator_id = ? ORDER BY id').all(operatorId);
    let routed = 0;
    for (const t of tours) {
      const seed = byTitle.get(t.title);
      if (!seed || t.route?.includes('→')) continue;
      const route = buildTourRow(seed, { operatorId, date: '2000-01-01' }).route;
      if (route?.includes('→')) {
        db.prepare('UPDATE tours SET route = ? WHERE id = ?').run(route, t.id);
        routed += 1;
      }
    }

    // 3. Dates. A tour someone has already booked keeps its date.
    const booked = new Set(db.prepare("SELECT DISTINCT tour_id FROM bookings WHERE status != 'cancelled'").all().map((r) => r.tour_id));
    const unbooked = tours.filter((t) => !booked.has(t.id));
    const queues = new Map();
    for (const t of unbooked) {
      if (!queues.has(t.category)) queues.set(t.category, []);
      queues.get(t.category).push(t);
    }
    const rotation = [];
    while (rotation.length < unbooked.length) {
      for (const queue of queues.values()) if (queue.length) rotation.push(queue.shift());
    }
    const dates = seedDates(rotation.length);
    rotation.forEach((t, i) => {
      const date = byTitle.get(t.title)?.key === 'karabakh-khankendi-shusha' ? nextRunDay(dates[i], [1, 3, 6]) : dates[i];
      db.prepare('UPDATE tours SET date = ? WHERE id = ?').run(date, t.id);
    });

    // 4. Deals. Dates may have just moved, so this operator's active deals are
    // replaced rather than kept on tours that are no longer the soonest. A
    // deal ends at the start of the tour day (Baku time, UTC+4).
    db.prepare(
      `DELETE FROM last_minute_deals WHERE datetime(expires_at) > datetime('now')
       AND tour_id IN (SELECT id FROM tours WHERE operator_id = ?)`
    ).run(operatorId);
    const soonest = db.prepare('SELECT id, date FROM tours WHERE operator_id = ? ORDER BY date, id LIMIT ?').all(operatorId, DEAL_COUNT);
    soonest.forEach((t, i) => {
      const expiresAt = new Date(`${t.date}T00:00:00+04:00`).toISOString();
      db.prepare('INSERT INTO last_minute_deals (tour_id, discount_percent, expires_at) VALUES (?, ?, ?)')
        .run(t.id, DEAL_PERCENTS[i % DEAL_PERCENTS.length], expiresAt);
    });

    return { added, routed, dated: rotation.length, firstDate: dates[0], lastDate: dates[dates.length - 1], deals: soonest.length };
  })();
}

// Creates the account, or sets a new password (and type) if it exists.
// Returns { id, created }. Only the bcrypt hash is stored.
export function upsertAccount(db, { name, email, password, accountType }) {
  if (typeof password !== 'string' || password.length < 6) throw new Error(`password for ${email} must be at least 6 characters`);
  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email.toLowerCase());
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, account_type = ?, password_changed_at = datetime('now') WHERE id = ?")
      .run(hash, accountType, existing.id);
    return { id: existing.id, created: false };
  }
  const id = db.prepare('INSERT INTO users (name, email, password_hash, account_type) VALUES (?, ?, ?, ?)')
    .run(name, email.toLowerCase(), hash, accountType).lastInsertRowid;
  return { id, created: true };
}

// Gives the showcase operator profile its login (operator.demo@turpoint.test).
// Refuses to take over a profile or account that belongs to someone else.
export function setShowcaseOperatorLogin(db, password) {
  return db.transaction(() => {
    const operator = findShowcaseOperator(db);
    if (!operator) throw new Error(`No "${OPERATOR_NAME}" operator profile found.`);
    const user = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(OPERATOR_EMAIL);
    if (operator.user_id && operator.user_id !== user?.id) {
      const owner = db.prepare('SELECT email FROM users WHERE id = ?').get(operator.user_id);
      throw new Error(`"${OPERATOR_NAME}" already belongs to ${owner?.email ?? `user ${operator.user_id}`}; nothing was changed.`);
    }
    if (user && db.prepare('SELECT 1 FROM operators WHERE user_id = ? AND id != ?').get(user.id, operator.id)) {
      throw new Error(`${OPERATOR_EMAIL} already owns a different operator profile; nothing was changed.`);
    }
    const account = upsertAccount(db, { name: 'Azerbaijan Discovery', email: OPERATOR_EMAIL, password, accountType: 'operator' });
    db.prepare('UPDATE operators SET user_id = ? WHERE id = ?').run(account.id, operator.id);
    return account;
  })();
}
