# Deployment

Backend on **Railway**, frontend on **Vercel**. Both redeploy automatically on every push to `main` once connected, so day-to-day updates are just a merged pull request.

> **Safe flow:** work on a branch → open a pull request → wait for CI (backend tests + frontend build) to go green → merge. A red CI never needs to block a running site, but it is the warning that something is about to break.

---

## 1. Backend → Railway

1. **Create the project:** [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → select this repo.
2. **Root directory:** set the service's Root Directory to `backend`. Nixpacks detects the Node app and `backend/railway.json` supplies the start command (`node src/server.js`) and the health check (`/api/health`).
3. **Persistent volume:** the database is a SQLite file, so without a volume it resets on every redeploy. Service → Settings → Volumes → New Volume, mount path `/data`.
4. **Environment variables** (Service → Variables):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` (enables the stricter limits, proxy-aware IPs and the secret requirements) |
   | `JWT_SECRET` | A long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never ship the dev fallback. |
   | `DB_PATH` | `/data/turpoint.db` |
   | `UPLOADS_DIR` | `/data/uploads` (operator photos; otherwise every redeploy wipes them) |
   | `CORS_ORIGIN` | Your Vercel URL, e.g. `https://turpoint.vercel.app` (comma-separate several). Set it after step 2.4. |
   | `GROQ_API_KEY` | Optional. Enables the AI planner. Without it the planner answers "AI unavailable". |
   | `CRON_SECRET` | Optional. Required only if you call `POST /api/group-formations/expire-past-due` yourself; the server already expires groups hourly. |
   | `ALLOW_MOCK_PHONE_VERIFICATION` | Leave unset. `true` lets anyone verify any number (demos only). |

   `PORT` is set by Railway; don't override it. All backend variables are documented in `backend/.env.example`.
5. **Deploy.** The schema and migrations are applied automatically on every boot, so there is no manual migration step.
6. **Seed demo data once**, after the first successful deploy, from inside the Railway service so it writes to the volume (open a shell in the service, then run `npm run seed`). Note that `railway run` executes on your own machine, not in the container. The seed refuses to run twice on a database that already has tours. To refresh tours on an existing database use `npm run seed:tours -- --prices`.
7. **Verify:**
   ```bash
   curl https://<railway-domain>/api/health     # {"status":"ok"}
   curl https://<railway-domain>/api/tours      # the 22 seeded tours
   ```
   Open `https://<railway-domain>/api-docs` too; Swagger UI should load.

---

## 2. Frontend → Vercel

1. **Import the project:** [vercel.com](https://vercel.com) → Add New → Project → import this repo.
2. **Root directory:** set it to `frontend` (this is a monorepo). The framework preset should detect Next.js.
3. **Environment variable:**

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your Railway URL, e.g. `https://turpoint-backend.up.railway.app` (no trailing slash) |

4. **Deploy.** Vercel runs `next build` and gives you a `*.vercel.app` URL.
5. **Close the CORS loop:** set `CORS_ORIGIN` on Railway to that exact URL and redeploy the backend.
6. **Verify:** open the Vercel URL. The homepage should load tours from the live backend. Then walk through browse → tour page → sign up → book → My Bookings → e-ticket.

---

## 3. Post-deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok"}` on the Railway URL.
- [ ] `/api-docs` loads and endpoints respond.
- [ ] The Vercel homepage shows real tours (`NEXT_PUBLIC_API_URL` and `CORS_ORIGIN` are correctly paired).
- [ ] Sign up → log in → book → view the e-ticket QR, end to end, on the deployed URLs.
- [ ] `JWT_SECRET` is a generated value, not the development fallback.
- [ ] The volume was attached **before** the first real user signed up.
- [ ] Photos survive a redeploy (`UPLOADS_DIR` is on the volume).

## 4. If a deploy goes wrong

Both platforms keep previous deployments. In Vercel (Deployments) or Railway (Deployments), redeploy the last good one. That is faster than reverting a commit under pressure.
