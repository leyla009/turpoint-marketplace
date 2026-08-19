# TurPoint — Centralized Tourism Marketplace for Azerbaijan

![TurPoint Banner](https://img.shields.io/badge/Status-In%20Development-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18.x-brightgreen?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14.x-black?style=for-the-badge)

> **Holberton School Final Portfolio Project**  
> TurPoint bridges the gap between local tour operators, independent guides, and travelers in Azerbaijan through a unified, dynamic, and intelligent marketplace platform.

---

## Table of Contents
- [About the Project](#-about-the-project)
- [Key Features & Key Differentiators](#-key-features--key-differentiators)
- [Tech Stack](#-tech-stack)
- [Architecture & Database Schema](#-architecture--database-schema)
- [Getting Started](#-getting-started)
- [Project Roadmap](#-project-roadmap)
- [The Team](#-the-team)
- [License](#-license)

---

## About the Project

In Azerbaijan, local tourism is heavily fragmented across Instagram pages, Facebook groups, and WhatsApp chats. Finding verified tours, comparing pricing, checking real-time availability, and reading genuine reviews is time-consuming and unreliable.

**TurPoint** solves this by offering a transparent two-sided marketplace where tour companies and independent guides can publish tours, manage bookings, and optimize occupancy, while travelers can discover, compare, and book verified trips seamlessly.

---

## Key Features & Key Differentiators

### Core Differentiators
1. **Dynamic Group Formation & Group Discount Model**
   - Enables solo travelers or small groups to reserve spots on tours that require a minimum capacity threshold.
   - Real-time dynamic pricing calculation: as participant numbers increase, the per-person cost decreases automatically based on shared cost formulas:
     $$\text{Per Person Cost} = \frac{\text{Total Tour Cost}}{\text{Number of Participants}}$$
   - Smooth state transitions: `Pending` ➔ `Formed` ➔ `Confirmed`.

2. **Smart Travel Planner**
   - An intelligent algorithmic itinerary generator that builds optimal multi-tour combinations given a user's budget ($B$), time duration ($T$), and interest preferences.
   - Based on a greedy heuristic variant of the **Team Orienteering Problem with Time Windows (TOPTW)** for fast, deterministic, and explainable recommendations.

### Standard Features
- **Operator Profiles:** Complete branding, vehicle specs (Wi-Fi, AC, baggage capacity), language capabilities, and operator ratings.
- **Tour Management & Comparison:** Filter by location, date, price, and category; compare 2–3 tours side-by-side.
- **Last-Minute Deals:** Discounted bookings for upcoming tours with open capacity.
- **Simulated Checkout & E-Ticketing:** End-to-end booking flow generating digital QR/e-tickets for passengers.

---

## Tech Stack

| Tier | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, React, Tailwind CSS | Responsive UI, Server-Side Rendering |
| **Backend** | Node.js, Express.js | RESTful API endpoints, state management |
| **Database** | SQLite | Lightweight Relational Database Engine |
| **Maps & Location** | Google Maps API | Interactive itinerary & venue mapping |
| **Design & Prototyping** | Figma | UI/UX Wireframes & Component System |
| **Hosting & CI/CD** | Vercel / Railway | Deployment and staging environment |

---

## Architecture & Flow

```
+-------------------+        +--------------------+        +---------------------+
|  Next.js Frontend | <----> | Express REST API   | <----> |   SQLite Database   |
| (Client / Admin)  |        | (Auth, Logic, Ops) |        | (Tours, Users, Ops) |
+-------------------+        +--------------------+        +---------------------+
                                       |
                                       v
                              +------------------+
                              | Google Maps API  |
                              +------------------+
```

---

## Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/turpoint.git
   cd turpoint
   ```

2. **Install dependencies for backend & frontend:**
   ```bash
   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run Database Migrations & Seed Data:**
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Development Servers:**
   ```bash
   # Backend
   npm run dev

   # Frontend (in another terminal tab)
   cd frontend && npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Project Roadmap

- [x] **Week 1:** Requirements, ERD Database Schema, Figma Wireframes, Repository Setup.
- [ ] **Week 2:** Authentication, Operator Dashboard, Tour Listing, Group Formation Logic.
- [ ] **Week 3:** Booking Simulation, Rating System, Tour Comparison, Smart Planner Algorithm.
- [ ] **Week 4:** End-to-End Testing, Seed Data Population, Staging Deployment & Final Defense.

---

## The Team

Created as a Holberton School Final Portfolio Project:

- **Ramil Mammadov** — Backend Engineer / Lead Architecture
- **Huseyn Sadatkhanov** — Full-Stack Engineer / UI Implementation
- **Aytakin Imanova** — Frontend Engineer / Design System
- **Leyla Khaspoladova** — Product Manager / Software Engineer

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


