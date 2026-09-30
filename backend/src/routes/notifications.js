// In-app notifications API. Every route is per-user: identity always comes
// from the verified JWT, and a notification id only works for its owner
// (someone else's id answers 404, not 403, so ids can't be probed).

import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function present(row) {
  let params = {};
  try {
    params = row.params ? JSON.parse(row.params) : {};
  } catch {
    params = {};
  }
  return { id: row.id, type: row.type, params, link: row.link, is_read: !!row.is_read, created_at: row.created_at };
}

const unreadCount = (userId) =>
  db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).c;

// GET /api/notifications?limit=30&before=<id>&unread=true
// Newest first. `before` pages backwards (pass the smallest id you have).
router.get('/', requireAuth, (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const before = parseInt(req.query.before, 10);
  const conditions = ['user_id = ?'];
  const args = [req.user.userId];
  if (Number.isInteger(before)) {
    conditions.push('id < ?');
    args.push(before);
  }
  if (req.query.unread === 'true') conditions.push('is_read = 0');

  const rows = db
    .prepare(`SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ?`)
    .all(...args, limit + 1);

  const hasMore = rows.length > limit;
  res.json({
    notifications: rows.slice(0, limit).map(present),
    has_more: hasMore,
    unread_count: unreadCount(req.user.userId),
  });
});

// Cheap endpoint the nav bell polls.
router.get('/unread-count', requireAuth, (req, res) => {
  res.json({ count: unreadCount(req.user.userId) });
});

// Must be declared before '/:id/read' so "read-all" is never parsed as an id.
router.post('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.userId);
  res.json({ count: 0 });
});

router.post('/:id/read', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid notification id' });

  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(id, req.user.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'notification not found' });

  res.json({ count: unreadCount(req.user.userId) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid notification id' });

  const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, req.user.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'notification not found' });

  res.json({ count: unreadCount(req.user.userId) });
});

export default router;
