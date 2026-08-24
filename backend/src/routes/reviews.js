
// Task 13: Reviews + operator rating rollup.
// Fixed: this route never got the auth overhaul the rest of the app got.
// It used to accept a client-supplied user_id, or create a brand-new
// "guest" account from any {name, email} pair with no password - meaning
// anyone could post a review as any existing user_id, or attach to any
// existing email with no verification. Now identity comes only from the
// verified JWT, same pattern as bookings.js/tours.js/operators.js.
 
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
 
const router = Router();
 
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
 
router.post('/', requireAuth, (req, res) => {
  const { tour_id, rating, comment } = req.body;
 
  if (!tour_id || !rating) {
    return res.status(400).json({ error: 'tour_id and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }
 
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  // One review per user per tour - prevents a single account from
  // stacking ratings on the same tour to skew the operator average.
  const existing = db
    .prepare('SELECT id FROM reviews WHERE tour_id = ? AND user_id = ?')
    .get(tour_id, req.user.userId);
  if (existing) {
    return res.status(409).json({ error: 'you already reviewed this tour - edit is not yet supported' });
  }
 
  const result = db
    .prepare('INSERT INTO reviews (tour_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(tour_id, req.user.userId, rating, comment ?? null);
 
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