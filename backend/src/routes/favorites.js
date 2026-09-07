// Traveler-saved tours ("Sevimlilər" in the account menu, and the heart
// icon on tour cards / the tour detail page). Identity is always derived
// from the verified JWT, never trusted from the request body - same
// pattern as every other route in this app.

import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/favorites - every tour the logged-in traveler has favorited,
// newest first. Returns full tour rows (not just ids) so the account
// menu's "Sevimlilər" list has everything it needs to render without a
// second round-trip per tour.
router.get('/', requireAuth, (req, res) => {
  const favorites = db
    .prepare(
      `SELECT t.*, f.id as favorite_id, f.created_at as favorited_at
       FROM favorites f
       JOIN tours t ON t.id = f.tour_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
    .all(req.user.userId);
  res.json(favorites);
});

// POST /api/favorites { tour_id } - idempotent: favoriting an
// already-favorited tour just returns the existing row instead of erroring.
router.post('/', requireAuth, (req, res) => {
  const { tour_id } = req.body;
  if (!tour_id) return res.status(400).json({ error: 'tour_id is required' });

  const tour = db.prepare('SELECT id FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });

  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND tour_id = ?').get(req.user.userId, tour_id);
  if (existing) return res.status(200).json({ id: existing.id, tour_id, already_favorited: true });

  const result = db
    .prepare('INSERT INTO favorites (user_id, tour_id) VALUES (?, ?)')
    .run(req.user.userId, tour_id);
  res.status(201).json({ id: result.lastInsertRowid, tour_id });
});

// DELETE /api/favorites/:tourId - un-favorite. Succeeds even if it wasn't
// favorited in the first place, since the end state either way is "not
// favorited" - matches the toggle behavior the heart icon needs.
router.delete('/:tourId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND tour_id = ?').run(req.user.userId, req.params.tourId);
  res.json({ removed: true, tour_id: Number(req.params.tourId) });
});

export default router;
