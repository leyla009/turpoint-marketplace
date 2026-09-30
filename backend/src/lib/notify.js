// In-app notifications: one small helper every route calls.
//
// Design rules:
//  - Storing `type` + `params` (not translated text) lets the frontend show
//    the message in each reader's own language.
//  - notify() NEVER throws. A failed notification must not break a booking,
//    a review or a cancellation. Called inside a db.transaction it also
//    rolls back with it, so a booking that fails leaves no phantom notice.

import { db } from '../db/index.js';

// Every type the frontend knows how to render. Unknown types are refused
// here so a typo can't create a notification nobody can display.
export const NOTIFICATION_TYPES = new Set([
  'booking_confirmed',      // traveler: your pending booking is now confirmed
  'booking_cancelled',      // traveler: the operator cancelled your booking
  'group_expired',          // traveler: group never filled, pending booking cancelled
  'deal_on_favorite',       // traveler: a tour you saved got a last-minute discount
  'new_booking',            // operator: someone booked your tour
  'booking_cancelled_by_traveler', // operator: a traveler cancelled
  'group_confirmed',        // operator: a group reached its minimum
  'new_review',             // operator: your tour got a review
]);

export function notify(userId, type, params = {}, link = null) {
  try {
    if (!userId || !NOTIFICATION_TYPES.has(type)) return;
    db.prepare('INSERT INTO notifications (user_id, type, params, link) VALUES (?, ?, ?, ?)')
      .run(userId, type, JSON.stringify(params), link);
  } catch (err) {
    console.error('notify failed', type, err.message);
  }
}

// The user account that owns an operator profile (or undefined).
export function operatorUserId(operatorId) {
  return db.prepare('SELECT user_id FROM operators WHERE id = ?').get(operatorId)?.user_id;
}

// Keep the table small: drop notifications older than 60 days. Called from
// the hourly job in server.js.
export function pruneOldNotifications() {
  return db.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-60 days')").run().changes;
}
