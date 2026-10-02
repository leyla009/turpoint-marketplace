# TurPoint — a tourism marketplace for Azerbaijan

*Holberton School final portfolio project.*

Local tourism in Azerbaijan is scattered across Instagram pages, Facebook groups and WhatsApp chats. **TurPoint** puts it in one place: tour operators and independent guides publish tours, and travelers discover, compare, group up and book them, with real prices, honest refund rules and reviews from people who actually went.

**Stack:** Next.js 14 · Express · SQLite · Vercel (frontend) + Railway (backend) · GitHub Actions CI

---

## What it does

**Travelers**
- **Discover:** search and filter by location, date, price and category; interactive Leaflet map; compare 2–3 tours side by side; save favorites; popular tours and last-minute deals.
- **Tour pages:** full details in Azerbaijani, English and Russian, reviews, a weather forecast for the tour dates (Open-Meteo), and WhatsApp / Instagram contact.
- **Group booking:** a tour runs once its minimum group size is reached. Bookings stay `pending` until then and all confirm together. If the group never fills, it is cancelled automatically and the bookings are refunded.
- **E-tickets:** unique ticket code, QR code and downloadable PDF. *My Bookings* shows past and upcoming trips.
- **Cancellation with refunds:** 7+ days before = 100%, 3–6 days = 50%, 0–2 days = 0%. Operator cancellations and unfilled groups always refund 100%.
- **AI Smart Planner:** a conversational trip planner (Groq LLM) that can only recommend tours that really exist in the database. Prices and totals are recomputed server-side. Trips can be saved.
- **Reviews:** only travelers with a confirmed booking can review, and only after the tour date.
- **In-app notifications** and a language switcher (AZ / EN / RU).

**Operators**
- One account can be traveler and operator, with a mode toggle in the UI.
- Operator profile (photo, languages, vehicle features, phone, Instagram).
- Dashboard: create, edit and delete tours with photos, run last-minute deals, see and cancel incoming bookings, and view analytics (views, bookings, favorites, reviews).

**Under the hood**
- JWT auth with bcrypt; identity always comes from the verified token, never the request body.
- Zod validation on every JSON route; rate limits on the API, login, booking and planner endpoints; helmet; CORS allowlist; uploads accepted only by real file signature.
- OpenAPI docs with "Try it out" at `/api-docs`.
- Hourly background job that expires unfilled groups.
- Payments are **simulated** (Stripe-shaped, test cards only, nothing is charged). Real Stripe Checkout is the next planned step, see [roadmap](docs/roadmap.md).

---

## Tech stack

| Area | Technology |
| :--- | :--- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Leaflet, lucide-react, qrcode.react |
| Backend | Node.js 20, Express 4, better-sqlite3 (WAL), Zod, jsonwebtoken + bcryptjs, helmet, express-rate-limit, multer, pdfkit + qrcode |
| External services | Groq API (planner), Open-Meteo (weather, no key needed) |
| API docs | swagger-ui-express (`/api-docs`) |
| Tests / CI | node:test + supertest, GitHub Actions (backend tests + frontend build) |
| Hosting | Vercel (frontend), Railway with a persistent volume (backend + SQLite) |

```
Next.js frontend  <──REST──>  Express API  <────>  SQLite
 (Vercel)                      (Railway)           (Railway volume)
```

---

## Quick start

Requires **Node.js 20**.

```bash
git clone https://github.com/leyla009/turpoint-marketplace.git
cd turpoint-marketplace
cd backend && npm install
cd ../frontend && npm install
```

`better-sqlite3` compiles a native module on install. Windows needs the "Desktop development with C++" workload from Visual Studio Build Tools; Linux and macOS usually have the toolchain already.

**Environment files**

`backend/.env` (copy from `backend/.env.example`):
```env
PORT=4000
JWT_SECRET=your_own_secret_here
GROQ_API_KEY=            # optional, enables the AI planner (free key: console.groq.com)
```
`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```
The full list of backend variables is documented in `backend/.env.example`.

**Create the database and demo data** (the schema is applied automatically on boot):
```bash
cd backend
npm run seed
```
This adds 22 real, translated tours with dates relative to today, so every refund tier can be demoed. It refuses to run twice on the same database.

**Run both servers** in two terminals:
```bash
cd backend && npm run dev      # http://localhost:4000  (API docs at /api-docs)
cd frontend && npm run dev     # http://localhost:3000
```

Other seed scripts: `seed:tours -- --prices` (refresh tours on an existing database), `seed:photos`, `seed:analytics -- you@example.com` (demo analytics for an operator account).

**Test cards (simulated payments):** `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined.

**In GitHub Codespaces**, `localhost` in the browser points at your own machine, not the Codespace. Set port 4000 to *Public* in the Ports tab, use that forwarded URL for `NEXT_PUBLIC_API_URL`, and restart the frontend after changing `.env.local`.

---

## Tests and CI

```bash
cd backend && npm test
```
GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and a production frontend build on every push to `main` and on every pull request. Vercel and Railway redeploy automatically from `main`, so the usual flow is branch, pull request, green CI, merge.

---

## Project structure

```
backend/
  src/app.js         Express app (exported, so tests can import it)
  src/server.js      Entry point: starts the server and the hourly expiry job
  src/routes/        auth, operators, tours, bookings, group-formations, reviews,
                     deals, planner, favorites, notifications
  src/lib/           payments (simulated), refundPolicy, expireGroups, notify,
                     schemas (Zod), uploads, groq, ticketPdf, analytics
  src/db/            schema.sql, boot-time migrations, seed scripts
  src/openapi.json   API documentation
  test/              API tests
frontend/
  app/(main)/        pages: home, tour detail and booking, bookings, dashboard, notifications
  app/(auth)/        login / signup page
  app/components/    UI components
  app/lib/           translations (az/en/ru), date/price formatting, photo, weather and notification helpers
  public/seed/       tour cover photos
  public/pictures/   hero slideshow and site images
docs/                see below
tools/               script that generated some seed cover images (not needed at runtime)
```

---

## Documentation

| Document | What's in it |
| :--- | :--- |
| [docs/deployment.md](docs/deployment.md) | Railway + Vercel setup, environment variables, post-deploy checklist |
| [docs/decisions.md](docs/decisions.md) | Why things work the way they do: group rules, refunds, security, content |
| [docs/changelog.md](docs/changelog.md) | What changed, version by version |
| [docs/roadmap.md](docs/roadmap.md) | What's next and known gaps |
| [docs/design.md](docs/design.md) | Design-system reference the UI was modelled on |
| [docs/figma.md](docs/figma.md) | Wireframe prompts and the prototype note |
