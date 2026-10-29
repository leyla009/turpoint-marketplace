// Populate an empty LOCAL database with one demo traveler, one demo operator,
// and the translated showcase tour listings (see showcase.js), scheduled from
// tomorrow with last-minute deals. Passwords are generated at run time, stored
// only as bcrypt hashes, and printed once for the developer. This script
// refuses to run if users/operators/tours exist.

import { randomBytes } from 'node:crypto';
import { db } from './index.js';
import {
  OPERATOR_EMAIL, SHOWCASE_TOURS, TRAVELER_EMAIL,
  createShowcaseOperator, setShowcaseOperatorLogin, syncShowcaseTours, upsertAccount, validateShowcaseTours,
} from './showcase.js';

validateShowcaseTours();

const counts = Object.fromEntries(['users', 'operators', 'tours'].map((table) => [
  table,
  db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
]));
if (Object.values(counts).some((count) => count > 0)) {
  throw new Error(`Showcase seed needs empty users/operators/tours tables; found ${JSON.stringify(counts)}. No data was changed.`);
}

const passwords = {
  traveler: randomBytes(24).toString('base64url'),
  operator: randomBytes(24).toString('base64url'),
};

const summary = db.transaction(() => {
  upsertAccount(db, { name: 'traveler_demo', email: TRAVELER_EMAIL, password: passwords.traveler, accountType: 'traveler' });
  const operatorId = createShowcaseOperator(db);
  setShowcaseOperatorLogin(db, passwords.operator);
  return syncShowcaseTours(db, operatorId, { addTours: SHOWCASE_TOURS });
})();

console.log(`Created ${summary.added} sample tours (${summary.firstDate} to ${summary.lastDate}), ${summary.deals} last-minute deals, 1 Tour Operator profile, and 2 accounts.`);
console.log(`Traveler email: ${TRAVELER_EMAIL}`);
console.log(`Traveler password: ${passwords.traveler}`);
console.log(`Tour Operator email: ${OPERATOR_EMAIL}`);
console.log(`Tour Operator password: ${passwords.operator}`);
