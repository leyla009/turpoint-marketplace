# TASKS

Holberton-style rule: **one task = one small, verifiable change.** Finish a
task, test it against its "Check" criteria, commit with a standard message like
`feat: task 4 - tour search endpoint`, then move on. Do not start task N+1
before task N is committed and checked.

Tasks are grouped under the project brief's four weekly Mərhələ so you can track
progress against the graduation timeline.

---

## Mərhələ 1 — Setup & Foundations (Week 1)

### Task 0. Repo & Tooling
Initialize the git repository, add `.gitignore`, and confirm both `backend/` and
`frontend/` environments install cleanly.
- **Files:** `.gitignore`, `backend/package.json`, `frontend/package.json`
- **Check:** `npm install` succeeds in both folders with zero errors.

### Task 1. Database Schema & SQLite WAL Configuration
Write the SQLite schema for all core entities: `operators`, `tours`, `users`,
`bookings`, `group_formations`, `reviews`, and `last_minute_deals`. Configure 
SQLite connection with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and 
a 5000ms busy timeout to prevent `SQLITE_BUSY` errors during concurrent write tests.
- **Files:** `backend/src/db/schema.sql`, `backend/src/db/index.js`
- **Check:** Running `node src/db/index.js` creates `turpoint.db` with all tables
  (`sqlite3 turpoint.db ".tables"` lists all 7 tables).

### Task 2. Express Server Skeleton
Create an Express server instance with CORS, JSON middleware, and a health-check route.
- **Files:** `backend/src/server.js`, `backend/.env.example`
- **Check:** `GET http://localhost:4000/api/health` returns `{ "status": "ok" }`.

### Task 3. Seed Data Generation
Create seed scripts providing 15–20 realistic demo tours across multiple operators 
(prevents cold-start data scarcity during Smart Planner testing).
- **Files:** `backend/src/db/seed.js`
- **Check:** `node src/db/seed.js` populates `tours` and `operators` with 20+ rows;
  `SELECT COUNT(*) FROM tours;` in SQLite CLI returns `20`.

### Task 4. Frontend Skeleton & API Connection
Initialize Next.js app with Tailwind CSS. Implement a homepage fetching `/api/health` 
to verify end-to-end frontend↔backend communication.
- **Files:** `frontend/app/page.jsx`, `frontend/app/layout.jsx`, `frontend/.env.example`
- **Check:** `npm run dev` in `frontend/` renders "API status: ok" in browser.

### Task 5. Figma Wireframe Deliverable
Design low-fidelity wireframes for the Operator Dashboard and Traveler Booking flows.
- **Deliverable:** Update `docs/figma.md` with the shareable Figma link.
- **Check:** Link contains screen flows for: Search ➔ Details ➔ Booking ➔ Confirmation, 
  and Operator Profile ➔ Add Tour ➔ Booking List.

---

## Mərhələ 2 — Core Marketplace & Group Formation (Week 2)

### Task 6. Operator CRUD Endpoints
Implement operator account creation, profile lookup, and vehicle specification updates.
- **Files:** `backend/src/routes/operators.js`
- **Check:** `POST /api/operators` creates an operator; `GET /api/operators/:id` 
  returns the record.

### Task 7. Tour Listing CRUD
Allow operators to post tours with route details, base prices, tour dates, and min/max group sizes.
- **Files:** `backend/src/routes/tours.js`
- **Check:** `POST /api/tours` with valid `operator_id` succeeds; `GET /api/tours` returns the tour.

### Task 8. Multi-Parametric Search & Filtering
Implement tour filtering by location/region, date range, price range, and category.
- **Files:** Extend `backend/src/routes/tours.js` (`GET /api/tours?...`)
- **Check:** `GET /api/tours?location=Quba&maxPrice=100` filters correctly.

### Task 9. Lock Business Constants (Day 1–2 of Week 2)
Lock core marketplace parameters before building state machine logic: minimum group size defaults 
and platform commission percentage.
- **Deliverable:** Document decisions in `docs/decisions.md`.
- **Check:** `docs/decisions.md` specifies default min group size (e.g., 4) and commission rate (e.g., 10%).

### Task 10. Group Formation Dynamic Pricing State Machine
Implement group joining logic. Recalculate `price_per_person` dynamically on each new join. 
Automatically flip status from `waiting` to `confirmed` when `current_participants >= min_participants`.
- **Files:** `backend/src/routes/groupFormations.js`
- **Check:** Submitting 3 join requests to a tour with `min_participants = 3` updates `status` to 
  `confirmed` and recalculates price split correctly.

### Task 11. Group Formation Timeout / Unfulfilled Fallback Rule
Implement automated handling for groups that do not meet minimum capacity by the deadline 
(24 hours prior to tour departure).
- **Logic:** Mark group status as `cancelled`, release hold, flag simulated payment for refund, 
  and generate notification record.
- **Files:** Extend `backend/src/routes/groupFormations.js`
- **Check:** A group past its confirmation threshold with `current_participants < min_participants` 
  returns `status: "cancelled"` with fallback metadata.

---

## Mərhələ 3 — Booking, Reviews, Comparison & Smart Planner (Week 3)

### Task 12. Checkout & Simulated E-Ticketing
Implement ticket purchase simulation, seat inventory deduction, and unique e-ticket generation.
- **Files:** `backend/src/routes/bookings.js`
- **Check:** `POST /api/bookings` returns a booking payload containing a unique ticket hash/QR ID; 
  `GET /api/bookings/:id` retrieves valid ticket details.

### Task 13. Reviews & Operator Rating Rollup
Allow verified travelers to submit post-tour ratings (1–5 stars) and comments. Update the operator's 
aggregate score on submission.
- **Files:** `backend/src/routes/reviews.js`
- **Check:** Submitting a review recalculates the target operator's average rating field in `operators`.

### Task 14. Side-by-Side Tour Comparison
Implement endpoint accepting 2 to 3 tour IDs and returning structured side-by-side comparison data.
- **Files:** `backend/src/routes/tours.js` (`GET /api/tours/compare?ids=1,2,3`)
- **Check:** Request returns an array of matching tour objects with aligned schema attributes.

### Task 15. Last-Minute Deals Endpoint
Allow operators to post discounted seat inventory for tours departing within 48 hours.
- **Files:** `backend/src/routes/deals.js`
- **Check:** `GET /api/deals` lists active discounted tours with original vs discounted prices.

### Task 16. Smart Travel Planner — Greedy Heuristic
Implement itinerary selection based on user budget ($B$), time length in days ($D$), and interests. 
Rank tours using an `(interest_match / cost)` efficiency ratio, greedily filling budget constraints.
- **Note:** Do not attempt full NP-hard TOPTW solvers in Week 3; focus on fast, deterministic, 
  and explainable results.
- **Files:** `backend/src/routes/planner.js`
- **Check:** `POST /api/planner` with `{ budget: 300, days: 3, interests: ["nature", "history"] }` 
  returns a itinerary combination where total cost $\le 300$ AZN and duration $\le 3$ days.

### Task 17. (Stretch Goal) Planner Optimization Upgrade
*Only execute if Task 16 is completed ahead of schedule.* Refine greedy planner output using local 
search optimization or 0/1 knapsack dynamic programming.
- **Check:** Compares output quality against Task 16 benchmark results on seed data.

---

## Mərhələ 4 — Frontend, Integration & Final Defense Prep (Week 4)

### Task 18. Tour Search & Detail UI Views
Build responsive catalog search page with real-time filters and detailed tour information view.
- **Files:** `frontend/app/tours/page.jsx`, `frontend/app/tours/[id]/page.jsx`

### Task 19. Booking & E-Ticket Modal UI
Implement traveler checkout flow and digital e-ticket display.
- **Files:** `frontend/app/tours/[id]/book/page.jsx`

### Task 20. Operator Dashboard Interface
Build operator panel displaying active listings, incoming bookings, and group formation status.
- **Files:** `frontend/app/dashboard/page.jsx`

### Task 21. Dynamic Comparison & Smart Planner UI Views
Build visual comparison matrix for 2–3 tours and an interactive form for the Smart Planner feature.
- **Files:** `frontend/app/compare/page.jsx`, `frontend/app/planner/page.jsx`

### Task 22. End-to-End System Integration Pass
Verify complete user journeys in browser (Traveler: Search ➔ Compare ➔ Group Join ➔ Book; 
Planner: Input Budget ➔ Generate ➔ Confirm; Operator: Add Tour ➔ Manage Seats).
- **Check:** Zero browser console errors, responsive mobile viewport compliance, no broken API endpoints.

### Task 23. Seed Data Verification & Final Presentation Deck
Confirm database seed data supports a clean live presentation story. Prepare final slide deck and 
practice portfolio defense presentation.
