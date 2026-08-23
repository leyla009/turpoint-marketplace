
// Task 6: Operator profile create/read/update.
// Operator/traveler dual-mode account model: an operator profile is now
// owned by the user account that created it (user_id). Creating or
// editing a profile requires a valid session; ownership is always
// derived from the verified token, never trusted from the request body.
 
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
 
const router = Router();
 
router.post('/', requireAuth, (req, res) => {
  const { name, description, languages, photo_url, vehicle_features } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
 
  const existing = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (existing) {
    return res.status(409).json({ error: 'you already have an operator profile — use PUT to update it' });
  }
 
  const result = db
    .prepare(
      `INSERT INTO operators (name, description, languages, photo_url, vehicle_features, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, description ?? null, languages ?? null, photo_url ?? null, vehicle_features ?? null, req.user.userId);
 
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(operator);
});
 
// "Do I have an operator profile?" — this is what drives the
// Traveler/Operator toggle on the frontend. Returns null (not a 404)
// when the answer is no, since that's a normal state, not an error.
// Must be declared before GET /:id, or Express would match "me" as :id.
router.get('/me', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE user_id = ?').get(req.user.userId);
  res.json(operator ?? null);
});
 
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM operators ORDER BY rating DESC').all());
});
 
router.get('/:id', (req, res) => {
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!operator) return res.status(404).json({ error: 'operator not found' });
  res.json(operator);
});
 
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'operator not found' });
  if (existing.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only edit your own operator profile' });
  }
 
  const updated = { ...existing, ...req.body };
  db.prepare(
    `UPDATE operators SET name=?, description=?, languages=?, photo_url=?, vehicle_features=? WHERE id=?`
  ).run(updated.name, updated.description, updated.languages, updated.photo_url, updated.vehicle_features, req.params.id);
 
  res.json(db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id));
});
 
export default router;