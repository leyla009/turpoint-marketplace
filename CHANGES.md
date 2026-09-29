# TurPoint fixes (v2 - cumulative, replaces the first zip)

Copy `backend/` over your backend project root and `frontend/` over your frontend project root
(paths match the originals). Nothing needs installing - no new dependencies.

## Requested
1. **Reserve button** - tour page now has a primary "İndi Bron Et" button (desktop sidebar + mobile bar)
   linking to `/tours/[id]/book`. WhatsApp stays as a secondary button; Instagram no longer appears twice.
   Operators viewing their own tour see "This is your tour." instead. Contact card reworded to "Have questions?".
2. **Analytics contrast** - "Analitika" heading was dark text on the dark photo. It now sits on a white pill;
   loading skeletons are solid; a light `bg-black/25` scrim was added in `dashboard/page.tsx`
   (raise/lower the `/25` to taste, or delete that one div to keep the raw photo).

## Bugs
3. Booking charged full price while a deal was active -> `bookings.js` now uses `attachActiveDeals`.
4. Views inflated -> owner's views ignored, one count per visitor per tour per 30 min (`tours.js`, `optionalAuth`).
5. Anyone could review any tour -> confirmed-booking gate restored, operators can't review own tours,
   new `GET /api/reviews/eligibility`, tour page shows the right message.
6. Dates followed the browser, not the selected language; raw `2026-10-02` on dashboard/bookings/compare -> `lib/format.ts`.
7. Instagram: `@name` / full URLs no longer break links (normalized on save AND on display). WhatsApp link is pre-filled with tour + date.
8. Currency: one formatter, always "AZN 120".
9. Text below 12px in analytics, dashboard panel and tour page raised to 12px.

## Hardening
11. `expire-past-due` refuses to run in production without `CRON_SECRET`.
12. Auth rate limiter always on (20/15min in prod, 200 in dev); `trust proxy` set in production so rate limits and view
    counting see real client IPs instead of Railway's proxy.
13. `.env.example` documents `NODE_ENV`.

## Follow-ups
15. Past tours can't be booked: `bookings.js` rejects them (date compared in Baku time; a tour departing today is still bookable).
    The tour page shows "This tour has already taken place." instead of the button, hides the invite-friends card,
    and an old `/book` link shows the same message instead of the payment form.
16. `openapi.json` (Swagger at /api-docs) updated: new `GET /reviews/eligibility`, review 403, booking past-tour 400 + deal pricing,
    view-counting note on `GET /tours/{id}`, `503` on `expire-past-due`, Instagram normalisation note.

## Extra find
14. `DestinationMap.tsx` put tour title/location into popup HTML unescaped (operator-controlled text -> XSS). Now escaped.

## .gitignore
This zip does NOT include .gitignore files - keep yours and add these three lines:
```
*.db.backup*
tsconfig.tsbuildinfo
.env.*.local
```

## Do these yourself (I can't touch your GitHub repo)
```bash
# in the backend repo - stop tracking DB files, keep them on disk
git rm --cached turpoint.db turpoint.db-wal turpoint.db-shm turpoint.db.backup-* 2>/dev/null
git commit -m "Stop tracking SQLite database files"
```
Anything already committed stays in git history. If real user data was in those files, consider rotating
passwords / purging history (e.g. `git filter-repo`).

On Railway set: `NODE_ENV=production`, `JWT_SECRET`, `CRON_SECRET`, `CORS_ORIGIN`. Nothing currently *calls*
`expire-past-due` on a schedule - add a Railway cron hitting it with the `x-cron-secret` header.
