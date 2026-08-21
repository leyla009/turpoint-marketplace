// Task 13: Reviews + operator rating rollup.
// Same guest-checkout style user resolution as bookings.js - no auth system yet.
 
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
 
const router = Router();
 
function resolveUser({ user_id, user }) {
  if (user_id) {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!existing) throw new Error('user_id not found');
    return existing;
  }
  if (user && user.email) {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
    if (existing) return existing;
    const placeholderHash = crypto.randomBytes(8).toString('hex');
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(user.name || 'Guest', user.email, placeholderHash);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  throw new Error('user_id or user {name, email} is required');
}
 
// Averages every rating across every tour that belongs to this operator,
// then writes it straight to operators.rating - this is the "rollup."
function recalculateOperatorRating(operatorId) {
  const row = db
    .prepare(
      `SELECT AVG(r.rating) as avgRating
       FROM reviews r
       JOIN tours t ON t.id = r.tour_id
       WHERE t.operator_id = ?`
    )
    .get(operatorId);
 
  const newRating = row.avgRating ? Math.round(row.avgRating * 10) / 10 : 0;
  db.prepare('UPDATE operators SET rating = ? WHERE id = ?').run(newRating, operatorId);
  return newRating;
}
 
router.post('/', (req, res) => {
  const { tour_id, rating, comment, user_id, user } = req.body;
 
  if (!tour_id || !rating) {
    return res.status(400).json({ error: 'tour_id and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }
 
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  let resolvedUser;
  try {
    resolvedUser = resolveUser({ user_id, user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
 
  const result = db
    .prepare('INSERT INTO reviews (tour_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(tour_id, resolvedUser.id, rating, comment ?? null);
 
  const newOperatorRating = recalculateOperatorRating(tour.operator_id);
 
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...review, operator_new_rating: newOperatorRating });
});
 
// GET /api/reviews?tour_id=5
router.get('/', (req, res) => {
  const { tour_id } = req.query;
  if (!tour_id) {
    return res.status(400).json({ error: 'tour_id query param is required' });
  }
  const reviews = db
    .prepare('SELECT * FROM reviews WHERE tour_id = ? ORDER BY created_at DESC')
    .all(tour_id);
  res.json(reviews);
});
 
export default router;
 
