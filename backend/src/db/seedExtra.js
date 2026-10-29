// Brings an existing showcase database up to date, without touching accounts
// or bookings:
//   1. adds the seedToursExtra.js tours that are not there yet (matched by title),
//   2. fills in full stop-by-stop routes for showcase tours that lack one,
//   3. moves every unbooked showcase tour onto dates from tomorrow onwards,
//      rotating categories so each one is spread across the month,
//   4. puts last-minute deals on the five soonest tours.
// Safe to run again; see syncShowcaseTours in showcase.js.
//
//   npm run seed:extra

import { db } from './index.js';
import { EXTRA_TOURS, OPERATOR_NAME, findShowcaseOperator, syncShowcaseTours, validateShowcaseTours } from './showcase.js';

validateShowcaseTours(EXTRA_TOURS);

const operator = findShowcaseOperator(db);
if (!operator) {
  console.error(`No "${OPERATOR_NAME}" operator profile found. Run "npm run seed:showcase" on an empty database instead.`);
  process.exit(1);
}

const summary = syncShowcaseTours(db, operator.id, { addTours: EXTRA_TOURS });
console.log(`Added ${summary.added} tour(s), filled ${summary.routed} route(s), and added ${summary.deals} last-minute deal(s).`);
console.log(`${summary.dated} tours now run from ${summary.firstDate} to ${summary.lastDate}.`);
