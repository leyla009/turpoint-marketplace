**Traveler flow:**

1.  **Search / home** — "Home screen for a tour marketplace. Top: search bar with location, date range, and category filter chips (nature, history, entertainment, food). Below: a grid of tour cards, each showing a cover photo, title, location, operator name with star rating, price per person, and a small 'last-minute deal' badge where relevant. Persistent bottom/side nav: Home, Search, My Bookings, Profile."
2.  **Tour detail** — "Tour detail page. Hero photo carousel at top. Title, location, operator name + avatar + rating (tappable). Description section. Simple route/itinerary list. A 'Join a group' card showing current participants (e.g. '2 of 4 joined') with the price-per-person updating live as the number changes — this is the key differentiator, give it visual weight. Reviews section with star breakdown and a few review cards. Sticky bottom button: Book Now / Join Group."
3.  **Booking / checkout** — "Booking flow with a 3-step indicator (Select seats → Payment → Confirmation). Seat count stepper. Price summary showing subtotal, group discount applied (if any), total. Simulated payment form clearly labeled as a demo. Confirm button."
4.  **Confirmation / e-ticket** — "Confirmation screen with a digital e-ticket card: tour name, date, operator, QR code placeholder, ticket code, seat count, total paid. Buttons: Add to calendar, Download, View booking."
5.  **Comparison** — "Side-by-side comparison for 2–3 tours. One column per tour: photo, price, operator rating, duration, group size range, amenity icons (wifi/AC/luggage), and a select button per column."
6.  **Smart Planner** — "Trip planner input: budget field (AZN), number-of-days stepper, interest checkboxes (nature/history/entertainment/food), Generate Plan button. Results view: a day-by-day list of selected tours with cost per tour, running total against budget, and a small tag showing why each was picked (interest match)."

**Operator flow:**

7.  **Profile setup** — "Operator onboarding form: photo upload, name, bio textarea, languages (multi-select chips), vehicle features checklist (WiFi, AC, charging, luggage), contact info, Save button."
8.  **Add tour** — "New tour form: title, description, category dropdown, location, route/itinerary textarea, price, date picker, duration in days, min/max participants sliders, Publish button."
9.  **Operator dashboard** — "Dashboard home with summary cards (total tours, upcoming bookings, average rating, this month's revenue), and below, a table of the operator's tours with status badges and quick actions (edit, view bookings, mark as last-minute deal)."
10.  **Bookings management** — "Bookings view for one tour: list of participants with name, seats, payment status, and — for group-formation tours — a progress bar showing 'X of Y minimum joined' plus a status badge (waiting/forming/confirmed)."


## Task 5 Implementation Note

The wireframes for Task 5 were constructed as a fully interactive, AI-generated React/TypeScript prototype rather than static Figma canvas frames. 

To preserve live routing path integrity for upcoming milestones, the standalone reference prototype has been relocated to:
- `docs/figma-prototype/App.tsx`

This prototype houses the baseline internal state-switching logic and hardcoded UI structures, which will be refactored into modular Next.js routes (`app/tours/page.tsx`, `app/tours/[id]/page.tsx`, `app/compare/page.tsx`, `app/planner/page.tsx`, `app/dashboard/page.tsx`) during Tasks 18–21.
