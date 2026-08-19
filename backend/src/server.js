// Task 2: server skeleton. Task 6+ mount additional routers below as
// each one is built — don't mount a router before its task is done.

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import operatorsRouter from './routes/operators.js';
import toursRouter from './routes/tours.js';
import groupFormationsRouter from './routes/groupFormations.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/operators', operatorsRouter);
app.use('/api/tours', toursRouter);
app.use('/api/group-formations', groupFormationsRouter);

// Task 12+: mount bookings, reviews, deals, planner routers here as built.

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`TurPoint API listening on http://localhost:${port}`);
});
