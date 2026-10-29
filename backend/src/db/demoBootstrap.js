// Boot-time rebuild for hosts without persistent storage (e.g. Render's free
// plan, where the SQLite file is wiped on every deploy, restart and sleep).
// When AUTO_SEED_DEMO=true and the database has no tours, it recreates the
// showcase tours (dated from tomorrow, with deals) and the logins whose
// passwords are set in the environment:
//   DEMO_OPERATOR_PASSWORD  -> operator.demo@turpoint.test (owns the tours)
//   DEMO_TRAVELER_PASSWORD  -> traveler.demo@turpoint.test
//   ADMIN_PASSWORD          -> the first email in ADMIN_EMAILS
// A database that already has tours is never touched. Passwords are never
// logged.

import { db } from './index.js';
import {
  OPERATOR_EMAIL, SHOWCASE_TOURS, TRAVELER_EMAIL,
  createShowcaseOperator, findShowcaseOperator, setShowcaseOperatorLogin, syncShowcaseTours, upsertAccount,
} from './showcase.js';

export function bootstrapDemo(env = process.env) {
  if (env.AUTO_SEED_DEMO !== 'true') return null;
  if (db.prepare('SELECT COUNT(*) AS n FROM tours').get().n > 0) {
    console.log('[demo] Database already has tours; automatic demo setup skipped.');
    return null;
  }

  const summary = db.transaction(() => {
    const operatorId = findShowcaseOperator(db)?.id ?? createShowcaseOperator(db);
    return syncShowcaseTours(db, operatorId, { addTours: SHOWCASE_TOURS });
  })();

  // Each login on its own, so one bad password can't undo the tours or the
  // other logins.
  const adminEmail = (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).find(Boolean);
  const steps = [
    [env.DEMO_OPERATOR_PASSWORD, `${OPERATOR_EMAIL} (operator)`, () => setShowcaseOperatorLogin(db, env.DEMO_OPERATOR_PASSWORD)],
    [env.DEMO_TRAVELER_PASSWORD, `${TRAVELER_EMAIL} (traveler)`, () => upsertAccount(db, {
      name: 'Demo Traveler', email: TRAVELER_EMAIL, password: env.DEMO_TRAVELER_PASSWORD, accountType: 'traveler',
    })],
    [adminEmail && env.ADMIN_PASSWORD, `${adminEmail} (admin)`, () => upsertAccount(db, {
      name: 'TurPoint Admin', email: adminEmail, password: env.ADMIN_PASSWORD, accountType: 'traveler',
    })],
  ];
  const logins = [];
  for (const [enabled, label, create] of steps) {
    if (!enabled) continue;
    try {
      create();
      logins.push(label);
    } catch (err) {
      console.error(`[demo] Could not set up ${label}: ${err.message}`);
    }
  }

  console.log(`[demo] Created ${summary.added} showcase tours (${summary.firstDate} to ${summary.lastDate}) and ${summary.deals} last-minute deals.`);
  console.log(`[demo] Logins: ${logins.length ? logins.join(', ') : 'none (set DEMO_OPERATOR_PASSWORD / DEMO_TRAVELER_PASSWORD / ADMIN_PASSWORD)'}.`);
  return { ...summary, logins };
}
