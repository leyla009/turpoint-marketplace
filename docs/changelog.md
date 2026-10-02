# Changelog

What changed, newest first. Versions v2 to v8 were numbered drops during development; later work was not versioned.

## After v8

- **Tests and CI:** the Express app was split into `app.js` (importable) and `server.js` (starts listening), a `supertest` API test suite was added, and GitHub Actions now runs the backend tests and a production frontend build on every push and pull request.
- **Validation:** JSON routes validate their body with Zod and return a clean 400 instead of crashing.
- **Notifications:** the traveler whose booking confirms a group is notified too, and travelers get a record of their own cancellation and refund.

## Also in the app (built along the way, not tied to one version)

Conversational AI Smart Planner (Groq) with saved trips · operator analytics with a demo-data seed script · weather forecast on tour pages (Open-Meteo) · downloadable PDF e-tickets · favorites · popular tours · booking rate limit (card-testing protection).

## v8: audit fixes, simulated payments, real tours

- Login, signup and profile updates no longer crash the server on non-string fields; async routes are wrapped and a last-resort `unhandledRejection` logger was added.
- Deleting a tour that someone had favorited no longer returns 500.
- Planner: only upcoming tours, only tours with room for the party, budget covers the whole party, EUR/USD budgets converted to AZN.
- Tour form: separate "minimum participants" and "seats" fields.
- **Simulated card payments and refunds** with a `payments` ledger, hold/capture/void for groups that are not full yet, and the 100/50/0% refund tiers (see [decisions](decisions.md)).
- **22 real, translated tours** (az/en/ru) with a detailed tour page and one photo each. Seed dates are relative to today.
- New seed workflow: `npm run seed` for a new database, `npm run seed:tours -- --prices` to refresh an existing one without touching users, operators or bookings.

## v7: cover images

- Tour cards were blank because the old seed wrote to a column that does not exist; fixed.
- One photo helper (`lib/photo.ts`) decides where a photo lives: backend uploads, the frontend's `/seed` folder, or an external URL.
- `seed:photos` adds covers to demo tours already in a database.

## v6: in-app notifications

- New `notifications` table, bell with unread badge (polled once a minute while the tab is visible), and a notifications page.
- Travelers hear about confirmed, cancelled and expired bookings and deals on saved tours. Operators hear about new bookings, traveler cancellations, confirmed groups and new reviews. Nobody is notified about their own action.
- Notifications store a type and values, so each person reads them in their own language.

## v5

- Tours saved as "Gəbələ" are renamed to "Qəbələ" on boot; the seed no longer creates the duplicate location.
- Uploaded photos are git-ignored.

## v4

- WhatsApp button shows for any operator with a valid +994 number.
- Phone-verification UI hidden unless `NEXT_PUBLIC_PHONE_VERIFICATION=true`.
- The tour page sends the login token so an owner's own views are not counted.
- The cancel dialog was reworded for demo payments.

## v3: security, cancellation, validation

- **Security:** operator endpoints stopped leaking private columns; mock phone verification is blocked in production; uploads accept only real JPG/PNG/WebP; the planner got a rate limit.
- **Cancellation:** `POST /bookings/:id/cancel` (traveler, or the tour's operator, before the tour date) with a Cancel button on the e-ticket page.
- **Unfilled groups now expire automatically** (hourly job plus once at boot).
- Deleting a tour can no longer erase confirmed or pending bookings on an upcoming tour.
- Reviews open only after the tour date.
- Validation: operator update whitelist, whole-number ratings 1–5, normalized emails, tour category checks.

## v2: first cumulative fix pass

- **Reserve button** on the tour page; analytics heading contrast fixed.
- **Bugs:** bookings charged full price during an active deal; views were inflated (owner ignored, one count per visitor per tour per 30 minutes); anyone could review any tour (confirmed-booking gate restored); dates followed the browser language instead of the selected one; Instagram handles and links broke on `@name` input; currency now always formats as "AZN 120".
- **Past tours cannot be booked** (compared in Baku time).
- **Hardening:** `expire-past-due` needs `CRON_SECRET` in production; login rate limit always on; proxy trust so rate limits see real client IPs on Railway; escaped operator text in map popups.

## Foundations (Sprints 1–2)

- **Sprint 1:** SQLite schema, Express API with Swagger docs, operator and tour CRUD, multi-parameter search, group formation, checkout with unique ticket code and QR, reviews with rating rollup, tour comparison, last-minute deals, greedy planner, JWT auth; Next.js homepage, e-ticket pages and Leaflet map.
- **Post-Sprint-1 hardening:** removed an unauthenticated review route and unauthenticated deal creation; removed legacy join routes that bypassed payment; added the missing capacity check on confirmed groups; fixed operator-mode hydration on page load and a silent group-pricing bug on the booking page.
- **Sprint 2:** tour update endpoint (`PUT /api/tours/:id`), global JSON 404 and error handler, deal management UI, edit-tour page, review edit and delete UI, success/error toasts, and a clean `next build`.
