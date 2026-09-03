// Task 10: Group Formation state machine.
// Fixed: this file used to also expose POST / and POST /:id/join, a
// leftover "manual join" flow from before the redesign. That let someone
// bump current_participants and recalculate price_per_person WITHOUT ever
// creating a booking - completely bypassing payment, and desyncing this
// table's price from what bookings.js actually charges people. Booking is
// now the only thing that advances a group (see bookings.js) - this file
// is read-only plus the Task 11 no-fill cancellation job.
 
import { Router } from 'express';
import { db } from '../db/index.js';
 
const router = Router();
 
// Read-only lookup - GET /api/group-formations?tour_id=5
// Returns the tour's current open (waiting/forming) group if one exists,
// otherwise its most recent confirmed group, otherwise null. Does NOT
// create anything - safe to call just to preview status/price.
router.get('/', (req, res) => {
  const { tour_id } = req.query;
  if (!tour_id) return res.status(400).json({ error: 'tour_id query param is required' });
 
  const open = db
    .prepare("SELECT * FROM group_formations WHERE tour_id = ? AND status IN ('waiting','forming') ORDER BY id DESC LIMIT 1")
    .get(tour_id);
  if (open) return res.json(open);
 
  const confirmed = db
    .prepare("SELECT * FROM group_formations WHERE tour_id = ? AND status = 'confirmed' ORDER BY id DESC LIMIT 1")
    .get(tour_id);
  if (confirmed) return res.json(confirmed);
 
  res.json(null);
});
 
router.get('/:id', (req, res) => {
  const group = db.prepare('SELECT * FROM group_formations WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(group);
});
 
// Task 11: no-fill case. Call this on a schedule (e.g. daily cron) or lazily
// on read - here it's exposed as an explicit endpoint so it's easy to test.
// Sprint 3 hardening: this mutates state (cancels groups/bookings) with no
// auth of its own - fine for local dev, but left wide open on a public
// deployment it's a free "cancel things" lever for anyone who finds the
// route. If CRON_SECRET is set (production), the caller must present it;
// left unset (local dev / Swagger "Try it out") the route stays open so it
// doesn't need extra setup to exercise.
router.post('/expire-past-due', (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'missing or invalid x-cron-secret header' });
  }

  const expired = db
    .prepare(
      `SELECT gf.id FROM group_formations gf
       JOIN tours t ON t.id = gf.tour_id
       WHERE gf.status IN ('waiting','forming') AND date(t.date) < date('now')`
    )
    .all();
 
  const cancelGroup = db.prepare("UPDATE group_formations SET status = 'cancelled' WHERE id = ?");
  // Anyone still 'pending' on a group that never filled was never actually
  // charged (payment only settles once a group confirms) - cancel their
  // booking too so nothing is left dangling in limbo.
  const cancelPendingBookings = db.prepare(
    "UPDATE bookings SET status = 'cancelled' WHERE group_formation_id = ? AND status = 'pending'"
  );
 
  const cancelledBookingIds = [];
  expired.forEach((row) => {
    cancelGroup.run(row.id);
    const pending = db
      .prepare("SELECT id FROM bookings WHERE group_formation_id = ? AND status = 'pending'")
      .all(row.id);
    cancelPendingBookings.run(row.id);
    pending.forEach((b) => cancelledBookingIds.push(b.id));
  });
 
  res.json({ cancelled_groups: expired.map((r) => r.id), cancelled_bookings: cancelledBookingIds });
});
 
export default router;
 