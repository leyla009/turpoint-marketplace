// Task 15: Last-minute deals - operators discount unsold seats on upcoming tours.
// Fixed: this route had no auth at all - anyone, logged in or not, could
// create a discount on any operator's tour with an arbitrary
// discount_percent. Now mirrors the ownership pattern used in tours.js:
// requireAuth, then confirm the caller's own operator profile owns the
// tour before letting them attach a deal to it.

import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const { tour_id, discount_percent, expires_at } = req.body;

  if (!tour_id || !discount_percent || !expires_at) {
    return res.status(400).json({ error: 'tour_id, discount_percent, and expires_at are required' });
  }
  if (discount_percent <= 0 || discount_percent >= 100) {
    return res.status(400).json({ error: 'discount_percent must be between 1 and 99' });
  }

  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });

  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator || operator.id !== tour.operator_id) {
    return res.status(403).json({ error: 'you do not own this tour' });
  }

  const result = db
    .prepare('INSERT INTO last_minute_deals (tour_id, discount_percent, expires_at) VALUES (?, ?, ?)')
    .run(tour_id, discount_percent, expires_at);

  res.status(201).json(db.prepare('SELECT * FROM last_minute_deals WHERE id = ?').get(result.lastInsertRowid));
});

// GET /api/deals - only currently-active (non-expired) deals
router.get('/', (req, res) => {
  const deals = db
    .prepare(
      `SELECT d.*, t.title as tour_title, t.price as tour_price
       FROM last_minute_deals d
       JOIN tours t ON t.id = d.tour_id
       WHERE datetime(d.expires_at) > datetime('now')
       ORDER BY d.expires_at ASC`
    )
    .all();
  res.json(deals);
});

export default router;