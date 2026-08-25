# TASKS
 
Holberton-style rule: **one task = one small, verifiable change.** Finish a task, test it against
its "Check" criteria, commit with a standard message like `feat: task 4 - tour search endpoint`,
then move on.
 
This file is organized by **Sprint**, matching the school's actual review cadence, rather than by
the original Mərhələ/Week numbering. Sprint 1 is the school-assigned rubric (deadline 25.08.2026)
and is complete. Sprints 2–4 are **not school-assigned** — a self-authored roadmap for future work.
 
---
 
## Sprint 1 — Initial MVP Setup (COMPLETE)
 
**Deadline:** 25.08.2026
**Rubric objective:** ilkin işlək versiya (MVP Foundation) — backend structure, core API endpoints,
auth if present, Swagger documentation, working Landing/Home page, responsive UI, static navigation.
 
### Backend — all delivered
- [x] **Task 0.** Repo & tooling — `npm install` clean in both `backend/` and `frontend/`.
- [x] **Task 1.** SQLite schema (`operators`, `tours`, `users`, `bookings`, `group_formations`,
  `reviews`, `last_minute_deals`) + WAL mode. Since extended with an idempotent
  `operators.user_id` migration, checked at boot, safe to re-run.
- [x] **Task 2.** Express skeleton — `GET /api/health` → `{ "status": "ok" }`.
- [x] **Task 3.** Seed data — 20+ tours across 3 operators.
- [x] **Task 6.** Operator CRUD.
- [x] **Task 7.** Tour listing CRUD.
- [x] **Task 8.** Multi-parametric search/filter (`GET /api/tours?location=&maxPrice=&...`).
- [x] **Task 9.** Business constants locked — min group size 3, commission 12% (`docs/decisions.md`).
- [x] **Task 10.** Group formation pricing state machine.
  **Note — this task's original check criteria is stale.** It was written against an early
  "join request" design (`POST /group-formations/:id/join`). The design was later replaced:
  booking *is* what advances a group now, with no separate join step — see the **Post-Sprint-1
  Hardening** section below for the full mechanics and for the cleanup that removed the old
  join route entirely.
- [x] **Task 11.** No-fill fallback — `POST /group-formations/expire-past-due` cancels
  past-due `waiting`/`forming` groups and cascades cancellation to their still-`pending` bookings.
- [x] **Task 12.** Checkout & e-ticketing — `POST /api/bookings` returns a unique text
  `ticket_code` (e.g. `TP-698EB3E7`). Scannable QR ticketing is also live: `QRCodeSVG` (from
  `qrcode.react`) renders client-side against `ticket.ticket_code` on both the post-booking
  confirmation view and the e-ticket detail page — generated entirely in the frontend, so no
  backend QR library was ever needed. Payment is simulated: `payment.card_number` is checked
  for presence only, never stored or charged.
- [x] **Task 13.** Reviews & operator rating rollup.
- [x] **Task 14.** Tour comparison (`GET /api/tours/compare?ids=1,2,3`, 2–3 ids enforced).
- [x] **Task 15.** Last-minute deals (`GET /api/deals`, `discounted_price` on `GET /tours/:id`).
- [x] **Task 16.** Smart Planner — greedy heuristic (interest-match/price ratio, budget/day capped).
  Deliberately not a full TOPTW solver (NP-complete) — see Task 17.
- [ ] **Task 17.** (Stretch) Planner optimization upgrade — deferred, not abandoned.
- [x] **Authentication** (Sprint 1 Addendum) — `POST /api/auth/signup`, `POST /api/auth/login`,
  `GET /api/auth/me`. bcrypt-hashed passwords, JWT sessions.
- [x] **Swagger/OpenAPI** — `/api-docs`, every endpoint documented and testable via "Try it out."
### Frontend — all delivered
- [x] **Task 4 (superseded).** Real homepage — live tour/operator data, category filter chips,
  search, responsive grid, persistent nav. Tour cards use category-colored gradients, not photos
  (`tours` has no `image` field yet — deliberate, not an oversight).
- [x] **Task 5.** Wireframes — delivered as an AI-generated clickable React/TypeScript prototype
  instead of static Figma frames (`docs/figma.md`, `docs/figma-prototype/`).
- [x] Stub pages so nav doesn't 404: `tours/[id]`, `compare`, `planner`, `bookings`.
- [x] `npm run build` passes with zero errors (after relocating an unused 46-file shadcn/ui
  bundle that was silently breaking prod builds — dev mode never caught it since dev only
  compiles files that are actually imported).
- [x] **Auth & user-state persistence** — JWT stored client-side, session re-validated against
  the backend on load (never trusted blindly), Traveler/Operator mode toggle, protected-route
  guard (`useRequireAuth`). Verified directly in `AuthContext.tsx`.
- [x] **Interactive destination map** (`DestinationMap.tsx`) — Leaflet map on the homepage,
  pins tours by a normalized-city coordinate lookup (handles Azerbaijani/English name variants,
  e.g. `sheki`/`şəki`), jitters overlapping pins at the same city, popup shows title/location/
  price/link. Unmatched locations are skipped with a console warning rather than crashing.
  Map is properly torn down and rebuilt on `tours` changes (cleanup resets the ref before the
  next effect run), so it won't go stale as data updates.
### Frontend — not yet built (carried forward, not abandoned)
- [ ] **Task 18.** Tour detail page — currently a functional stub (core fields only); full
  designed screen from `docs/figma-prototype/` not yet built. No image gallery (blocked on
  adding an `image` field/table to the schema first).
- [~] **Task 19.** Booking & e-ticket UI — in progress. Checkout page
  (`frontend/app/tours/[id]/book/page.tsx`), My Bookings, and the e-ticket detail page (QR via
  `qrcode.react`) are built; see Post-Sprint-1 Hardening below for a checkout bug fix.
- [ ] **Task 20.** Operator dashboard UI — backend CRUD live and tested, frontend not started.
- [ ] **Task 21.** Comparison & Planner UI — stub pages only, backend live and tested.
- [ ] **Task 22.** Formal end-to-end integration pass — not run as one pass; pieces verified
  individually as built.
- [ ] **Task 23.** Final presentation deck — not started. Seed data already verified sufficient.
- [ ] Dedicated frontend filter-bar component beyond the existing category chips — backend
  filtering (Task 8) works; a richer client-side filter UI is not confirmed built.
### Known dependency debt
- `next` pinned to `14.2.35` (last patch before Next 14 EOL, Oct 2025). Two high-severity
  `npm audit` advisories require the Next 16 breaking upgrade — deliberately deferred.
---
 
## Post-Sprint-1 Hardening (security & correctness fixes, done outside the sprint plan)
 
Found and fixed during a code review pass before Sprint 1 closed. None of these were caught by
the original task Check criteria, which is exactly why they're logged here explicitly rather
than folded quietly into the tasks above.
 
- [x] **`reviews.js` had no auth.** It accepted a client-supplied `user_id` in the body, or
  created a throwaway "guest" account from any `{name, email}` pair with no password — meaning
  anyone could post a review as any existing user, or under any existing email. Fixed:
  `requireAuth` added, identity now comes only from the verified JWT (same pattern as
  `tours.js`/`bookings.js`/`operators.js`), plus a new one-review-per-user-per-tour guard.
  **Still open:** reviews are not yet restricted to travelers who actually completed a booking
  on that tour — anyone with an account can review any tour. Tracked below under Sprint 4.
- [x] **`deals.js` had no auth or ownership check at all.** Any request, authenticated or not,
  could create a discount deal on any operator's tour with an arbitrary `discount_percent`.
  Fixed: `requireAuth` + ownership check mirroring `tours.js`'s pattern (caller's operator
  profile must own the `tour_id`).
- [x] **Dead legacy routes removed from `groupFormations.js`.** `POST /group-formations` and
  `POST /:id/join` were leftovers from the pre-redesign join-based flow (see Task 10 note
  above) — they let someone bump a group's `current_participants` and recalculated price with
  **no booking created**, completely bypassing payment and desyncing price from what
  `bookings.js` actually charges. Removed; only the read-only `GET` routes and the Task 11
  `expire-past-due` job remain.
- [x] **Missing capacity check on confirmed groups in `bookings.js`.** The `waiting`/`forming`
  path correctly rejected bookings that would exceed `tour.max_participants`; the already-
  `confirmed` path had no such check and could be overbooked indefinitely. Fixed, and
  `current_participants` is now kept in sync on that path too so the check stays accurate
  across repeated bookings.
- [x] **`AuthContext.tsx` mode-hydration gap.** `setMode('operator')` correctly refused to
  switch modes without a real operator profile, but the initial page-load hydration from
  `localStorage` applied a stored `'operator'` mode before/without checking that a profile
  actually existed, and never corrected it if the profile fetch came back null. Fixed on both
  paths (profile fetch resolves null → revert to traveler; no token at all → revert to
  traveler).
- [x] **`openapi.json` updated** to add the missing `/deals` paths and correct `/reviews` to
  show it now requires `bearerAuth`.
- [x] **Silent group-pricing bug in booking checkout fixed.** `frontend/app/tours/[id]/book/page.tsx`
  was calling `GET /api/group-formations` without a `tour_id` filter and treating the response
  as an array; in practice the endpoint returns a single object (or `null`) for a given tour, so
  the active-group banner and the locked-in per-person group price silently failed to render
  during checkout — no error, just missing UI. Fixed by passing `tour_id` as a query param and
  handling the single object/`null` shape correctly.
---
 
## Sprint 2 (self-authored, not yet started)
 
- [ ] Dedicated filter-bar UI component (location, price range, tour type) wired to the
  existing backend search params — even client-side-only filtering over fetched data is a
  reasonable first cut.
- [ ] Tour Details page — full build: itinerary, operator info, dynamic pricing display, image
  gallery (needs an `image`/`images` field added to the schema first — currently absent by
  design).
- [ ] Booking Checkout Flow UI — step-by-step date selection, guest/seat count, mock payment
  screen, wired to the existing `POST /api/bookings`.
---
 
## Sprint 3 (self-authored, not yet started)
 
**Availability & real payments**
- [ ] `Inventory`/`Availability` schema: `tour_id`, `date`, `time_slot`, `max_capacity`,
  `booked_count`.
- [ ] `GET /api/tours/:id/availability?date=YYYY-MM-DD`.
- [ ] Stripe SDK integration; `POST /api/payments/create-intent`.
- [ ] `POST /api/payments/webhook` handling `payment_intent.succeeded` → auto-confirm booking.
- [ ] Date/time-slot picker + guest-count selector on the tour detail/checkout page.
- [ ] Embedded Stripe Payment Elements (no full-page redirect).
- [ ] Loading / card-declined / success states for the real payment flow.
**Cancellation & dashboards**
- [ ] `POST /api/bookings/:id/cancel` — release capacity back to inventory, process a Stripe
  refund.
- [ ] "Cancel Reservation" button + confirmation modal on the My Trips UI (once built in
  Sprint 2).
- [ ] Extend the Operator Dashboard (once built) with daily manifests and revenue metrics.
- [ ] End-to-end payment testing: successful card, declined card, booking an out-of-stock slot.
**Sprint 3 acceptance criteria**
- ✅ A user can select a date/time slot, verify availability, and pay via embedded card inputs.
- ✅ Stripe webhooks auto-confirm bookings — no manual DB edits.
- ✅ Booking a slot decreases capacity; fully booked dates block further checkout.
- ✅ Travelers can view and cancel reservations from My Trips.
- ✅ Operators can view incoming reservations and guest lists on their dashboard.
---
 
## Sprint 4 (self-authored, not yet started)
 
Trust, social proof, and the platform's differentiators.
 
- [ ] **Reviews restricted to verified buyers only.** Currently any authenticated user can
  review any tour regardless of whether they booked it — this is a real, currently-open gap
  (see Post-Sprint-1 Hardening above), not just a nice-to-have. `POST /api/reviews` needs to
  check for a `confirmed` booking by that user on that tour before allowing a review.
- [ ] In-app messaging/inquiries between travelers and operators (WebSocket/Socket.io or
  polling).
- [x] ~~Digital ticket with an actual scannable QR code~~ — done ahead of schedule, see Task 12
  above (`QRCodeSVG` on confirmation + e-ticket detail page).
- [ ] Notification system — email confirmations (with the existing QR ticket attached),
  new-order alerts, cancellation notices (SendGrid/Nodemailer).
- [ ] AI Trip Assistant widget. **Note:** the existing Smart Planner (Task 16) is a rule-based
  greedy heuristic over budget/days/interests, not an LLM-driven assistant — it could evolve
  into this differentiator, or this could ship as a separate feature. Worth deciding which
  before starting, so effort isn't duplicated.
**Sprint 4 acceptance criteria**
- ✅ Only users with a completed, confirmed booking can leave a review on that tour.
- ✅ Automated confirmation emails with QR attachments dispatch on purchase.
- ✅ Messaging works cleanly between traveler and operator accounts.
- ✅ The AI Assistant (or whichever feature ships as the differentiator) produces valid
  recommendations in the frontend.