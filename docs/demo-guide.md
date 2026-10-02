# Demo guide

For the teammates presenting TurPoint. It covers what is new since the last release, a step-by-step demo script, and answers to likely questions.

> Lines marked **[FILL IN]** or **[VERIFY]** need a quick check before the demo.

---

## 1. Before you start (10 minutes)

1. Open the live site **[FILL IN: frontend URL]** and the API docs at **[FILL IN: backend URL]/api-docs**. Confirm both load.
2. Check the language switcher (AZ / EN / RU) works.
3. **Check the tour dates.** The demo tours have dates relative to the day the database was seeded. If tours show past dates or no available tours, refresh them (from `backend/`): `npm run seed:tours -- --prices`. **[VERIFY on the deployed database]**
4. Log in once as the traveler and once as the operator in two different browsers (or one normal and one private window), so you can switch without logging out.

**Demo accounts**

| Role | Email | Password |
| :--- | :--- | :--- |
| Traveler | **[FILL IN]** | **[FILL IN]** |
| Operator | **[FILL IN]** | **[FILL IN]** |

**Test cards (payments are simulated, nothing is charged)**

| Card | Result |
| :--- | :--- |
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment is declined |

Use any future expiry date and any 3-digit CVC.

---

## 2. What's new

Newest first. Dates are from the commit history (28 Sept to 2 Oct 2026).

**Documentation and quality (1-2 Oct)**
- README and `docs/` were rewritten and old planning files removed.
- Automated tests and a CI check now run on every push and pull request (backend tests plus a frontend build).
- Every API route now validates its input, so bad requests get a clear error instead of crashing the server.
- Azerbaijani dates are formatted correctly, tour page photos keep a proper aspect ratio, and some seed photos were replaced.

**Tickets and notifications (30 Sept to 1 Oct)**
- **PDF e-ticket** with a QR code and full Azerbaijani character support, downloadable from the booking page.
- **Notification bell** in the navigation bar and a full notifications page. Booking events create notifications automatically.

**Payments, refunds and tour data (1 Oct)**
- **Simulated payments** with a card form. Pending group bookings are held and then charged when the group fills.
- **Refund rules:** 7 or more days before the tour = 100%, 3-6 days = 50%, 0-2 days = 0%. Operator cancellations and groups that never fill always refund 100%.
- **22 real tours**, translated into AZ / EN / RU, with photos and real prices.
- **Smart Planner** only recommends tours that exist, are upcoming and have room for the party. The budget covers the whole party.

**Earlier this week (28-30 Sept)**
- **Operator analytics dashboard:** views, bookings, favorites and reviews.
- **Weather forecast** on each tour page, for the tour dates.
- **Invite friends card** with group progress and share links.
- A clear **"Book now" button** on the tour page, past-date validation for new tours, and fixes for blank tour cards.

---

## 3. Demo script (about 10 minutes)

**1. Discover (2 min)**
- Open the home page. Show the hero slideshow and the tour cards.
- Filter by location, date, price or category. Open the map.
- Select 2-3 tours and open **Compare**.

**2. Tour page (2 min)**
- Open a group tour. Point out the three languages, the weather forecast for the tour dates, reviews, and the **group progress** (how many people have joined and how many are still needed).
- Show the **invite friends** card and its share links.

**3. Book with a group tour (3 min)**
- Click **Book now** and enter traveler details.
- Pay with `4242 4242 4242 4242`. Show that `4000 0000 0000 0002` is declined, then use the working card.
- Open **My Bookings**. If the group is not full yet, the booking shows as `pending` and confirms together with the rest of the group.
- Open the booking and download the **PDF e-ticket** (QR code and unique ticket code).
- Check the **notification bell**.

**4. Cancel and refund (1 min)**
- Cancel a booking. Show the refund amount and explain the three tiers (100% / 50% / 0%).

**5. Operator side (2 min)**
- Switch to the operator account and use the mode toggle in the interface.
- Open the **dashboard**: create or edit a tour, show incoming bookings and the **analytics** panel.
- Optional: show **Smart Planner** from the traveler side. Ask for a trip with a budget and party size.

**6. Behind the scenes (30 s, only if asked)**
- Open `/api-docs` and use "Try it out" on one route.
- Mention CI and automated tests.

---

## 4. Likely questions and honest answers

| Question | Answer |
| :--- | :--- |
| Do payments really work? | No. Payments are **simulated**: no payment provider is connected and no money moves. Real Stripe Checkout in test mode is built but **not yet merged**, because it still needs a full run with a real Stripe test key. See `docs/roadmap.md`. |
| Why do bookings stay "pending"? | A tour only runs once its minimum group size is reached. All bookings confirm together. If the group never fills, it is cancelled automatically and everyone is refunded in full. |
| What happens to a card hold that expires? | The planned Stripe version will charge immediately and refund if the group never fills, because card holds expire after about 7 days. See `docs/roadmap.md`. |
| How is the AI planner safe? | It can only recommend tours that exist in the database, and prices and totals are recomputed on the server. |
| Is it secure? | Login uses JWT and hashed passwords, every route validates its input, rate limits protect login, booking and planner endpoints, and uploads are checked by real file signature. |
| What is not done yet? | See `docs/roadmap.md`. |

---

## 5. If something goes wrong

- **Site is slow or an error appears on the first page:** wait 30 seconds and refresh. **[VERIFY: does the backend sleep when idle?]**
- **No tours or old dates:** run the seed refresh command in section 1, step 3.
- **Planner does not answer:** it needs a Groq API key on the backend. Skip it and say it is optional.
- **Card declined unexpectedly:** check you typed `4242 4242 4242 4242` exactly.
- **Anything else:** **[FILL IN: your contact and the fallback plan, such as a screen recording]**. Keep a short screen recording of the full flow ready as a backup.
