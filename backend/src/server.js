// Task 2: server skeleton. Task 6+ mount additional routers below as
// each one is built — don't mount a router before its task is done.

import express from 'express';
import cors from 'cors';
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
app.use(cors());
app.use(express.json());

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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`TurPoint API listening on http://localhost:${port}`);
});