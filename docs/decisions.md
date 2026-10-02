# Decisions

Why TurPoint works the way it does. Each section is a decision that shaped the code, so a future change can start from the reasoning.

## Groups and pricing

- **Booking is what advances a group.** There is no separate "join" step. A booking on a group below its minimum is stored as `pending`; the booking that reaches the minimum confirms itself and every earlier pending booking together.
- **The price per person is flat:** the tour's listed price, or the discounted price while a last-minute deal is active. The group minimum decides *whether the tour runs*, not what it costs.
- **Unfilled groups expire.** If a group has not reached its minimum by the tour date, it is cancelled with its pending bookings, which are refunded in full. An hourly job does this inside the server; the `expire-past-due` endpoint (protected by `CRON_SECRET` in production) can trigger the same thing.
- **The reference minimum group size is 3**; operators set their own per tour with `min_participants`. Three is low enough to demo live, and high enough that the group dynamic still matters.
- **Business model (not applied by the app yet):** a 12% commission charged to the operator. That sits well below the 20–30% typical of large marketplaces, which supports TurPoint's positioning against distrust of commission-heavy platforms while leaving operators a viable margin.
- **Dates use Baku time** for refund tiers and "has this tour passed" checks. Seed dates are relative to today so every refund tier can be demoed.

## Payments and refunds (simulated gateway)

- The gateway (`backend/src/lib/payments.js`) is shaped like Stripe but nothing is charged. A card is checked with Luhn, expiry and CVC shape. `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002` and `4000 0000 0000 9995` are declined (HTTP 402). Only brand and last four digits are stored.
- Every money movement is a row in the `payments` ledger: `charge`, `hold`, `capture`, `refund` or `void`.
- A booking on a group that is not full yet is a card **hold**. It is captured when the group confirms and voided if the booking is cancelled or the group expires.
- Refund tiers (`lib/refundPolicy.js`, whole days before the tour in Baku time): **7+ days = 100%, 3–6 days = 50%, 0–2 days = 0%.** Operator cancellations always refund 100%, and so does a held (pending) booking, because nothing was captured.
- `GET /api/bookings/refund-policy` exposes the tiers. `GET /api/bookings/:id` returns `refund_preview` and the ledger. `POST /api/bookings/:id/cancel` returns the refund that was applied.

## Reviews

Only a traveler with a **confirmed** booking can review a tour, and only **after the tour date**. Operators cannot review their own tours, there is one review per user per tour, and reviewers can edit or delete their own. An operator's rating is recalculated from their reviews.

## Security and trust

- **Identity comes from the verified JWT, never from a request body.** Ownership checks (operator owns the tour, traveler owns the booking) are enforced on every write route.
- **Validation:** Zod schemas on all JSON routes return clean 400s; every SQL query uses `?` placeholders.
- **Rate limits:** global, login/signup, booking (card-testing protection) and planner (each message costs two LLM calls).
- **Uploads:** only real JPG, PNG or WebP, detected by file signature. The server picks the extension and the size limit is 5 MB.
- **Phone verification is a mock** (no SMS provider yet). In production it answers 501 unless `ALLOW_MOCK_PHONE_VERIFICATION=true`, and the UI hides it unless `NEXT_PUBLIC_PHONE_VERIFICATION=true`. The WhatsApp button shows for any valid +994 number.
- Operator endpoints never expose private columns (pending SMS code, `user_id`). Map popups escape operator-written text.

## Smart Planner

The AI is only a reasoning layer. A small model extracts the trip requirements from free text; the backend then queries the **real** tours table; a larger model builds an itinerary but may cite only ids from that candidate list. The backend rebuilds every activity from its own database row and recomputes totals, so a model that invents a tour, price or rating cannot get one to the frontend. The worst case is an honest "no match". Models are configurable through `GROQ_EXTRACT_MODEL` and `GROQ_ITINERARY_MODEL`.

An optimal planner is a variant of the Team Orienteering Problem with Time Windows (NP-complete), so a full solver was out of scope. Upgrading the matching step is on the [roadmap](roadmap.md).

## Content, photos and language

- **Languages:** Azerbaijani, English and Russian. Tour content is stored as translated JSON; the UI strings live in `frontend/app/lib/translations.ts`.
- **Photo location is decided by the path** (`frontend/app/lib/photo.ts`): `/seed/...` files ship with the frontend (served by Vercel, survive backend redeploys), `/uploads/...` are operator uploads on the backend volume, and `https://...` is used as-is. To change a seed photo, overwrite the file with the same name.
- **Notifications store a type and values, never a finished sentence**, so each person reads them in their own language.
- **Dates and prices are formatted in one place** (`frontend/app/lib/format.ts`), so the whole app agrees, for example "AZN 120".

## Tooling choices

- **Leaflet** for the map instead of Google Maps: no paid key required.
- **SQLite on a Railway volume** instead of a hosted database: zero setup for a demo-scale app. The volume must be attached before the first real signup.
- **Next.js is pinned to 14.2.35.** Two high-severity `npm audit` advisories need the Next 16 breaking upgrade, which is deliberately deferred.
- **Wireframes were an AI-generated clickable React prototype** rather than static Figma frames. It lives in `docs/figma-prototype/`; see [figma.md](figma.md).
