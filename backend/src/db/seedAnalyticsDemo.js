// Fills one operator's tours with demo bookings/views/favorites/reviews so the
// dashboard's Analytics section has data to show (see lib/analyticsDemo.js).
//
//   npm run seed:analytics -- you@example.com            add demo data
//   npm run seed:analytics -- you@example.com --reset    wipe the demo data and regenerate
//
// The email is the account that owns the operator profile (the one you log
// into the dashboard with). Only rows tied to demo-traveler-N@turpoint.demo
// accounts are ever created or removed.

import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { seedAnalyticsDemo } from '../lib/analyticsDemo.js';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const email = args.find((a) => !a.startsWith('--'));

if (!email) {
  console.error('Usage: npm run seed:analytics -- <operator-account-email> [--reset]');
  process.exit(1);
}

const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (!user) {
  console.error(`No account with email "${email}". Sign up first, then run this again.`);
  process.exit(1);
}
const operator = db.prepare('SELECT id, name FROM operators WHERE user_id = ?').get(user.id);
if (!operator) {
  console.error('That account has no operator profile yet - create it on the dashboard first.');
  process.exit(1);
}
const tourCount = db.prepare('SELECT COUNT(*) AS c FROM tours WHERE operator_id = ?').get(operator.id).c;
if (tourCount === 0) {
  console.error('This operator has no tours yet - add a few tours first, then run this again.');
  process.exit(1);
}

const result = seedAnalyticsDemo(db, operator.id, {
  reset,
  passwordHash: bcrypt.hashSync(`demo-${Date.now()}`, 10), // demo accounts are not meant to be logged into
});

if (result.skipped) {
  console.log(`Nothing changed: ${result.reason}`);
} else {
  console.log(
    `Demo data added for "${operator.name}": ${result.bookings} bookings, ${result.reviews} reviews, ` +
      `${result.favorites} favorites across ${result.tours} tours` +
      (result.skippedTours ? ` (${result.skippedTours} tours skipped - they already have real bookings)` : '') +
      '.'
  );
}
