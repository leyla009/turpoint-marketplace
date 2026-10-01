// Task 2: server skeleton. Task 6+ mount additional routers below as
// each one is built — don't mount a router before its task is done.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import authRouter from './routes/auth.js';
import operatorsRouter from './routes/operators.js';
import toursRouter from './routes/tours.js';
import groupFormationsRouter from './routes/groupFormations.js';
import bookingsRouter from './routes/bookings.js';
import reviewsRouter from './routes/reviews.js';
import dealsRouter from './routes/deals.js';
import plannerRouter from './routes/planner.js';
import favoritesRouter from './routes/favorites.js';
import { UPLOADS_ROOT } from './lib/uploads.js';
import { expirePastDueGroups } from './lib/expireGroups.js';
import { pruneOldNotifications } from './lib/notify.js';
import notificationsRouter from './routes/notifications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiSpec = JSON.parse(readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));

const app = express();

// Behind Railway's proxy every request otherwise appears to come from the
// proxy's own IP - which makes the rate limiters below share ONE bucket for
// all users, and breaks per-visitor view counting. Trust exactly one hop.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Sets a standard set of protective response headers (no CSP here - this
// is a pure JSON API, the frontend is a separate origin/deployment).
app.use(helmet({ contentSecurityPolicy: false }));

// CORS_ORIGIN is a comma-separated allowlist (e.g. the deployed frontend's
// URL). Unset in dev so localhost works without any config; set it in
// production so the API doesn't accept requests from arbitrary origins.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;
app.use(cors({ origin: corsOrigins }));

app.use(express.json());

// Serves uploaded operator profile photos (see POST /api/operators/me/photo).
// helmet's default Cross-Origin-Resource-Policy is "same-origin", which
// would silently block the frontend (a different origin) from loading
// these images in an <img> tag - override it just for this public,
// non-sensitive path.
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(UPLOADS_ROOT, { index: false, dotfiles: 'deny' })
);

// Broad, cheap-to-run limiter for every route - a basic ceiling against
// accidental hammering or naive scripted abuse. Auth gets a much tighter
// limit below since credential-guessing is the higher-value target.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Always on (previously production-only, which meant the limiter was never
// exercised until it was live). Dev gets a much higher ceiling so repeated
// local test logins/signups don't lock you out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many attempts - try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use('/api/auth', authRouter);
app.use('/api/operators', operatorsRouter);
app.use('/api/tours', toursRouter);
app.use('/api/group-formations', groupFormationsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/deals', dealsRouter);
// Every planner message triggers two paid/limited Groq calls, and the
// endpoint is open to anonymous visitors, so it gets its own much tighter
// ceiling than the global limiter (per IP; needs `trust proxy`, set above).
const plannerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many planner requests - try again in a few minutes' },
});
app.use('/api/planner/chat', plannerLimiter);
app.use('/api/planner', plannerRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/notifications', notificationsRouter);

// Mərhələ 4: frontend-only work from here - no more backend routers to mount.

// Catch-all for unmatched routes - keeps responses JSON instead of falling
// through to Express's default HTML 404 page.
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Global error handler - must be defined last, with all 4 params, for
// Express to recognize it as an error middleware. Keeps an uncaught
// exception in any route from leaking Express's default HTML stack trace
// to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

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
});