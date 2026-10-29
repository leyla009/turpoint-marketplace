// Brings an existing showcase database up to date, without touching accounts
// or bookings:
//   1. adds the seedToursExtra.js tours that are not there yet (matched by title),
//   2. fills in full stop-by-stop routes for showcase tours that lack one,
//   3. moves every unbooked showcase tour onto dates from tomorrow onwards,
//      rotating categories so each one is spread across the month,
//   4. puts last-minute deals on the five soonest tours.
// Safe to run again: steps 1-2 skip what is already done, and steps 3-4
// produce the same schedule and deals each time.
//
//   npm run seed:extra

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';
import { SEED_TOURS, buildTourRow, seedDates, LOCALES } from './seedTourData.js';
import { ADDITIONAL_SHOWCASE_TOURS } from './seedToursShowcase.js';
import { EXTRA_TOURS } from './seedToursExtra.js';

const OPERATOR_NAME = 'Azerbaijan Discovery (Demo)';
const DEAL_COUNT = 5;
const DEAL_PERCENTS = [15, 20, 25, 15, 20];
const LIST_FIELDS = ['highlights', 'description', 'includes', 'excludes', 'notSuitable', 'bring', 'notAllowed', 'know'];

const here = path.dirname(fileURLToPath(import.meta.url));
for (const tour of EXTRA_TOURS) {
  for (const locale of LOCALES) {
    const c = tour.i18n?.[locale];
    if (!c?.title || !c?.summary || !c?.meeting) throw new Error(`${tour.key}: incomplete ${locale} text`);
    for (const f of LIST_FIELDS) {
      if (!Array.isArray(c[f]) || c[f].length === 0) throw new Error(`${tour.key}.${locale}.${f} is empty`);
      if (c[f].length !== tour.i18n.en[f].length) throw new Error(`${tour.key}.${f}: list lengths differ across languages`);
    }
  }
  if (!fs.existsSync(path.resolve(here, '../../../frontend/public', `.${tour.photo}`))) {
    throw new Error(`${tour.key}: photo missing (${tour.photo})`);
  }
}

const operator = db.prepare('SELECT id FROM operators WHERE name = ?').get(OPERATOR_NAME);
if (!operator) {
  console.error(`No "${OPERATOR_NAME}" operator profile found. Run "npm run seed:showcase" on an empty database instead.`);
  process.exit(1);
}

const byTitle = new Map([...SEED_TOURS, ...ADDITIONAL_SHOWCASE_TOURS, ...EXTRA_TOURS].map((t) => [t.i18n.en.title, t]));
const columns = [
  'title', 'description', 'title_i18n', 'description_i18n', 'details_i18n', 'facts', 'location', 'category',
  'route', 'price', 'date', 'duration_days', 'min_participants', 'max_participants', 'interest_score',
  'features', 'vehicle_features', 'photo_url',
];
const insertTour = db.prepare(
  `INSERT INTO tours (operator_id, ${columns.join(', ')}) VALUES (@operator_id, ${columns.map((c) => `@${c}`).join(', ')})`
);

// Monday, Wednesday or Saturday: the Karabakh group tour's published days.
function nextRunDay(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  while (!days.includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const summary = db.transaction(() => {
  // 1. New tours.
  const existingTitles = new Set(db.prepare('SELECT title FROM tours WHERE operator_id = ?').all(operator.id).map((r) => r.title));
  let added = 0;
  for (const tour of EXTRA_TOURS) {
    if (existingTitles.has(tour.i18n.en.title)) continue;
    const row = buildTourRow(tour, { operatorId: operator.id, date: '2000-01-01' }); // real date set in step 3
    insertTour.run(Object.fromEntries([['operator_id', operator.id], ...columns.map((c) => [c, row[c]])]));
    added += 1;
  }

  // 2. Routes.
  const tours = db.prepare('SELECT id, title, route FROM tours WHERE operator_id = ? ORDER BY id').all(operator.id);
  let routed = 0;
  for (const t of tours) {
    const seed = byTitle.get(t.title);
    if (!seed || t.route?.includes('→')) continue;
    const route = buildTourRow(seed, { operatorId: operator.id, date: '2000-01-01' }).route;
    if (route?.includes('→')) {
      db.prepare('UPDATE tours SET route = ? WHERE id = ?').run(route, t.id);
      routed += 1;
    }
  }

  // 3. Dates from tomorrow onwards. Categories take turns (one tour from each
  // in rotation) so every category, wellness included, is spread across the
  // whole month instead of bunching up in listing order.
  const categoryOf = new Map(db.prepare('SELECT id, category FROM tours WHERE operator_id = ?').all(operator.id).map((r) => [r.id, r.category]));
  // A tour someone has already booked keeps its date.
  const booked = new Set(db.prepare("SELECT DISTINCT tour_id FROM bookings WHERE status != 'cancelled'").all().map((r) => r.tour_id));
  const queues = new Map();
  const unbooked = tours.filter((x) => !booked.has(x.id));
  for (const t of unbooked) {
    const c = categoryOf.get(t.id) ?? '';
    if (!queues.has(c)) queues.set(c, []);
    queues.get(c).push(t);
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

  // 4. Last-minute deals on the five soonest tours. Dates may have just
  // moved, so this operator's active deals are replaced rather than kept on
  // tours that are no longer the soonest. A deal ends at the start of the tour
  // day (Baku time, UTC+4).
  db.prepare(
    `DELETE FROM last_minute_deals WHERE datetime(expires_at) > datetime('now')
     AND tour_id IN (SELECT id FROM tours WHERE operator_id = ?)`
  ).run(operator.id);
  const soonest = db.prepare('SELECT id, date FROM tours WHERE operator_id = ? ORDER BY date, id').all(operator.id);
  let deals = 0;
  for (const t of soonest.slice(0, DEAL_COUNT)) {
    const expiresAt = new Date(`${t.date}T00:00:00+04:00`).toISOString();
    db.prepare('INSERT INTO last_minute_deals (tour_id, discount_percent, expires_at) VALUES (?, ?, ?)')
      .run(t.id, DEAL_PERCENTS[deals % DEAL_PERCENTS.length], expiresAt);
    deals += 1;
  }

  return { added, routed, dated: rotation.length, firstDate: dates[0], lastDate: dates[dates.length - 1], deals };
})();

console.log(`Added ${summary.added} tour(s), filled ${summary.routed} route(s), and added ${summary.deals} last-minute deal(s).`);
console.log(`${summary.dated} tours now run from ${summary.firstDate} to ${summary.lastDate}.`);
