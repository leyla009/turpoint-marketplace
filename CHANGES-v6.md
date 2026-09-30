# TurPoint v6 - in-app notifications (on top of v5)

Copy over your project, same paths. No new dependencies. The `notifications` table is created
automatically on the next backend start (schema.sql uses CREATE TABLE IF NOT EXISTS), so no manual migration.

## Who gets notified
Traveler
- booking_confirmed  - your pending booking became confirmed because the group filled
- booking_cancelled  - the operator cancelled your booking
- group_expired      - the group never filled by the tour date; your pending booking was cancelled
- deal_on_favorite   - a tour you saved got a last-minute discount
Operator
- new_booking, booking_cancelled_by_traveler, group_confirmed, new_review

Nobody is notified about their own action (an operator booking their own tour, or the traveler who just booked).

## Backend (backend/src)
- db/schema.sql            new `notifications` table + index
- lib/notify.js            notify() helper (never throws; inside a transaction it rolls back with it), 60-day prune
- routes/notifications.js  GET / (paged), GET /unread-count, POST /read-all, POST /:id/read, DELETE /:id
                           (own notifications only; someone else's id answers 404)
- routes/bookings.js, reviews.js, deals.js, lib/expireGroups.js   create the notifications
- server.js                mounts /api/notifications; hourly job also prunes old notifications
- openapi.json             documents the new routes

## Frontend (frontend/app)
- lib/notifications.ts, components/NotificationBell.tsx   bell + unread badge (polls once a minute, only while the tab is visible)
- (main)/notifications/page.tsx    list, mark read, mark all read, delete, "show more"
- components/Nav.tsx               bell in the desktop header and the mobile top bar
- lib/translations.ts              az / en / ru strings

The server stores only a type and values, never a finished sentence, so each notification is shown in the
reader's own language.
