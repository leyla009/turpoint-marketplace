# TurPoint v8 + seed tours - everything in one drop (on top of the current repo, v7)

Copy `backend/` and `frontend/` (and `docs/`) over your project, same paths. No new dependencies.

## 1. v8 fixes + simulated payments/refunds (from the peers' v8 zip)
- Login / signup / PUT /me no longer crash on non-string fields (`middleware/asyncHandler.js`, also wraps the planner chat route).
- Deleting a tour that someone favorited no longer returns 500.
- Smart Planner: upcoming tours only, only tours with room for the party, budget covers the whole party, EUR/USD budgets converted to AZN.
- Tour form: separate "minimum participants" and "seats" fields.
- Simulated card payments + refunds: `lib/payments.js`, `lib/refundPolicy.js`, `payments` table, payment UI on the booking page.
  Test cards: 4242 4242 4242 4242 (ok), 4000 0000 0000 0002 (declined). Refunds: 7+ days 100%, 3-6 days 50%, 0-2 days 0%;
  operator cancel and unfilled group = 100%. See docs/decisions.md.

## 2. Real, translated seed tours (from the peers' v9 zip, reworked)
- 22 tours from Seed_tours.docx in Azerbaijani / English / Russian, with the GetYourGuide-style detail page.
- Photos: one per tour, `frontend/public/seed/<tour-key>.jpg` (3:2 landscape, max 1600 px).
- Prices: AZN per person, as listed on each tour's GetYourGuide page (`backend/src/db/seedTours*.js`, `price:` lines).
- Dates: `seedDates()` in `seedTourData.js` spreads the tours over the current month (Baku time), starting tomorrow;
  if fewer than 10 days are left in the month it runs to the end of next month.

## Apply it
- New database: `cd backend && npm run seed`
- Existing database (keeps users, operators, bookings): `cd backend && npm run seed:tours -- --prices`
  Adds/refreshes the 22 tours, deletes old "turu #N" demo tours nobody booked, moves expired real tours that have no
  bookings to this month, and (with `--prices`) sets the seed price on tours nobody has booked. Past tours with bookings
  keep their date, and booked tours keep their price. Safe to re-run. Migrations (new tour columns, payments table,
  booking payment columns) run automatically on boot.
- Without `--prices`, `seed:tours` leaves prices alone, so operators' own price edits survive.
