// Upgrades a database that ALREADY has data: replaces the old generic demo
// tours ("Bakı history turu #1" ...) with the 22 real, translated tours from
// seedTourData.js, without wiping users, operators or bookings.
//
//     npm run seed:tours               (text, photos, expired dates)
//     npm run seed:tours -- --prices   (the same, plus the seed prices for unbooked tours)
//
// What it does, in one transaction:
//   1. Real tours that are already there (matched by English title) get their
//      text/photo refreshed - prices and bookings are left alone. Their date is
//      moved to this month ONLY if it has already passed and nobody booked it.
//   2. Missing real tours are inserted (under the operator named in the
//      content, created if needed).
//   3. Old generic demo tours (title "<place> <category> turu #N") are deleted
//      ONLY if nobody booked them; ones with bookings are kept and listed.
// Safe to re-run. Tours an operator created themselves are never touched.

import { db } from './index.js';
import { SEED_TOURS, buildTourRow, seedDates } from './seedTourData.js';

const dates = seedDates(SEED_TOURS.length);
const todayBaku = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });

const findOperator = db.prepare('SELECT id FROM operators WHERE name = ?');
const insertOperator = db.prepare(
  "INSERT INTO operators (name, description, languages) VALUES (?, '', 'az,en,ru')"
);
const findTour = db.prepare('SELECT id, date FROM tours WHERE title = ?');
const bookingCount = db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE tour_id = ?');
const setDate = db.prepare('UPDATE tours SET date = ? WHERE id = ?');
const setPrice = db.prepare('UPDATE tours SET price = ? WHERE id = ?');
const updatePrices = process.argv.includes('--prices');

const COLUMNS = [
  'title', 'description', 'title_i18n', 'description_i18n', 'details_i18n', 'facts',
  'location', 'category', 'route', 'interest_score', 'features', 'vehicle_features', 'photo_url',
  'duration_days', 'min_participants', 'max_participants',
];
const update = db.prepare(`UPDATE tours SET ${COLUMNS.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`);
const insert = db.prepare(
  `INSERT INTO tours (operator_id, price, date, ${COLUMNS.join(', ')})
   VALUES (@operator_id, @price, @date, ${COLUMNS.map((c) => `@${c}`).join(', ')})`
);

let inserted = 0;
let refreshed = 0;
let redated = 0;
let repriced = 0;
let removed = 0;
const keptWithBookings = [];

db.transaction(() => {
  SEED_TOURS.forEach((tour, i) => {
    let op = findOperator.get(tour.operator);
    if (!op) op = { id: insertOperator.run(tour.operator).lastInsertRowid };

    const row = buildTourRow(tour, { operatorId: op.id, date: dates[i] });
    const existing = findTour.get(row.title);
    if (existing) {
      // Only the text/photo/shape columns - never price, date or operator.
      update.run({ ...Object.fromEntries(COLUMNS.map((c) => [c, row[c]])), id: existing.id });
      refreshed += 1;
      // `npm run seed:tours -- --prices` also applies the seed price, but only to
      // tours nobody has booked (a booked tour's price is part of that booking).
      if (updatePrices && bookingCount.get(existing.id).c === 0) {
        setPrice.run(row.price, existing.id);
        repriced += 1;
      }
      // An EXPIRED tour nobody booked gets this month's date. Past tours that
      // have bookings are history and keep their date; upcoming tours keep theirs.
      if (existing.date < todayBaku && bookingCount.get(existing.id).c === 0) {
        setDate.run(row.date, existing.id);
        redated += 1;
      }
    } else {
      insert.run(row);
      inserted += 1;
    }
  });

  const oldDemo = db.prepare("SELECT id, title FROM tours WHERE title LIKE '% turu #%'").all();
  for (const t of oldDemo) {
    const booked = db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE tour_id = ?').get(t.id).c;
    if (booked > 0) {
      keptWithBookings.push(t.title);
      continue;
    }
    db.prepare('DELETE FROM favorites WHERE tour_id = ?').run(t.id);
    db.prepare('DELETE FROM reviews WHERE tour_id = ?').run(t.id);
    db.prepare('DELETE FROM last_minute_deals WHERE tour_id = ?').run(t.id);
    db.prepare('DELETE FROM group_formations WHERE tour_id = ?').run(t.id);
    db.prepare('DELETE FROM tours WHERE id = ?').run(t.id);
    removed += 1;
  }
})();

console.log(`Real tours: ${inserted} added, ${refreshed} refreshed, ${redated} moved to this month${updatePrices ? `, ${repriced} repriced` : ''}. Old demo tours removed: ${removed}.`);
if (keptWithBookings.length) {
  console.log(`Kept ${keptWithBookings.length} old demo tour(s) because they have bookings: ${keptWithBookings.join(', ')}`);
}
