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
- [Project Roadmap](#project-roadmap)
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
   - Enables solo travelers or small groups to reserve spots on tours that require a minimum capacity threshold.
   - Real-time dynamic pricing: as participant numbers increase, the per-person cost decreases automatically:
     $$\text{Per Person Cost} = \frac{\text{Total Tour Cost}}{\text{Number of Participants}}$$
   - State transitions: `waiting` → `forming` → `confirmed`, with an automatic `cancelled` fallback if a group doesn't fill before the tour date.

2. **Smart Travel Planner**
   - An algorithmic itinerary generator that builds tour combinations given a user's budget, day count, and interest preferences.
   - Deliberately implemented as a **greedy heuristic** (rank by interest-match-per-price, fill budget) rather than a full solver — the underlying problem is a variant of the **Team Orienteering Problem with Time Windows (TOPTW)**, which is NP-complete. The greedy version ships fast and gives explainable, if not mathematically optimal, results. A knapsack/local-search upgrade is a documented stretch goal, not a blocker.

### Standard Features
- **Operator Profiles:** Branding, vehicle specs (Wi-Fi, AC, baggage capacity), language capabilities, and a rating that rolls up automatically from traveler reviews.
- **Tour Management & Comparison:** Filter by location, date, price, and category; compare 2–3 tours side-by-side.
- **Reviews & Ratings:** Travelers rate completed tours (1–5 stars); an operator's average rating recalculates on every new review.
- **Last-Minute Deals:** Discounted pricing for upcoming tours with open capacity.
- **Simulated Checkout & E-Ticketing:** Booking flow with a simulated payment step and a unique ticket code per booking.
- **Authentication:** Email/password sign-up and login with bcrypt-hashed passwords and JWT sessions.

---

## Tech Stack

| Tier | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14.2.35, React 18, TypeScript, Tailwind CSS | Responsive UI, App Router |
| **Backend** | Node.js, Express.js | RESTful API endpoints, state management |
| **Database** | SQLite (better-sqlite3) | Lightweight relational database engine |
| **Auth** | bcryptjs, jsonwebtoken | Password hashing, JWT session tokens |
| **API Docs** | swagger-ui-express | Interactive, testable OpenAPI documentation at `/api-docs` |
| **Icons** | lucide-react | UI iconography |
| **Design & Prototyping** | AI-generated clickable prototype (React/TypeScript) | UI/UX reference — see `docs/figma-prototype/`; see [decision note](docs/figma.md) |
| **Maps & Location** | Google Maps API | *Planned, not yet integrated* |
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

3. **Configure environment variables** — these are two separate files, each inside its own folder, not one root `.env`:

   `backend/.env` (copy from `backend/.env.example`):
   ```env
   PORT=4000
   JWT_SECRET=your_own_secret_here
   ```
   `JWT_SECRET` falls back to a development default if unset, but set a real value before any real deployment.

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
   (There is no `db:migrate` script — schema creation and seeding are two separate, explicit commands.)

5. **Start both dev servers, in two separate terminals:**
   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend && npm run dev
   ```
   Open `http://localhost:3000` for the app, and `http://localhost:4000/api-docs` for the interactive API docs.

### A note on GitHub Codespaces

This project has been primarily developed inside GitHub Codespaces. The frontend's API calls run in your **browser**, not inside the container — so `localhost` in `NEXT_PUBLIC_API_URL` refers to your own machine, not the Codespace, and will fail to connect.

1. Open the **Ports** tab in VS Code, find port `4000`, and set its visibility to **Public**.
2. Copy the forwarded URL shown there (e.g. `https://your-codespace-name-4000.app.github.dev`) into `frontend/.env.local` as `NEXT_PUBLIC_API_URL`.
3. Restart the frontend dev server after any change to `.env.local` — Next.js only reads it at startup, not live.

---

## API Documentation

Every endpoint is documented and directly testable via Swagger UI once the backend is running:

```
http://localhost:4000/api-docs
```

(or the Codespaces-forwarded equivalent, per the note above). Covers auth, operators, tours, group formations, bookings, reviews, deals, and the planner.

---

## Project Roadmap

### Week 1 — Setup & Foundations
- [x] Repository setup, database schema, seed data
- [x] Express server skeleton
- [x] Figma wireframes (delivered as an AI-generated clickable prototype — see `docs/figma.md`)

### Week 2 — Core Marketplace & Group Formation
- [x] Operator CRUD
- [x] Tour listing CRUD + search/filter
- [x] Group formation dynamic pricing state machine
- [x] Authentication (sign up / login) — added ahead of schedule for the Sprint 1 review
- [ ] Operator dashboard UI (backend CRUD exists; UI is Week 4 scope)

### Week 3 — Booking, Reviews, Comparison & Smart Planner
- [x] Booking flow + simulated payment + e-ticket
- [x] Reviews & operator rating rollup
- [x] Tour comparison endpoint
- [x] Last-minute deals
- [x] Smart Planner (greedy heuristic)

### Week 4 — Frontend, Integration & Final Defense Prep
- [x] Real homepage (search, category filters, live API data, responsive) — built ahead of schedule for the Sprint 1 review
- [x] Swagger/OpenAPI documentation — added for the Sprint 1 review
- [x] Verified production build (`npm run build`) with no errors
- [ ] Tour detail page (currently a functional stub — full UI still pending)
- [ ] Booking & e-ticket UI
- [ ] Operator dashboard UI
- [ ] Comparison & Planner UI (backend endpoints live; frontend still stub pages)
- [ ] End-to-end integration pass across all user journeys
- [ ] Staging deployment
- [ ] Final presentation deck

---

## The Team

Created as a Holberton School Final Portfolio Project:

- **Leyla Khaspoladova** — Product Manager / Software Engineer
- **Ramil Mammadov** — Backend Engineer / Lead Architecture
- **Huseyn Sadatkhanov** — Full-Stack Engineer / UI Implementation
- **Aytakin Imanova** — Frontend Engineer / Design System

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

