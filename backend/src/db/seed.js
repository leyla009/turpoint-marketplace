// Task 3: seed 20+ demo tours so the Smart Planner (Task 16) always has
// enough data to produce a meaningful result — this is the fix for the
// "not enough tour data" risk flagged in the project brief.
//
// The tours are real listings (22, from Seed_tours.pdf) with their title,
// summary and full details written in az / en / ru - see seedTourData.js.
// Each tour gets a cover image (photo_url -> /seed/tour-NN.jpg, a static file
// shipped with the frontend).
//
// Safe to run on a deployed database: if tours already exist it does nothing,
// so a second `npm run seed` can't create duplicates. Use `npm run seed -- --force`
// to add another batch on purpose.

import { db } from './index.js';
import { SEED_TOURS, buildTourRow, seedDates } from './seedTourData.js';

const existing = db.prepare('SELECT COUNT(*) AS c FROM tours').get().c;
if (existing > 0 && !process.argv.includes('--force')) {
  console.log(`Database already has ${existing} tour(s) - skipping seed. Use --force to add the demo batch anyway.`);
  process.exit(0);
}

const operators = [
  { name: 'Qafqaz Tours', description: 'Dağ və təbiət turları', languages: 'az,en,ru', vehicle_features: 'wifi,ac' },
  { name: 'Baku City Guides', description: 'Şəhər tarixi ekskursiyaları', languages: 'az,en', vehicle_features: 'wifi' },
  { name: 'Caspian Adventures', description: 'Fəal istirahət və macəra', languages: 'az,en,tr', vehicle_features: 'wifi,ac,charging' },
];

const insertOperator = db.prepare(
  `INSERT INTO operators (name, description, languages, vehicle_features)
   VALUES (@name, @description, @languages, @vehicle_features)`
);

const insertTour = db.prepare(
  `INSERT INTO tours
    (operator_id, title, description, title_i18n, description_i18n, details_i18n, facts,
     location, category, route, price, date, duration_days, min_participants, max_participants,
     interest_score, features, vehicle_features, photo_url)
   VALUES
    (@operator_id, @title, @description, @title_i18n, @description_i18n, @details_i18n, @facts,
     @location, @category, @route, @price, @date, @duration_days, @min_participants, @max_participants,
     @interest_score, @features, @vehicle_features, @photo_url)`
);

// Tour dates are spread over the current month (Baku time), starting tomorrow -
// see seedDates() in seedTourData.js.
const dates = seedDates(SEED_TOURS.length);

const seed = db.transaction(() => {
  const operatorIds = operators.map((op) => insertOperator.run(op).lastInsertRowid);
  const operatorIdByName = new Map(operators.map((op, i) => [op.name, operatorIds[i]]));

  SEED_TOURS.forEach((tour, i) => {
    // The operator named in the content, so e.g. all Sheki tours share one.
    const operatorId = operatorIdByName.get(tour.operator) ?? operatorIds[i % operatorIds.length];
    insertTour.run(buildTourRow(tour, { operatorId, date: dates[i] }));
  });
});

seed();
console.log(`Seeded ${operators.length} operators and ${SEED_TOURS.length} tours (az/en/ru) with cover images.`);
