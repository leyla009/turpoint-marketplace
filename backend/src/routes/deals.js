// Task 15: Last-minute deals - operators discount unsold seats on upcoming tours.
 
import { Router } from 'express';
import { db } from '../db/index.js';
 
const router = Router();
 
router.post('/', (req, res) => {
  const { tour_id, discount_percent, expires_at } = req.body;
 
  if (!tour_id || !discount_percent || !expires_at) {
    return res.status(400).json({ error: 'tour_id, discount_percent, and expires_at are required' });
  }
  if (discount_percent <= 0 || discount_percent >= 100) {
    return res.status(400).json({ error: 'discount_percent must be between 1 and 99' });
  }
 
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
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
