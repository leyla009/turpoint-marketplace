// Cancels group formations whose tour date has passed without the group
// filling, and the still-pending bookings on them. Shared by the manual
// POST /api/group-formations/expire-past-due endpoint and the in-process
// scheduler in server.js, so expiry no longer depends on an external cron.

import { db } from '../db/index.js';
import { notify } from './notify.js';
import { voidHold } from './payments.js';

export function expirePastDueGroups() {
  const run = db.transaction(() => {
    const expired = db
      .prepare(
        `SELECT gf.id FROM group_formations gf
         JOIN tours t ON t.id = gf.tour_id
         WHERE gf.status IN ('waiting','forming') AND date(t.date) < date('now')`
      )
      .all();

    const cancelGroup = db.prepare("UPDATE group_formations SET status = 'cancelled' WHERE id = ?");
    const pendingFor = db.prepare(
      `SELECT b.id, b.user_id, t.title FROM bookings b JOIN tours t ON t.id = b.tour_id
       WHERE b.group_formation_id = ? AND b.status = 'pending'`
    );
    const cancelPending = db.prepare(
      "UPDATE bookings SET status = 'cancelled' WHERE group_formation_id = ? AND status = 'pending'"
    );

    const cancelledBookingIds = [];
    for (const row of expired) {
      cancelGroup.run(row.id);
      pendingFor.all(row.id).forEach((b) => {
        cancelledBookingIds.push(b.id);
        voidHold(b.id, 'group never reached its minimum');
        notify(b.user_id, 'group_expired', { tour_title: b.title }, `/bookings/${b.id}`);
      });
      cancelPending.run(row.id);
      // (holds voided above; cancelled_by marks these as system cancellations)
      db.prepare("UPDATE bookings SET cancelled_at = CURRENT_TIMESTAMP, cancelled_by = 'system', refund_percent = 100 WHERE group_formation_id = ? AND status = 'cancelled' AND cancelled_at IS NULL").run(row.id);
    }
    return { cancelled_groups: expired.map((r) => r.id), cancelled_bookings: cancelledBookingIds };
  });
  return run();
}
