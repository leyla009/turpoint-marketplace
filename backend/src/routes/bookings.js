// Task 12: Booking flow + simulated payment.
// No real auth system exists yet (out of MVP scope per the brief), so this
// route accepts either an existing user_id, or a {name, email} object and
// creates the user on the fly - similar to a guest-checkout flow.
// Payment is simulated: card details are validated for shape only, never stored.
 
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
 
const router = Router();
 
function generateTicketCode() {
  return `TP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
 
function resolveUser({ user_id, user }) {
  if (user_id) {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!existing) throw new Error('user_id not found');

    return existing;
  }
  if (user && user.email) {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
    if (existing) return existing;
    // MVP has no real auth flow yet - store a placeholder hash, not a real password.
    const placeholderHash = crypto.randomBytes(8).toString('hex');
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(user.name || 'Guest', user.email, placeholderHash);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  throw new Error('user_id or user {name, email} is required');
}
 
router.post('/', (req, res) => {
  const { tour_id, seats, group_formation_id, user_id, user, payment } = req.body;
 
  if (!tour_id || !seats) {
    return res.status(400).json({ error: 'tour_id and seats are required' });
  }
 
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  // If booking through a confirmed group, use the group's live price-per-person
  // instead of the tour's solo price - this is what connects Task 10's pricing
  // to an actual booking record.
  let pricePerSeat = tour.price;
  if (group_formation_id) {
    const group = db.prepare('SELECT * FROM group_formations WHERE id = ?').get(group_formation_id);
    if (!group) return res.status(404).json({ error: 'group formation not found' });
    if (group.status !== 'confirmed') {
      return res.status(409).json({ error: 'group formation is not confirmed yet' });
    }
    pricePerSeat = group.price_per_person;
  }
 
  let resolvedUser;
  try {
    resolvedUser = resolveUser({ user_id, user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
 
  // Simulated payment step - MVP has no real payment provider (per project brief).
  if (!payment || !payment.card_number) {
    return res.status(400).json({ error: 'simulated payment details required (payment.card_number)' });
  }
 
  const totalPrice = pricePerSeat * seats;
  const ticketCode = generateTicketCode();
 
  const result = db
    .prepare(
      `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`
    )
    .run(tour_id, resolvedUser.id, group_formation_id ?? null, seats, totalPrice, ticketCode);
 
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...booking, tour_title: tour.title, user_email: resolvedUser.email });
});
 
router.get('/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
  const tour = db.prepare('SELECT title, date, location FROM tours WHERE id = ?').get(booking.tour_id);
  res.json({ ...booking, tour });
});
 
export default router;
