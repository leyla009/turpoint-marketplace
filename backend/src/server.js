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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiSpec = JSON.parse(readFileSync(path.join(__dirname, 'openapi.json'), 'utf-8'));

const app = express();

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
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
app.use('/api/planner', plannerRouter);

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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`TurPoint API listening on http://localhost:${port}`);
});