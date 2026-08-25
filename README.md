# TurPoint — Centralized Tourism Marketplace for Azerbaijan
 
![TurPoint Banner](https://img.shields.io/badge/Status-In%20Development-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18.x-brightgreen?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black?style=for-the-badge)
 
> **Holberton School Final Portfolio Project**
> TurPoint bridges the gap between local tour operators, independent guides, and travelers in Azerbaijan through a unified, dynamic, and intelligent marketplace platform.
 
---
 
## Table of Contents
- [About the Project](#about-the-project)
- [Key Features & Key Differentiators](#key-features--key-differentiators)
- [Tech Stack](#tech-stack)
- [Architecture & Flow](#architecture--flow)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Sprint Roadmap](#sprint-roadmap)
- [The Team](#the-team)
- [License](#license)
---
 
## About the Project
 
In Azerbaijan, local tourism is heavily fragmented across Instagram pages, Facebook groups, and WhatsApp chats. Finding verified tours, comparing pricing, checking real-time availability, and reading genuine reviews is time-consuming and unreliable.
 
**TurPoint** solves this by offering a transparent two-sided marketplace where tour companies and independent guides can publish tours, manage bookings, and optimize occupancy, while travelers can discover, compare, and book verified trips seamlessly.
 
---
 
## Key Features & Key Differentiators
 
### Core Differentiators
1. **Dynamic Group Formation & Group Discount Model**
   - Solo travelers or small groups reserve spots on tours that require a minimum capacity threshold.
   - Booking *is* what advances the group — there's no separate "join" action disconnected from an actual reservation. A booking against a group that hasn't hit its minimum goes in as `pending`; the moment any booking tips the group over its minimum, that booking **and every earlier pending booking on the same group** settle together at the same final per-person price:
     $$\text{Per Person Cost} = \frac{\text{Total Tour Cost}}{\text{Number of Participants}}$$
   - If a group never fills before the tour date, it's cancelled automatically and any pending bookings on it cancel with it.
2. **Smart Travel Planner**
   - An algorithmic itinerary generator that builds tour combinations given a user's budget, day count, and interest preferences.
   - Deliberately a **greedy heuristic** (rank by interest-match-per-price, fill budget) rather than a full solver — the underlying problem is a variant of the Team Orienteering Problem with Time Windows (TOPTW), which is NP-complete. A knapsack/local-search upgrade is a documented stretch goal.
### Standard Features
- **Dual-mode accounts:** every user can be a traveler, an operator, or both — a mode toggle in the UI switches between traveler nav and an operator dashboard. Operator profiles are owned by the authenticated account (`operators.user_id`); ownership is always derived from the verified JWT, never trusted from a request body.
- **Operator Dashboard (backend):** create/edit an operator profile, list and delete owned tours, view incoming bookings across all owned tours. Frontend UI for this is planned, not yet built — see the Sprint Roadmap.
- **Tour Management & Comparison:** filter by location, date, price, and category; compare 2–3 tours side-by-side.
- **Reviews & Ratings:** travelers rate completed tours (1–5 stars); an operator's average rating rolls up automatically. **Not yet restricted to verified buyers** — currently any authenticated user can review any tour, regardless of whether they booked it. Tracked as a Sprint 4 item.
- **Last-Minute Deals:** discounted pricing for upcoming tours with open capacity, restricted to the owning operator.
- **Booking & E-Ticketing:** authenticated booking flow with a unique text `ticket_code` per booking, rendered as a scannable QR code (`qrcode.react`'s `QRCodeSVG`) on both the post-booking confirmation view and the e-ticket detail page — generated client-side from the ticket code, no backend QR library needed.
- **"My Trips":** a traveler's own bookings, past and upcoming (`GET /api/bookings/my-trips`).
- **Authentication:** email/password sign-up and login with bcrypt-hashed passwords and JWT sessions, with client-side session persistence and re-validation on load.
---
 
## Tech Stack
 
| Tier | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14.2.35, React 18, TypeScript, Tailwind CSS | Responsive UI, App Router |
| **Backend** | Node.js, Express.js | RESTful API endpoints, state management |
| **Database** | SQLite (better-sqlite3) | Lightweight relational database engine |
| **Auth** | bcryptjs, jsonwebtoken | Password hashing, JWT session tokens, ownership-scoped routes |
| **API Docs** | swagger-ui-express | Interactive, testable OpenAPI documentation at `/api-docs` |
| **Icons** | lucide-react | UI iconography |
| **Maps & Location** | Leaflet | Interactive homepage destination map, pinning tours by city — replaces the originally-planned Google Maps API, no paid key required |
| **Design & Prototyping** | AI-generated clickable prototype (React/TypeScript) | UI/UX reference — see `docs/figma-prototype/`; see [decision note](docs/figma.md) |
| **Payments** | Simulated (card number presence only, nothing charged) | Real Stripe integration is Sprint 3 scope |
| **Hosting & CI/CD** | Vercel / Railway | *Planned, not yet deployed* |
 
---
 
## Architecture & Flow
 
```
+-------------------+        +--------------------+        +---------------------+
|  Next.js Frontend | <----> | Express REST API   | <----> |   SQLite Database   |
| (App Router, TS)  |        | (Auth, Logic, Ops) |        | (Tours, Users, Ops) |
+-------------------+        +--------------------+        +---------------------+
                                       |
                                       v
                              +------------------+
                              | Swagger / OpenAPI|
                              |   (/api-docs)    |
                              +------------------+
```
 
---
 
## Getting Started
 
### Prerequisites
- Node.js (v18.x or higher)
- npm
### Installation
 
1. **Clone the repository:**
```bash
   git clone https://github.com/leyla009/turpoint-marketplace.git
   cd turpoint-marketplace
```
 
2. **Install dependencies for backend & frontend separately:**
```bash
   cd backend && npm install
   cd ../frontend && npm install
```
 
3. **Configure environment variables** — two separate files, each inside its own folder:
   `backend/.env` (copy from `backend/.env.example`):
```env
   PORT=4000
   JWT_SECRET=your_own_secret_here
```
   `JWT_SECRET` falls back to a development default if unset — set a real value before any real deployment.
 
   `frontend/.env.local`:
```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
```
   **If developing in GitHub Codespaces**, `localhost` will NOT work here — see the Codespaces note below.
 
4. **Create the schema and seed demo data:**
```bash
   cd backend
   node src/db/index.js
   npm run seed
```
   The schema step also applies a safe, idempotent migration adding `operators.user_id` if it isn't already there — fine to run repeatedly.
 
5. **Start both dev servers, in two separate terminals:**
```bash
   # Terminal 1
   cd backend && npm run dev
 
   # Terminal 2
   cd frontend && npm run dev
```
   Open `http://localhost:3000` for the app, and `http://localhost:4000/api-docs` for the interactive API docs.
 
### A note on GitHub Codespaces
 
This project has been primarily developed inside GitHub Codespaces. The frontend's (and your browser's, generally) API calls run in your **browser**, not inside the container — so `localhost` refers to your own machine, not the Codespace, and will fail to connect for *anything* you open in-browser, including `/api-docs`.
 
1. Open the **Ports** tab in VS Code, find port `4000`, set its visibility to **Public**.
2. Copy the forwarded URL shown there (e.g. `https://your-codespace-name-4000.app.github.dev`) — use this for `NEXT_PUBLIC_API_URL` in `frontend/.env.local`, **and** use it directly in your browser instead of typing `localhost:4000` by hand.
3. Restart the frontend dev server after any change to `.env.local` — Next.js only reads it at startup, not live.
---
 
## API Documentation
 
Every endpoint is documented and directly testable via Swagger UI once the backend is running:
```
http://localhost:4000/api-docs
```
(or the Codespaces-forwarded equivalent, per the note above). Covers auth, operators, tours, group formations, bookings, reviews, deals, and the planner — kept current with the actual route set as of the last hardening pass (see TASKS.md).
 
---
 
## Sprint Roadmap
 
TurPoint's actual school-assigned deliverable is **Sprint 1**, below. Sprints 2–4 are a
self-authored forward plan, not school-assigned deadlines — see `TASKS.md` for the full
task-by-task breakdown, including a reconciliation table showing which "Sprint 2/3" items
turned out to already be built.
 
### Sprint 1 — Initial MVP Setup — ✅ COMPLETE (deadline 25.08.2026)
- [x] Backend structure, core API endpoints, auth (signup/login), Swagger documentation
- [x] Real homepage: live data, category filters, search, responsive, persistent nav, Leaflet destination map
- [x] `npm run build` passes with zero errors
- [x] Dual-mode auth with client-side session persistence
- [x] Tour detail page, booking UI — built (see `TASKS.md` Task 18/19)
- [ ] Operator dashboard UI, comparison/planner UI — backend live and tested; frontend still stub pages
- [ ] Formal end-to-end integration pass, final presentation deck
**Post-Sprint-1 hardening:** a security/correctness review found and fixed several gaps that
predated this document — most notably, `POST /api/reviews` and `POST /api/deals` had no auth
at all (client-supplied identity and no ownership checks, respectively), a dead legacy
group-join route was still live and bypassed the booking flow entirely, and confirmed groups
had no capacity check. A later fix corrected a silent bug in the booking checkout page where
active group-formation banners and locked-in group pricing failed to render because the
`group-formations` request wasn't filtered by `tour_id` and mishandled the endpoint's
single-object response shape. All fixed — see `TASKS.md` for the full list.
 
### Sprint 2 — planned, not started
Dedicated filter-bar UI, full Tour Details page (incl. image
gallery — needs a schema change first), Booking Checkout Flow UI.
 
### Sprint 3 — planned, not started
Real Stripe payments, date/time-slot availability & capacity, cancellation/refunds, extended
My Trips and Operator Dashboard UI.
 
### Sprint 4 — planned, not started
Reviews restricted to verified buyers (a real current gap, not just future polish), in-app
messaging, email notifications (QR-code ticketing itself is already live — see Task 12), and a
decision on whether the existing greedy Smart Planner evolves into the "AI Trip Assistant"
differentiator or ships as something separate.
 

---

## The Team

Created as a Holberton School Final Portfolio Project:

- **Leyla Khaspoladova** — Product Manager / Software Engineer
- **Ramil Mammadov** — Backend Engineer / Lead Architecture
- **Huseyn Sadatkhanov** —
- **Aytakin Imanova** — Frontend Engineer / Design System

---
