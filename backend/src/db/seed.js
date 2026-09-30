// Task 3: seed 20+ demo tours so the Smart Planner (Task 16) always has
// enough data to produce a meaningful result — this is the fix for the
// "not enough tour data" risk flagged in the project brief.
//
// Each tour gets a cover image (photo_url -> /seed/tour-NN.jpg, a static file
// shipped with the frontend). See seedPhotoData.js.
//
// Safe to run on a deployed database: if tours already exist it does nothing,
// so a second `npm run seed` can't create duplicates. Use `npm run seed -- --force`
// to add another batch on purpose.

import { db } from './index.js';
import { SEED_TOURS } from './seedPhotoData.js';

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

const featureSlugs = ['breakfast', 'evening_tea', 'guide', 'road_games', 'hotel_stay'];

const insertOperator = db.prepare(
  `INSERT INTO operators (name, description, languages, vehicle_features)
   VALUES (@name, @description, @languages, @vehicle_features)`
);

const insertTour = db.prepare(
  `INSERT INTO tours
    (operator_id, title, description, location, category, route, price, date,
     duration_days, min_participants, max_participants, interest_score, features, photo_url)
   VALUES
    (@operator_id, @title, @description, @location, @category, @route, @price, @date,
     @duration_days, @min_participants, @max_participants, @interest_score, @features, @photo_url)`
);

const seed = db.transaction(() => {
  const operatorIds = operators.map((op) => insertOperator.run(op).lastInsertRowid);

  SEED_TOURS.forEach(({ number, location, category, photo }, i) => {
    const operatorId = operatorIds[i % operatorIds.length];
    const price = 30 + (i % 6) * 15;
    const interestScore = {
      nature: category === 'nature' ? 0.9 : 0.1,
      history: category === 'history' ? 0.9 : 0.1,
      entertainment: category === 'entertainment' ? 0.9 : 0.1,
      food: category === 'food' ? 0.9 : 0.1,
    };
    const features = featureSlugs.filter((_, idx) => (i + idx) % 3 === 0).join(',');

    insertTour.run({
      operator_id: operatorId,
      title: `${location} ${category} turu #${number}`,
      description: `Demo tour - ${category} in ${location}`,
      location,
      category,
      route: `${location} mərkəzi -> əsas nöqtə`,
      price,
      date: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`,
      duration_days: 1 + (i % 3),
      min_participants: 3,
      max_participants: 10,
      interest_score: JSON.stringify(interestScore),
      features,
      photo_url: photo,
    });
  });
});

seed();
console.log('Seeded 3 operators and 20 tours with cover images.');
