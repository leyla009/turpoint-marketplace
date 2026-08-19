// Task 3: seed 20+ demo tours so the Smart Planner (Task 16) always has
// enough data to produce a meaningful result — this is the fix for the
// "not enough tour data" risk flagged in the project brief.

import { db } from './index.js';

const operators = [
  { name: 'Qafqaz Tours', description: 'Dağ və təbiət turları', languages: 'az,en,ru', vehicle_features: 'wifi,ac' },
  { name: 'Baku City Guides', description: 'Şəhər tarixi ekskursiyaları', languages: 'az,en', vehicle_features: 'wifi' },
  { name: 'Caspian Adventures', description: 'Fəal istirahət və macəra', languages: 'az,en,tr', vehicle_features: 'wifi,ac,charging' },
];

const categories = ['nature', 'history', 'entertainment', 'food'];
const locations = ['Quba', 'Şəki', 'Qəbələ', 'Bakı', 'Gəbələ', 'Lənkəran'];

const insertOperator = db.prepare(
  `INSERT INTO operators (name, description, languages, vehicle_features)
   VALUES (@name, @description, @languages, @vehicle_features)`
);

const insertTour = db.prepare(
  `INSERT INTO tours
    (operator_id, title, description, location, category, route, price, date,
     duration_days, min_participants, max_participants, interest_score)
   VALUES
    (@operator_id, @title, @description, @location, @category, @route, @price, @date,
     @duration_days, @min_participants, @max_participants, @interest_score)`
);

const seed = db.transaction(() => {
  const operatorIds = operators.map((op) => insertOperator.run(op).lastInsertRowid);

  let tourNum = 1;
  for (let i = 0; i < 20; i += 1) {
    const category = categories[i % categories.length];
    const location = locations[i % locations.length];
    const operatorId = operatorIds[i % operatorIds.length];
    const price = 30 + (i % 6) * 15; // 30..105 AZN spread
    const interestScore = {
      nature: category === 'nature' ? 0.9 : 0.1,
      history: category === 'history' ? 0.9 : 0.1,
      entertainment: category === 'entertainment' ? 0.9 : 0.1,
      food: category === 'food' ? 0.9 : 0.1,
    };

    insertTour.run({
      operator_id: operatorId,
      title: `${location} ${category} turu #${tourNum}`,
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
    });
    tourNum += 1;
  }
});

seed();
console.log('Seeded 3 operators and 20 tours.');
