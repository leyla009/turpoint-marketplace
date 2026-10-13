// Populate an empty LOCAL database with one demo traveler, one demo operator,
// and 30 richly described, translated sample tour listings. Passwords are
// generated at run time, stored only as bcrypt hashes, and printed once for
// the developer. This script refuses to run if users/operators/tours exist.

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { SEED_TOURS, buildTourRow, seedDates, LOCALES } from './seedTourData.js';
import { ADDITIONAL_SHOWCASE_TOURS } from './seedToursShowcase.js';

const tours = [...SEED_TOURS, ...ADDITIONAL_SHOWCASE_TOURS];
if (tours.length !== 30 || new Set(tours.map((tour) => tour.key)).size !== 30) {
  throw new Error(`Expected 30 unique showcase tours; found ${tours.length}.`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
for (const tour of tours) {
  for (const locale of LOCALES) {
    const content = tour.i18n?.[locale];
    if (!content?.title || !content?.summary || !content?.description?.length || !content?.highlights?.length || !content?.includes?.length) {
      throw new Error(`${tour.key} has incomplete ${locale} content.`);
    }
  }
  const imagePath = path.resolve(here, '../../../frontend/public', `.${tour.photo}`);
  if (!fs.existsSync(imagePath)) throw new Error(`${tour.key} photo is missing: ${tour.photo}`);
}

const counts = Object.fromEntries(['users', 'operators', 'tours'].map((table) => [
  table,
  db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
]));
if (Object.values(counts).some((count) => count > 0)) {
  throw new Error(`Showcase seed needs empty users/operators/tours tables; found ${JSON.stringify(counts)}. No data was changed.`);
}

const credentials = {
  traveler: {
    username: 'traveler_demo',
    email: 'traveler.demo@turpoint.test',
    password: randomBytes(24).toString('base64url'),
  },
  operator: {
    username: 'operator_demo',
    email: 'operator.demo@turpoint.test',
    password: randomBytes(24).toString('base64url'),
  },
};
const hashes = {
  traveler: bcrypt.hashSync(credentials.traveler.password, 10),
  operator: bcrypt.hashSync(credentials.operator.password, 10),
};
const dates = seedDates(tours.length);

const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, account_type, preferred_language)
  VALUES (?, ?, ?, ?, 'en')
`);
const insertOperator = db.prepare(`
  INSERT INTO operators (user_id, name, description, languages, photo_url)
  VALUES (?, ?, ?, 'az,en,ru', NULL)
`);
const columns = [
  'title', 'description', 'title_i18n', 'description_i18n', 'details_i18n', 'facts',
  'location', 'category', 'route', 'price', 'date', 'duration_days', 'min_participants',
  'max_participants', 'interest_score', 'features', 'vehicle_features', 'photo_url',
];
const insertTour = db.prepare(`
  INSERT INTO tours (operator_id, ${columns.join(', ')})
  VALUES (@operator_id, ${columns.map((column) => `@${column}`).join(', ')})
`);

db.transaction(() => {
  insertUser.run(
    credentials.traveler.username,
    credentials.traveler.email,
    hashes.traveler,
    'traveler',
  ).lastInsertRowid;
  const operatorUserId = insertUser.run(
    credentials.operator.username,
    credentials.operator.email,
    hashes.operator,
    'operator',
  ).lastInsertRowid;
  const operatorId = insertOperator.run(
    operatorUserId,
    'Azerbaijan Discovery (Demo)',
    'A local showcase profile with sample itineraries inspired by Azerbaijan’s destinations. Listings, prices, dates, and availability are for demonstration.',
  ).lastInsertRowid;

  tours.forEach((tour, index) => {
    const row = buildTourRow(tour, { operatorId, date: dates[index] });
    insertTour.run(Object.fromEntries([
      ['operator_id', operatorId],
      ...columns.map((column) => [column, row[column]]),
    ]));
  });
})();

console.log(`Created 30 sample tours, 1 Tour Operator profile, and 2 accounts. Existing weather and other data were left untouched.`);
console.log(`Traveler username: ${credentials.traveler.username}`);
console.log(`Traveler email: ${credentials.traveler.email}`);
console.log(`Traveler password: ${credentials.traveler.password}`);
console.log(`Tour Operator username: ${credentials.operator.username}`);
console.log(`Tour Operator email: ${credentials.operator.email}`);
console.log(`Tour Operator password: ${credentials.operator.password}`);
console.log(`Login uses email and password; the usernames are the accounts' display names.`);
