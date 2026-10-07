// Process entry point: boots the HTTP server and the background expiry job.
// The Express app itself lives in app.js so tests can import it without
// opening a port or starting timers.

import 'dotenv/config';
import app from './app.js';
import { expirePastDueGroups } from './lib/expireGroups.js';
import { pruneOldNotifications } from './lib/notify.js';
import { checkGroqKey } from './lib/groq.js';
import { stormglassConfigured } from './lib/stormglass.js';

// Expire unfilled groups whose tour date has passed, without needing an
// external cron. Runs at boot and then hourly; the manual
// POST /api/group-formations/expire-past-due endpoint still works too.
function runExpiry() {
  try {
    pruneOldNotifications();
    const result = expirePastDueGroups();
    if (result.cancelled_groups.length) {
      console.log(`Expired ${result.cancelled_groups.length} unfilled group(s), cancelled ${result.cancelled_bookings.length} pending booking(s).`);
    }
  } catch (err) {
    console.error('expiry job failed', err);
  }
}
runExpiry();
setInterval(runExpiry, 60 * 60 * 1000).unref();

// Last-resort safety net: log a stray unhandled rejection instead of letting
// it terminate the process. Route handlers should still catch their own errors
// (see middleware/asyncHandler.js); this only stops one missed case from
// becoming an outage.
process.on('unhandledRejection', (reason) => {
  console.error('unhandled rejection', reason);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`TurPoint API listening on http://localhost:${port}`);
  // Report Smart Planner (Groq) status once at boot - informational only.
  checkGroqKey().then(({ ok, message }) => (ok ? console.log(message) : console.warn(`[planner] ${message}`)));
  // No test call here - Stormglass's free quota is only 10 requests/day.
  if (stormglassConfigured()) console.log(`Weather panel ready (Stormglass, cached ${process.env.STORMGLASS_CACHE_HOURS || 6}h per city).`);
  else console.warn('[weather] STORMGLASS_API_KEY is not set - the homepage weather panel is hidden. Add it to backend/.env and restart.');
});