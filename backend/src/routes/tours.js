// Task 7: Tour create/list.
// Task 8: search & filters via query params.
// Task 14: /compare endpoint.
// Operator/traveler dual-mode account model: creating a tour now requires
// being logged in with an operator profile. operator_id is derived from
// that profile server-side - never trusted from the request body.
 
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
 
const router = Router();
 
router.post('/', requireAuth, (req, res) => {
  const {
    title, description, location, category, route,
    price, date, duration_days, min_participants, max_participants, interest_score,
  } = req.body;
 
  if (!title || !price || !date) {
    return res.status(400).json({ error: 'title, price, date are required' });
  }
 
  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) {
    return res.status(403).json({ error: 'you need an operator profile before creating tours' });
  }
 
  const result = db
    .prepare(
      `INSERT INTO tours
        (operator_id, title, description, location, category, route, price, date,
         duration_days, min_participants, max_participants, interest_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      operator.id, title, description ?? null, location ?? null, category ?? null,
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
 
  // Task 15: attach discounted_price if an active last-minute deal exists.
  const activeDeal = db
    .prepare(
      `SELECT * FROM last_minute_deals
       WHERE tour_id = ? AND datetime(expires_at) > datetime('now')
       ORDER BY discount_percent DESC LIMIT 1`
    )
    .get(req.params.id);
 
  if (activeDeal) {
    const discountedPrice = Math.round(tour.price * (1 - activeDeal.discount_percent / 100) * 100) / 100;
    return res.json({ ...tour, discounted_price: discountedPrice, active_deal: activeDeal });
  }
 
  res.json(tour);
});
 
// Delete a tour - auth required, and only the owning operator can do it.
// Ownership is derived from the token, same pattern as PUT /operators/:id.
router.delete('/:id', requireAuth, (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  const ownsIt = db
    .prepare('SELECT id FROM operators WHERE id = ? AND user_id = ?')
    .get(tour.operator_id, req.user.userId);
  if (!ownsIt) {
    return res.status(403).json({ error: 'you can only delete your own tours' });
  }
 
  // Safety gate: don't silently wipe out a tour someone has actually
  // booked. Require an explicit ?force=true to go through anyway.
  const bookingCount = db
    .prepare('SELECT COUNT(*) as count FROM bookings WHERE tour_id = ?')
    .get(tour.id).count;
  if (bookingCount > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `this tour has ${bookingCount} booking(s) - pass ?force=true to delete anyway`,
      booking_count: bookingCount,
    });
  }
 
  // Clean up everything that references this tour so nothing is left
  // pointing at a tour_id that no longer exists.
  const deleteTour = db.transaction(() => {
    db.prepare('DELETE FROM bookings WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM group_formations WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM reviews WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM last_minute_deals WHERE tour_id = ?').run(tour.id);
    db.prepare('DELETE FROM tours WHERE id = ?').run(tour.id);
  });
  deleteTour();
 
  res.json({ deleted: true, id: tour.id });
});
 
export default router;
 
