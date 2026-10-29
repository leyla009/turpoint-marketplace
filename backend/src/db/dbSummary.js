// Read-only overview of the database, for checking a deployed instance from
// its shell before running any seed script. Changes nothing.
//
//   npm run db:summary

import { db } from './index.js';

const count = (sql, ...params) => db.prepare(sql).get(...params).n;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });

console.log(`Database: ${process.env.DB_PATH || './turpoint.db'}`);
console.log(`Accounts: ${count('SELECT COUNT(*) AS n FROM users')}`);
for (const u of db.prepare('SELECT email, account_type FROM users ORDER BY id').all()) {
  console.log(`  - ${u.email} (${u.account_type})`);
}
console.log(`Operator profiles: ${count('SELECT COUNT(*) AS n FROM operators')}`);
for (const o of db.prepare(
  `SELECT o.name, u.email, (SELECT COUNT(*) FROM tours t WHERE t.operator_id = o.id) AS tours
   FROM operators o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.id`
).all()) {
  console.log(`  - ${o.name}: ${o.tours} tour(s), login ${o.email ?? 'none'}`);
}
console.log(`Tours: ${count('SELECT COUNT(*) AS n FROM tours')} (upcoming: ${count('SELECT COUNT(*) AS n FROM tours WHERE date > ?', today)})`);
for (const c of db.prepare('SELECT category, COUNT(*) AS n FROM tours GROUP BY category ORDER BY category').all()) {
  console.log(`  - ${c.category ?? 'none'}: ${c.n}`);
}
console.log(`Multi-day tours: ${count('SELECT COUNT(*) AS n FROM tours WHERE duration_days > 1')}`);
console.log(`Active last-minute deals: ${count("SELECT COUNT(*) AS n FROM last_minute_deals WHERE datetime(expires_at) > datetime('now')")}`);
console.log(`Bookings: ${count('SELECT COUNT(*) AS n FROM bookings')}`);
