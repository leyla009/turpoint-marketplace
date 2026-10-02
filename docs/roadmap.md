# Roadmap

What is next and what is known to be missing. Finished work is in the [changelog](changelog.md).

## Next

**Real payments: Stripe Checkout (test mode)**
- Replace the simulated card form with Stripe's hosted Checkout page. The backend prices the order itself, then verifies the Checkout Session with Stripe (`payment_status === 'paid'`) before creating the booking. The redirect alone is never trusted.
- Cancellations and expired groups call the Stripe Refunds API.
- A first implementation with mocked-Stripe tests exists outside `main`. It needs a full run against a real Stripe test key before it is merged.
- *Design note:* card authorizations (holds) expire after about 7 days, while tours are often booked weeks ahead. The real integration therefore charges immediately and refunds in full if a group never fills, instead of using hold/capture/void. This replaces the simulated hold logic.
- *Later:* a `checkout.session.completed` webhook, to cover a traveler who pays and then closes the tab before the redirect completes. Mount its raw-body route **before** `express.json()` in `app.js`.

**Availability and time slots**
- Per-date inventory (`tour_id`, `date`, `time_slot`, capacity, booked count) and `GET /api/tours/:id/availability`.
- A date / time-slot picker on the booking page.

## Later

- **Email notifications:** booking confirmations with the QR ticket attached, new-order alerts and cancellation notices. In-app notifications already exist.
- **Traveler ↔ operator messaging.**
- **Real SMS provider** for phone verification (it is a mock today).
- **Planner optimization:** replace the greedy matching with a knapsack or local-search approach.
- **Photo gallery:** tours have a single cover photo today.
- **Operator commission (12%):** a decided business rule that the app does not apply yet.

## Known gaps and technical debt

- **Test coverage:** the suite covers basics, auth and a few booking cases. Booking, payment and refund logic should get proper tests, and there is no end-to-end pass yet.
- **Next.js 14.2.35** has two high-severity `npm audit` advisories that need the Next 16 upgrade.
- The frontend decides whether a tour is "past" using the browser's date; the server uses Baku time. They can differ for a few hours around midnight.
- The Railway volume must be attached before the first real signup, or data on the ephemeral disk is lost.
