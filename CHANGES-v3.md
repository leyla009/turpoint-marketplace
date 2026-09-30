# TurPoint fixes v3 

Only files changed since v2 are included. No new dependencies.

## Security
1. **Operator endpoints no longer leak private columns.** `GET /operators`, `GET /operators/:id` hide the pending SMS
   code/number/expiry and `user_id`; `/operators/me` hides the code. (`operators.js`)
2. **Mock phone verification** works only outside production. In production it answers 501 unless
   `ALLOW_MOCK_PHONE_VERIFICATION=true`. Added a 60 s resend cooldown and a 5-wrong-attempts lock.
3. **Uploads**: only real jpg/png/webp (checked by file signature; extension chosen by the server, never from the
   filename). SVG/HTML can no longer be stored. Files go to `UPLOADS_DIR` (set it to a Railway volume). New `lib/uploads.js`.
4. **Planner**: 15 requests / 10 min per IP in production, message capped at 1000 chars. (No login required - see notes.)

## Bookings and reviews
5. **`POST /bookings/:id/cancel`** (traveler or the tour's operator, only before the tour date, frees the seats),
   plus a Cancel button on the e-ticket page.
6. **Unfilled groups now expire automatically**: hourly job + once at boot (`lib/expireGroups.js`). The cron endpoint
   still works.
7. **`DELETE /tours/:id?force=true`** can no longer erase confirmed/pending bookings on an upcoming tour; cancel them first.
8. **Reviews open only after the tour date** (new eligibility reason `not-yet`, with its own message in az/en/ru).
   Before this, a traveler could review a trip that hadn't happened yet.

## Validation
9. `PUT /operators/:id` only accepts name, description, languages, photo_url, vehicle_features, phone, instagram
   (previously any column, e.g. `rating`), and rejects an empty name (was a 500).
10. Ratings must be whole numbers 1-5 (was a 500 on non-numbers).
11. Emails are trimmed + lower-cased on signup/login/profile update; login also matches old mixed-case accounts;
    basic format check on signup.
12. Tour `category` validated on create and update.
13. `schema.sql` documents `pending`; `openapi.json` has the cancel route.

## Views
14. The Next.js metadata fetch sends `x-no-view-count`, so it no longer counts as a visitor view.

## Still open / our decision
- The tour page's own fetch doesn't send the login token, so the "owner's views are ignored" rule can't recognise the
  owner (it still de-dupes per IP for 30 min). Fix if you want it: send `Authorization` on that fetch.
- The UI never calls the phone-verify endpoints, and the WhatsApp button needs `phone_verified`, so it never shows.
  Decide: show WhatsApp for any valid +994 number, or build the verify UI.
- `isPastDate` (frontend) uses the browser's date; the server uses Baku time. Can differ for a few hours near midnight.
- Cancelling does not refund anything (payment is simulated).
- Set on Railway: `NODE_ENV=production`, `JWT_SECRET`, `CRON_SECRET`, `CORS_ORIGIN`, `UPLOADS_DIR`.
