# TASKS

Holberton-style rule: **one task = one small, verifiable change.** Finish a task, test it against its "Check" criteria, commit with a standard message like `feat: task 4 - tour search endpoint`, then move on. Do not start task N+1 before task N is committed and checked.

Tasks are grouped under the project brief's four weekly Mərhələ so you can track progress against the graduation timeline. A **Sprint 1 Addendum** at the end covers work that was pulled forward out of its natural week to satisfy an external rubric deadline — see that section for why the order doesn't always match the numbering below.

---

## Mərhələ 1 — Setup & Foundations (Week 1)

### Task 0. Repo & Tooling

Initialize the git repository, add `.gitignore`, and confirm both `backend/` and `frontend/` environments install cleanly.

-   **Files:** `.gitignore`, `backend/package.json`, `frontend/package.json`
-   **Check:** `npm install` succeeds in both folders with zero errors.

### Task 1. Database Schema & SQLite WAL Configuration

Write the SQLite schema for all core entities: `operators`, `tours`, `users`, `bookings`, `group_formations`, `reviews`, and `last_minute_deals`. Configure SQLite connection with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`).

-   **Files:** `backend/src/db/schema.sql`, `backend/src/db/index.js`
-   **Check:** Running `node src/db/index.js` creates `turpoint.db` with all tables (`sqlite3 turpoint.db ".tables"` lists all 7 tables).

### Task 2. Express Server Skeleton

Create an Express server instance with CORS, JSON middleware, and a health-check route.

-   **Files:** `backend/src/server.js`, `backend/.env.example`
-   **Check:** `GET http://localhost:4000/api/health` returns `{ "status": "ok" }`.

### Task 3. Seed Data Generation

Create seed scripts providing 15–20 realistic demo tours across multiple operators (prevents cold-start data scarcity during Smart Planner testing).

-   **Files:** `backend/src/db/seed.js`
-   **Check:** `node src/db/seed.js` populates `tours` and `operators` with 20+ rows; `SELECT COUNT(*) FROM tours;` in SQLite CLI returns `20`.

### Task 4. Frontend Skeleton & API Connection

Initialize Next.js app with Tailwind CSS. Implement a homepage fetching `/api/health` to verify end-to-end frontend↔backend communication.

-   **Files:** `frontend/app/page.tsx`, `frontend/app/layout.tsx`, `frontend/.env.local`
-   **Check:** `npm run dev` in `frontend/` renders "API status: ok" in browser.
-   **Superseded:** this placeholder homepage was replaced by the real homepage build documented in the Sprint 1 Addendum below. Kept here for the historical record of what unblocked frontend↔backend connectivity first.

### Task 5. Figma Wireframe Deliverable

Design low-fidelity wireframes for the Operator Dashboard and Traveler Booking flows.

-   **Deliverable:** Update `docs/figma.md` with the shareable Figma link.
-   **Actual delivery:** built as a fully interactive AI-generated React/TypeScript clickable prototype instead of static Figma frames — see `docs/figma.md` for the reasoning, and `docs/figma-prototype/` for the code.
-   **Check:** Screen flows exist for: Search → Details → Booking → Confirmation, and Operator Profile → Add Tour → Booking List.

---

## Mərhələ 2 — Core Marketplace & Group Formation (Week 2)

### Task 6. Operator CRUD Endpoints

Implement operator account creation, profile lookup, and vehicle specification updates.

-   **Files:** `backend/src/routes/operators.js`
-   **Check:** `POST /api/operators` creates an operator; `GET /api/operators/:id` returns the record.

### Task 7. Tour Listing CRUD

Allow operators to post tours with route details, base prices, tour dates, and min/max group sizes.

-   **Files:** `backend/src/routes/tours.js`
-   **Check:** `POST /api/tours` with valid `operator_id` succeeds; `GET /api/tours` returns the tour.

### Task 8. Multi-Parametric Search & Filtering

Implement tour filtering by location/region, date range, price range, and category.

-   **Files:** Extend `backend/src/routes/tours.js` (`GET /api/tours?...`)
-   **Check:** `GET /api/tours?location=Quba&maxPrice=100` filters correctly.

### Task 9. Lock Business Constants (Day 1–2 of Week 2)

Lock core marketplace parameters before building state machine logic.

-   **Deliverable:** Document decisions in `docs/decisions.md`.
-   **Decided:** minimum group size = **3 participants** (default; operators can override per tour via `tours.min_participants`); platform commission = **12%** of tour price. Full reasoning is in `docs/decisions.md`.
-   **Check:** `docs/decisions.md` contains both numbers and the reasoning, not placeholders.

### Task 10. Group Formation Dynamic Pricing State Machine

Implement group joining logic. Recalculate `price_per_person` dynamically on each new join. Automatically flip status from `waiting`/`forming` to `confirmed` when `current_participants >= min_participants`.

-   **Files:** `backend/src/routes/groupFormations.js`
-   **Check:** Submitting 3 join requests to a tour with `min_participants = 3` updates `status` to `confirmed` and recalculates the price split correctly on every join, not just the final one.

### Task 11. Group Formation No-Fill Fallback

Implement handling for groups that don't reach minimum capacity before the tour date.

-   **Files:** Extend `backend/src/routes/groupFormations.js` (`POST /group-formations/expire-past-due`)
-   **Actual scope:** any `waiting`/`forming` group whose tour date has passed gets flipped to `status: "cancelled"`. **Note:** this is simpler than originally planned — there is no 24-hour-specific deadline window, no automated refund flagging, and no notification record, since there's no payment provider or notification system yet (both are documented future work, not oversights). Payment for group bookings only happens after confirmation via `/bookings`, so there's nothing to refund at the "waiting" stage in the current design.
-   **Check:** A group whose tour date is in the past and still `waiting`/`forming` returns `status: "cancelled"` after calling the expire endpoint.

---

## Mərhələ 3 — Booking, Reviews, Comparison & Smart Planner (Week 3)

### Task 12. Checkout & Simulated E-Ticketing

Implement ticket purchase simulation and unique ticket code generation.

-   **Files:** `backend/src/routes/bookings.js`
-   **Actual scope:** generates a text `ticket_code` (e.g. `TP-698EB3E7`), not a QR code image — no QR generation library is used. No real payment provider; `payment.card_number` is validated for presence only, never stored or charged.
-   **Check:** `POST /api/bookings` returns a booking payload containing a unique `ticket_code`; `GET /api/bookings/:id` retrieves it with nested tour info.

### Task 13. Reviews & Operator Rating Rollup

Allow travelers to submit post-tour ratings (1–5 stars) and comments. Update the operator's aggregate score on submission.

-   **Files:** `backend/src/routes/reviews.js`
-   **Check:** Submitting a review recalculates the target operator's average `rating` field, averaged across all of that operator's tours — not just the tour the new review was posted on.

### Task 14. Side-by-Side Tour Comparison

Implement endpoint accepting 2 to 3 tour IDs and returning structured side-by-side comparison data.

-   **Files:** `backend/src/routes/tours.js` (`GET /api/tours/compare?ids=1,2,3`)
-   **Check:** Request returns an array of matching tour objects; requests with fewer than 2 or more than 3 ids are rejected with a 400.

### Task 15. Last-Minute Deals Endpoint

Allow operators to post discounted seat inventory for upcoming tours.

-   **Files:** `backend/src/routes/deals.js`, extends `backend/src/routes/tours.js`
-   **Check:** `GET /api/deals` lists active (non-expired) discounted tours; `GET /api/tours/:id` shows a `discounted_price` field when an active deal exists.

### Task 16. Smart Travel Planner — Greedy Heuristic

Implement itinerary selection based on user budget, day count, and interests. Rank tours using an `(interest_match / price)` efficiency ratio, greedily filling the budget while respecting the day limit.

-   **Note:** deliberately not a full TOPTW solver — see the Tech Stack rationale in `README.md`.
-   **Files:** `backend/src/routes/planner.js`
-   **Check:** `POST /api/planner` with `{ budget: 300, days: 3, interests: [...] }` returns a combination where total price ≤ 300 AZN and total days ≤ 3.

### Task 17. (Stretch Goal) Planner Optimization Upgrade

*Only execute if Task 16 is completed ahead of schedule.* Not started — deferred, not abandoned.

---

## Mərhələ 4 — Frontend, Integration & Final Defense Prep (Week 4)

### Task 18. Tour Search & Detail UI Views

The search/browse portion of this was effectively delivered early as part of the Sprint 1 homepage build (see addendum). What remains: the tour detail page is currently a functional stub showing core fields, not the full designed screen from `docs/figma-prototype/`.

-   **Files:** `frontend/app/page.tsx` (done), `frontend/app/tours/[id]/page.tsx` (stub, needs full build)

### Task 19. Booking & E-Ticket Modal UI

Not started. Backend (`/api/bookings`) is live and tested.

-   **Files:** `frontend/app/tours/[id]/book/page.jsx`

### Task 20. Operator Dashboard Interface

Not started. Backend CRUD (`/api/operators`, `/api/tours`) is live and tested.

-   **Files:** `frontend/app/dashboard/page.jsx`

### Task 21. Dynamic Comparison & Smart Planner UI Views

Currently stub pages (`/compare`, `/planner`) confirming the routes exist and nav works; the actual comparison matrix and planner form are not built yet. Backend endpoints are live and tested.

-   **Files:** `frontend/app/compare/page.tsx` (stub), `frontend/app/planner/page.tsx` (stub)

### Task 22. End-to-End System Integration Pass

Not started as a full pass, though individual pieces have been verified end-to-end as they were built (see commit history).

-   **Check:** Zero browser console errors, responsive mobile viewport compliance, no broken API endpoints.

### Task 23. Seed Data Verification & Final Presentation Deck

Seed data verified sufficient for demo purposes (20 tours across 3 operators, spans all 4 categories). Presentation deck not started.

---

## Sprint 1 Addendum (added outside the original week order)

The school's Sprint 1 rubric (deadline 25.08.2026) required Sign Up/Login APIs, Swagger documentation, and a complete Landing/Home page — none of which were explicit tasks above (Task 4 only ever planned a placeholder health-check page, and auth was mentioned in the original project brief's Mərhələ 2 narrative but never converted into its own numbered task). Rather than renumber everything above and break the existing commit-message ↔ task-number mapping, this work is tracked here instead.

### Authentication (Sign Up / Login)

-   **Files:** `backend/src/routes/auth.js`
-   **Endpoints:** `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
-   Passwords hashed with bcrypt; sessions via JWT. Note: users created earlier through the booking/review "guest checkout" flow have a random placeholder password hash and cannot log in through this route — only accounts created via `/signup` have real, working passwords. This is expected, not a bug.
-   **Check:** signup returns a user + token; login with wrong password returns 401.

### Swagger / OpenAPI Documentation

-   **Files:** `backend/src/openapi.json`, wired into `backend/src/server.js` via `swagger-ui-express`
-   **Check:** `/api-docs` renders every endpoint and supports "Try it out" directly in-browser.

### Real Homepage Build

-   **Files:** `frontend/app/page.tsx`, `frontend/app/components/TourCard.tsx`, `frontend/app/components/Nav.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/tailwind.config.js`
-   Fetches live tours/operators from the real backend (replacing Task 4's placeholder). Category filter chips, search, responsive grid (2 cols mobile → 4 cols desktop), persistent nav (sidebar desktop / bottom bar mobile). Tour cards use category-colored gradients instead of photos, since the `tours` table has no `image` field yet — a known, deliberate simplification, not an oversight.
-   **Stub pages added** so nav links don't 404: `frontend/app/tours/[id]/page.tsx`, `frontend/app/compare/page.tsx`, `frontend/app/planner/page.tsx`, `frontend/app/bookings/page.tsx`. These show real fetched data where applicable (tour detail) or a clear "coming soon" message otherwise.
-   **Cleanup:** an unused 46-file shadcn/ui component library (auto-generated alongside the Figma prototype, depending on uninstalled Radix packages) was relocated from `frontend/app/components/ui/` to `docs/figma-prototype/ui-components/` after it broke `npm run build` — dev mode had been silently ignoring it since dev mode only compiles files that are actually imported.
-   **Check:** `npm run build` completes with zero errors; responsive behavior verified via DevTools device toolbar at mobile and tablet widths.

### Known Dependency Debt

-   `next` is pinned to `14.2.35` — the final patch before Next.js 14 reached end-of-life (Oct 2025). Two remaining high-severity `npm audit` advisories require upgrading to Next 16, which is a breaking change — deliberately deferred past Sprint 1, not unnoticed.

### Explicitly Deferred (not forgotten, revisit with the team post-MVP)

-   Real payment provider (Stripe or similar) — payment is simulated by design for the MVP.
-   Google Maps integration.
-   Full TOPTW/knapsack upgrade to the planner (Task 17).
-   Next.js 14 → 16 migration.
