# Decisions

## Minimum group size & commission rate (Task 9)

- **Minimum group size:** 3 participants (default; operators can override
  per tour via `tours.min_participants`).
- **Commission rate:** 12% of tour price, charged to the operator.
- **Reasoning:** 3 is low enough to demo live in a few steps but high
  enough that the price-per-person drop is visible and meaningful. 12%
  sits well below the 20-30% typical of GetYourGuide/Viator, directly
  supporting the brief's positioning against distrust of commission-based
  platforms, while still leaving pilot operators (offered discounted
  terms per the risk-mitigation plan) a viable margin.

## Payments & refunds (simulated gateway)

- Payment is a Stripe-shaped simulation (`backend/src/lib/payments.js`): card is checked with Luhn + expiry + CVC shape, test card `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` / `4000 0000 0000 9995` are declined (HTTP 402). Only brand + last 4 digits are stored. Every money movement is a row in the `payments` ledger (charge | hold | capture | refund | void).
- Pending (group not full) bookings are a card **hold**; it is captured when the group confirms, and voided if the booking is cancelled or the group expires.
- Refund rules (`backend/src/lib/refundPolicy.js`, days before tour in Baku time): 7+ days = 100%, 3–6 days = 50%, 0–2 days = 0%. Operator cancels = always 100%. Pending/held = 100% (nothing was charged).
- `GET /api/bookings/refund-policy` exposes the tiers; `GET /api/bookings/:id` returns `refund_preview` and the payment ledger; `POST /api/bookings/:id/cancel` returns the applied `refund`.
