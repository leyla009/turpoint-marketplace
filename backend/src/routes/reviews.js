// Task 13: Reviews + operator rating rollup.
// Identity derived strictly from verified JWT (removed guest account / client-supplied user_id fallback).
//
// Sprint 4:
// - Verified buyers only: Requires a 'confirmed' booking on the target tour.
// - Edit/Delete support: Added ownership-gated PUT/DELETE /api/reviews/:id with rating rollup recalculation.
// - Rate limiting: Added rolling-window rate limit on new review creation to prevent burst reviews.
 
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
 
const REVIEW_RATE_LIMIT_COUNT = 5;
const REVIEW_RATE_LIMIT_WINDOW_MINUTES = 60;
 
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
 
  // Verified-buyer gate: you can only review a tour you actually have a
  // confirmed (settled) booking on. A 'pending' booking - still waiting on
  // its group to hit minimum - doesn't count, and neither does a
  // 'cancelled' one.
  const verifiedBooking = db
    .prepare("SELECT id FROM bookings WHERE tour_id = ? AND user_id = ? AND status = 'confirmed'")
    .get(tour_id, req.user.userId);
  if (!verifiedBooking) {
    return res.status(403).json({ error: 'you can only review tours you have a confirmed booking for' });
  }
 
  // One review per user per tour - prevents a single account from
  // stacking ratings on the same tour to skew the operator average.
  const existing = db
    .prepare('SELECT id FROM reviews WHERE tour_id = ? AND user_id = ?')
    .get(tour_id, req.user.userId);
  if (existing) {
    return res.status(409).json({ error: 'you already reviewed this tour - use PUT /api/reviews/:id to edit it' });
  }
 
  // Rate limit: caps how many NEW reviews one account can create across
  // ALL tours in a rolling window. This is a separate concern from the
  // one-review-per-tour rule above - that rule stops spamming the SAME
  // tour, this stops a burst of (individually legitimate, verified-buyer)
  // reviews across MANY different tours in a short window.
  const recentReviewCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM reviews
       WHERE user_id = ? AND created_at > datetime('now', ?)`
    )
    .get(req.user.userId, `-${REVIEW_RATE_LIMIT_WINDOW_MINUTES} minutes`).count;
  if (recentReviewCount >= REVIEW_RATE_LIMIT_COUNT) {
    return res.status(429).json({
      error: `too many reviews posted recently - limit is ${REVIEW_RATE_LIMIT_COUNT} per ${REVIEW_RATE_LIMIT_WINDOW_MINUTES} minutes, try again later`,
    });
  }
 
  const result = db
    .prepare('INSERT INTO reviews (tour_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(tour_id, req.user.userId, rating, comment ?? null);
 
  const newOperatorRating = recalculateOperatorRating(tour.operator_id);
 
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...review, operator_new_rating: newOperatorRating });
});
 
// PUT /api/reviews/:id - edit your own review (rating and/or comment).
// Ownership-gated: identity comes from the verified JWT, never the body -
// same pattern as everywhere else in this file. Re-runs the operator
// rating rollup afterward since the average may have shifted.
router.put('/:id', requireAuth, (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'review not found' });
  if (review.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only edit your own review' });
  }
 
  const { rating, comment } = req.body;
  if (rating === undefined && comment === undefined) {
    return res.status(400).json({ error: 'nothing to update - provide rating and/or comment' });
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }
 
  const newRating = rating !== undefined ? rating : review.rating;
  const newComment = comment !== undefined ? comment : review.comment;
 
  db.prepare('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?').run(newRating, newComment, review.id);
 
  const tour = db.prepare('SELECT operator_id FROM tours WHERE id = ?').get(review.tour_id);
  const newOperatorRating = recalculateOperatorRating(tour.operator_id);
 
  const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review.id);
  res.json({ ...updated, operator_new_rating: newOperatorRating });
});
 
// DELETE /api/reviews/:id - remove your own review. Same ownership gate,
// same rollup afterward (an operator's average changes when a review
// disappears, not just when one is added or edited).
router.delete('/:id', requireAuth, (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'review not found' });
  if (review.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only delete your own review' });
  }
 
  const tour = db.prepare('SELECT operator_id FROM tours WHERE id = ?').get(review.tour_id);
 
  db.prepare('DELETE FROM reviews WHERE id = ?').run(review.id);
 
  const newOperatorRating = recalculateOperatorRating(tour.operator_id);
  res.json({ deleted: true, id: review.id, operator_new_rating: newOperatorRating });
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