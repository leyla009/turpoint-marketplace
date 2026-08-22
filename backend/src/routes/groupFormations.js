// Task 10: Group Formation state machine.
// waiting -> forming -> confirmed, price_per_person recalculated on every join.
// Task 11: no-fill case - a waiting/forming group past its tour date becomes cancelled.
 
import { Router } from 'express';
import { db } from '../db/index.js';
 
const router = Router();
 
function recalculate(groupId) {
  const group = db.prepare('SELECT * FROM group_formations WHERE id = ?').get(groupId);
  if (!group) return null;
 
  const pricePerPerson = group.current_participants > 0
    ? Math.round((group.total_cost / group.current_participants) * 100) / 100
    : group.total_cost;
 
  let status = group.status;
  if (group.current_participants >= group.min_participants && status !== 'confirmed') {
    status = 'confirmed';
  } else if (group.current_participants > 0 && status === 'waiting') {
    status = 'forming';
  }
 
  db.prepare(
    'UPDATE group_formations SET price_per_person = ?, status = ? WHERE id = ?'
  ).run(pricePerPerson, status, groupId);
 
  return db.prepare('SELECT * FROM group_formations WHERE id = ?').get(groupId);
}
 
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
 
// Create (or the caller can look up) the group-formation record for a tour.
router.post('/', (req, res) => {
  const { tour_id } = req.body;
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'tour not found' });
 
  const existing = db
    .prepare("SELECT * FROM group_formations WHERE tour_id = ? AND status IN ('waiting','forming')")
    .get(tour_id);
  if (existing) return res.status(200).json(existing);
 
  const totalCost = tour.price * tour.min_participants;
  const result = db
    .prepare(
      `INSERT INTO group_formations (tour_id, total_cost, min_participants, current_participants, price_per_person, status)
       VALUES (?, ?, ?, 0, ?, 'waiting')`
    )
    .run(tour_id, totalCost, tour.min_participants, tour.price);
 
  res.status(201).json(db.prepare('SELECT * FROM group_formations WHERE id = ?').get(result.lastInsertRowid));
});
 
// Task 10: join a group - the core price-recalculation step.
router.post('/:id/join', (req, res) => {
  const group = db.prepare('SELECT * FROM group_formations WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  if (group.status === 'confirmed') return res.status(409).json({ error: 'group already confirmed' });
  if (group.status === 'cancelled') return res.status(409).json({ error: 'group was cancelled' });
 
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(group.tour_id);
  if (group.current_participants >= tour.max_participants) {
    return res.status(409).json({ error: 'group is full' });
  }
 
  db.prepare('UPDATE group_formations SET current_participants = current_participants + 1 WHERE id = ?')
    .run(group.id);
 
  res.json(recalculate(group.id));
});
 
router.get('/:id', (req, res) => {
  const group = db.prepare('SELECT * FROM group_formations WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(group);
});
 
// Task 11: no-fill case. Call this on a schedule (e.g. daily cron) or lazily
// on read - here it's exposed as an explicit endpoint so it's easy to test.
router.post('/expire-past-due', (req, res) => {
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
