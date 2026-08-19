// Task 6: Operator profile create/read/update.

import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.post('/', (req, res) => {
  const { name, description, languages, photo_url, vehicle_features } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db
    .prepare(
      `INSERT INTO operators (name, description, languages, photo_url, vehicle_features)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, description ?? null, languages ?? null, photo_url ?? null, vehicle_features ?? null);

  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(operator);
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM operators ORDER BY rating DESC').all());
});

router.get('/:id', (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!operator) return res.status(404).json({ error: 'operator not found' });
  res.json(operator);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'operator not found' });

  const updated = { ...existing, ...req.body };
  db.prepare(
    `UPDATE operators SET name=?, description=?, languages=?, photo_url=?, vehicle_features=? WHERE id=?`
  ).run(updated.name, updated.description, updated.languages, updated.photo_url, updated.vehicle_features, req.params.id);

  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id));
});

export default router;
