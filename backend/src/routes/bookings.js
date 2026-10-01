// Task 12: Booking flow + simulated payment.
// Booking now requires a logged-in traveler — identity is derived from the
// verified JWT (req.user.userId), never trusted from the request body.
// This closes the same gap operators.js and tours.js already closed: no
// more client-supplied user_id or {name, email} guest-checkout path.
// Payment is simulated (lib/payments.js, Stripe-shaped): card is checked with
// Luhn + test-card rules, only brand/last4 are kept. Cancellation refunds follow
// lib/refundPolicy.js.
 
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createBookingSchema } from '../lib/schemas.js';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { attachActiveDeals } from './tours.js';
import { notify, operatorUserId } from '../lib/notify.js';
import { validateCard, authorize, recordInitialPayment, captureHold, voidHold, refundPayment } from '../lib/payments.js';
import { computeRefund, REFUND_TIERS } from '../lib/refundPolicy.js';
import { renderTicketPdf, TICKET_LANGS } from '../lib/ticketPdf.js';
 
const router = Router();
 
function generateTicketCode() {
  return `TP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
 
router.post('/', requireAuth, validate(createBookingSchema), (req, res) => {
  const { tour_id, seats, payment } = req.body;
 
  if (!tour_id || !seats) {
    return res.status(400).json({ error: 'tour_id and seats are required' });
  }
  if (!Number.isInteger(seats) || seats < 1) {
    return res.status(400).json({ error: 'seats must be a positive whole number' });
  }

  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  // Fixed: nothing stopped a traveler booking a tour that already happened.
  // Compared as YYYY-MM-DD in Baku time (the server itself runs in UTC, and
  // Baku is UTC+4, so `new Date()` alone would disagree for a few hours
  // around midnight). A tour departing TODAY is still bookable.
  const todayInBaku = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });
  if (String(tour.date).slice(0, 10) < todayInBaku) {
    return res.status(400).json({ error: 'this tour has already taken place and can no longer be booked' });
  }

  if (seats > tour.max_participants) {
    return res.status(400).json({ error: `cannot book more than ${tour.max_participants} seats on this tour` });
  }
 
  const resolvedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!resolvedUser) return res.status(404).json({ error: 'user not found' });
 
  if (!payment || !payment.card_number) {
    return res.status(400).json({ error: 'simulated payment details required (payment.card_number)' });
  }
  const card = validateCard(payment);
  if (!card.ok) return res.status(400).json({ error: card.error });
 
  const ticketCode = generateTicketCode();
 
  // Everything below runs atomically: a group settling and every pending
  // booking on it flipping to confirmed must not partially apply.
  const createBooking = () => {
    // Notify the tour's operator (never yourself, if an operator books their own tour).
    // Inside the transaction on purpose: a booking that fails and rolls back leaves no notice.
    const ownerUserId = operatorUserId(tour.operator_id);
    const tellOperator = (type, params) => {
      if (ownerUserId && ownerUserId !== resolvedUser.id) notify(ownerUserId, type, params, '/dashboard');
    };
    tellOperator('new_booking', { tour_title: tour.title, seats, traveler: resolvedUser.name });

    const openGroup = db
      .prepare("SELECT * FROM group_formations WHERE tour_id = ? AND status IN ('waiting','forming')")
      .get(tour_id);
 
    // Price is always the tour's flat listed price - no more "total cost
    // pool divided by however many have joined so far" math, which used to
    // show an early/solo booker the FULL group's cost until enough people
    // joined. min_participants/max_participants still gate when a group
    // is considered "confirmed" (a social/logistics threshold), they just
    // no longer affect what anyone actually pays. Operators wanting a
    // different price for early bookers should use the manual "create
    // deal" feature instead.
    //
    // Fixed: this used to be `tour.price` even while a last-minute deal was
    // active, so a traveler saw (and was promised) the discounted price on
    // the booking page but was charged the full price. attachActiveDeals is
    // the same helper GET /api/tours/:id uses, so the two always agree.
    const flatPrice = attachActiveDeals(tour).discounted_price ?? tour.price;

    if (openGroup) {
      const newCount = openGroup.current_participants + seats;
      if (newCount > tour.max_participants) {
        throw new Error(`only ${tour.max_participants - openGroup.current_participants} spot(s) left in this group`);
      }
      const nowConfirmed = newCount >= openGroup.min_participants;

      db.prepare('UPDATE group_formations SET current_participants = ?, price_per_person = ?, status = ? WHERE id = ?')
        .run(newCount, flatPrice, nowConfirmed ? 'confirmed' : 'forming', openGroup.id);

      if (nowConfirmed) {
        // This booking tipped the group over - every earlier pending
        // booking on it was already priced flat, so just flip their status.
        const pendingBookings = db
          .prepare("SELECT id, user_id FROM bookings WHERE group_formation_id = ? AND status = 'pending'")
          .all(openGroup.id);
        const settlePending = db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?");
        pendingBookings.forEach((b) => {
          settlePending.run(b.id);
          captureHold(b.id); // the card hold becomes a real charge now that the trip is going ahead
          notify(b.user_id, 'booking_confirmed', { tour_title: tour.title }, `/bookings/${b.id}`);
        });
        tellOperator('group_confirmed', { tour_title: tour.title, count: newCount });

        const totalPrice = Math.round(flatPrice * seats * 100) / 100;
        const result = db
          .prepare(
            `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
             VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`
          )
          .run(tour_id, resolvedUser.id, openGroup.id, seats, totalPrice, ticketCode);
        // The booker whose booking confirms the group hears about it too, not only earlier pending bookers.
        notify(resolvedUser.id, 'booking_confirmed', { tour_title: tour.title }, `/bookings/${result.lastInsertRowid}`);
        return { bookingId: result.lastInsertRowid };
      }

      // Still short of the minimum - held as pending until the group settles.
      const estimatedTotal = Math.round(flatPrice * seats * 100) / 100;
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

      const totalPrice = Math.round(flatPrice * seats * 100) / 100;
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

      notify(resolvedUser.id, 'booking_confirmed', { tour_title: tour.title }, `/bookings/${result.lastInsertRowid}`);
      return { bookingId: result.lastInsertRowid };
    }

    // No group exists for this tour yet - this booking starts one.
    const totalCost = tour.price * tour.min_participants;
    const nowConfirmed = seats >= tour.min_participants;
    const newStatus = nowConfirmed ? 'confirmed' : 'forming';

    const groupResult = db
      .prepare(
        `INSERT INTO group_formations (tour_id, total_cost, min_participants, current_participants, price_per_person, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(tour_id, totalCost, tour.min_participants, seats, flatPrice, newStatus);
    if (nowConfirmed) tellOperator('group_confirmed', { tour_title: tour.title, count: seats });

    const totalPrice = Math.round(flatPrice * seats * 100) / 100;
    const bookingResult = db
      .prepare(
        `INSERT INTO bookings (tour_id, user_id, group_formation_id, seats, total_price, status, ticket_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(tour_id, resolvedUser.id, groupResult.lastInsertRowid, seats, totalPrice, nowConfirmed ? 'confirmed' : 'pending', ticketCode);
    if (nowConfirmed) {
      notify(resolvedUser.id, 'booking_confirmed', { tour_title: tour.title }, `/bookings/${bookingResult.lastInsertRowid}`);
    }
    return { bookingId: bookingResult.lastInsertRowid };
  };

  // Booking rows and the payment ledger commit together or not at all.
  const runBooking = db.transaction(() => {
    const out = createBooking();
    const created = db.prepare('SELECT * FROM bookings WHERE id = ?').get(out.bookingId);
    recordInitialPayment(created, { ref: charge.ref, last4: card.last4, brand: card.brand });
    return out;
  });

  // "Bank" step happens before anything is written, so a declined card
  // leaves no booking, no seat taken and no notification behind.
  const chargeAmount = Math.round((attachActiveDeals(tour).discounted_price ?? tour.price) * seats * 100) / 100;
  const charge = authorize(card, chargeAmount);
  if (!charge.ok) return res.status(402).json({ error: charge.error });

  let outcome;
  try {
    outcome = runBooking();
  } catch (err) {
    return res.status(409).json({ error: err.message });
  }
 
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(outcome.bookingId);
  res.status(201).json({ ...booking, tour_title: tour.title, tour_title_i18n: tour.title_i18n ?? null, user_email: resolvedUser.email });
});
 
// Task 20: an operator's bookings across ALL of their tours, for the
// dashboard. Must come before GET /:id or Express would try to parse
// "mine" as a booking id.
router.get('/mine', requireAuth, (req, res) => {
  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  if (!operator) return res.status(403).json({ error: 'you need an operator profile first' });
 
  const bookings = db
    .prepare(
      `SELECT b.*, t.title as tour_title, t.title_i18n as tour_title_i18n, t.date as tour_date,
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
      `SELECT b.*, t.title as tour_title, t.title_i18n as tour_title_i18n, t.date as tour_date, t.location as tour_location
       FROM bookings b
       JOIN tours t ON t.id = b.tour_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.user.userId);
  res.json(bookings);
});
 
// Public: the refund rules, so the booking page can show them before paying.
// Must stay above GET /:id.
router.get('/refund-policy', (_req, res) => {
  res.json({ tiers: REFUND_TIERS, operator_cancel_percent: 100, pending_percent: 100 });
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
      `SELECT t.title, t.title_i18n, t.date, t.location, t.route, o.name as operator_name
       FROM tours t
       JOIN operators o ON o.id = t.operator_id
       WHERE t.id = ?`
    )
    .get(booking.tour_id);
 
  const payments = db
    .prepare('SELECT id, type, amount, status, provider_ref, card_last4, card_brand, note, created_at FROM payments WHERE booking_id = ? ORDER BY id')
    .all(booking.id);
  // What the traveler would get back if they cancelled right now.
  const refund_preview = booking.status === 'cancelled' || !tour
    ? null
    : computeRefund({ totalPrice: booking.paid_amount || booking.total_price, tourDate: tour.date, bookingStatus: booking.status, cancelledBy: 'traveler' });

  res.json({ ...booking, tour, payments, refund_preview });
});
 
// Downloadable PDF pass / receipt for one booking. Same ownership rule as
// GET /:id - only the traveler who made the booking can download it.
// ?lang=az|en|ru picks the label language (default az).
router.get('/:id/ticket.pdf', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
  if (booking.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'you can only download your own tickets' });
  }
  const tour = db
    .prepare(
      `SELECT t.title, t.title_i18n, t.date, t.location, t.route, o.name AS operator_name
       FROM tours t JOIN operators o ON o.id = t.operator_id WHERE t.id = ?`
    )
    .get(booking.tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(booking.user_id);

  const lang = TICKET_LANGS.includes(req.query.lang) ? req.query.lang : 'az';
  const doc = renderTicketPdf({ booking, tour, user: user ?? { name: '' }, lang });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${booking.ticket_code}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  doc.on('error', (err) => {
    console.error('ticket pdf failed', err);
    if (!res.headersSent) res.status(500).json({ error: 'could not generate ticket' });
    else res.end();
  });
  doc.pipe(res);
});

// Cancel a booking. Allowed for the traveler who made it, or for the
// operator who owns the tour (e.g. before deleting a tour). Only bookings
// that are still confirmed/pending, on a tour that hasn't happened yet.
// Frees the seats on the group so the capacity checks in POST / stay
// accurate. Money side (lib/refundPolicy.js + lib/payments.js):
//   - pending booking  -> card hold is voided, nothing was charged
//   - confirmed, traveler cancels -> tiered refund by days before the tour
//   - operator cancels -> always a full refund
router.post('/:id/cancel', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });

  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(booking.tour_id);
  const operator = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId);
  const isTraveler = booking.user_id === req.user.userId;
  const isTourOperator = !!operator && !!tour && operator.id === tour.operator_id;
  if (!isTraveler && !isTourOperator) {
    return res.status(403).json({ error: 'you can only cancel your own bookings or bookings on your own tours' });
  }

  if (booking.status === 'cancelled') return res.status(409).json({ error: 'booking is already cancelled' });

  const todayInBaku = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baku' });
  if (tour && String(tour.date).slice(0, 10) < todayInBaku) {
    return res.status(400).json({ error: 'this tour has already taken place' });
  }

  const cancelledBy = isTraveler ? 'traveler' : 'operator';
  // Refund is based on what was actually captured. Legacy bookings made
  // before payments existed have no payment_status and nothing to refund.
  const refund = computeRefund({
    totalPrice: booking.paid_amount || booking.total_price,
    tourDate: tour ? tour.date : todayInBaku,
    bookingStatus: booking.status,
    cancelledBy,
  });

  const cancel = db.transaction(() => {
    db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, refund_percent = ? WHERE id = ?")
      .run(cancelledBy, refund.percent, booking.id);

    if (booking.payment_status === 'authorized') {
      voidHold(booking.id, 'booking cancelled before the group was confirmed');
    } else if (booking.payment_status === 'paid') {
      refundPayment(booking.id, refund.amount, `${cancelledBy} cancelled ${refund.days_before} day(s) before the tour (${refund.percent}% refund)`);
    }

    if (booking.group_formation_id) {
      const group = db.prepare('SELECT * FROM group_formations WHERE id = ?').get(booking.group_formation_id);
      if (group) {
        const remaining = Math.max(0, group.current_participants - booking.seats);
        // An unconfirmed group with nobody left is over; a confirmed group
        // stays confirmed (its other travelers were already promised the trip).
        const status = remaining === 0 && group.status !== 'confirmed' ? 'cancelled' : group.status;
        db.prepare('UPDATE group_formations SET current_participants = ?, status = ? WHERE id = ?')
          .run(remaining, status, group.id);
      }
    }
  });
  cancel();

  // Tell the other side. If the operator cancelled, the traveler needs to know;
  // if the traveler cancelled, the operator's seat count just changed.
  if (isTraveler) {
    const opUser = tour ? db.prepare('SELECT user_id FROM operators WHERE id = ?').get(tour.operator_id)?.user_id : null;
    if (opUser && opUser !== req.user.userId) {
      const who = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.userId);
      notify(opUser, 'booking_cancelled_by_traveler', { tour_title: tour.title, seats: booking.seats, traveler: who?.name ?? '' }, '/dashboard');
    }
    // The traveler gets a record of their own cancellation (and refund) as well.
    notify(booking.user_id, 'booking_cancelled_self', { tour_title: tour?.title ?? '' }, `/bookings/${booking.id}`);
    if (booking.payment_status === 'paid' && refund.amount > 0) {
      notify(booking.user_id, 'refund_issued_self', { tour_title: tour?.title ?? '', amount: refund.amount }, `/bookings/${booking.id}`);
    }
  } else {
    notify(booking.user_id, 'booking_cancelled', { tour_title: tour?.title ?? '' }, `/bookings/${booking.id}`);
    if (booking.payment_status === 'paid' && refund.amount > 0) {
      notify(booking.user_id, 'refund_issued', { tour_title: tour?.title ?? '', amount: refund.amount }, `/bookings/${booking.id}`);
    }
  }

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
  res.json({ ...updated, refund: booking.payment_status === 'authorized' ? { ...refund, voided: true } : refund });
});

export default router;