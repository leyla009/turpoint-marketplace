# Deployment Guide

Sprint 3 target: backend on **Railway**, frontend on **Vercel**, per the plan
in `README.md`. Everything below is prepared and tested locally (see
`backend/railway.json`, the hardening in `backend/src/server.js`, and
`backend/.env.example`) — this doc is the checklist to actually take it
live. Nobody but you can run the final steps: they need your own Railway
and Vercel accounts/credentials.

Both platforms redeploy automatically on every push to `main` once
connected, so day-to-day updates after the initial setup are just `git
push`.

---

## 1. Backend → Railway

1. **Create the project.** [railway.app](https://railway.app) → New Project
   → Deploy from GitHub repo → select this repo.
2. **Set the root directory to `backend`.** Railway's Nixpacks builder
   auto-detects the Node app once the service's root/working directory is
   pointed at `backend/` (Settings → Service → Root Directory). It will pick
   up `backend/railway.json` for the start command and health check.
3. **Attach a persistent volume** (the backend uses a SQLite file — the
   container filesystem is ephemeral otherwise, so the database would reset
   on every redeploy):
   - Service → Settings → Volumes → New Volume.
   - Mount path: `/data`.
4. **Set environment variables** (Service → Variables):
   | Variable | Value |
   |---|---|
   | `JWT_SECRET` | A long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — do **not** ship the dev fallback from `src/lib/jwt.js` to production. |
   | `DB_PATH` | `/data/turpoint.db` — puts the SQLite file on the volume from step 3, so it survives redeploys. |
   | `CORS_ORIGIN` | Your Vercel frontend URL once you have it (step 2.4 below), e.g. `https://turpoint.vercel.app`. Can be added/updated after the frontend is deployed. |
   | `CRON_SECRET` | Optional — a random string, if you want `POST /api/group-formations/expire-past-due` protected from public triggering. |

   `PORT` is set automatically by Railway — don't override it.
5. **Deploy.** Railway builds and starts the service. The schema (tables +
   indexes) is applied automatically on boot — `db/index.js` runs
   `schema.sql` idempotently every time the process starts, so this needs no
   manual step.
6. **Seed demo data once**, after the first successful deploy — this is a
   one-off, not something that should run on every boot (it would duplicate
   rows):
   ```bash
   railway login
   railway link            # select this project/service
   railway run npm run seed
   ```
7. **Verify:**
   ```bash
   curl https://<your-railway-domain>/api/health
   # {"status":"ok"}
   curl https://<your-railway-domain>/api/tours
   # should list the 20 seeded tours
   ```
   Also open `https://<your-railway-domain>/api-docs` — Swagger UI should
   load and "Try it out" should work against the live API.

---

## 2. Frontend → Vercel

1. **Import the project.** [vercel.com](https://vercel.com) → Add New →
   Project → import this repo.
2. **Set the Root Directory to `frontend`.** This is a monorepo (backend +
   frontend side by side) — Vercel needs to be told which subfolder is the
   Next.js app (Project Settings → General → Root Directory → `frontend`).
   Framework preset should auto-detect as Next.js.
3. **Set the environment variable** (Project Settings → Environment
   Variables):
   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your Railway backend URL from step 1, e.g. `https://turpoint-backend.up.railway.app` (no trailing slash). |

   Set it for all three environments (Production/Preview/Development) if you
   want preview deploys to also hit the live backend.
4. **Deploy.** Vercel builds with `next build` (already verified to pass
   locally with zero errors — see below) and gives you a `*.vercel.app` URL.
5. **Close the loop on CORS:** go back to Railway and set `CORS_ORIGIN` to
   this exact Vercel URL (step 1.4), then redeploy the backend so it starts
   accepting requests from the live frontend.
6. **Verify:** open the Vercel URL, confirm the homepage loads tours from
   the live backend (not a "couldn't reach the backend" error), and walk
   through: browse → tour detail → sign up → book a tour → My Bookings
   e-ticket.

---

## 3. Post-deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok"}` on the Railway URL.
- [ ] `GET /api-docs` loads Swagger UI on the Railway URL and endpoints are
      callable from it (confirms CORS isn't blocking Swagger's own
      "Try it out", which runs from the API's own origin so it's unaffected
      either way).
- [ ] Homepage on the Vercel URL loads real tour data (confirms
      `NEXT_PUBLIC_API_URL` + `CORS_ORIGIN` are correctly paired).
- [ ] Sign up → log in → book a tour → view the e-ticket QR code, end to
      end, on the deployed URLs.
- [ ] `JWT_SECRET` on Railway is a real generated value, not the
      `dev-only-secret-change-before-real-deployment` fallback.
- [ ] The Railway volume is attached *before* the first real user signs up —
      moving to a volume after data already exists on the ephemeral disk
      loses that data. (Not a concern for a fresh deploy.)

## 4. Local build verification (already run)

`cd frontend && npm run build` was run locally against this branch and
completed with zero errors — all 15 routes compiled and typechecked
cleanly. Re-run it yourself after pulling if you want to double check
before pushing:

```bash
cd frontend && npm run build
```
