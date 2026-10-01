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
  'refund_issued',          // traveler: operator cancelled and your money is on its way back
  'booking_cancelled_self', // traveler: confirmation that YOU cancelled your booking
  'refund_issued_self',     // traveler: you cancelled and a refund is on its way back
]);

// Notifications are stored as type + params, not finished sentences, so each
// reader sees them in their own language. A tour title is one of those
// params: when it belongs to a translated tour, store all languages next to
// it (tour_title_i18n) and let the frontend pick. One lookup here means none
// of the ~10 call sites has to know about translations.
function withTitleTranslations(params) {
  if (typeof params?.tour_title !== 'string' || params.tour_title_i18n) return params;
  try {
    const row = db
      .prepare('SELECT title_i18n FROM tours WHERE title = ? AND title_i18n IS NOT NULL LIMIT 1')
      .get(params.tour_title);
    return row ? { ...params, tour_title_i18n: JSON.parse(row.title_i18n) } : params;
  } catch {
    return params;
  }
}

export function notify(userId, type, params = {}, link = null) {
  try {
    if (!userId || !NOTIFICATION_TYPES.has(type)) return;
    params = withTitleTranslations(params);
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
