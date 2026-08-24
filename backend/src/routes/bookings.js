// Task 12: Booking flow + simulated payment.
// Booking now requires a logged-in traveler — identity is derived from the
// verified JWT (req.user.userId), never trusted from the request body.
// This closes the same gap operators.js and tours.js already closed: no
// more client-supplied user_id or {name, email} guest-checkout path.
// Payment is simulated: card details are validated for shape only, never stored.
 
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
 
const router = Router();
 
function generateTicketCode() {
  return `TP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
 
router.post('/', requireAuth, (req, res) => {
  const { tour_id, seats, payment } = req.body;
 
  if (!tour_id || !seats) {
    return res.status(400).json({ error: 'tour_id and seats are required' });
  }
 
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  if (seats > tour.max_participants) {
    return res.status(400).json({ error: `cannot book more than ${tour.max_participants} seats on this tour` });
  }
 
  const resolvedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!resolvedUser) return res.status(404).json({ error: 'user not found' });
 
  if (!payment || !payment.card_number) {
    return res.status(400).json({ error: 'simulated payment details required (payment.card_number)' });
  }
 
  const ticketCode = generateTicketCode();
 
  // Everything below runs atomically: a group settling and every pending
  // booking on it flipping to confirmed must not partially apply.
  const runBooking = db.transaction(() => {
    const openGroup = db
      .prepare("SELECT * FROM group_formations WHERE tour_id = ? AND status IN ('waiting','forming')")
      .get(tour_id);
 
    if (openGroup) {
      const newCount = openGroup.current_participants + seats;
      if (newCount > tour.max_participants) {
        throw new Error(`only ${tour.max_participants - openGroup.current_participants} spot(s) left in this group`);
      }
      const finalPricePerPerson = Math.round((openGroup.total_cost / newCount) * 100) / 100;
      const nowConfirmed = newCount >= openGroup.min_participants;
 
      db.prepare('UPDATE group_formations SET current_participants = ?, price_per_person = ?, status = ? WHERE id = ?')
        .run(newCount, finalPricePerPerson, nowConfirmed ? 'confirmed' : 'forming', openGroup.id);
 
      if (nowConfirmed) {
        // This booking tipped the group over - settle every earlier pending
        // booking on it at the SAME final price, so nobody pays more just
        // for having booked first.
        const pendingBookings = db
          .prepare("SELECT * FROM bookings WHERE group_formation_id = ? AND status = 'pending'")
          .all(openGroup.id);
        const settlePending = db.prepare('UPDATE bookings SET total_price = ?, status = ? WHERE id = ?');
        pendingBookings.forEach((b) => {
          settlePending.run(Math.round(finalPricePerPerson * b.seats * 100) / 100, 'confirmed', b.id);
        });
 
        const totalPrice = Math.round(finalPricePerPerson * seats * 100) / 100;
        const result = db
          .prepare(
            `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
             VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`
          )
          .run(tour_id, resolvedUser.id, openGroup.id, seats, totalPrice, ticketCode);
        return { bookingId: result.lastInsertRowid };
      }
 
      // Still short of the minimum - held as pending until the group settles.
      const estimatedTotal = Math.round(finalPricePerPerson * seats * 100) / 100;
      const result = db
        .prepare(
          `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`
        )
        .run(tour_id, resolvedUser.id, openGroup.id, seats, estimatedTotal, ticketCode);
      return { bookingId: result.lastInsertRowid };
    }
 
    const confirmedGroup = db
      .prepare("SELECT * FROM group_formations WHERE tour_id = ? AND status = 'confirmed' ORDER BY id DESC LIMIT 1")
      .get(tour_id);
 
    if (confirmedGroup) {
      // Fixed: this path never checked remaining capacity, unlike the
      // waiting/forming path above - a confirmed group could be
      // overbooked past tour.max_participants with no error.
      if (confirmedGroup.current_participants + seats > tour.max_participants) {
        throw new Error(`only ${tour.max_participants - confirmedGroup.current_participants} spot(s) left on this tour`);
      }
 
      const totalPrice = Math.round(confirmedGroup.price_per_person * seats * 100) / 100;
      const result = db
        .prepare(
          `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
           VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`
        )
        .run(tour_id, resolvedUser.id, confirmedGroup.id, seats, totalPrice, ticketCode);
 
      // Keep current_participants in sync so the capacity check above stays
      // accurate for the NEXT booking too, not just this one.
      db.prepare('UPDATE group_formations SET current_participants = current_participants + ? WHERE id = ?')
        .run(seats, confirmedGroup.id);
 
      return { bookingId: result.lastInsertRowid };
    }
 
    // No group exists for this tour yet - this booking starts one.
    const totalCost = tour.price * tour.min_participants;
    const finalPricePerPerson = Math.round((totalCost / seats) * 100) / 100;
    const nowConfirmed = seats >= tour.min_participants;
    const newStatus = nowConfirmed ? 'confirmed' : 'forming';
 
    const groupResult = db
      .prepare(
        `INSERT INTO group_formations (tour_id, total_cost, min_participants, current_participants, price_per_person, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(tour_id, totalCost, tour.min_participants, seats, finalPricePerPerson, newStatus);
 
    const totalPrice = Math.round(finalPricePerPerson * seats * 100) / 100;
    const bookingResult = db
      .prepare(
        `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(tour_id, resolvedUser.id, groupResult.lastInsertRowid, seats, totalPrice, nowConfirmed ? 'confirmed' : 'pending', ticketCode);
    return { bookingId: bookingResult.lastInsertRowid };
  });
 
  let outcome;
  try {
    outcome = runBooking();
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }
 
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(outcome.bookingId);
  res.status(201).json({ ...booking, tour_title: tour.title, user_email: resolvedUser.email });
});
 
// Task 20: an operator's bookings across ALL of their tours, for the
// dashboard. Must come before GET /:id or Express would try to parse
// "mine" as a booking id.
router.get('/mine', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(403).json({ error: 'you need an operator profile first' });
 
  const bookings = db
    .prepare(
      `SELECT b.*, t.title as tour_title, t.date as tour_date,
              u.name as traveler_name, u.email as traveler_email
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       JOIN users u ON u.id = b.user_id
       WHERE t.operator_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(operator.id);
 
  res.json(bookings);
});
 
// A traveler's own bookings across every tour they've booked. Distinct
// from GET /mine (which is operator-scoped, bookings ON their tours) —
// this is bookings THEY made. Also must come before GET /:id.
router.get('/my-trips', requireAuth, (req, res) => {
  const bookings = db
    .prepare(
      `SELECT b.*, t.title as tour_title, t.date as tour_date, t.location as tour_location
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.user.userId);
  res.json(bookings);
});
 
// Single booking detail, for the traveler's own e-ticket view. Auth +
// ownership required — this used to be public, which meant anyone could
// view anyone else's ticket by guessing an id.
router.get('/:id', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
  if (booking.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only view your own bookings' });
  }
 
  const tour = db
    .prepare(
      `SELECT t.title, t.date, t.location, t.route, o.name as operator_name
       FROM tours t
       JOIN operators o ON o.id = t.operator_id
       WHERE t.id = ?`
    )
    .get(booking.tour_id);
 
  res.json({ ...booking, tour });
});
 
export default router;