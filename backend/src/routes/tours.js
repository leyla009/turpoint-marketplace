// Task 7: Tour create/list.
// Task 8: search & filters via query params.
// Task 14: /compare endpoint.

import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.post('/', (req, res) => {
  const {
    operator_id, title, description, location, category, route,
    price, date, duration_days, min_participants, max_participants, interest_score,
  } = req.body;

  if (!operator_id || !title || !price || !date) {
    return res.status(400).json({ error: 'operator_id, title, price, date are required' });
  }

  const result = db
    .prepare(
      `INSERT INTO tours
        (operator_id, title, description, location, category, route, price, date,
         duration_days, min_participants, max_participants, interest_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      operator_id, title, description ?? null, location ?? null, category ?? null,
      route ?? null, price, date, duration_days ?? 1, min_participants ?? 1,
      max_participants ?? 10, interest_score ? JSON.stringify(interest_score) : null
    );

  res.status(201).json(db.prepare('SELECT * FROM tours WHERE id = ?').get(result.lastInsertRowid));
});

// Task 8: GET /api/tours?location=Quba&maxPrice=100&category=nature&fromDate=2026-09-01
router.get('/', (req, res) => {
  const { location, category, minPrice, maxPrice, fromDate, toDate } = req.query;

  let query = 'SELECT * FROM tours WHERE 1=1';
  const params = [];

  if (location) { query += ' AND location = ?'; params.push(location); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (minPrice) { query += ' AND price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { query += ' AND price <= ?'; params.push(Number(maxPrice)); }
  if (fromDate) { query += ' AND date >= ?'; params.push(fromDate); }
  if (toDate) { query += ' AND date <= ?'; params.push(toDate); }

  res.json(db.prepare(query).all(...params));
});

// Task 14: comparison — GET /api/tours/compare?ids=1,2,3
router.get('/compare', (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean).map(Number);
  if (ids.length < 2 || ids.length > 3) {
    return res.status(400).json({ error: 'compare requires 2 or 3 ids' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const tours = db.prepare(`SELECT * FROM tours WHERE id IN (${placeholders})`).all(...ids);
  res.json(tours);
});

router.get('/:id', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
  res.json(tour);
});

export default router;
