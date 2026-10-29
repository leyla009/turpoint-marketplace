import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/overview', (req, res) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) AS count FROM users').get().count,
    operators: db.prepare('SELECT COUNT(*) AS count FROM operators').get().count,
    tours: db.prepare('SELECT COUNT(*) AS count FROM tours').get().count,
    bookings: db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count,
    revenue: db.prepare("SELECT COALESCE(SUM(total_price), 0) AS amount FROM bookings WHERE status = 'confirmed'").get().amount,
    pendingBookings: db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE status = 'pending'").get().count,
    recentUsers: db.prepare("SELECT id, name, email, account_type, created_at FROM users ORDER BY id DESC LIMIT 6").all(),
    recentBookings: db.prepare(`SELECT b.id, b.status, b.seats, b.total_price, b.created_at,
      t.title AS tour_title, u.name AS traveler_name FROM bookings b
      JOIN tours t ON t.id = b.tour_id JOIN users u ON u.id = b.user_id
      ORDER BY b.id DESC LIMIT 6`).all(),
  };
  res.json(stats);
});

router.get('/users', (req, res) => {
  const q = `%${String(req.query.q || '').trim().slice(0, 100)}%`;
  res.json(db.prepare(`SELECT id, name, email, account_type, created_at FROM users
    WHERE name LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 100`).all(q, q));
});

router.get('/tours', (req, res) => {
  const q = `%${String(req.query.q || '').trim().slice(0, 100)}%`;
  res.json(db.prepare(`SELECT t.id, t.title, t.location, t.price, t.date, t.click_count,
    o.name AS operator_name, (SELECT COUNT(*) FROM bookings b WHERE b.tour_id = t.id) AS booking_count
    FROM tours t JOIN operators o ON o.id = t.operator_id
    WHERE t.title LIKE ? OR t.location LIKE ? OR o.name LIKE ? ORDER BY t.id DESC LIMIT 100`).all(q, q, q));
});

router.get('/bookings', (req, res) => {
  const q = `%${String(req.query.q || '').trim().slice(0, 100)}%`;
  res.json(db.prepare(`SELECT b.id, b.status, b.seats, b.total_price, b.created_at,
    t.title AS tour_title, u.name AS traveler_name, o.name AS operator_name
    FROM bookings b JOIN tours t ON t.id = b.tour_id JOIN users u ON u.id = b.user_id
    JOIN operators o ON o.id = t.operator_id
    WHERE t.title LIKE ? OR u.name LIKE ? OR o.name LIKE ? OR CAST(b.id AS TEXT) LIKE ?
    ORDER BY b.id DESC LIMIT 100`).all(q, q, q, q));
});

export default router;
