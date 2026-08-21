import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import operatorsRouter from './routes/operators.js';
import toursRouter from './routes/tours.js';
import groupFormationsRouter from './routes/groupFormations.js';
import bookingsRouter from './routes/bookings.js';
import reviewsRouter from './routes/reviews.js';
import dealsRouter from './routes/deals.js';
import plannerRouter from './routes/planner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.join(__dirname, 'openapi.json');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (existsSync(openapiPath)) {
  const openapiSpec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
}

app.use('/api/operators', operatorsRouter);
app.use('/api/tours', toursRouter);
app.use('/api/group-formations', groupFormationsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/planner', plannerRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`TurPoint API listening on http://localhost:${port}`);
});