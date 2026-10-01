# TurPoint v8 - audit fixes + simulated payments/refunds (on top of v7)

Copy over your project, same paths. No new dependencies.
Replaces the earlier `turpoint-payments.zip` (this one contains everything in it).

## Fixes
1. **Login/signup/PUT /me could crash the server** on non-string fields -> type checks + `middleware/asyncHandler.js`
   (also wraps the planner chat route) + a last-resort `unhandledRejection` logger in server.js.
2. **Seed tours were all in the past** -> seed dates are now relative to today (Baku): +2, +5, +8 ... days, so the
   0% / 50% / 100% refund tiers can all be demoed. Adds the missing v7 backend seed files and the `seed:photos` script.
   The seed refuses to run on a database that already has tours: delete `turpoint.db` and run `npm run seed`
   (or `npm run seed -- --force` to add a fresh upcoming batch next to the old tours).
3. **Deleting a tour that someone favorited returned 500** -> favorites (and payments) are cleaned up first.
4. **Smart Planner**: only upcoming tours, only tours with room for the party, budget covers the whole party
   (price x travelers), EUR/USD budgets are converted to AZN (override with RATE_EUR_AZN / RATE_USD_AZN).
5. **Tour form**: separate "minimum participants" and "seats" fields (were one value sent as both min and max).

## Payments + refunds (simulated gateway)
See docs/decisions.md. Test cards: 4242 4242 4242 4242 (ok), 4000 0000 0000 0002 (declined).
Refunds: 7+ days 100%, 3-6 days 50%, 0-2 days 0%; operator cancel and unfilled group = 100%.
